import { supabase } from '@/lib/supabase/client';

const BUCKET = 'event-covers';

/**
 * 上传活动封面图片到 Supabase Storage
 * 返回公开访问 URL
 */
export async function uploadEventCover(file: File, eventId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${eventId}/cover.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * 删除活动封面图片
 */
export async function deleteEventCover(eventId: string): Promise<void> {
  const { data: files } = await supabase.storage
    .from(BUCKET)
    .list(eventId);

  if (files && files.length > 0) {
    const paths = files.map((f) => `${eventId}/${f.name}`);
    await supabase.storage.from(BUCKET).remove(paths);
  }
}

/* ── 用户头像 ── */

const AVATAR_BUCKET = 'user-avatars';

/**
 * 上传用户头像到 Supabase Storage
 * 返回公开访问 URL
 */
export async function uploadUserAvatar(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * 删除用户头像
 */
export async function deleteUserAvatar(userId: string): Promise<void> {
  const { data: files } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(userId);

  if (files && files.length > 0) {
    const paths = files.map((f) => `${userId}/${f.name}`);
    await supabase.storage.from(AVATAR_BUCKET).remove(paths);
  }
}

/* ── 广告图片 ── */

const AD_BUCKET = 'ad-images';

export async function uploadAdImage(file: File, adId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${adId}/image.${ext}`;

  const { error } = await supabase.storage
    .from(AD_BUCKET)
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(AD_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
