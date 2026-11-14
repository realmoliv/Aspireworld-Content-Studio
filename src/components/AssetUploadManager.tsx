import { useState, useRef } from 'react';
import { formatFileSize, getSignedAssetUrl } from '@/lib/storage';

interface Asset {
  id?: string;
  name: string;
  version: string;
  storage_path?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_at?: string;
}

interface AssetUploadManagerProps {
  itemId: string;
  assets: Asset[];
  onUpload: (file: File, version: string) => Promise<any>;
  onDelete: (assetId: string, storagePath?: string | null) => Promise<void>;
  canWrite?: boolean;
  isAdmin?: boolean;
}

export function AssetUploadManager({
  itemId,
  assets,
  onUpload,
  onDelete,
  canWrite = true,
  isAdmin = true,
}: AssetUploadManagerProps) {
  const [version, setVersion] = useState<'v1' | 'v2' | 'final'>(() => {
    if (!assets || assets.length === 0) return 'v1';
    if (assets.length === 1) return 'v2';
    return 'final';
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    setError(null);

    // 50MB check
    if (file.size > 50 * 1024 * 1024) {
      setError(`File "${file.name}" exceeds the 50 MB limit (${formatFileSize(file.size)}).`);
      return;
    }

    setUploading(true);
    setUploadProgress(`Uploading ${file.name} (${formatFileSize(file.size)})...`);

    try {
      await onUpload(file, version);
      setUploadProgress(null);
      // Auto-advance version suggestion for next upload
      if (version === 'v1') setVersion('v2');
      else if (version === 'v2') setVersion('final');
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canWrite) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDownload = async (asset: Asset) => {
    if (asset.storage_path) {
      const url = await getSignedAssetUrl(asset.storage_path);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        alert('Could not generate download link for this asset.');
      }
    } else {
      alert(`Asset "${asset.name}" is a local mock reference without cloud storage.`);
    }
  };

  const handleDelete = async (asset: Asset) => {
    if (!window.confirm(`Are you sure you want to delete ${asset.name}?`)) return;
    try {
      await onDelete(asset.id || '', asset.storage_path);
    } catch (err: any) {
      alert(`Failed to delete asset: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Version Selector */}
      {canWrite && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
          <span style={{ font: '600 0.75rem "Barlow Condensed"', letterSpacing: '0.15em', color: 'var(--grey)' }}>
            CHOOSE VERSION TAG
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['v1', 'v2', 'final'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVersion(v)}
                className={`btn ${version === v ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.75rem',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  borderColor: version === v ? 'var(--red)' : undefined,
                }}
              >
                {v === 'final' ? '★ FINAL' : v}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload Drop Zone */}
      {canWrite && (
        <div
          className={`upload ${isDragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            cursor: uploading ? 'wait' : 'pointer',
            border: isDragging ? '2px dashed var(--red)' : '1px dashed var(--line)',
            background: isDragging ? 'rgba(252, 13, 18, 0.08)' : 'var(--surface-2)',
            padding: 'var(--space-4)',
            textAlign: 'center',
            borderRadius: '4px',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ font: '600 0.7rem "Barlow Condensed"', letterSpacing: '0.15em', color: 'var(--grey)' }}>
            {uploading ? 'UPLOADING TO SUPABASE STORAGE...' : `UPLOAD ASSET AS ${version.toUpperCase()}`}
          </span>
          <strong style={{ display: 'block', fontSize: '1.1rem', margin: '0.35rem 0', fontFamily: 'Bebas Neue', letterSpacing: '0.05em' }}>
            {uploading ? 'PROCESSING FILE...' : 'DROP FILES HERE OR CLICK TO BROWSE'}
          </strong>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--grey)' }}>
            Videos (MP4, MOV), Images (PNG, JPG, WebP), PDFs, Audio up to 50MB.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      )}

      {/* Upload Feedback */}
      {uploadProgress && (
        <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--white)' }}>
          ⏳ {uploadProgress}
        </div>
      )}

      {error && (
        <div style={{ padding: '0.5rem', background: 'rgba(252, 13, 18, 0.15)', borderLeft: '3px solid var(--red)', borderRadius: '4px', fontSize: '0.8rem', color: '#ff8888' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Asset List */}
      <div className="asset-list" style={{ marginTop: 'var(--space-2)' }}>
        {assets.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--grey)', fontSize: '0.85rem' }}>
            No assets uploaded yet. Upload a draft or final edit above.
          </div>
        ) : (
          assets.map((a, idx) => (
            <div
              key={a.id || idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                marginBottom: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
                <span
                  className="pill"
                  style={{
                    background: a.version.toLowerCase() === 'final' ? 'var(--red)' : 'var(--dark-grey)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    padding: '0.2rem 0.5rem',
                  }}
                >
                  {a.version.toUpperCase()}
                </span>
                <div style={{ overflow: 'hidden' }}>
                  <strong style={{ display: 'block', fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {a.name}
                  </strong>
                  <small style={{ color: 'var(--grey)', fontSize: '0.75rem' }}>
                    {formatFileSize(a.file_size)} {a.uploaded_at ? `· ${new Date(a.uploaded_at).toLocaleDateString()}` : '· Attached'}
                  </small>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => handleDownload(a)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  title="Open / Download asset"
                >
                  VIEW ↗
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(a)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--red)' }}
                    title="Delete asset"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
