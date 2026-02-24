

# Team Content Planner with n8n Integration

This is a major rebuild of the current mock-data app into a full-stack application with Supabase backend, real authentication, and n8n automation integration.

## What Changes

The current app uses in-memory mock data with no persistence. This plan replaces that with:

- Real signup/login with Supabase Auth
- Database tables for teams, projects, tasks (with expanded fields like multi-platform, caption, asset URLs, reviewers, post results)
- Kanban board with drag-drop that persists to database
- n8n webhook trigger when tasks are approved
- API endpoint for n8n to call back with posting results
- Automation logs panel in task detail

## Architecture Overview

```text
+------------------+       +-----------+       +-----------+
|   React Frontend | ----> |  Supabase | ----> |   n8n     |
|  (existing UI +  |       |  Database |       | Workflows |
|   new features)  | <---- |  + Auth   | <---- |           |
+------------------+       +-----------+       +-----------+
        |                       |                    |
        |  Status -> Approved   |  Webhook POST      |
        +-------> Edge Fn ------+---> n8n webhook    |
                                |                    |
        |  n8n calls back       |  Edge Fn endpoint  |
        +<--- update-task-status <-------------------+
```

---

## Phase 1: Enable Supabase + Database Schema

### Step 1.1 — Connect Supabase
Enable Supabase on the project.

### Step 1.2 — Database Tables (Migrations)

**Enums:**
- `app_role`: admin, member
- `task_status`: draft, needs_review, approved, scheduled, posted, failed
- `task_priority`: low, medium, high, urgent
- `content_type`: reel, video, image, carousel, text

**Tables:**

1. **profiles** — `id (FK auth.users)`, `full_name`, `avatar_url`, `created_at`
2. **user_roles** — `id`, `user_id (FK auth.users)`, `role (app_role)` — separate table per security requirements
3. **teams** — `id`, `name`, `created_by`, `created_at`
4. **team_members** — `id`, `team_id`, `user_id`, `role (app_role)`, `joined_at`
5. **projects** — `id`, `team_id`, `name`, `description`, `tags (text[])`, `created_by`, `created_at`
6. **project_members** — `id`, `project_id`, `user_id`
7. **tasks** — `id`, `project_id`, `title`, `description`, `platforms (text[])` (multi-select), `content_type`, `caption_master (text)`, `asset_urls (text[])`, `owner_id`, `reviewers (uuid[])`, `priority`, `status`, `due_at (timestamptz)`, `scheduled_at`, `posted_at`, `post_results (jsonb)`, `error_message (text)`, `created_by`, `created_at`, `updated_at`
8. **task_comments** — `id`, `task_id`, `user_id`, `text`, `created_at`
9. **automation_logs** — `id`, `task_id`, `source (text)`, `action (text)`, `payload (jsonb)`, `created_at`

**Triggers:**
- Auto-create profile on signup
- Auto-set `updated_at` on task update

**RLS Policies:**
- Users see only teams they belong to
- Tasks/projects scoped to team membership
- `automation_logs` readable by team members, writable only by service role (edge functions)

### Step 1.3 — Security Architecture
- Use `security definer` helper function `has_team_access(user_id, team_id)` for RLS
- Roles stored in `team_members.role`, NOT on profiles
- Edge function for n8n callback uses service role key (no user auth)

---

## Phase 2: Update TypeScript Types + Supabase Client

### Step 2.1 — Update `src/types/index.ts`
Expand types to match new schema:
- `Task.platforms` becomes `string[]` (multi-select)
- Add `caption_master`, `asset_urls`, `reviewers`, `scheduled_at`, `posted_at`, `post_results`, `error_message`
- New status values: `draft`, `needs_review`, `approved`, `scheduled`, `posted`, `failed`
- New `AutomationLog` type

### Step 2.2 — Generate Supabase Types
Auto-generate TypeScript types from the database schema.

### Step 2.3 — Create Data Hooks
Replace `AppContext` mock data with React Query hooks:
- `useAuth()` — login, signup, logout, session
- `useTeam()` — current team, members
- `useProjects(teamId)` — CRUD projects
- `useTasks(projectId)` — CRUD tasks, status updates
- `useTaskComments(taskId)` — comments
- `useAutomationLogs(taskId)` — read logs

---

## Phase 3: Authentication

### Step 3.1 — Auth Pages
- Update `Login.tsx` to use `supabase.auth.signInWithPassword` and `signUp`
- Add password reset flow with `/reset-password` page
- Add `AuthProvider` context wrapping the app with `onAuthStateChange`

### Step 3.2 — Protected Routes
- Wrap authenticated routes in a guard component
- Redirect unauthenticated users to `/login`

### Step 3.3 — Onboarding Flow
- After first signup: prompt to create or join a team
- Team invite by email (store pending invites in `team_members` with status)

---

## Phase 4: Update UI Components

### Step 4.1 — Task Form (Create/Edit)
New form modal with all fields:
- Title, description, caption master
- Platforms multi-select (checkboxes for IG/FB/TikTok/LinkedIn)
- Content type dropdown
- Asset URLs (dynamic list input)
- Owner selector, reviewers multi-select
- Priority, status dropdowns
- Due date/time picker (timezone-aware)

### Step 4.2 — Update Task Modal
- Show all new fields (platforms as badges, caption, assets as links)
- Add "Automation Logs" tab/panel showing latest n8n updates from `automation_logs` table
- Show `post_results` per platform (post URL, status, errors)
- Show `scheduled_at` and `posted_at` timestamps

### Step 4.3 — Update Kanban Board
- New status columns: Draft, Needs Review, Approved, Scheduled, Posted, Failed
- Drag-drop calls Supabase to update status
- When dropped to "Approved", triggers the n8n webhook (via edge function)

### Step 4.4 — Update List View
- Add owner and status filter dropdowns
- Show platform badges (multiple per task)

### Step 4.5 — Update Calendar View
- Add week view toggle (in addition to month)
- Show both `due_at` and `scheduled_at` as separate colored markers

---

## Phase 5: n8n Integration

### Step 5.1 — Store n8n Webhook URL
Store the n8n webhook URL as a Supabase secret (`N8N_WEBHOOK_URL`). The user provides this URL from their n8n workflow's webhook trigger node.

### Step 5.2 — Edge Function: `notify-n8n`
Triggered from the frontend when a task status changes to "Approved":
- Reads full task data from database
- POSTs the task payload to the n8n webhook URL
- Logs the call in `automation_logs`

```text
POST {N8N_WEBHOOK_URL}
Body: { task_id, title, platforms, caption_master, asset_urls, due_at, ... }
```

### Step 5.3 — Edge Function: `update-task-status`
Public endpoint that n8n calls back to update task state:
- Authenticates via a shared API key (stored as secret)
- Accepts: `task_id`, `status`, `scheduled_at`, `posted_at`, `post_results`, `error_message`
- Updates the task record in Supabase
- Writes to `automation_logs` with the received payload
- No JWT required (uses API key auth instead)

```text
POST /functions/v1/update-task-status
Headers: x-api-key: {TASK_API_KEY}
Body: { task_id, status, scheduled_at, post_results, ... }
```

### Step 5.4 — Automation Logs Panel
In the task detail modal, add a collapsible "Automation Logs" section:
- Shows timestamped entries from `automation_logs`
- Displays source (n8n), action (scheduled, posted, failed), and payload preview
- Auto-refreshes or uses Supabase realtime subscription

---

## Phase 6: Teams + Projects CRUD

### Step 6.1 — Team Management Page
- Create team form
- Invite members by email
- Show member list with roles
- Admin can change roles or remove members

### Step 6.2 — Project CRUD
- Create/edit project form (name, description, tags)
- Assign members from team
- Delete project (with confirmation)

---

## Implementation Order

| Step | What | Depends On |
|------|------|------------|
| 1 | Enable Supabase, create schema | -- |
| 2 | Auth (login/signup/guard) | Step 1 |
| 3 | Types + Supabase client + hooks | Step 1 |
| 4 | Team onboarding + management | Steps 2-3 |
| 5 | Project CRUD | Steps 2-3 |
| 6 | Task form + expanded fields | Steps 3, 5 |
| 7 | Update Kanban/List/Calendar views | Step 6 |
| 8 | n8n edge functions + webhook | Step 6 |
| 9 | Automation logs panel | Step 8 |
| 10 | Polish + testing | All |

---

## Technical Details

**New files to create:**
- `src/hooks/useAuth.ts` — auth state + actions
- `src/hooks/useTeam.ts` — team CRUD
- `src/hooks/useProjects.ts` — project CRUD
- `src/hooks/useTasks.ts` — task CRUD + status updates
- `src/hooks/useAutomationLogs.ts` — read logs
- `src/components/auth/AuthGuard.tsx` — route protection
- `src/components/tasks/TaskForm.tsx` — create/edit form
- `src/components/tasks/AutomationLogs.tsx` — logs panel
- `src/components/teams/TeamForm.tsx` — create team
- `src/components/teams/InviteMembers.tsx` — invite flow
- `src/pages/ResetPassword.tsx` — password reset
- `src/pages/TeamOnboarding.tsx` — post-signup team setup
- `supabase/functions/notify-n8n/index.ts` — webhook to n8n
- `supabase/functions/update-task-status/index.ts` — n8n callback endpoint

**Files to significantly modify:**
- `src/types/index.ts` — expanded Task type
- `src/contexts/AppContext.tsx` — replace mock data with Supabase hooks
- `src/pages/Login.tsx` — real auth
- `src/pages/ProjectDetail.tsx` — new views + task creation
- `src/components/tasks/TaskModal.tsx` — new fields + automation logs
- `src/components/tasks/KanbanBoard.tsx` — new statuses + DB persistence
- `src/components/tasks/TaskCard.tsx` — multi-platform badges
- `src/components/calendar/CalendarGrid.tsx` — week view + scheduled_at markers
- `src/App.tsx` — new routes + auth guard

**Secrets needed:**
- `N8N_WEBHOOK_URL` — the n8n webhook trigger URL
- `TASK_API_KEY` — shared secret for n8n callback authentication

