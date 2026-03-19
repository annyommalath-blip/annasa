import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Bell, CheckSquare, Plus, LogOut, Search, CalendarDays, Settings, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useProjects } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const navItems = [
  { icon: CheckSquare, label: 'My Tasks', path: '/my-tasks' },
  { icon: CalendarDays, label: 'Calendar', path: '/calendar' },
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: FolderKanban, label: 'Projects', path: '/projects' },
];

interface SidebarProps {
  onAddTask: () => void;
}

export function Sidebar({ onAddTask }: SidebarProps) {
  const location = useLocation();
  const { profile, signOut, user } = useAuth();
  const { data: notifications } = useNotifications();
  const { data: projects } = useProjects();
  const unreadCount = notifications?.filter(n => !n.read).length || 0;
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col z-30">
      {/* Logo */}
      <div className="p-5 flex items-center gap-2">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-primary">Task</span>
          <span className="text-foreground">Flow</span>
        </h1>
      </div>

      {/* Search */}
      <div className="px-3 mb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Add Task */}
      <div className="px-3 mb-3">
        <button
          onClick={onAddTask}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}

        {/* Inbox */}
        <Link
          to="/inbox"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative",
            location.pathname === '/inbox' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Bell className="w-4 h-4" />
          Inbox
          {unreadCount > 0 && (
            <span className="ml-auto bg-accent text-accent-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Link>

        {/* Projects list */}
        {projects && projects.length > 0 && (
          <div className="pt-4">
            <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Projects</p>
            {projects.map(p => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors",
                  location.pathname === `/projects/${p.id}` ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <div className="w-2 h-2 rounded-full bg-primary/40" />
                <span className="truncate">{p.name}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-border">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg hover:bg-muted transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || 'User'}</p>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-56 p-1.5">
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Link
              to="/settings"
              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground rounded-md hover:bg-muted transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-3 py-2 text-sm text-destructive rounded-md hover:bg-destructive/10 transition-colors w-full text-left"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </aside>
  );
}
