import React, { useState } from 'react';

export type EmbedType =
  | 'youtube'
  | 'vimeo'
  | 'loom'
  | 'drive-file'
  | 'drive-folder'
  | 'instagram'
  | 'tiktok'
  | 'figma'
  | 'spotify'
  | 'image'
  | 'video'
  | 'audio'
  | 'website'
  | 'invalid';

export interface EmbedInfo {
  type: EmbedType;
  embedUrl?: string;
  thumbnailUrl?: string;
  id?: string;
  domain?: string;
  rawUrl: string;
}

export function parseEmbedInfo(rawUrl: string): EmbedInfo {
  const url = (rawUrl || '').trim();
  if (!url) {
    return { type: 'invalid', rawUrl: '' };
  }

  // YouTube
  const ytMatch = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})/i
  );
  if (ytMatch) {
    const id = ytMatch[1];
    return {
      type: 'youtube',
      id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      domain: 'youtube.com',
      rawUrl: url,
    };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch) {
    const id = vimeoMatch[1];
    return {
      type: 'vimeo',
      id,
      embedUrl: `https://player.vimeo.com/video/${id}`,
      domain: 'vimeo.com',
      rawUrl: url,
    };
  }

  // Loom
  const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i);
  if (loomMatch) {
    const id = loomMatch[1];
    return {
      type: 'loom',
      id,
      embedUrl: `https://www.loom.com/embed/${id}`,
      domain: 'loom.com',
      rawUrl: url,
    };
  }

  // Google Drive File
  const driveFileMatch =
    url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i) ||
    url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i);
  if (driveFileMatch) {
    const id = driveFileMatch[1];
    return {
      type: 'drive-file',
      id,
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
      domain: 'drive.google.com',
      rawUrl: url,
    };
  }

  // Google Drive Folder
  const driveFolderMatch = url.match(
    /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/i
  );
  if (driveFolderMatch) {
    const id = driveFolderMatch[1];
    return {
      type: 'drive-folder',
      id,
      embedUrl: `https://drive.google.com/embeddedfolderview?id=${id}#grid`,
      domain: 'drive.google.com',
      rawUrl: url,
    };
  }

  // Instagram Post or Reel
  const igMatch = url.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i);
  if (igMatch) {
    const id = igMatch[1];
    return {
      type: 'instagram',
      id,
      embedUrl: `https://www.instagram.com/p/${id}/embed/`,
      domain: 'instagram.com',
      rawUrl: url,
    };
  }

  // TikTok Video
  const ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
  if (ttMatch) {
    const id = ttMatch[1];
    return {
      type: 'tiktok',
      id,
      embedUrl: `https://www.tiktok.com/embed/v2/${id}`,
      domain: 'tiktok.com',
      rawUrl: url,
    };
  }

  // Figma
  const figmaMatch = url.match(/figma\.com\/(?:file|design|proto)\/([a-zA-Z0-9_-]+)/i);
  if (figmaMatch) {
    return {
      type: 'figma',
      embedUrl: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`,
      domain: 'figma.com',
      rawUrl: url,
    };
  }

  // Spotify
  const spotifyMatch = url.match(
    /open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/i
  );
  if (spotifyMatch) {
    return {
      type: 'spotify',
      embedUrl: `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}`,
      domain: 'spotify.com',
      rawUrl: url,
    };
  }

  // Direct Images
  if (
    /\.(jpeg|jpg|gif|png|webp|svg)($|\?|#)/i.test(url) ||
    /(images\.unsplash\.com|i\.imgur\.com|cdn\.shopify\.com)/i.test(url)
  ) {
    return {
      type: 'image',
      embedUrl: url,
      thumbnailUrl: url,
      rawUrl: url,
    };
  }

  // Direct Video
  if (/\.(mp4|webm|mov|m4v|ogg)($|\?|#)/i.test(url)) {
    return {
      type: 'video',
      embedUrl: url,
      rawUrl: url,
    };
  }

  // Direct Audio
  if (/\.(mp3|wav|ogg|m4a|aac)($|\?|#)/i.test(url)) {
    return {
      type: 'audio',
      embedUrl: url,
      rawUrl: url,
    };
  }

  // Fallback to website
  let domain = '';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    domain = parsed.hostname.replace(/^www\./, '');
  } catch {
    domain = url.split('/')[0] || '';
  }

  return {
    type: 'website',
    domain,
    rawUrl: url.startsWith('http') ? url : `https://${url}`,
  };
}

interface ReferenceEmbedPreviewProps {
  url: string;
  label?: string;
  compact?: boolean;
  interactive?: boolean;
  className?: string;
}

export function ReferenceEmbedPreview({
  url,
  label = 'Reference preview',
  compact = false,
  interactive = true,
  className = '',
}: ReferenceEmbedPreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [tryIframe, setTryIframe] = useState(false);
  const [driveViewMode, setDriveViewMode] = useState<'card' | 'embed'>('card');

  const info = parseEmbedInfo(url);

  if (info.type === 'invalid' || !url.trim()) {
    return (
      <div className={`ref-embed-empty ${className}`}>
        <span className="ref-embed-empty-icon">🔗</span>
        <span className="ref-embed-empty-text">No reference link added yet</span>
      </div>
    );
  }

  // COMPACT MODE (e.g. For ReferenceView grid cards or compact lists)
  if (compact) {
    if (info.type === 'youtube' && info.thumbnailUrl) {
      return (
        <div className={`ref-embed-compact ${className}`}>
          <img
            src={info.thumbnailUrl}
            alt={label}
            className="ref-compact-img"
            loading="lazy"
          />
          <span className="ref-badge-play">▶ YT</span>
        </div>
      );
    }
    if (info.type === 'image' && !imageError) {
      return (
        <div className={`ref-embed-compact ${className}`}>
          <img
            src={info.embedUrl || info.rawUrl}
            alt={label}
            className="ref-compact-img"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        </div>
      );
    }
    if (info.type === 'drive-folder' || info.type === 'drive-file') {
      return (
        <div className={`ref-embed-compact ref-embed-compact-drive ${className}`}>
          <span className="ref-drive-icon">📁</span>
          <strong>DRIVE</strong>
        </div>
      );
    }
    if (info.type === 'figma') {
      return (
        <div className={`ref-embed-compact ref-embed-compact-figma ${className}`}>
          <span className="ref-figma-icon">🎨</span>
          <strong>FIGMA</strong>
        </div>
      );
    }
    return (
      <div className={`ref-embed-compact ref-embed-compact-web ${className}`}>
        {info.domain ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${info.domain}&sz=32`}
            alt={info.domain}
            className="ref-compact-favicon"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <span className="ref-web-icon">↗</span>
        )}
        <strong>{info.domain ? info.domain.split('.')[0].toUpperCase() : 'SOURCE'}</strong>
      </div>
    );
  }

  // FULL EMBED / PREVIEW MODE

  // 1. YouTube
  if (info.type === 'youtube' && info.embedUrl) {
    return (
      <div className={`ref-embed-container ${className}`}>
        <div className="ref-embed-header">
          <span className="ref-embed-pill">YOUTUBE EMBED</span>
          <a
            href={info.rawUrl}
            target="_blank"
            rel="noreferrer"
            className="ref-embed-link"
          >
            OPEN IN YOUTUBE ↗
          </a>
        </div>
        <div className="ref-embed-aspect">
          <iframe
            src={info.embedUrl}
            title={label}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="ref-embed-iframe"
          />
        </div>
      </div>
    );
  }

  // 2. Vimeo
  if (info.type === 'vimeo' && info.embedUrl) {
    return (
      <div className={`ref-embed-container ${className}`}>
        <div className="ref-embed-header">
          <span className="ref-embed-pill">VIMEO EMBED</span>
          <a
            href={info.rawUrl}
            target="_blank"
            rel="noreferrer"
            className="ref-embed-link"
          >
            OPEN IN VIMEO ↗
          </a>
        </div>
        <div className="ref-embed-aspect">
          <iframe
            src={info.embedUrl}
            title={label}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="ref-embed-iframe"
          />
        </div>
      </div>
    );
  }

  // 3. Loom
  if (info.type === 'loom' && info.embedUrl) {
    return (
      <div className={`ref-embed-container ${className}`}>
        <div className="ref-embed-header">
          <span className="ref-embed-pill">LOOM VIDEO</span>
          <a
            href={info.rawUrl}
            target="_blank"
            rel="noreferrer"
            className="ref-embed-link"
          >
            OPEN IN LOOM ↗
          </a>
        </div>
        <div className="ref-embed-aspect">
          <iframe
            src={info.embedUrl}
            title={label}
            allowFullScreen
            className="ref-embed-iframe"
          />
        </div>
      </div>
    );
  }

  // 4. Google Drive File
  if (info.type === 'drive-file' && info.embedUrl) {
    return (
      <div className={`ref-embed-container ${className}`}>
        <div className="ref-embed-header">
          <span className="ref-embed-pill">GOOGLE DRIVE FILE</span>
          <a
            href={info.rawUrl}
            target="_blank"
            rel="noreferrer"
            className="ref-embed-link"
          >
            OPEN IN DRIVE ↗
          </a>
        </div>
        <div className="ref-embed-aspect">
          <iframe
            src={info.embedUrl}
            title={label}
            className="ref-embed-iframe"
            allow="autoplay"
          />
        </div>
      </div>
    );
  }

  // 5. Google Drive Folder
  if (info.type === 'drive-folder') {
    return (
      <div className={`ref-embed-container ${className}`}>
        <div className="ref-embed-header">
          <span className="ref-embed-pill">GOOGLE DRIVE FOLDER</span>
          <div className="ref-embed-header-actions">
            <button
              type="button"
              className="ref-btn-toggle"
              onClick={() => setDriveViewMode(driveViewMode === 'card' ? 'embed' : 'card')}
            >
              {driveViewMode === 'card' ? 'PREVIEW AS GRID' : 'HIDE GRID'}
            </button>
            <a
              href={info.rawUrl}
              target="_blank"
              rel="noreferrer"
              className="ref-embed-link"
            >
              OPEN FOLDER ↗
            </a>
          </div>
        </div>

        {driveViewMode === 'embed' && info.embedUrl ? (
          <div className="ref-embed-aspect">
            <iframe
              src={info.embedUrl}
              title={label}
              className="ref-embed-iframe"
            />
          </div>
        ) : (
          <div className="ref-drive-folder-card">
            <div className="ref-drive-card-content">
              <span className="ref-drive-big-icon">📁</span>
              <div>
                <h4>Google Drive Asset Directory</h4>
                <p>Folder ID: <code>{info.id}</code></p>
                <small className="muted">Contains source footage, rushes or brand assets.</small>
              </div>
            </div>
            <a
              href={info.rawUrl}
              target="_blank"
              rel="noreferrer"
              className="ref-drive-launch-btn"
            >
              BROWSE DRIVE FOLDER ↗
            </a>
          </div>
        )}
      </div>
    );
  }

  // 6. Figma
  if (info.type === 'figma' && info.embedUrl) {
    return (
      <div className={`ref-embed-container ${className}`}>
        <div className="ref-embed-header">
          <span className="ref-embed-pill">FIGMA DESIGN</span>
          <a
            href={info.rawUrl}
            target="_blank"
            rel="noreferrer"
            className="ref-embed-link"
          >
            OPEN IN FIGMA ↗
          </a>
        </div>
        <div className="ref-embed-aspect">
          <iframe
            src={info.embedUrl}
            title={label}
            allowFullScreen
            className="ref-embed-iframe"
          />
        </div>
      </div>
    );
  }

  // 7. Instagram
  if (info.type === 'instagram' && info.embedUrl) {
    return (
      <div className={`ref-embed-container ${className}`}>
        <div className="ref-embed-header">
          <span className="ref-embed-pill">INSTAGRAM</span>
          <a
            href={info.rawUrl}
            target="_blank"
            rel="noreferrer"
            className="ref-embed-link"
          >
            OPEN IN INSTAGRAM ↗
          </a>
        </div>
        <div className="ref-embed-instagram-wrap">
          <iframe
            src={info.embedUrl}
            title={label}
            className="ref-embed-instagram-iframe"
            scrolling="no"
          />
        </div>
      </div>
    );
  }

  // 8. Direct Image
  if (info.type === 'image' && !imageError) {
    return (
      <div className={`ref-embed-container ${className}`}>
        <div className="ref-embed-header">
          <span className="ref-embed-pill">IMAGE PREVIEW</span>
          <a
            href={info.rawUrl}
            target="_blank"
            rel="noreferrer"
            className="ref-embed-link"
          >
            VIEW FULL RESOLUTION ↗
          </a>
        </div>
        <div className="ref-image-wrap">
          <img
            src={info.embedUrl || info.rawUrl}
            alt={label}
            className="ref-embed-img"
            onError={() => setImageError(true)}
          />
        </div>
      </div>
    );
  }

  // 9. Direct Video
  if (info.type === 'video' && info.embedUrl) {
    return (
      <div className={`ref-embed-container ${className}`}>
        <div className="ref-embed-header">
          <span className="ref-embed-pill">DIRECT VIDEO</span>
          <a
            href={info.rawUrl}
            target="_blank"
            rel="noreferrer"
            className="ref-embed-link"
          >
            DOWNLOAD / OPEN ↗
          </a>
        </div>
        <div className="ref-embed-video-wrap">
          <video
            src={info.embedUrl}
            controls
            playsInline
            className="ref-embed-video"
          />
        </div>
      </div>
    );
  }

  // 10. Direct Audio
  if (info.type === 'audio' && info.embedUrl) {
    return (
      <div className={`ref-embed-container ${className}`}>
        <div className="ref-embed-header">
          <span className="ref-embed-pill">AUDIO TRACK</span>
          <a
            href={info.rawUrl}
            target="_blank"
            rel="noreferrer"
            className="ref-embed-link"
          >
            OPEN AUDIO ↗
          </a>
        </div>
        <div className="ref-embed-audio-wrap">
          <audio src={info.embedUrl} controls className="ref-embed-audio" />
        </div>
      </div>
    );
  }

  // 11. Spotify
  if (info.type === 'spotify' && info.embedUrl) {
    return (
      <div className={`ref-embed-container ${className}`}>
        <div className="ref-embed-header">
          <span className="ref-embed-pill">SPOTIFY EMBED</span>
          <a
            href={info.rawUrl}
            target="_blank"
            rel="noreferrer"
            className="ref-embed-link"
          >
            OPEN IN SPOTIFY ↗
          </a>
        </div>
        <iframe
          src={info.embedUrl}
          title={label}
          width="100%"
          height="152"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="ref-spotify-iframe"
        />
      </div>
    );
  }

  // 12. Generic Website / External Resource
  return (
    <div className={`ref-embed-container ${className}`}>
      <div className="ref-embed-header">
        <span className="ref-embed-pill">WEB REFERENCE</span>
        <div className="ref-embed-header-actions">
          {interactive && (
            <button
              type="button"
              className="ref-btn-toggle"
              onClick={() => setTryIframe(!tryIframe)}
            >
              {tryIframe ? 'HIDE WEB PREVIEW' : 'TRY IN-LINE PREVIEW'}
            </button>
          )}
          <a
            href={info.rawUrl}
            target="_blank"
            rel="noreferrer"
            className="ref-embed-link"
          >
            VISIT SITE ↗
          </a>
        </div>
      </div>

      {tryIframe ? (
        <div className="ref-embed-aspect">
          <iframe
            src={info.rawUrl}
            title={label}
            className="ref-embed-iframe"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      ) : (
        <div className="ref-web-card">
          <div className="ref-web-info">
            {info.domain && (
              <img
                src={`https://www.google.com/s2/favicons?domain=${info.domain}&sz=64`}
                alt={info.domain}
                className="ref-web-favicon"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            )}
            <div className="ref-web-meta">
              <h4>{info.domain ? info.domain.toUpperCase() : 'EXTERNAL RESOURCE'}</h4>
              <p className="ref-web-url">{info.rawUrl}</p>
              <small className="muted">Direct external reference link for editors and creators.</small>
            </div>
          </div>
          <a
            href={info.rawUrl}
            target="_blank"
            rel="noreferrer"
            className="ref-web-action-btn"
          >
            OPEN IN NEW TAB ↗
          </a>
        </div>
      )}
    </div>
  );
}
