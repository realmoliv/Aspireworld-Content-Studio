import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { Theme } from '@/hooks/useTheme';

interface AppLayoutProps {
  children: React.ReactNode;
  profileName?: string;
  avatarInitials?: string;
  roleTitle?: string;
  onSignOut?: () => void;
  onNewItem?: () => void;
  toast?: string;
  theme?: Theme;
  onToggleTheme?: () => void;
}

export function AppLayout({
  children,
  profileName = '',
  avatarInitials = '',
  roleTitle = '',
  onSignOut,
  onNewItem,
  toast,
  theme,
  onToggleTheme,
}: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const nav = [
    ['/calendar', 'Month overview'],
    ['/board', 'Week board'],
    ['/references', 'Reference library'],
    ['/templates', 'Templates'],
    ['/planner', 'Monthly planner'],
    ['/leads', 'Lead tracker'],
  ] as const;

  const currentPath = location.pathname === '/' ? '/calendar' : location.pathname;

  const handleMobileNav = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
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

      {/* Mobile Drawer Navigation (320px–767px) */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-head">
              <div className="brand" onClick={() => handleMobileNav('/calendar')}>
                <img src="/aspire-globe.svg" alt="Aspire World" />
                <div>
                  <strong>ASPIRE WORLD</strong>
                  <span>CONTENT STUDIO</span>
                </div>
              </div>
              <button
                type="button"
                className="mobile-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
              >
                ✕
              </button>
            </div>

            <nav className="mobile-drawer-nav" aria-label="Mobile navigation">
              {nav.map(([path, label], index) => {
                const isActive = currentPath.startsWith(path);
                return (
                  <button
                    key={path}
                    className={`mobile-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleMobileNav(path)}
                  >
                    <span className="mobile-nav-num">0{index + 1}</span>
                    <span className="mobile-nav-label">{label}</span>
                    {isActive && <span className="mobile-nav-indicator" />}
                  </button>
                );
              })}
            </nav>

            <div className="mobile-drawer-foot">
              <div className="mobile-profile-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  >
                    EXIT
                  </button>
                )}
              </div>
              {onToggleTheme && theme && (
                <div style={{ marginTop: '0.75rem' }}>
                  <ThemeToggle theme={theme} onToggle={onToggleTheme} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <main>
        <header className="topbar">
          <div className="topbar-left-mobile">
            <button
              type="button"
              className="mobile-hamburger-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Toggle navigation drawer"
            >
              ☰
            </button>
            <div className="mobile-brand" onClick={() => navigate('/calendar')}>
              <img src="/aspire-globe.svg" alt="" />
              <span>CONTENT STUDIO</span>
            </div>
          </div>
          <div className="top-context">
            <span>WORKSPACE</span>
            <strong>Aspire World / Social</strong>
          </div>
          <div className="top-actions">
            {onToggleTheme && theme && (
              <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            )}
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
