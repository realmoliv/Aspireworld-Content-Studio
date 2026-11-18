import { useState, useMemo, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useContentStudio } from '@/hooks/useContentStudio';
import { useTheme } from '@/hooks/useTheme';
import { AuthView } from '@/components/AuthView';
import { AppLayout } from '@/components/layout/AppLayout';
import { CalendarView } from '@/views/CalendarView';
import { BoardView } from '@/views/BoardView';
import { ReferenceView } from '@/views/ReferenceView';
import { TemplatesView } from '@/views/TemplatesView';
import { PlannerView } from '@/views/PlannerView';
import { LeadsView } from '@/views/LeadsView';
import { DetailDrawer } from '@/views/DetailDrawer';
import { makeItem, pillars } from '@/constants';
import type { Item, Lead, Pillar, ContentType, FilterState, ReferenceItem } from '@/types';

function ContentStudioApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeMatch = location.pathname.match(/^\/items\/([^/]+)/);
  const routeItemId = routeMatch ? decodeURIComponent(routeMatch[1]) : null;

  const { user, profile, signOut, isSupabaseConfigured, canWrite, isAdmin, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [demoMode, setDemoMode] = useState(!isSupabaseConfigured);
  const studio = useContentStudio(user?.id);

  const [localItems, setLocalItems] = useState<Item[]>(() => {
    try {
      const stored = sessionStorage.getItem('aspire-items');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((i: any) => !i.id?.match(/^i(1[0-6]|[1-9])$/) && i.title !== 'Aspire World intro reel' && i.title !== 'Untitled item');
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [localLeads, setLocalLeads] = useState<Lead[]>(() => {
    try {
      const stored = localStorage.getItem('aspire-leads');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((l: any) => !['l1', 'l2', 'l3', 'l4'].includes(l.id) && l.name !== 'Aarav Mehta' && l.name !== 'Studio North' && l.name !== 'Maya Rao' && l.name !== 'Rhyme House');
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('aspire-leads', JSON.stringify(localLeads));
    } catch {
      // Ignored
    }
  }, [localLeads]);

  const [selectedId, setSelectedId] = useState<string | null>(routeItemId);
  const [month, setMonth] = useState('2026-11');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    type: 'All',
    pillar: 'All',
    status: 'All',
    assignee: 'All',
  });
  const [toast, setToast] = useState('');
  const [plannerStep, setPlannerStep] = useState(1);
  const [plannerMonth, setPlannerMonth] = useState('2026-12');
  const [plannerCounts, setPlannerCounts] = useState<Record<Pillar, number>>({
    Proof: 2,
    'Behind the Scenes': 2,
    Value: 3,
    People: 1,
    Offer: 2,
    Festive: 2,
  });
  const [search, setSearch] = useState('');

  const isConnected = isSupabaseConfigured && Boolean(user) && !studio.dbTablesMissing;
  const items = isConnected && studio.isLoaded ? studio.items : localItems;
  const leads = isConnected && studio.isLoaded && !studio.dbTablesMissing ? studio.leads : localLeads;

  // Sync selectedId with route parameter if present
  useEffect(() => {
    if (routeItemId) {
      setSelectedId(routeItemId);
    }
  }, [routeItemId]);

  useEffect(() => {
    if (!isConnected) {
      sessionStorage.setItem('aspire-items', JSON.stringify(items));
    }
  }, [items, isConnected]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const monthItems = useMemo(
    () =>
      items.filter(
        (i) =>
          i.date.startsWith(month) &&
          (filters.type === 'All' || i.type === filters.type) &&
          (filters.pillar === 'All' || i.pillar === filters.pillar) &&
          (filters.status === 'All' || i.status === filters.status) &&
          (filters.assignee === 'All' || i.assignee === filters.assignee)
      ),
    [items, month, filters]
  );

  const ready = monthItems.filter((i) =>
    ['Approved', 'Scheduled', 'Posted'].includes(i.status)
  ).length;

  const updateItem = (id: string, patch: Partial<Item>) => {
    setLocalItems((v) => v.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    if (isConnected) {
      studio.updateItem(id, patch);
    }
  };

  const updateCopy = (id: string, key: keyof Item['copy'], value: string) => {
    setLocalItems((v) => v.map((i) => (i.id === id ? { ...i, copy: { ...i.copy, [key]: value } } : i)));
    if (isConnected) {
      studio.updateCopy(id, key, value);
    }
  };

  const deleteItem = async (id: string) => {
    setLocalItems((v) => v.filter((i) => i.id !== id));
    handleCloseDrawer();
    if (isConnected) {
      try {
        await studio.deleteItem(id);
        setToast('Item deleted.');
      } catch {
        setToast('Failed to delete item.');
      }
    } else {
      setToast('Item deleted.');
    }
  };

  const openNew = async (preset?: Partial<Item>) => {
    if (isConnected) {
      const created = await studio.createItem(preset);
      if (created) {
        setSelectedId(created.id);
        navigate(`/items/${created.id}`);
      }
    } else {
      const base = makeItem(
        `i${Date.now()}`,
        `${month}-01`,
        (preset?.type as ContentType) || 'Reel',
        (preset?.pillar as Pillar) || 'Proof',
        preset?.title || 'Untitled item'
      );
      const next = { ...base, ...preset, id: base.id };
      setLocalItems((v) => [...v, next]);
      setSelectedId(next.id);
      navigate(`/items/${next.id}`);
    }
  };

  const duplicate = (item: Item, nextMonth = false) => {
    const nextDate = nextMonth
      ? `${String(Number(item.date.slice(0, 4)) + (item.date.slice(5, 7) === '12' ? 1 : 0))}-${String(item.date.slice(5, 7) === '12' ? 1 : Number(item.date.slice(5, 7)) + 1).padStart(2, '0')}-${item.date.slice(8)}`
      : item.date;
    const copy = {
      ...item,
      id: `i${Date.now()}`,
      title: `${item.title} — copy`,
      date: nextDate,
      assets: [],
      comments: [],
    };
    if (isConnected) {
      studio.createItem(copy);
    } else {
      setLocalItems((v) => [...v, copy]);
    }
    setToast(nextMonth ? 'Duplicated to next month.' : 'Item duplicated.');
  };

  const generatePlan = () => {
    const [y, m] = plannerMonth.split('-').map(Number);
    const valid = Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => i + 1).filter((d) =>
      [1, 3, 5, 6].includes(new Date(y, m - 1, d).getDay())
    );
    let n = 0;
    const created: Item[] = [];
    pillars.forEach((p) => {
      for (let i = 0; i < plannerCounts[p]; i++) {
        const day = valid[n % valid.length];
        created.push(
          makeItem(
            `i${Date.now()}-${n}`,
            `${plannerMonth}-${String(day).padStart(2, '0')}`,
            'Reel',
            p,
            `${p} content placeholder`
          )
        );
        n++;
      }
    });

    if (isConnected) {
      created.forEach((item) => studio.createItem(item));
    } else {
      setLocalItems((v) => [...v, ...created]);
    }

    setMonth(plannerMonth);
    navigate('/calendar');
    setToast('Month plan generated.');
  };

  const handleOpenItem = (id: string) => {
    setSelectedId(id);
    navigate(`/items/${id}`);
  };

  const handleCloseDrawer = () => {
    setSelectedId(null);
    if (location.pathname.startsWith('/items/')) {
      navigate('/calendar');
    }
  };

  const activeId = routeItemId || selectedId;
  const selected = items.find((i) => i.id === activeId) || null;

  // Auto-align calendar month when an item is deep-linked
  useEffect(() => {
    if (selected && selected.date) {
      const itemMonth = selected.date.slice(0, 7);
      if (itemMonth && itemMonth !== month) {
        setMonth(itemMonth);
      }
    }
  }, [selected, month]);

  if (isSupabaseConfigured && authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--black)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--white)',
          fontFamily: '"Barlow", sans-serif',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '2px solid var(--red)',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '1rem',
          }}
        />
        <p
          style={{
            fontSize: '0.75rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--grey)',
            fontWeight: 600,
          }}
        >
          Loading Content Studio...
        </p>
      </div>
    );
  }

  if (isSupabaseConfigured && !user && !demoMode) {
    return <AuthView onBypassDemo={() => setDemoMode(true)} />;
  }

  const displayName = profile?.full_name || (user?.email ? user.email.split('@')[0] : 'Team Member');
  const displayInitials = profile?.avatar_initials || (displayName ? displayName.slice(0, 2).toUpperCase() : 'AW');
  const displayRole = profile?.role ? `${profile.role.toUpperCase()} / STRATEGIST` : (user ? 'AUTHENTICATED' : 'DEMO');

  return (
    <AppLayout
      profileName={displayName}
      avatarInitials={displayInitials}
      roleTitle={displayRole}
      onSignOut={user ? signOut : undefined}
      onNewItem={() => openNew()}
      toast={toast}
      theme={theme}
      onToggleTheme={toggleTheme}
    >
      {isConnected && !studio.isLoaded ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            color: 'var(--grey)',
            fontFamily: '"Barlow", sans-serif',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '2px solid var(--red)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginBottom: '0.75rem',
            }}
          />
          <p
            style={{
              fontSize: '0.7rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Syncing studio data...
          </p>
        </div>
      ) : (
        <Routes>
        <Route path="/" element={<Navigate to="/calendar" replace />} />
        <Route
          path="/calendar"
          element={
            <CalendarView
              items={monthItems}
              month={month}
              setMonth={setMonth}
              filters={filters}
              setFilters={setFilters}
              filtersOpen={filtersOpen}
              setFiltersOpen={setFiltersOpen}
              ready={ready}
              onOpen={handleOpenItem}
              onMove={(id, date) => updateItem(id, { date })}
              onNew={() => openNew()}
            />
          }
        />
        <Route
          path="/items/:id"
          element={
            <CalendarView
              items={monthItems}
              month={month}
              setMonth={setMonth}
              filters={filters}
              setFilters={setFilters}
              filtersOpen={filtersOpen}
              setFiltersOpen={setFiltersOpen}
              ready={ready}
              onOpen={handleOpenItem}
              onMove={(id, date) => updateItem(id, { date })}
              onNew={() => openNew()}
            />
          }
        />
        <Route
          path="/board"
          element={
            <BoardView
              items={items.filter((i) => i.date.startsWith(month))}
              onOpen={handleOpenItem}
              onStatus={(id, status) => updateItem(id, { status })}
            />
          }
        />
        <Route
          path="/references"
          element={
            <ReferenceView
              search={search}
              setSearch={setSearch}
              onUse={(ref: ReferenceItem) => {
                const target = items[0];
                if (target) {
                  updateItem(target.id, { references: [...target.references, ref] });
                  handleOpenItem(target.id);
                  setToast('Reference added to item.');
                }
              }}
            />
          }
        />
        <Route
          path="/templates"
          element={<TemplatesView onUse={(template: Partial<Item>) => openNew(template)} />}
        />
        <Route
          path="/planner"
          element={
            <PlannerView
              step={plannerStep}
              setStep={setPlannerStep}
              month={plannerMonth}
              setMonth={setPlannerMonth}
              counts={plannerCounts}
              setCounts={setPlannerCounts}
              onGenerate={generatePlan}
            />
          }
        />
        <Route
          path="/leads"
          element={
            <LeadsView
              leads={leads}
              setLeads={setLocalLeads}
              onAddLead={async () => {
                const newFallbackLead = {
                  id: `l${Date.now()}`,
                  date: new Date().toISOString().slice(0, 10),
                  source: 'Organic',
                  name: 'New lead',
                  contact: '',
                  service: '',
                  budget: '',
                  status: 'New',
                  followUp: '',
                };

                if (isConnected) {
                  try {
                    await studio.addLead();
                    setToast('Lead added.');
                  } catch (err: any) {
                    setLocalLeads((prev) => [...prev, newFallbackLead]);
                    setToast('Saved locally. Run database migration in Supabase to sync.');
                  }
                } else {
                  setLocalLeads((prev) => [...prev, newFallbackLead]);
                  setToast('Lead added.');
                }
              }}
              onUpdateLead={(leadId, patch) => {
                setLocalLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...patch } : l)));
                if (isConnected) {
                  studio.updateLead(leadId, patch);
                }
              }}
            />
          }
        />
        <Route path="*" element={<Navigate to="/calendar" replace />} />
      </Routes>
      )}

      {selected && (
        <DetailDrawer
          item={selected}
          onClose={handleCloseDrawer}
          onUpdate={(patch) => updateItem(selected.id, patch)}
          onCopy={(key, value) => updateCopy(selected.id, key, value)}
          onDuplicate={() => duplicate(selected)}
          onDuplicateNext={() => duplicate(selected, true)}
          onDelete={() => deleteItem(selected.id)}
          setToast={setToast}
          currentUserName={displayName}
          canWrite={canWrite}
          isAdmin={isAdmin}
          onUploadAsset={async (file, version) => {
            if (isConnected) {
              const res = await studio.uploadAsset(selected.id, file, version);
              setToast(`Uploaded ${res.name} (${version.toUpperCase()})`);
              return res;
            } else {
              const mockAsset = {
                id: `a${Date.now()}`,
                name: file.name,
                version,
                storage_path: null,
                file_size: file.size,
                mime_type: file.type,
                uploaded_at: new Date().toISOString(),
              };
              updateItem(selected.id, {
                assets: [...selected.assets, mockAsset],
              });
              setToast(`Attached ${file.name} (${version.toUpperCase()})`);
              return mockAsset;
            }
          }}
          onDeleteAsset={async (assetId, storagePath) => {
            if (isConnected) {
              await studio.removeAsset(selected.id, assetId, storagePath);
              setToast('Asset deleted.');
            } else {
              updateItem(selected.id, {
                assets: selected.assets.filter((a) => a.id !== assetId),
              });
              setToast('Asset removed.');
            }
          }}
          onAddComment={(text) => {
            const author = profile?.full_name || (user?.email ? user.email.split('@')[0] : 'Aryan Kapoor');
            if (isConnected) {
              studio.addComment(selected.id, text, author);
            } else {
              updateItem(selected.id, {
                comments: [...selected.comments, { author, text, time: 'Now' }],
              });
            }
          }}
        />
      )}
    </AppLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ContentStudioApp />
    </BrowserRouter>
  );
}
