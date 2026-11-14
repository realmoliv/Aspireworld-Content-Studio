import { useState, useMemo, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useContentStudio } from '@/hooks/useContentStudio';
import { AuthView } from '@/components/AuthView';
import { AppLayout } from '@/components/layout/AppLayout';
import { CalendarView } from '@/views/CalendarView';
import { BoardView } from '@/views/BoardView';
import { ReferenceView } from '@/views/ReferenceView';
import { TemplatesView } from '@/views/TemplatesView';
import { PlannerView } from '@/views/PlannerView';
import { LeadsView } from '@/views/LeadsView';
import { DetailDrawer } from '@/views/DetailDrawer';
import { initialItems, initialLeads, makeItem, pillars } from '@/constants';
import type { Item, Lead, Pillar, ContentType, FilterState, ReferenceItem } from '@/types';

function ContentStudioApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeMatch = location.pathname.match(/^\/items\/([^/]+)/);
  const routeItemId = routeMatch ? decodeURIComponent(routeMatch[1]) : null;

  const { user, profile, signOut, isSupabaseConfigured, canWrite, isAdmin } = useAuth();
  const [demoMode, setDemoMode] = useState(!isSupabaseConfigured);
  const studio = useContentStudio(user?.id);

  const [localItems, setLocalItems] = useState<Item[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('aspire-items') || 'null') || initialItems;
    } catch {
      return initialItems;
    }
  });
  const [localLeads, setLocalLeads] = useState<Lead[]>(initialLeads);
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

  const isConnected = isSupabaseConfigured && Boolean(user);
  const items = isConnected && studio.items.length > 0 ? studio.items : localItems;
  const leads = isConnected && studio.leads.length > 0 ? studio.leads : localLeads;

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

  return (
    <AppLayout
      profileName={profile?.full_name || (user?.email ? user.email.split('@')[0] : 'Aryan Kapoor')}
      avatarInitials={profile?.avatar_initials || (user?.email ? user.email.slice(0, 2).toUpperCase() : 'AK')}
      roleTitle={profile?.role ? `${profile.role.toUpperCase()} / STRATEGIST` : (isConnected ? 'AUTHENTICATED' : 'DEMO / LOCAL')}
      onSignOut={user ? signOut : undefined}
      onNewItem={() => openNew()}
      toast={toast}
    >
      {isSupabaseConfigured && !user && !demoMode && (
        <AuthView onBypassDemo={() => setDemoMode(true)} />
      )}

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
              onAddLead={() => {
                if (isConnected) {
                  studio.addLead();
                } else {
                  setLocalLeads((prev) => [
                    ...prev,
                    {
                      id: `l${Date.now()}`,
                      date: '2026-11-20',
                      source: 'Organic',
                      name: 'New lead',
                      contact: '',
                      service: '',
                      budget: '',
                      status: 'New',
                      followUp: '',
                    },
                  ]);
                }
              }}
              onUpdateLead={(leadId, patch) => {
                if (isConnected) {
                  studio.updateLead(leadId, patch);
                }
              }}
            />
          }
        />
        <Route path="*" element={<Navigate to="/calendar" replace />} />
      </Routes>

      {selected && (
        <DetailDrawer
          item={selected}
          onClose={handleCloseDrawer}
          onUpdate={(patch) => updateItem(selected.id, patch)}
          onCopy={(key, value) => updateCopy(selected.id, key, value)}
          onDuplicate={() => duplicate(selected)}
          onDuplicateNext={() => duplicate(selected, true)}
          setToast={setToast}
          currentUserName={profile?.full_name || (user?.email ? user.email.split('@')[0] : 'Aryan Kapoor')}
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
