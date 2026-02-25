'use client';

import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { uploadUserAvatar } from '@/lib/api/storage';
import { upsertProfile } from '@/lib/api/profile';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  userId: string;
  avatarUrl: string | null;
  nickname: string;
  size?: 'sm' | 'lg';
  onAvatarChange?: (url: string) => void;
}

export default function AvatarUpload({
  userId,
  avatarUrl,
  nickname,
  size = 'lg',
  onAvatarChange,
}: AvatarUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const displayUrl = previewUrl || avatarUrl;
  const initials = (nickname || '?').slice(0, 2).toUpperCase();

  const sizeClass = size === 'lg' ? 'w-20 h-20' : 'w-14 h-14';
  const iconSize = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  const badgeSize = size === 'lg' ? 'w-7 h-7' : 'w-6 h-6';
  const textSize = size === 'lg' ? 'text-xl' : 'text-sm';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setUploading(true);
    try {
      const url = await uploadUserAvatar(file, userId);
      await upsertProfile(userId, { avatar_url: url });
      onAvatarChange?.(url);
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      className={cn('relative rounded-full shrink-0 group', sizeClass)}
      disabled={uploading}
    >
      {displayUrl ? (
        <img
          src={displayUrl}
          alt={nickname}
          className={cn('w-full h-full rounded-full object-cover', uploading && 'opacity-50')}
        />
      ) : (
        <div className={cn(
          'w-full h-full rounded-full bg-primary/10 flex items-center justify-center',
          uploading && 'opacity-50'
        )}>
          <span className={cn('font-semibold text-primary', textSize)}>{initials}</span>
        </div>
      )}

      {/* Camera badge */}
      <div className={cn(
        'absolute -bottom-0.5 -right-0.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm transition-transform group-hover:scale-110',
        badgeSize
      )}>
        {uploading ? (
          <span className={cn('animate-spin rounded-full border-2 border-primary-foreground border-t-transparent', size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3')} />
        ) : (
          <Camera className={iconSize} />
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </button>
  );
}
