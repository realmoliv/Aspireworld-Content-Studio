import type { Status, Pillar, ContentType, Item, Lead, ReferenceItem } from '@/types';

export const statuses: Status[] = [
  'Idea',
  'Briefed',
  'In Design/Edit',
  'In Review',
  'Approved',
  'Scheduled',
  'Posted',
];

export const pillars: Pillar[] = [
  'Proof',
  'Behind the Scenes',
  'Value',
  'People',
  'Offer',
  'Festive',
];

export const types: ContentType[] = [
  'Reel',
  'Post',
  'Carousel',
  'Story',
  'Story series',
  'Festival Creative',
];

export const defaultChecklist: string[] = [
  'Hook in first 2 seconds',
  'Captions burned in',
  'Text inside safe zone',
  'Logo or end card present',
  'CTA present',
  'Music licensed or original',
  'No suggestive content',
  'Caption proofread',
];

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
    'Up to 5 slides',
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

export const templates: [string, ContentType, string][] = [
  [
    'Client-getting Reel',
    'Reel',
    'Hook (2 s), proof montage, services line, CTA “DM BOOK for a free consultation”',
  ],
  ['Case study Reel', 'Reel', 'Problem, what we made, result, CTA'],
  [
    'Behind the Scenes Reel',
    'Reel',
    'Open on action. Show process, decisions and finished output.',
  ],
  ['Value Carousel', 'Carousel', '“3 mistakes artists make...”, one idea per slide, CTA slide'],
  ['Offer post', 'Post', 'One clear service. One clear outcome. One CTA.'],
  ['Festival creative', 'Festival Creative', 'Greeting, logo, no sales pitch'],
  ['Testimonial Story', 'Story', 'Quote, proof, client name, supporting frame'],
];

export const savedReferences: ReferenceItem[] = [
  {
    label: 'Trendzilla — Shark Tank sourcing',
    url: 'https://drive.google.com/drive/folders/1ibKPX6oXL0cbpCg-VnGRIzuosG571Xhr?usp=sharing',
    type: 'Raw footage (Drive)',
    pillar: 'Proof',
    instruction: 'Build the case study from the strongest artist moments.',
  },
  {
    label: 'Trendzilla — Campaign OTN',
    url: 'https://drive.google.com/drive/folders/1FNH_Wg6qYAUZtzVZNB28rGJUT3P0tifA?usp=sharing',
    type: 'Raw footage (Drive)',
    pillar: 'Proof',
    instruction: 'Show campaign range before individual details.',
  },
  {
    label: 'RAD Event — Flow State',
    url: 'https://drive.google.com/drive/folders/1y4ZPCTTbKT7iTaeRYN9oWlEA9vDBs37E?usp=sharing',
    type: 'Raw footage (Drive)',
    pillar: 'Proof',
    instruction: 'Prioritize energy, crowd and brand presence.',
  },
  {
    label: '10KD behind the scenes',
    url: 'https://drive.google.com/drive/folders/1cR4VJi6Np40TNgS38Rhxyqq40XGN-ZBn?usp=sharing',
    type: 'Raw footage (Drive)',
    pillar: 'Behind the Scenes',
    instruction: 'Use process footage. Keep cuts direct.',
  },
  {
    label: 'Cyberpunk Editorial Visual Moodboard',
    url: 'https://www.pinterest.com/pin/582653270577713437/',
    type: 'Pinterest / Moodboard',
    pillar: 'Value',
    instruction: 'Reference the high-contrast neon lighting, composition and grading.',
  },
];

export const slug = (x: string) => x.toLowerCase().replace(/ /g, '-').replace(/\//g, '-');

export const missing = (i: Item) => !i.assignee || !i.copy.onScreen || !i.references.length;

export const makeItem = (
  id: string,
  date: string,
  type: ContentType,
  pillar: Pillar,
  title: string,
  raw?: string,
  verifyDate?: boolean
): Item => ({
  id,
  title,
  type,
  pillar,
  goal:
    pillar === 'Offer' || pillar === 'Proof'
      ? 'Get Clients'
      : pillar === 'Festive'
        ? 'Festive'
        : 'Build Trust',
  date,
  time: '18:30',
  status: 'Idea',
  assignee: '',
  priority: pillar === 'Offer' ? 'High' : 'Normal',
  brief: '',
  copy: {
    onScreen: '',
    caption: '',
    hashtags: '',
    cta: '',
    script: '',
  },
  references: raw
    ? [
        {
          url: raw,
          label: 'Raw footage',
          instruction: 'Use the strongest proof moments. Do not change the source files.',
          type: 'Raw footage (Drive)',
        },
      ]
    : [],
  shots: [{ order: '01', visual: '', text: '' }],
  specs: specMap[type] || [],
  assets: [],
  checklist: defaultChecklist.map((label) => ({ label, done: false })),
  comments: [],
  verifyDate,
});

export const initialItems: Item[] = [];

export const initialLeads: Lead[] = [];

