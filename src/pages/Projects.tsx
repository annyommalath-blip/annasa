import { AppLayout } from '@/components/layout/AppLayout';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Projects() {
  const { projects, tasks, team } = useApp();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-1">{projects.length} active projects</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {projects.map(project => {
            const projectTasks = tasks.filter(t => t.projectId === project.id);
            const members = team.members.filter(m => project.memberIds.includes(m.id));

            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="bg-card border border-border rounded-lg p-6 cursor-pointer hover:shadow-lg hover:border-primary/20 transition-all"
              >
                <h3 className="text-lg font-semibold text-foreground mb-1">{project.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{project.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {project.tags.map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {members.slice(0, 3).map(m => (
                        <div
                          key={m.id}
                          className="w-7 h-7 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center text-primary text-[10px] font-semibold"
                          title={m.name}
                        >
                          {m.name.split(' ').map(n => n[0]).join('')}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{projectTasks.length} tasks</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
