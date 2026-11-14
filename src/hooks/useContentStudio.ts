import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

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

export type Lead = {
  id: string;
  date: string;
  source: string;
  name: string;
  contact: string;
  service: string;
  budget: string;
  status: string;
  followUp: string;
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

export function useContentStudio(userId?: string) {
  const [items, setItems] = useState<Item[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      if (itemsErr) throw itemsErr;

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

      setItems(mapped);
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

      if (err) throw err;

      setLeads(
        (data || []).map((l: any) => ({
          id: l.id,
          date: l.lead_date,
          source: l.source,
          name: l.name,
          contact: l.contact || '',
          service: l.service || '',
          budget: l.budget || '',
          status: l.status,
          followUp: l.follow_up || '',
        }))
      );
    } catch (e: any) {
      console.error('Failed to fetch leads:', e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      if (isSupabaseConfigured) {
        await Promise.all([fetchItems(), fetchLeads()]);
      }
      setLoading(false);
    }
    loadAll();
  }, [fetchItems, fetchLeads]);

  // Mutations
  const updateItem = async (id: string, patch: Partial<Item>) => {
    // Optimistic UI update
    setItems((curr) => curr.map((item) => (item.id === id ? { ...item, ...patch } : item)));

    if (!isSupabaseConfigured) return;

    try {
      const dbPatch: any = {};
      if (patch.title !== undefined) dbPatch.title = patch.title;
      if (patch.type !== undefined) {
        dbPatch.content_type = patch.type;
      }
      if (patch.pillar !== undefined) dbPatch.pillar = patch.pillar;
      if (patch.goal !== undefined) dbPatch.goal = patch.goal;
      if (patch.date !== undefined) dbPatch.post_date = patch.date;
      if (patch.time !== undefined) dbPatch.post_time = patch.time;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.priority !== undefined) dbPatch.priority = patch.priority;
      if (patch.brief !== undefined) dbPatch.brief = patch.brief;
      if (patch.verifyDate !== undefined) dbPatch.verify_date = patch.verifyDate;

      if (Object.keys(dbPatch).length > 0) {
        await supabase.from('items').update(dbPatch).eq('id', id);
      }

      // Handle checklist updates if present
      if (patch.checklist) {
        for (const c of patch.checklist) {
          if (c.id) {
            await supabase.from('item_checklist').update({ done: c.done }).eq('id', c.id);
          }
        }
      }

      // Handle references updates if present
      if (patch.references) {
        // Upsert references
        for (let i = 0; i < patch.references.length; i++) {
          const r = patch.references[i];
          if (r.id) {
            await supabase
              .from('item_references')
              .update({
                label: r.label,
                url: r.url,
                instruction: r.instruction,
                ref_type: r.type,
                sort_order: i,
              })
              .eq('id', r.id);
          } else {
            const { data } = await supabase
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
            if (data) r.id = data.id;
          }
        }
      }

      // Handle shots updates if present
      if (patch.shots) {
        for (let i = 0; i < patch.shots.length; i++) {
          const s = patch.shots[i];
          if (s.id) {
            await supabase
              .from('item_shots')
              .update({
                shot_order: s.order,
                visual: s.visual,
                text_on_screen: s.text,
                sort_order: i,
              })
              .eq('id', s.id);
          } else {
            const { data } = await supabase
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
            if (data) s.id = data.id;
          }
        }
      }
    } catch (err) {
      console.error('Error updating item in Supabase:', err);
    }
  };

  const updateCopy = async (id: string, key: keyof Item['copy'], value: string) => {
    setItems((curr) =>
      curr.map((item) =>
        item.id === id ? { ...item, copy: { ...item.copy, [key]: value } } : item
      )
    );

    if (!isSupabaseConfigured) return;

    const columnMap: Record<keyof Item['copy'], string> = {
      onScreen: 'copy_on_screen',
      caption: 'copy_caption',
      hashtags: 'copy_hashtags',
      cta: 'copy_cta',
      script: 'copy_script',
    };

    try {
      await supabase
        .from('items')
        .update({ [columnMap[key]]: value })
        .eq('id', id);
    } catch (err) {
      console.error('Error updating copy in Supabase:', err);
    }
  };

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
      checklist: defaultChecklist.map((label) => ({ label, done: false })),
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
        })
        .select()
        .single();

      if (createErr || !created) throw createErr;

      // Seed initial checklist
      const checksToInsert = defaultChecklist.map((label, i) => ({
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

  const updateLead = async (leadId: string, patch: Partial<Lead>) => {
    setLeads((curr) => curr.map((l) => (l.id === leadId ? { ...l, ...patch } : l)));

    if (!isSupabaseConfigured) return;

    const dbPatch: any = {};
    if (patch.date !== undefined) dbPatch.lead_date = patch.date;
    if (patch.source !== undefined) dbPatch.source = patch.source;
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.contact !== undefined) dbPatch.contact = patch.contact;
    if (patch.service !== undefined) dbPatch.service = patch.service;
    if (patch.budget !== undefined) dbPatch.budget = patch.budget;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.followUp !== undefined) dbPatch.follow_up = patch.followUp || null;

    try {
      await supabase.from('leads').update(dbPatch).eq('id', leadId);
    } catch (e) {
      console.error('Error updating lead in Supabase:', e);
    }
  };

  const addLead = async () => {
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
    };

    setLeads((curr) => [...curr, newLead]);

    if (!isSupabaseConfigured || !userId) return;

    try {
      const { data } = await supabase
        .from('leads')
        .insert({
          lead_date: newLead.date,
          source: newLead.source,
          name: newLead.name,
          contact: newLead.contact,
          service: newLead.service,
          budget: newLead.budget,
          status: newLead.status,
          owner_id: userId,
        })
        .select('id')
        .single();

      if (data) {
        setLeads((curr) =>
          curr.map((l) => (l.id === newLead.id ? { ...l, id: data.id } : l))
        );
      }
    } catch (e) {
      console.error('Error adding lead in Supabase:', e);
    }
  };

  return {
    items,
    setItems,
    leads,
    setLeads,
    loading,
    error,
    updateItem,
    updateCopy,
    createItem,
    addComment,
    updateLead,
    addLead,
    refreshItems: fetchItems,
    refreshLeads: fetchLeads,
  };
}
