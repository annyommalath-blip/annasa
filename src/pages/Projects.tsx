import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProjects, useCreateProject } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useTeams } from '@/hooks/useTeam';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

export default function Projects() {
  const { data: projects, isLoading } = useProjects();
  const { data: tasks } = useTasks();
  const { data: teams } = useTeams();
  const navigate = useNavigate();
  const createProject = useCreateProject();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !teams?.[0]) return;
    try {
      await createProject.mutateAsync({ name: name.trim(), description, teamId: teams[0].id });
      toast({ title: 'Project created' });
      setName('');
      setDescription('');
      setShowCreate(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const getTaskCount = (projectId: string) => tasks?.filter(t => t.project_id === projectId).length || 0;

  return (
    <AppLayout>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-1">{projects?.length || 0} projects</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : projects?.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">No projects yet</p>
            <Button variant="outline" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create your first project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {projects?.map(project => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="bg-card border border-border rounded-lg p-6 cursor-pointer hover:shadow-lg hover:border-primary/20 transition-all"
              >
                <h3 className="text-lg font-semibold text-foreground mb-1">{project.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{project.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {project.tags?.map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{tag}</span>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{getTaskCount(project.id)} tasks</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Project name" required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description..." rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createProject.isPending}>{createProject.isPending ? 'Creating...' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
