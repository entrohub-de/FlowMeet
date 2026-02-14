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
