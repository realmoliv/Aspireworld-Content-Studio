import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui';

interface AppLayoutProps {
  children: React.ReactNode;
  profileName?: string;
  avatarInitials?: string;
  roleTitle?: string;
  onSignOut?: () => void;
  onNewItem?: () => void;
  toast?: string;
}

export function AppLayout({
  children,
  profileName = 'Aryan Kapoor',
  avatarInitials = 'AK',
  roleTitle = 'ADMIN / STRATEGIST',
  onSignOut,
  onNewItem,
  toast,
}: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const nav = [
    ['/calendar', 'Month overview'],
    ['/board', 'Week board'],
    ['/references', 'Reference library'],
    ['/templates', 'Templates'],
    ['/planner', 'Monthly planner'],
    ['/leads', 'Lead tracker'],
  ] as const;

  const currentPath = location.pathname === '/' ? '/calendar' : location.pathname;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand" onClick={() => navigate('/calendar')} style={{ cursor: 'pointer' }}>
          <img src="/aspire-globe.svg" alt="Aspire World" />
          <div>
            <strong>ASPIRE WORLD</strong>
            <span>CONTENT STUDIO</span>
          </div>
        </div>

        <nav aria-label="Primary navigation">
          {nav.map(([path, label], index) => {
            const isActive = currentPath.startsWith(path);
            return (
              <button
                key={path}
                className={isActive ? 'active' : ''}
                onClick={() => navigate(path)}
              >
                <span>0{index + 1}</span>
                {label}
              </button>
            );
          })}
        </nav>

        <div className="tagline">
          <span>CREATE.</span>
          <span>CONNECT.</span>
          <span>ASPIRE.</span>
        </div>

        <div
          className="profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingRight: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className="avatar">{avatarInitials}</span>
            <div>
              <strong>{profileName}</strong>
              <small>{roleTitle}</small>
            </div>
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="btn btn-secondary"
              style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem', height: 'auto' }}
              title="Sign out"
            >
              EXIT
            </button>
          )}
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div className="mobile-brand">
            <img src="/aspire-globe.svg" alt="" />
            <span>CONTENT STUDIO</span>
          </div>
          <div className="top-context">
            <span>WORKSPACE</span>
            <strong>Aspire World / Social</strong>
          </div>
          <div className="top-actions">
            <button className="search-button" aria-label="Search">
              SEARCH
            </button>
            {onNewItem && (
              <Button variant="primary" onClick={onNewItem}>
                + NEW ITEM
              </Button>
            )}
          </div>
        </header>

        <div className="workspace">{children}</div>
      </main>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
