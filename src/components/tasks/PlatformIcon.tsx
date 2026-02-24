import { Instagram, Facebook, Linkedin } from 'lucide-react';
import { Platform } from '@/types';
import { cn } from '@/lib/utils';

export function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  const base = "w-4 h-4";

  switch (platform) {
    case 'instagram':
      return <Instagram className={cn(base, "text-platform-instagram", className)} />;
    case 'facebook':
      return <Facebook className={cn(base, "text-platform-facebook", className)} />;
    case 'linkedin':
      return <Linkedin className={cn(base, "text-platform-linkedin", className)} />;
    case 'tiktok':
      return (
        <svg className={cn(base, "text-platform-tiktok", className)} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.97a8.35 8.35 0 0 0 4.76 1.49V7.01a4.83 4.83 0 0 1-1-.32z"/>
        </svg>
      );
  }
}
