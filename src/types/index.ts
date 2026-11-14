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

export type Copywriting = {
  onScreen: string;
  caption: string;
  hashtags: string;
  cta: string;
  script: string;
};

export type ReferenceItem = {
  id?: string;
  url: string;
  label: string;
  instruction: string;
  type: string;
  pillar?: Pillar;
};

export type ShotItem = {
  id?: string;
  order: string;
  visual: string;
  text: string;
};

export type AssetItem = {
  id?: string;
  name: string;
  version: string;
  storage_path?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_at?: string;
};

export type ChecklistItem = {
  id?: string;
  label: string;
  done: boolean;
};

export type CommentItem = {
  id?: string;
  author: string;
  text: string;
  time: string;
};

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
  copy: Copywriting;
  references: ReferenceItem[];
  shots: ShotItem[];
  specs: string[];
  assets: AssetItem[];
  checklist: ChecklistItem[];
  comments: CommentItem[];
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

export type FilterState = {
  type: string;
  pillar: string;
  status: string;
  assignee: string;
};
