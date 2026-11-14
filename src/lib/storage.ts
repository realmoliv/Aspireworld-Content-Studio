import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface AssetUploadResult {
  id: string;
  name: string;
  version: string;
  storage_path: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at: string;
  error?: string;
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export async function uploadAssetFile(
  itemId: string,
  file: File,
  versionLabel: string,
  userId?: string
): Promise<AssetUploadResult> {
  const maxBytes = 50 * 1024 * 1024; // 50MB
  if (file.size > maxBytes) {
    throw new Error('File exceeds the 50 MB limit.');
  }

  // Fallback if Supabase is not configured (demo mode)
  if (!isSupabaseConfigured) {
    return {
      id: `a${Date.now()}`,
      name: file.name,
      version: versionLabel,
      storage_path: '',
      file_size: file.size,
      mime_type: file.type,
      uploaded_at: new Date().toISOString(),
    };
  }

  // Sanitize filename to avoid S3/Storage character issues
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `items/${itemId}/${Date.now()}_${safeName}`;

  // 1. Upload to Supabase Storage bucket 'content-assets'
  const { error: uploadErr } = await supabase.storage
    .from('content-assets')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadErr) {
    throw new Error(`Storage upload failed: ${uploadErr.message}`);
  }

  // 2. Insert record into PostgreSQL item_assets table
  const { data: assetRow, error: dbErr } = await supabase
    .from('item_assets')
    .insert({
      item_id: itemId,
      file_name: file.name,
      version_label: versionLabel,
      storage_path: storagePath,
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
      uploaded_by: userId || null,
    })
    .select()
    .single();

  if (dbErr || !assetRow) {
    // Attempt cleanup if DB insert failed
    await supabase.storage.from('content-assets').remove([storagePath]);
    throw new Error(`Asset record creation failed: ${dbErr?.message}`);
  }

  return {
    id: assetRow.id,
    name: assetRow.file_name,
    version: assetRow.version_label,
    storage_path: assetRow.storage_path || storagePath,
    file_size: assetRow.file_size || file.size,
    mime_type: assetRow.mime_type || file.type,
    uploaded_at: assetRow.uploaded_at,
  };
}

export async function getSignedAssetUrl(storagePath: string, expiresIn = 3600): Promise<string | null> {
  if (!storagePath || !isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase.storage
      .from('content-assets')
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data) {
      console.warn('Could not generate signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Error fetching signed URL:', err);
    return null;
  }
}

export async function deleteAssetFile(assetId: string, storagePath?: string | null): Promise<void> {
  if (!isSupabaseConfigured) return;

  // 1. Remove file from Supabase storage if storage_path exists
  if (storagePath) {
    const { error: storageErr } = await supabase.storage
      .from('content-assets')
      .remove([storagePath]);
    if (storageErr) {
      console.warn('Could not remove file from storage:', storageErr);
    }
  }

  // 2. Delete database record
  const { error: dbErr } = await supabase
    .from('item_assets')
    .delete()
    .eq('id', assetId);

  if (dbErr) {
    throw new Error(`Failed to delete asset record: ${dbErr.message}`);
  }
}
