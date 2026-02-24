import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden items-center justify-center">
        <div className="relative z-10 p-12 max-w-lg">
          <h1 className="text-4xl font-extrabold text-primary-foreground mb-4 tracking-tight">
            ContentFlow
          </h1>
          <p className="text-lg text-primary-foreground/80 leading-relaxed">
            Plan, create, and schedule your team's social media content — all in one place.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { label: 'Team Boards', desc: 'Kanban-style planning' },
              { label: 'Calendar View', desc: 'Visual scheduling' },
              { label: 'Multi-Platform', desc: 'IG, FB, TikTok, LinkedIn' },
              { label: 'Approvals', desc: 'Review & approve flow' },
            ].map(item => (
              <div key={item.label} className="bg-primary-foreground/10 rounded-lg p-3">
                <p className="text-sm font-semibold text-primary-foreground">{item.label}</p>
                <p className="text-xs text-primary-foreground/60 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-foreground/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary-foreground/5 rounded-full translate-y-1/3 -translate-x-1/3" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-primary-foreground/5 rounded-full" />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isLogin ? 'Sign in to your workspace' : 'Get started with ContentFlow'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" placeholder="Alex Rivera" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="alex@team.co" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full">
              {isLogin ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-medium hover:underline"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
