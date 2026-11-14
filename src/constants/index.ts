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
];

export const slug = (x: string) => x.toLowerCase().replaceAll(' ', '-').replaceAll('/', '-');

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
  brief:
    title === 'Aspire World intro reel'
      ? 'Introduce Aspire World through a fast proof-led montage. Lead with outcomes. Show the team’s strongest design and edit work. End on one clear consultation action.'
      : '',
  copy: {
    onScreen:
      title === 'Aspire World intro reel'
        ? 'You create. We build the system around it.\nDesign. Edit. Launch.'
        : '',
    caption: '',
    hashtags: '',
    cta: title === 'Aspire World intro reel' ? 'DM BOOK for a free consultation' : '',
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

export const initialItems: Item[] = [
  makeItem('i1', '2026-11-14', 'Reel', 'Proof', 'Aspire World intro reel'),
  makeItem(
    'i2',
    '2026-11-16',
    'Reel',
    'Proof',
    'Trendzilla Shark Tank Artist Sourcing, case study',
    'https://drive.google.com/drive/folders/1ibKPX6oXL0cbpCg-VnGRIzuosG571Xhr?usp=sharing'
  ),
  makeItem(
    'i3',
    '2026-11-18',
    'Reel',
    'Proof',
    'Trendzilla Campaign OTN, campaign breakdown',
    'https://drive.google.com/drive/folders/1FNH_Wg6qYAUZtzVZNB28rGJUT3P0tifA?usp=sharing'
  ),
  makeItem(
    'i4',
    '2026-11-20',
    'Reel',
    'Proof',
    'RAD Event Flow State, event recap',
    'https://drive.google.com/drive/folders/1y4ZPCTTbKT7iTaeRYN9oWlEA9vDBs37E?usp=sharing'
  ),
  makeItem(
    'i5',
    '2026-11-21',
    'Reel',
    'Behind the Scenes',
    '10KD BTS',
    'https://drive.google.com/drive/folders/1cR4VJi6Np40TNgS38Rhxyqq40XGN-ZBn?usp=sharing'
  ),
  makeItem('i6', '2026-11-23', 'Reel', 'Value', '3 mistakes artists make in their first music video'),
  makeItem('i7', '2026-11-25', 'Reel', 'Value', 'How much does a music video really cost?'),
  makeItem('i8', '2026-11-27', 'Carousel', 'Offer', 'Editing and print-on-demand services'),
  makeItem('i9', '2026-11-28', 'Reel', 'Value', 'Why every artist needs a website'),
  makeItem('i10', '2026-11-30', 'Story series', 'People', 'Meet the team'),
  makeItem('i11', '2026-11-14', 'Festival Creative', 'Festive', "Children's Day", undefined, true),
  makeItem('i12', '2026-11-24', 'Festival Creative', 'Festive', 'Guru Nanak Jayanti', undefined, true),
  makeItem('i13', '2026-11-27', 'Festival Creative', 'Offer', 'Black Friday offer', undefined, true),
  makeItem('i14', '2026-11-21', 'Story', 'Offer', 'Slots open for next month, DM BOOK'),
  makeItem('i15', '2026-12-25', 'Festival Creative', 'Festive', 'Christmas placeholder', undefined, true),
  makeItem('i16', '2026-12-31', 'Festival Creative', 'Festive', 'New Year placeholder', undefined, true),
];

export const initialLeads: Lead[] = [
  {
    id: 'l1',
    date: '2026-11-16',
    source: 'Organic',
    name: 'Aarav Mehta',
    contact: '@aaravmusic',
    service: 'Music video',
    budget: '₹75,000',
    status: 'Qualified',
    followUp: '2026-11-20',
  },
  {
    id: 'l2',
    date: '2026-11-17',
    source: 'Referral',
    name: 'Studio North',
    contact: 'hello@studionorth.in',
    service: 'Campaign edit',
    budget: '₹1,20,000',
    status: 'Call booked',
    followUp: '2026-11-19',
  },
  {
    id: 'l3',
    date: '2026-11-18',
    source: 'Outreach',
    name: 'Maya Rao',
    contact: '@mayarao.art',
    service: 'Website',
    budget: '₹90,000',
    status: 'New',
    followUp: '2026-11-21',
  },
  {
    id: 'l4',
    date: '2026-11-19',
    source: 'Ad',
    name: 'Rhyme House',
    contact: '+91 90000 00000',
    service: 'Monthly content',
    budget: '₹60,000/mo',
    status: 'Closed',
    followUp: '2026-12-01',
  },
];
