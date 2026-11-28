import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { uploadAssetFile, deleteAssetFile, getSignedAssetUrl, formatFileSize } from '@/lib/storage';
import { getChecklistForType, defaultTeamMembers } from '@/constants';
import type { Database } from '@/lib/database.types';
import type { TeamMember, Lead, LeadActivity } from '@/types';

export type ItemPatch = Partial<Omit<Item, 'copy'>> & {
  copy?: Partial<Item['copy']>;
};

export type Screen = 'calendar' | 'board' | 'references' | 'templates' | 'planner' | 'leads';
export type Status =
  | 'Idea'
  | 'Briefed'
  | 'In Design/Edit'
  | 'In Review'
  | 'Approved'
  | 'Scheduled'
  | 'Posted';
export type Pillar = 'Proof' | 'Behind the Scenes' | 'Value' | 'People' | 'Offer' | 'Festive';
export type ContentType =
  | 'Reel'
  | 'Post'
  | 'Carousel'
  | 'Story'
  | 'Story series'
  | 'Festival Creative';

export type Item = {
  id: string;
  title: string;
  type: ContentType;
  pillar: Pillar;
  goal: string;
  date: string;
  time: string;
  status: Status;
  assignee: string;
  assigneeId?: string | null;
  priority: string;
  brief: string;
  copy: {
    onScreen: string;
    caption: string;
    hashtags: string;
    cta: string;
    script: string;
  };
  references: {
    id?: string;
    url: string;
    label: string;
    instruction: string;
    type: string;
  }[];
  shots: {
    id?: string;
    order: string;
    visual: string;
    text: string;
  }[];
  specs: string[];
  assets: {
    id?: string;
    name: string;
    version: string;
    storage_path?: string | null;
    file_size?: number | null;
    mime_type?: string | null;
    uploaded_at?: string;
  }[];
  checklist: {
    id?: string;
    label: string;
    done: boolean;
  }[];
  comments: {
    id?: string;
    author: string;
    text: string;
    time: string;
  }[];
  verifyDate?: boolean;
};

export const specMap: Record<string, string[]> = {
  Reel: [
    '1080 × 1920',
    '9:16',
    '15–30 seconds',
    'Text clear of top 14% and bottom 20%',
    'Burned-in captions',
    'Hook in first 2 seconds',
    'Keep key content centered',
  ],
  Post: ['1080 × 1350', '4:5', 'Keep key content centered'],
  Carousel: [
    'Up to 10 slides',
    '1080 × 1350',
    'First slide is the hook',
    'Last slide is the CTA',
    'Keep key content centered',
  ],
  Story: ['1080 × 1920', '9:16', 'Keep top and bottom 250 px clear'],
  'Story series': ['1080 × 1920', '9:16', 'Keep top and bottom 250 px clear'],
  'Festival Creative': [
    '1080 × 1920 and 1080 × 1350',
    'WhatsApp-share version',
    'Keep key content centered',
  ],
};

export const defaultChecklist = [
  'Hook in first 2 seconds',
  'Captions burned in',
  'Text inside safe zone',
  'Logo or end card present',
  'CTA present',
  'Music licensed or original',
  'No suggestive content',
  'Caption proofread',
];

const LEAD_META_STORAGE_KEY = 'aspire-leads-metadata';

export function getLeadMetaCache(): Record<string, Partial<Lead>> {
  try {
    const raw = localStorage.getItem(LEAD_META_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLeadMetaCache(leadId: string, meta: Partial<Lead>) {
  try {
    const current = getLeadMetaCache();
    current[leadId] = {
      ...(current[leadId] || {}),
      ...meta,
    };
    localStorage.setItem(LEAD_META_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Ignored
  }
}

export function useContentStudio(userId?: string) {
  const [items, setItems] = useState<Item[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(defaultTeamMembers);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbTablesMissing, setDbTablesMissing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const teamMembersRef = useRef<TeamMember[]>(defaultTeamMembers);
  // Coalescing queues & echo-guard timestamps per entity ID
  const itemWriteQueueRef = useRef<
    Map<
      string,
      {
        inFlight: boolean;
        queuedPatch: ItemPatch | null;
        waiters: Array<{ resolve: () => void; reject: (err: unknown) => void }>;
      }
    >
  >(new Map());
  const leadWriteQueueRef = useRef<
    Map<
      string,
      {
        inFlight: boolean;
        queuedPatch: Partial<Lead> | null;
        waiters: Array<{ resolve: () => void; reject: (err: unknown) => void }>;
      }
    >
  >(new Map());
  const recentLocalItemSaveAtRef = useRef<Map<string, number>>(new Map());
  const recentLocalLeadSaveAtRef = useRef<Map<string, number>>(new Map());

  // Fetch all registered team members from Supabase profiles
  const fetchTeamMembers = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_initials')
        .order('full_name', { ascending: true });

      if (profErr) {
        if (profErr.code === 'PGRST205' || profErr.message?.includes('schema cache')) {
          setDbTablesMissing(true);
        }
        console.error('Error fetching team members from Supabase:', profErr);
        return;
      }

      const dbMembers = (data || []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        role: p.role || 'editor',
        avatar_initials: p.avatar_initials || '',
      }));

      // Combine with default team members so core members (Akshay, Avani, Sanchit) are always present
      const combined = [...dbMembers];
      for (const def of defaultTeamMembers) {
        if (!combined.some((m) => m.full_name.toLowerCase().includes(def.full_name.toLowerCase().split(' ')[0]))) {
          combined.push(def);
        }
      }

      teamMembersRef.current = combined;
      setTeamMembers(combined);
    } catch (e) {
      console.error('Failed to fetch team members:', e);
    }
  }, []);

  // Fetch all items with relations from Supabase
  const fetchItems = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return;
    }
    try {
      const { data: rawItems, error: itemsErr } = await supabase
        .from('items')
        .select(`
          *,
          assignee:profiles!items_assignee_id_fkey(full_name),
          item_references(*),
          item_shots(*),
          item_assets(*),
          item_checklist(*),
          item_comments(
            id,
            body,
            created_at,
            author:profiles(full_name)
          )
        `)
        .order('post_date', { ascending: true });

      if (itemsErr) {
        if (itemsErr.code === 'PGRST205' || itemsErr.message?.includes('schema cache')) {
          setDbTablesMissing(true);
        }
        throw itemsErr;
      }

      const mapped: Item[] = (rawItems || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        type: row.content_type as ContentType,
        pillar: row.pillar as Pillar,
        goal: row.goal,
        date: row.post_date,
        time: (row.post_time || '18:30').slice(0, 5),
        status: row.status as Status,
        assignee: row.assignee?.full_name || '',
        assigneeId: row.assignee_id,
        priority: row.priority,
        brief: row.brief || '',
        copy: {
          onScreen: row.copy_on_screen || '',
          caption: row.copy_caption || '',
          hashtags: row.copy_hashtags || '',
          cta: row.copy_cta || '',
          script: row.copy_script || '',
        },
        references: (row.item_references || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((r: any) => ({
            id: r.id,
            url: r.url || '',
            label: r.label,
            instruction: r.instruction || '',
            type: r.ref_type,
          })),
        shots: (row.item_shots || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((s: any) => ({
            id: s.id,
            order: s.shot_order,
            visual: s.visual || '',
            text: s.text_on_screen || '',
          })),
        specs: specMap[row.content_type] || [],
        assets: (row.item_assets || []).map((a: any) => ({
          id: a.id,
          name: a.file_name,
          version: a.version_label,
          storage_path: a.storage_path,
          file_size: a.file_size,
          mime_type: a.mime_type,
          uploaded_at: a.uploaded_at,
        })),
        checklist: (row.item_checklist || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((c: any) => ({
            id: c.id,
            label: c.label,
            done: c.done,
          })),
        comments: (row.item_comments || [])
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((c: any) => ({
            id: c.id,
            author: c.author?.full_name || 'Team member',
            text: c.body,
            time: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          })),
        verifyDate: row.verify_date,
      }));

      setItems((prev) => {
        const prevMap = new Map(prev.map((i) => [i.id, i]));
        const now = Date.now();
        return mapped.map((remote) => {
          const queueState = itemWriteQueueRef.current.get(remote.id);
          const recentAt = recentLocalItemSaveAtRef.current.get(remote.id) || 0;
          // Ignore server/Realtime echo while a write is queued/in-flight or just saved locally
          if (queueState?.inFlight || queueState?.queuedPatch || now - recentAt < 2500) {
            return prevMap.get(remote.id) || remote;
          }
          return remote;
        });
      });
    } catch (e: any) {
      console.error('Failed to fetch items:', e);
      setError(e.message);
    }
  }, []);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error: err } = await supabase
        .from('leads')
        .select('*')
        .order('lead_date', { ascending: false });

      if (err) {
        if (err.code === 'PGRST205' || err.message?.includes('schema cache')) {
          setDbTablesMissing(true);
        }
        throw err;
      }

      const metaCache = getLeadMetaCache();
      const currentMembers = teamMembersRef.current;

      const remoteLeads: Lead[] = (data || []).map((l: any) => {
        const cached = metaCache[l.id] || {};
        const matchedProfile = l.owner_id ? currentMembers.find((m) => m.id === l.owner_id) : null;
        const resolvedOwner =
          l.owner_name ||
          cached.owner ||
          matchedProfile?.full_name ||
          '';

        // Authoritative status: if cached metadata has an explicit transition (e.g. On hold), prefer cached
        const resolvedStatus = cached.status || l.status || 'New';

        return {
          id: l.id,
          date: l.lead_date,
          source: l.source,
          name: l.name,
          contact: l.contact || '',
          service: l.service || '',
          budget: l.budget || '',
          status: resolvedStatus,
          followUp: l.follow_up || cached.followUp || '',
          owner: resolvedOwner,
          ownerId: l.owner_id || cached.ownerId || matchedProfile?.id || null,
          holdReason: l.hold_reason || cached.holdReason || '',
          holdNotes: l.hold_notes || cached.holdNotes || '',
          previousStatus: l.previous_status || cached.previousStatus || '',
          resumeDate: l.resume_date || cached.resumeDate || '',
          activityLog: Array.isArray(l.activity_log) && l.activity_log.length > 0
            ? l.activity_log
            : (cached.activityLog || []),
        };
      });

      setLeads((prev) => {
        const prevMap = new Map(prev.map((l) => [l.id, l]));
        const now = Date.now();
        return remoteLeads.map((remote) => {
          const queueState = leadWriteQueueRef.current.get(remote.id);
          const recentAt = recentLocalLeadSaveAtRef.current.get(remote.id) || 0;
          if (queueState?.inFlight || queueState?.queuedPatch || now - recentAt < 2500) {
            return prevMap.get(remote.id) || remote;
          }
          return remote;
        });
      });
    } catch (e: any) {
      console.error('Failed to fetch leads:', e);
    }
  }, []);

  // Initial load (runs once per auth userId, never loops)
  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      setLoading(true);
      if (isSupabaseConfigured) {
        try {
          await fetchTeamMembers();
          if (!cancelled) {
            await Promise.all([fetchItems(), fetchLeads()]);
          }
        } catch {
          // Handled inside individual fetchers
        }
      }
      if (!cancelled) {
        setIsLoaded(true);
        setLoading(false);
      }
    }
    loadAll();
    return () => {
      cancelled = true;
    };
  }, [userId, fetchItems, fetchLeads, fetchTeamMembers]);

  const persistItemPatchToSupabase = useCallback(async (id: string, patch: ItemPatch) => {
    const dbPatch: any = {};
    if (patch.title !== undefined) dbPatch.title = patch.title;
    if (patch.type !== undefined) dbPatch.content_type = patch.type;
    if (patch.pillar !== undefined) dbPatch.pillar = patch.pillar;
    if (patch.goal !== undefined) dbPatch.goal = patch.goal;
    if (patch.date !== undefined) dbPatch.post_date = patch.date;
    if (patch.time !== undefined) dbPatch.post_time = patch.time;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.priority !== undefined) dbPatch.priority = patch.priority;
    if (patch.brief !== undefined) dbPatch.brief = patch.brief;
    if (patch.verifyDate !== undefined) dbPatch.verify_date = patch.verifyDate;
    if ('assigneeId' in patch) dbPatch.assignee_id = patch.assigneeId || null;

    if (patch.copy) {
      if (patch.copy.onScreen !== undefined) dbPatch.copy_on_screen = patch.copy.onScreen;
      if (patch.copy.caption !== undefined) dbPatch.copy_caption = patch.copy.caption;
      if (patch.copy.hashtags !== undefined) dbPatch.copy_hashtags = patch.copy.hashtags;
      if (patch.copy.cta !== undefined) dbPatch.copy_cta = patch.copy.cta;
      if (patch.copy.script !== undefined) dbPatch.copy_script = patch.copy.script;
    }

    if (Object.keys(dbPatch).length > 0) {
      const { error: itemErr } = await supabase.from('items').update(dbPatch).eq('id', id);
      if (itemErr) throw itemErr;
    }

    // Handle checklist updates if present
    if (patch.checklist) {
      const keepCheckIds = patch.checklist.map((c) => c.id).filter(Boolean) as string[];
      if (keepCheckIds.length > 0) {
        const { error: delErr } = await supabase
          .from('item_checklist')
          .delete()
          .eq('item_id', id)
          .not('id', 'in', `(${keepCheckIds.join(',')})`);
        if (delErr) throw delErr;
      } else {
        const { error: delErr } = await supabase.from('item_checklist').delete().eq('item_id', id);
        if (delErr) throw delErr;
      }

      await Promise.all(
        patch.checklist.map(async (c, i) => {
          if (c.id) {
            const { error: upErr } = await supabase
              .from('item_checklist')
              .update({ done: c.done, label: c.label, sort_order: i })
              .eq('id', c.id);
            if (upErr) throw upErr;
          } else {
            const { data, error: insErr } = await supabase
              .from('item_checklist')
              .insert({
                item_id: id,
                label: c.label,
                done: c.done,
                sort_order: i,
              })
              .select('id')
              .single();
            if (insErr) throw insErr;
            if (data) c.id = data.id;
          }
        })
      );
    }

    // Handle references updates if present
    if (patch.references) {
      const keepIds = patch.references.map((r) => r.id).filter(Boolean) as string[];
      if (keepIds.length > 0) {
        const { error: delErr } = await supabase
          .from('item_references')
          .delete()
          .eq('item_id', id)
          .not('id', 'in', `(${keepIds.join(',')})`);
        if (delErr) throw delErr;
      } else {
        const { error: delErr } = await supabase.from('item_references').delete().eq('item_id', id);
        if (delErr) throw delErr;
      }

      await Promise.all(
        patch.references.map(async (r, i) => {
          if (r.id) {
            const { error: upErr } = await supabase
              .from('item_references')
              .update({
                label: r.label,
                url: r.url,
                instruction: r.instruction,
                ref_type: r.type,
                sort_order: i,
              })
              .eq('id', r.id);
            if (upErr) throw upErr;
          } else {
            const { data, error: insErr } = await supabase
              .from('item_references')
              .insert({
                item_id: id,
                label: r.label,
                url: r.url,
                instruction: r.instruction,
                ref_type: r.type,
                sort_order: i,
              })
              .select('id')
              .single();
            if (insErr) throw insErr;
            if (data) r.id = data.id;
          }
        })
      );
    }

    // Handle shots updates if present
    if (patch.shots) {
      const keepShotIds = patch.shots.map((s) => s.id).filter(Boolean) as string[];
      if (keepShotIds.length > 0) {
        const { error: delErr } = await supabase
          .from('item_shots')
          .delete()
          .eq('item_id', id)
          .not('id', 'in', `(${keepShotIds.join(',')})`);
        if (delErr) throw delErr;
      } else {
        const { error: delErr } = await supabase.from('item_shots').delete().eq('item_id', id);
        if (delErr) throw delErr;
      }

      await Promise.all(
        patch.shots.map(async (s, i) => {
          if (s.id) {
            const { error: upErr } = await supabase
              .from('item_shots')
              .update({
                shot_order: s.order,
                visual: s.visual,
                text_on_screen: s.text,
                sort_order: i,
              })
              .eq('id', s.id);
            if (upErr) throw upErr;
          } else {
            const { data, error: insErr } = await supabase
              .from('item_shots')
              .insert({
                item_id: id,
                shot_order: s.order,
                visual: s.visual,
                text_on_screen: s.text,
                sort_order: i,
              })
              .select('id')
              .single();
            if (insErr) throw insErr;
            if (data) s.id = data.id;
          }
        })
      );
    }
  }, []);

  // Mutations (coalesced per item ID: at most 1 in-flight write per record, obsolete intermediates deduped)
  const updateItem = useCallback(async (id: string, patch: ItemPatch) => {
    recentLocalItemSaveAtRef.current.set(id, Date.now());
    setItems((curr) =>
      curr.map((item) => {
        if (item.id !== id) return item;
        const nextCopy = patch.copy ? { ...item.copy, ...patch.copy } : item.copy;
        return { ...item, ...patch, copy: nextCopy };
      })
    );

    if (!isSupabaseConfigured) return;

    let entry = itemWriteQueueRef.current.get(id);
    if (!entry) {
      entry = { inFlight: false, queuedPatch: null, waiters: [] };
      itemWriteQueueRef.current.set(id, entry);
    }

    const prevQueued = entry.queuedPatch || {};
    entry.queuedPatch = {
      ...prevQueued,
      ...patch,
      ...(prevQueued.copy || patch.copy
        ? { copy: { ...(prevQueued.copy || {}), ...(patch.copy || {}) } }
        : {}),
    };

    const completion = new Promise<void>((resolve, reject) => {
      entry!.waiters.push({ resolve, reject });
    });

    if (!entry.inFlight) {
      entry.inFlight = true;
      (async () => {
        try {
          while (entry!.queuedPatch) {
            const batch = entry!.queuedPatch;
            entry!.queuedPatch = null;
            const batchWaiters = entry!.waiters.splice(0, entry!.waiters.length);
            try {
              recentLocalItemSaveAtRef.current.set(id, Date.now());
              await persistItemPatchToSupabase(id, batch);
              recentLocalItemSaveAtRef.current.set(id, Date.now());
              batchWaiters.forEach((w) => w.resolve());
            } catch (err) {
              console.error('Error updating item in Supabase:', err);
              batchWaiters.forEach((w) => w.reject(err));
            }
          }
        } finally {
          entry!.inFlight = false;
          if (!entry!.queuedPatch && entry!.waiters.length === 0) {
            itemWriteQueueRef.current.delete(id);
          }
        }
      })();
    }

    return completion;
  }, [persistItemPatchToSupabase]);

  const updateCopy = useCallback(
    async (id: string, key: keyof Item['copy'], value: string) => {
      return updateItem(id, { copy: { [key]: value } });
    },
    [updateItem]
  );

  const createItem = async (preset?: Partial<Item>): Promise<Item | null> => {
    const defaultItem: Item = {
      id: `i${Date.now()}`,
      title: preset?.title || 'Untitled item',
      type: preset?.type || 'Reel',
      pillar: preset?.pillar || 'Proof',
      goal: preset?.goal || 'Build Trust',
      date: preset?.date || new Date().toISOString().slice(0, 10),
      time: '18:30',
      status: 'Idea',
      assignee: '',
      priority: preset?.priority || 'Normal',
      brief: preset?.brief || '',
      copy: { onScreen: '', caption: '', hashtags: '', cta: '', script: '' },
      references: [],
      shots: [{ order: '01', visual: '', text: '' }],
      specs: specMap[preset?.type || 'Reel'],
      assets: [],
      checklist: getChecklistForType(preset?.type || 'Reel').map((label) => ({ label, done: false })),
      comments: [],
    };

    const next = { ...defaultItem, ...preset };

    if (!isSupabaseConfigured || !userId) {
      setItems((v) => [...v, next]);
      return next;
    }

    try {
      const { data: created, error: createErr } = await supabase
        .from('items')
        .insert({
          title: next.title,
          content_type: next.type,
          pillar: next.pillar,
          goal: next.goal,
          post_date: next.date,
          post_time: next.time,
          status: next.status,
          priority: next.priority,
          brief: next.brief,
          copy_on_screen: next.copy.onScreen,
          copy_caption: next.copy.caption,
          copy_hashtags: next.copy.hashtags,
          copy_cta: next.copy.cta,
          copy_script: next.copy.script,
          verify_date: next.verifyDate || false,
          created_by: userId,
          assignee_id: next.assigneeId || null,
        })
        .select()
        .single();

      if (createErr || !created) throw createErr;

      // Seed initial checklist specific to this content type
      const checksToInsert = getChecklistForType(created.content_type as ContentType).map((label, i) => ({
        item_id: created.id,
        label,
        done: false,
        sort_order: i,
      }));
      await supabase.from('item_checklist').insert(checksToInsert);

      // Seed initial shot
      await supabase.from('item_shots').insert({
        item_id: created.id,
        shot_order: '01',
        visual: '',
        text_on_screen: '',
        sort_order: 0,
      });

      next.id = created.id;
      setItems((v) => [...v, next]);
      return next;
    } catch (e) {
      console.error('Error creating item in Supabase:', e);
      setItems((v) => [...v, next]);
      return next;
    }
  };

  const deleteItem = async (itemId: string) => {
    setItems((curr) => curr.filter((i) => i.id !== itemId));
    if (!isSupabaseConfigured || !userId) return;
    try {
      const { error } = await supabase.from('items').delete().eq('id', itemId);
      if (error) {
        console.error('Error deleting item from Supabase:', error);
        throw error;
      }
    } catch (e) {
      console.error('Error deleting item from Supabase:', e);
      throw e;
    }
  };

  const addComment = async (itemId: string, text: string, authorName = 'Team member') => {
    const newComment = {
      id: `c${Date.now()}`,
      author: authorName,
      text,
      time: 'Just now',
    };

    setItems((curr) =>
      curr.map((i) => (i.id === itemId ? { ...i, comments: [...i.comments, newComment] } : i))
    );

    if (!isSupabaseConfigured || !userId) return;

    try {
      await supabase.from('item_comments').insert({
        item_id: itemId,
        author_id: userId,
        body: text,
      });
    } catch (e) {
      console.error('Error adding comment to Supabase:', e);
    }
  };

  const persistLeadPatchToSupabase = useCallback(async (leadId: string, patch: Partial<Lead>) => {
    const isUUID = (val?: string | null) =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

    if (!isUUID(leadId)) {
      return;
    }

    const dbPatch: any = {};
    if (patch.date !== undefined) dbPatch.lead_date = patch.date;
    if (patch.source !== undefined) dbPatch.source = patch.source;
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.contact !== undefined) dbPatch.contact = patch.contact;
    if (patch.service !== undefined) dbPatch.service = patch.service;
    if (patch.budget !== undefined) dbPatch.budget = patch.budget;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.followUp !== undefined) dbPatch.follow_up = patch.followUp || null;
    if (patch.owner !== undefined) dbPatch.owner_name = patch.owner;
    if (isUUID(patch.ownerId)) dbPatch.owner_id = patch.ownerId;
    if (patch.holdReason !== undefined) dbPatch.hold_reason = patch.holdReason || null;
    if (patch.holdNotes !== undefined) dbPatch.hold_notes = patch.holdNotes || null;
    if (patch.previousStatus !== undefined) dbPatch.previous_status = patch.previousStatus || null;
    if (patch.resumeDate !== undefined) dbPatch.resume_date = patch.resumeDate || null;
    if (patch.activityLog !== undefined) dbPatch.activity_log = patch.activityLog;

    if (Object.keys(dbPatch).length === 0) return;

    const { error } = await supabase.from('leads').update(dbPatch).eq('id', leadId);
    if (error) {
      // Fallback if extended columns are not yet applied via migration
      if (error.code === '42703' || error.message?.includes('column')) {
        const basicPatch: any = {};
        if (patch.date !== undefined) basicPatch.lead_date = patch.date;
        if (patch.source !== undefined) basicPatch.source = patch.source;
        if (patch.name !== undefined) basicPatch.name = patch.name;
        if (patch.contact !== undefined) basicPatch.contact = patch.contact;
        if (patch.service !== undefined) basicPatch.service = patch.service;
        if (patch.budget !== undefined) basicPatch.budget = patch.budget;
        if (patch.status !== undefined) basicPatch.status = patch.status;
        if (patch.followUp !== undefined) basicPatch.follow_up = patch.followUp || null;
        if (isUUID(patch.ownerId)) basicPatch.owner_id = patch.ownerId;
        const retry = await supabase.from('leads').update(basicPatch).eq('id', leadId);
        if (retry.error) {
          console.error('Database update failed on fallback:', retry.error);
          throw retry.error;
        }
      } else {
        console.error('Error updating lead in Supabase:', error);
        throw error;
      }
    }
  }, []);

  const updateLead = useCallback(async (leadId: string, patch: Partial<Lead>) => {
    recentLocalLeadSaveAtRef.current.set(leadId, Date.now());

    // 1. Cache lead metadata synchronously when saving (debounced for text inputs)
    saveLeadMetaCache(leadId, {
      ...(patch.status !== undefined && { status: patch.status }),
      ...(patch.previousStatus !== undefined && { previousStatus: patch.previousStatus }),
      ...(patch.owner !== undefined && { owner: patch.owner }),
      ...(patch.ownerId !== undefined && { ownerId: patch.ownerId }),
      ...(patch.holdReason !== undefined && { holdReason: patch.holdReason }),
      ...(patch.holdNotes !== undefined && { holdNotes: patch.holdNotes }),
      ...(patch.resumeDate !== undefined && { resumeDate: patch.resumeDate }),
      ...(patch.followUp !== undefined && { followUp: patch.followUp }),
      ...(patch.activityLog !== undefined && { activityLog: patch.activityLog }),
    });

    // 2. Optimistic UI update
    setLeads((curr) => curr.map((l) => (l.id === leadId ? { ...l, ...patch } : l)));

    if (!isSupabaseConfigured) return;

    let entry = leadWriteQueueRef.current.get(leadId);
    if (!entry) {
      entry = { inFlight: false, queuedPatch: null, waiters: [] };
      leadWriteQueueRef.current.set(leadId, entry);
    }

    entry.queuedPatch = { ...(entry.queuedPatch || {}), ...patch };
    const completion = new Promise<void>((resolve, reject) => {
      entry!.waiters.push({ resolve, reject });
    });

    if (!entry.inFlight) {
      entry.inFlight = true;
      (async () => {
        try {
          while (entry!.queuedPatch) {
            const batch = entry!.queuedPatch;
            entry!.queuedPatch = null;
            const batchWaiters = entry!.waiters.splice(0, entry!.waiters.length);
            try {
              recentLocalLeadSaveAtRef.current.set(leadId, Date.now());
              await persistLeadPatchToSupabase(leadId, batch);
              recentLocalLeadSaveAtRef.current.set(leadId, Date.now());
              batchWaiters.forEach((w) => w.resolve());
            } catch (err) {
              console.error('Error updating lead in Supabase:', err);
              batchWaiters.forEach((w) => w.reject(err));
            }
          }
        } finally {
          entry!.inFlight = false;
          if (!entry!.queuedPatch && entry!.waiters.length === 0) {
            leadWriteQueueRef.current.delete(leadId);
          }
        }
      })();
    }

    return completion;
  }, [persistLeadPatchToSupabase]);

  const addLead = async () => {
    const isUUID = (val?: string | null) =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

    const newLead: Lead = {
      id: `l${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      source: 'Organic',
      name: 'New lead',
      contact: '',
      service: '',
      budget: '',
      status: 'New',
      followUp: '',
      owner: '',
      ownerId: isUUID(userId) ? userId : null,
      holdReason: '',
      resumeDate: '',
      activityLog: [
        {
          id: `act_${Date.now()}`,
          timestamp: new Date().toISOString(),
          author: 'System',
          action: 'Lead created',
          type: 'note',
        },
      ],
    };

    saveLeadMetaCache(newLead.id, {
      owner: newLead.owner,
      ownerId: newLead.ownerId,
      holdReason: newLead.holdReason,
      resumeDate: newLead.resumeDate,
      activityLog: newLead.activityLog,
    });

    setLeads((curr) => [...curr, newLead]);

    if (!isSupabaseConfigured || !userId) return newLead;

    try {
      const insertPayload: any = {
        lead_date: newLead.date,
        source: newLead.source,
        name: newLead.name,
        contact: newLead.contact,
        service: newLead.service,
        budget: newLead.budget,
        status: newLead.status,
        owner_id: userId,
        activity_log: newLead.activityLog,
      };

      let { data, error: insertErr } = await supabase
        .from('leads')
        .insert(insertPayload)
        .select('id')
        .single();

      if (insertErr && (insertErr.code === '42703' || insertErr.message?.includes('column'))) {
        delete insertPayload.activity_log;
        const retry = await supabase
          .from('leads')
          .insert(insertPayload)
          .select('id')
          .single();
        data = retry.data;
        insertErr = retry.error;
      }

      if (insertErr) {
        console.error('Error adding lead in Supabase:', insertErr);
        if (insertErr.code === 'PGRST205' || insertErr.message?.includes('schema cache')) {
          setDbTablesMissing(true);
        }
        throw insertErr;
      }

      if (data) {
        newLead.id = data.id;
        saveLeadMetaCache(data.id, {
          owner: newLead.owner,
          ownerId: newLead.ownerId,
          holdReason: newLead.holdReason,
          resumeDate: newLead.resumeDate,
          activityLog: newLead.activityLog,
        });
        setLeads((curr) =>
          curr.map((l) => (l.id === newLead.id ? { ...l, id: data.id } : l))
        );
      }
      return newLead;
    } catch (e) {
      console.error('Error adding lead in Supabase:', e);
      throw e;
    }
  };

  const deleteLead = async (leadId: string) => {
    setLeads((curr) => curr.filter((l) => l.id !== leadId));

    if (!isSupabaseConfigured) return;

    try {
      const { error } = await supabase.from('leads').delete().eq('id', leadId);
      if (error) {
        console.error('Error deleting lead from Supabase:', error);
        throw error;
      }
    } catch (e) {
      console.error('Error deleting lead from Supabase:', e);
      throw e;
    }
  };

  const uploadAsset = async (itemId: string, file: File, versionLabel: string) => {
    try {
      const result = await uploadAssetFile(itemId, file, versionLabel, userId);
      const newAsset = {
        id: result.id,
        name: result.name,
        version: result.version,
        storage_path: result.storage_path,
        file_size: result.file_size,
        mime_type: result.mime_type,
        uploaded_at: result.uploaded_at,
      };

      setItems((curr) =>
        curr.map((i) => (i.id === itemId ? { ...i, assets: [...i.assets, newAsset] } : i))
      );
      return newAsset;
    } catch (err) {
      console.error('Upload failed:', err);
      throw err;
    }
  };

  const removeAsset = async (itemId: string, assetId: string, storagePath?: string | null) => {
    try {
      if (assetId) {
        await deleteAssetFile(assetId, storagePath);
      }
      setItems((curr) =>
        curr.map((i) =>
          i.id === itemId
            ? { ...i, assets: i.assets.filter((a) => a.id !== assetId) }
            : i
        )
      );
    } catch (err) {
      console.error('Delete asset failed:', err);
      throw err;
    }
  };

  return {
    items,
    setItems,
    leads,
    setLeads,
    loading,
    error,
    dbTablesMissing,
    isLoaded,
    updateItem,
    updateCopy,
    createItem,
    addComment,
    updateLead,
    addLead,
    deleteLead,
    uploadAsset,
    removeAsset,
    deleteItem,
    teamMembers,
    refreshTeamMembers: fetchTeamMembers,
    refreshItems: fetchItems,
    refreshLeads: fetchLeads,
  };
}
