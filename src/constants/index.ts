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

export const checklistMap: Record<ContentType, string[]> = {
  Reel: [
    'Hook in first 2–3s (Visual movement or audio pattern interrupt)',
    'Captions burned in (Over 70% of viewers watch Reels on mute)',
    'Text inside 9:16 safe zone (Clear of top header, bottom caption & right icons)',
    'Trending or licensed audio synced to edit cuts',
    'High visual retention pacing (Cut every 2–4 seconds)',
    'Clear CTA to Save, Share or Comment (Triggers algorithm reach)',
    'Cover frame selected & centered for 1:1 profile grid',
  ],
  Carousel: [
    'Slide 1 scroll-stopping hook & bold headline (Must demand a swipe)',
    'Swipe prompt / visual cue on Slide 1 (Right arrow or "Swipe >")',
    'One clear, focused value takeaway per slide (High legibility on mobile)',
    'Visual continuity across slides (Consistent fonts, colors & slide connectors)',
    'Key content centered in 4:5 frame (Safe from 1:1 profile feed crop)',
    'Slide 5 (final slide) clear Save for later & Share CTA',
    'Caption adds deeper context to slide summaries',
  ],
  Post: [
    '3-second visual focal point (Immediate clarity on mobile screen)',
    'Clean typography with strong contrast against background',
    '4:5 aspect ratio (1080 × 1350) with 1:1 profile grid safe center',
    'Brand identity (Logo, font hierarchy & brand colors applied)',
    'Engaging first 2 lines of caption (Hook before "more" tap)',
    'Conversation-starter question or prompt to drive comments',
    'Up to 5 relevant niche hashtags in caption',
  ],
  Story: [
    'Interactive engagement sticker (Poll, Question Box, Quiz, Slider, or Link)',
    'Top & bottom safe zones (Keep top 250px and bottom 250px clear of text)',
    'Native, casual aesthetic (Authentic, unfiltered, direct-to-audience vibe)',
    'Scannable in under 5 seconds (Quick text or high-energy clip)',
    'Direct action callout (e.g. "Tap link below" or "DM us KEYWORD")',
  ],
  'Story series': [
    'Story 1 curiosity hook or interactive poll (Maximizes completion rate)',
    'Sequential narrative flow across frames (Hook → Context → Value → CTA)',
    'Numbered progression indicator on each story (e.g. 1/4, 2/4)',
    'Consistent sticker & typography placement across all slides',
    'Safe zone margins checked on every individual story frame',
    'Final story clear direct response CTA (Link, DM, or Booking)',
  ],
  'Festival Creative': [
    'Accurate festival / cultural greeting & date relevance',
    'Festive theme & celebratory color palette integrated',
    'Aspire World brand logo subtly integrated (Not overpowering the greeting)',
    '4:5 vertical portrait feed framing with 1:1 center-safe crop',
    'Warm, inclusive community-focused caption copy',
    'Festive / occasion-specific trending hashtags included',
  ],
};

export function getChecklistForType(type: ContentType): string[] {
  return checklistMap[type] || checklistMap.Reel;
}

export const defaultChecklist: string[] = checklistMap.Reel;

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
  checklist: getChecklistForType(type).map((label) => ({ label, done: false })),
  comments: [],
  verifyDate,
});

export const initialItems: Item[] = [];

export const initialLeads: Lead[] = [];

