'use client';

import { User } from 'lucide-react';

interface UserAvatarProps {
  avatarUrl: string | null;
  name: string | null;
  size?: 'sm' | 'md';
  variant?: 'primary' | 'muted';
}

export function UserAvatar({ avatarUrl, name, size = 'md', variant = 'primary' }: UserAvatarProps) {
  const sizeClass = size === 'sm' ? 'w-9 h-9' : 'w-10 h-10';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const bgClass = variant === 'primary' ? 'bg-primary/10' : 'bg-muted';
  const iconClass = variant === 'primary' ? 'text-primary' : 'text-muted-foreground';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || ''}
        className={`${sizeClass} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full ${bgClass} flex items-center justify-center shrink-0`}>
      <User className={`${iconSize} ${iconClass}`} />
    </div>
  );
}
