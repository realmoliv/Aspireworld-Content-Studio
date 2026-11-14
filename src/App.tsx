import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useContentStudio } from "@/hooks/useContentStudio";
import { AuthView } from "@/components/AuthView";

type Screen = "calendar" | "board" | "references" | "templates" | "planner" | "leads";
type Status =
  | "Idea"
  | "Briefed"
  | "In Design/Edit"
  | "In Review"
  | "Approved"
  | "Scheduled"
  | "Posted";
type Pillar = "Proof" | "Behind the Scenes" | "Value" | "People" | "Offer" | "Festive";
type ContentType = "Reel" | "Post" | "Carousel" | "Story" | "Story series" | "Festival Creative";
type Item = {
  id: string;
  title: string;
  type: ContentType;
  pillar: Pillar;
  goal: string;
  date: string;
  time: string;
  status: Status;
  assignee: string;
  priority: string;
  brief: string;
  copy: { onScreen: string; caption: string; hashtags: string; cta: string; script: string };
  references: { url: string; label: string; instruction: string; type: string }[];
  shots: { order: string; visual: string; text: string }[];
  specs: string[];
  assets: { name: string; version: string }[];
  checklist: { label: string; done: boolean }[];
  comments: { author: string; text: string; time: string }[];
  verifyDate?: boolean;
};

type Lead = {
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

const statuses: Status[] = [
  "Idea",
  "Briefed",
  "In Design/Edit",
  "In Review",
  "Approved",
  "Scheduled",
  "Posted",
];
const pillars: Pillar[] = ["Proof", "Behind the Scenes", "Value", "People", "Offer", "Festive"];
const types: ContentType[] = [
  "Reel",
  "Post",
  "Carousel",
  "Story",
  "Story series",
  "Festival Creative",
];
const checklist = [
  "Hook in first 2 seconds",
  "Captions burned in",
  "Text inside safe zone",
  "Logo or end card present",
  "CTA present",
  "Music licensed or original",
  "No suggestive content",
  "Caption proofread",
];
const specMap: Record<string, string[]> = {
  Reel: [
    "1080 × 1920",
    "9:16",
    "15–30 seconds",
    "Text clear of top 14% and bottom 20%",
    "Burned-in captions",
    "Hook in first 2 seconds",
    "Keep key content centered",
  ],
  Post: ["1080 × 1350", "4:5", "Keep key content centered"],
  Carousel: [
    "Up to 10 slides",
    "1080 × 1350",
    "First slide is the hook",
    "Last slide is the CTA",
    "Keep key content centered",
  ],
  Story: ["1080 × 1920", "9:16", "Keep top and bottom 250 px clear"],
  "Story series": ["1080 × 1920", "9:16", "Keep top and bottom 250 px clear"],
  "Festival Creative": [
    "1080 × 1920 and 1080 × 1350",
    "WhatsApp-share version",
    "Keep key content centered",
  ],
};

const makeItem = (
  id: string,
  date: string,
  type: ContentType,
  pillar: Pillar,
  title: string,
  raw?: string,
  verifyDate?: boolean,
): Item => ({
  id,
  title,
  type,
  pillar,
  goal:
    pillar === "Offer" || pillar === "Proof"
      ? "Get Clients"
      : pillar === "Festive"
        ? "Festive"
        : "Build Trust",
  date,
  time: "18:30",
  status: "Idea",
  assignee: "",
  priority: pillar === "Offer" ? "High" : "Normal",
  brief:
    title === "Aspire World intro reel"
      ? "Introduce Aspire World through a fast proof-led montage. Lead with outcomes. Show the team’s strongest design and edit work. End on one clear consultation action."
      : "",
  copy: {
    onScreen:
      title === "Aspire World intro reel"
        ? "You create. We build the system around it.\nDesign. Edit. Launch."
        : "",
    caption: "",
    hashtags: "",
    cta: title === "Aspire World intro reel" ? "DM BOOK for a free consultation" : "",
    script: "",
  },
  references: raw
    ? [
        {
          url: raw,
          label: "Raw footage",
          instruction: "Use the strongest proof moments. Do not change the source files.",
          type: "Raw footage (Drive)",
        },
      ]
    : [],
  shots: [{ order: "01", visual: "", text: "" }],
  specs: specMap[type],
  assets: [],
  checklist: checklist.map((label) => ({ label, done: false })),
  comments: [],
  verifyDate,
});

const initialItems: Item[] = [
  makeItem("i1", "2026-11-14", "Reel", "Proof", "Aspire World intro reel"),
  makeItem(
    "i2",
    "2026-11-16",
    "Reel",
    "Proof",
    "Trendzilla Shark Tank Artist Sourcing, case study",
    "https://drive.google.com/drive/folders/1ibKPX6oXL0cbpCg-VnGRIzuosG571Xhr?usp=sharing",
  ),
  makeItem(
    "i3",
    "2026-11-18",
    "Reel",
    "Proof",
    "Trendzilla Campaign OTN, campaign breakdown",
    "https://drive.google.com/drive/folders/1FNH_Wg6qYAUZtzVZNB28rGJUT3P0tifA?usp=sharing",
  ),
  makeItem(
    "i4",
    "2026-11-20",
    "Reel",
    "Proof",
    "RAD Event Flow State, event recap",
    "https://drive.google.com/drive/folders/1y4ZPCTTbKT7iTaeRYN9oWlEA9vDBs37E?usp=sharing",
  ),
  makeItem(
    "i5",
    "2026-11-21",
    "Reel",
    "Behind the Scenes",
    "10KD BTS",
    "https://drive.google.com/drive/folders/1cR4VJi6Np40TNgS38Rhxyqq40XGN-ZBn?usp=sharing",
  ),
  makeItem(
    "i6",
    "2026-11-23",
    "Reel",
    "Value",
    "3 mistakes artists make in their first music video",
  ),
  makeItem("i7", "2026-11-25", "Reel", "Value", "How much does a music video really cost?"),
  makeItem("i8", "2026-11-27", "Carousel", "Offer", "Editing and print-on-demand services"),
  makeItem("i9", "2026-11-28", "Reel", "Value", "Why every artist needs a website"),
  makeItem("i10", "2026-11-30", "Story series", "People", "Meet the team"),
  makeItem("i11", "2026-11-14", "Festival Creative", "Festive", "Children's Day", undefined, true),
  makeItem(
    "i12",
    "2026-11-24",
    "Festival Creative",
    "Festive",
    "Guru Nanak Jayanti",
    undefined,
    true,
  ),
  makeItem(
    "i13",
    "2026-11-27",
    "Festival Creative",
    "Offer",
    "Black Friday offer",
    undefined,
    true,
  ),
  makeItem("i14", "2026-11-21", "Story", "Offer", "Slots open for next month, DM BOOK"),
  makeItem(
    "i15",
    "2026-12-25",
    "Festival Creative",
    "Festive",
    "Christmas placeholder",
    undefined,
    true,
  ),
  makeItem(
    "i16",
    "2026-12-31",
    "Festival Creative",
    "Festive",
    "New Year placeholder",
    undefined,
    true,
  ),
];

const templates = [
  [
    "Client-getting Reel",
    "Reel",
    "Hook (2 s), proof montage, services line, CTA “DM BOOK for a free consultation”",
  ],
  ["Case study Reel", "Reel", "Problem, what we made, result, CTA"],
  [
    "Behind the Scenes Reel",
    "Reel",
    "Open on action. Show process, decisions and finished output.",
  ],
  ["Value Carousel", "Carousel", "“3 mistakes artists make...”, one idea per slide, CTA slide"],
  ["Offer post", "Post", "One clear service. One clear outcome. One CTA."],
  ["Festival creative", "Festival Creative", "Greeting, logo, no sales pitch"],
  ["Testimonial Story", "Story", "Quote, proof, client name, supporting frame"],
];

const savedReferences = [
  {
    label: "Trendzilla — Shark Tank sourcing",
    url: initialItems[1].references[0].url,
    type: "Raw footage (Drive)",
    pillar: "Proof",
    instruction: "Build the case study from the strongest artist moments.",
  },
  {
    label: "Trendzilla — Campaign OTN",
    url: initialItems[2].references[0].url,
    type: "Raw footage (Drive)",
    pillar: "Proof",
    instruction: "Show campaign range before individual details.",
  },
  {
    label: "RAD Event — Flow State",
    url: initialItems[3].references[0].url,
    type: "Raw footage (Drive)",
    pillar: "Proof",
    instruction: "Prioritize energy, crowd and brand presence.",
  },
  {
    label: "10KD behind the scenes",
    url: initialItems[4].references[0].url,
    type: "Raw footage (Drive)",
    pillar: "Behind the Scenes",
    instruction: "Use process footage. Keep cuts direct.",
  },
];

const initialLeads: Lead[] = [
  {
    id: "l1",
    date: "2026-11-16",
    source: "Organic",
    name: "Aarav Mehta",
    contact: "@aaravmusic",
    service: "Music video",
    budget: "₹75,000",
    status: "Qualified",
    followUp: "2026-11-20",
  },
  {
    id: "l2",
    date: "2026-11-17",
    source: "Referral",
    name: "Studio North",
    contact: "hello@studionorth.in",
    service: "Campaign edit",
    budget: "₹1,20,000",
    status: "Call booked",
    followUp: "2026-11-19",
  },
  {
    id: "l3",
    date: "2026-11-18",
    source: "Outreach",
    name: "Maya Rao",
    contact: "@mayarao.art",
    service: "Website",
    budget: "₹90,000",
    status: "New",
    followUp: "2026-11-21",
  },
  {
    id: "l4",
    date: "2026-11-19",
    source: "Ad",
    name: "Rhyme House",
    contact: "+91 90000 00000",
    service: "Monthly content",
    budget: "₹60,000/mo",
    status: "Closed",
    followUp: "2026-12-01",
  },
];

function Button({
  children,
  onClick,
  variant = "secondary",
  className = "",
  type = "button",
  disabled = false,
}: any) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn btn-${variant} ${className}`}
    >
      {children}
    </button>
  );
}
function Field({ label, required = false, children, className = "" }: any) {
  return (
    <label className={`field ${className}`}>
      <span>
        {label}
        {required && <b> REQUIRED</b>}
      </span>
      {children}
    </label>
  );
}
function Input(props: any) {
  return <input {...props} className={`input ${props.className || ""}`} />;
}
function Textarea(props: any) {
  return <textarea {...props} className={`input textarea ${props.className || ""}`} />;
}
function Select({ children, ...props }: any) {
  return (
    <select {...props} className={`input ${props.className || ""}`}>
      {children}
    </select>
  );
}
function Pill({ children, tone = "" }: any) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
function SectionTitle({ eyebrow, title, action }: any) {
  return (
    <div className="section-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {action}
    </div>
  );
}
function Empty({ title, text, action, onClick }: any) {
  return (
    <div className="empty">
      <span className="empty-index">00</span>
      <h2>{title}</h2>
      <p>{text}</p>
      <Button onClick={onClick}>{action}</Button>
    </div>
  );
}

function App() {
  const { user, profile, signOut, isSupabaseConfigured } = useAuth();
  const [demoMode, setDemoMode] = useState(!isSupabaseConfigured);
  const studio = useContentStudio(user?.id);

  const [screen, setScreen] = useState<Screen>("calendar");
  const [localItems, setLocalItems] = useState<Item[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem("aspire-items") || "null") || initialItems;
    } catch {
      return initialItems;
    }
  });
  const [localLeads, setLocalLeads] = useState<Lead[]>(initialLeads);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [month, setMonth] = useState("2026-11");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    type: "All",
    pillar: "All",
    status: "All",
    assignee: "All",
  });
  const [toast, setToast] = useState("");
  const [plannerStep, setPlannerStep] = useState(1);
  const [plannerMonth, setPlannerMonth] = useState("2026-12");
  const [plannerCounts, setPlannerCounts] = useState<Record<Pillar, number>>({
    Proof: 2,
    "Behind the Scenes": 2,
    Value: 3,
    People: 1,
    Offer: 2,
    Festive: 2,
  });
  const [search, setSearch] = useState("");

  const isConnected = isSupabaseConfigured && Boolean(user);
  const items = isConnected && studio.items.length > 0 ? studio.items : localItems;
  const leads = isConnected && studio.leads.length > 0 ? studio.leads : localLeads;
  const selected = items.find((i) => i.id === selectedId) || null;

  useEffect(() => {
    if (!isConnected) {
      sessionStorage.setItem("aspire-items", JSON.stringify(items));
    }
  }, [items, isConnected]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const monthItems = useMemo(
    () =>
      items.filter(
        (i) =>
          i.date.startsWith(month) &&
          (filters.type === "All" || i.type === filters.type) &&
          (filters.pillar === "All" || i.pillar === filters.pillar) &&
          (filters.status === "All" || i.status === filters.status) &&
          (filters.assignee === "All" || i.assignee === filters.assignee),
      ),
    [items, month, filters],
  );
  const ready = monthItems.filter((i) =>
    ["Approved", "Scheduled", "Posted"].includes(i.status),
  ).length;

  const updateItem = (id: string, patch: Partial<Item>) => {
    setLocalItems((v) => v.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    if (isConnected) {
      studio.updateItem(id, patch);
    }
  };

  const updateCopy = (id: string, key: keyof Item["copy"], value: string) => {
    setLocalItems((v) => v.map((i) => (i.id === id ? { ...i, copy: { ...i.copy, [key]: value } } : i)));
    if (isConnected) {
      studio.updateCopy(id, key, value);
    }
  };

  const openNew = async (preset?: Partial<Item>) => {
    if (isConnected) {
      const created = await studio.createItem(preset);
      if (created) setSelectedId(created.id);
    } else {
      const base = makeItem(
        `i${Date.now()}`,
        `${month}-01`,
        (preset?.type as ContentType) || "Reel",
        (preset?.pillar as Pillar) || "Proof",
        preset?.title || "Untitled item",
      );
      const next = { ...base, ...preset, id: base.id };
      setLocalItems((v) => [...v, next]);
      setSelectedId(next.id);
    }
  };

  const duplicate = (item: Item, nextMonth = false) => {
    const nextDate = nextMonth
      ? `${String(Number(item.date.slice(0, 4)) + (item.date.slice(5, 7) === "12" ? 1 : 0))}-${String(item.date.slice(5, 7) === "12" ? 1 : Number(item.date.slice(5, 7)) + 1).padStart(2, "0")}-${item.date.slice(8)}`
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
    setToast(nextMonth ? "Duplicated to next month." : "Item duplicated.");
  };

  const nav = [
    ["calendar", "Month overview"],
    ["board", "Week board"],
    ["references", "Reference library"],
    ["templates", "Templates"],
    ["planner", "Monthly planner"],
    ["leads", "Lead tracker"],
  ] as const;

  return (
    <div className="app-shell">
      {isSupabaseConfigured && !user && !demoMode && (
        <AuthView onBypassDemo={() => setDemoMode(true)} />
      )}
      <aside className="sidebar">
        <div className="brand">
          <img src="/aspire-globe.svg" alt="Aspire World" />
          <div>
            <strong>ASPIRE WORLD</strong>
            <span>CONTENT STUDIO</span>
          </div>
        </div>
        <nav aria-label="Primary navigation">
          {nav.map(([id, label], index) => (
            <button
              key={id}
              className={screen === id ? "active" : ""}
              onClick={() => {
                setScreen(id);
                setSelectedId(null);
              }}
            >
              <span>0{index + 1}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="tagline">
          <span>CREATE.</span>
          <span>CONNECT.</span>
          <span>ASPIRE.</span>
        </div>
        <div className="profile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className="avatar">
              {profile?.avatar_initials || (user?.email ? user.email.slice(0, 2).toUpperCase() : "AK")}
            </span>
            <div>
              <strong>{profile?.full_name || (user?.email ? user.email.split('@')[0] : "Aryan Kapoor")}</strong>
              <small>{profile?.role ? `${profile.role.toUpperCase()} / STRATEGIST` : (isConnected ? "AUTHENTICATED" : "DEMO / LOCAL")}</small>
            </div>
          </div>
          {user && (
            <button 
              onClick={() => signOut()}
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
            <Button variant="primary" onClick={() => openNew()}>
              + NEW ITEM
            </Button>
          </div>
        </header>
        <div className="workspace">
          {screen === "calendar" && (
            <CalendarView
              items={monthItems}
              month={month}
              setMonth={setMonth}
              filters={filters}
              setFilters={setFilters}
              filtersOpen={filtersOpen}
              setFiltersOpen={setFiltersOpen}
              ready={ready}
              onOpen={setSelectedId}
              onMove={(id, date) => updateItem(id, { date })}
              onNew={() => openNew()}
            />
          )}
          {screen === "board" && (
            <BoardView
              items={items.filter((i) => i.date.startsWith(month))}
              onOpen={setSelectedId}
              onStatus={(id, status) => updateItem(id, { status })}
            />
          )}
          {screen === "references" && (
            <ReferenceView
              search={search}
              setSearch={setSearch}
              onUse={(ref: any) => {
                const target = items[0];
                updateItem(target.id, { references: [...target.references, ref] });
                setSelectedId(target.id);
                setToast("Reference added to item.");
              }}
            />
          )}
          {screen === "templates" && <TemplatesView onUse={(template: any) => openNew(template)} />}
          {screen === "planner" && (
            <PlannerView
              step={plannerStep}
              setStep={setPlannerStep}
              month={plannerMonth}
              setMonth={setPlannerMonth}
              counts={plannerCounts}
              setCounts={setPlannerCounts}
              onGenerate={() => {
                generatePlan(plannerMonth, plannerCounts, setItems);
                setMonth(plannerMonth);
                setScreen("calendar");
                setToast("Month plan generated.");
              }}
            />
          )}
          {screen === "leads" && (
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
                      date: "2026-11-20",
                      source: "Organic",
                      name: "New lead",
                      contact: "",
                      service: "",
                      budget: "",
                      status: "New",
                      followUp: "",
                    },
                  ]);
                }
              }}
              onUpdateLead={(leadId: string, patch: any) => {
                if (isConnected) {
                  studio.updateLead(leadId, patch);
                }
              }}
            />
          )}
        </div>
      </main>
      {selected && (
        <DetailDrawer
          item={selected}
          onClose={() => setSelectedId(null)}
          onUpdate={(patch: any) => updateItem(selected.id, patch)}
          onCopy={(key: any, value: string) => updateCopy(selected.id, key, value)}
          onDuplicate={() => duplicate(selected)}
          onDuplicateNext={() => duplicate(selected, true)}
          setToast={setToast}
          currentUserName={profile?.full_name || (user?.email ? user.email.split('@')[0] : "Aryan Kapoor")}
          onAddComment={(text: string) => {
            const author = profile?.full_name || (user?.email ? user.email.split('@')[0] : "Aryan Kapoor");
            if (isConnected) {
              studio.addComment(selected.id, text, author);
            } else {
              updateItem(selected.id, {
                comments: [...selected.comments, { author, text, time: "Now" }],
              });
            }
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function CalendarView({
  items,
  month,
  setMonth,
  filters,
  setFilters,
  filtersOpen,
  setFiltersOpen,
  ready,
  onOpen,
  onMove,
  onNew,
}: any) {
  const [year, mon] = month.split("-").map(Number);
  const days = new Date(year, mon, 0).getDate();
  const start = new Date(year, mon - 1, 1).getDay();
  const cells = Array(start)
    .fill(null)
    .concat(Array.from({ length: days }, (_, i) => i + 1));
  const monthLabel = new Date(year, mon - 1)
    .toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    .toUpperCase();
  const change = (d: number) => {
    const n = new Date(year, mon - 1 + d, 1);
    setMonth(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`);
  };
  return (
    <>
      <SectionTitle
        eyebrow="CONTENT CALENDAR"
        title={monthLabel}
        action={
          <div className="month-actions">
            <Button onClick={() => change(-1)}>←</Button>
            <Button onClick={() => change(1)}>→</Button>
          </div>
        }
      />
      <div className="deadline">
        <div>
          <span className="deadline-mark">20</span>
          <p>
            <strong>NEXT MONTH'S PLAN LOCKS ON THE 20TH.</strong>
            <br />
            Creatives due by the 25th.
          </p>
        </div>
        <Button onClick={() => setFiltersOpen(!filtersOpen)}>
          FILTERS{" "}
          <span className="filter-count">
            {Object.values(filters).filter((x) => x !== "All").length}
          </span>
        </Button>
      </div>
      {filtersOpen && (
        <div className="filter-row">
          {(["type", "pillar", "status", "assignee"] as const).map((k) => (
            <Field key={k} label={k}>
              <Select
                value={filters[k]}
                onChange={(e: any) => setFilters({ ...filters, [k]: e.target.value })}
              >
                <option>All</option>
                {(k === "type"
                  ? types
                  : k === "pillar"
                    ? pillars
                    : k === "status"
                      ? statuses
                      : ["Unassigned", "Aryan Kapoor", "Mira Shah"]
                ).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Select>
            </Field>
          ))}
        </div>
      )}
      <div className="progress-row">
        <div>
          <strong>
            {ready} OF {items.length} ITEMS READY
          </strong>
          <span>Approved, scheduled or posted</span>
        </div>
        <div className="progress">
          <i style={{ width: `${items.length ? (ready / items.length) * 100 : 0}%` }} />
        </div>
        <button className="view-toggle active">MONTH</button>
        <button className="view-toggle">LIST</button>
      </div>
      <div className="calendar">
        <div className="weekdays">
          {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {cells.map((day, index) =>
            day ? (
              <div
                key={day}
                className="day"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) =>
                  onMove(
                    e.dataTransfer.getData("item-id"),
                    `${month}-${String(day).padStart(2, "0")}`,
                  )
                }
              >
                <span className="day-num">{String(day).padStart(2, "0")}</span>
                <div className="day-items">
                  {items
                    .filter((i: any) => Number(i.date.slice(8)) === day)
                    .map((item: any) => (
                      <button
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("item-id", item.id)}
                        onClick={() => onOpen(item.id)}
                        key={item.id}
                        className={`calendar-item pillar-${slug(item.pillar)}`}
                      >
                        <span>
                          {item.type.toUpperCase()} ·{" "}
                          <b className={`status-${slug(item.status)}`}>
                            {item.status.toUpperCase()}
                          </b>
                        </span>
                        <strong>{item.title}</strong>
                        {missing(item) && <i title="Missing required details" />}
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <div key={`e${index}`} className="day empty-day" />
            ),
          )}
        </div>
      </div>
      {!items.length && (
        <Empty
          title="NO ITEMS THIS MONTH"
          text="Build the month from a template or start with one clear brief."
          action="CREATE FIRST ITEM"
          onClick={onNew}
        />
      )}
    </>
  );
}

function BoardView({ items, onOpen, onStatus }: any) {
  return (
    <>
      <SectionTitle
        eyebrow="PRODUCTION FLOW"
        title="WEEK BOARD"
        action={<Pill>{items.length} ACTIVE ITEMS</Pill>}
      />
      <div className="board">
        {statuses.map((status, index) => (
          <section
            className="board-column"
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onStatus(e.dataTransfer.getData("item-id"), status)}
          >
            <header>
              <span>0{index + 1}</span>
              <strong>{status.toUpperCase()}</strong>
              <small>{items.filter((i: any) => i.status === status).length}</small>
            </header>
            <div className="board-stack">
              {items
                .filter((i: any) => i.status === status)
                .map((item: any) => (
                  <button
                    key={item.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("item-id", item.id)}
                    className="board-card"
                    onClick={() => onOpen(item.id)}
                  >
                    <span className={`pillar-line pillar-${slug(item.pillar)}`} />
                    <small>
                      {item.date.slice(8)} NOV · {item.type.toUpperCase()}
                    </small>
                    <strong>{item.title}</strong>
                    <div>
                      <Pill>{item.pillar}</Pill>
                      {missing(item) && <i className="missing-dot" />}
                    </div>
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function ReferenceView({ search, setSearch, onUse }: any) {
  const refs = savedReferences.filter((r) => r.label.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <SectionTitle
        eyebrow="SOURCE MATERIAL"
        title="REFERENCE LIBRARY"
        action={<Button>SAVE REFERENCE</Button>}
      />
      <div className="library-tools">
        <Input
          aria-label="Search references"
          placeholder="Search saved references"
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
        />
        <Pill>{refs.length} SAVED</Pill>
      </div>
      <div className="reference-grid">
        {refs.map((r, index) => (
          <article className="reference-card" key={r.url}>
            <div className="ref-preview">
              <span>0{index + 1}</span>
              <strong>
                RAW
                <br />
                FOOTAGE
              </strong>
            </div>
            <div className="ref-body">
              <div>
                <Pill>{r.pillar}</Pill>
                <Pill>{r.type}</Pill>
              </div>
              <h2>{r.label}</h2>
              <p>{r.instruction}</p>
              <div className="ref-actions">
                <a href={r.url} target="_blank" rel="noreferrer">
                  OPEN SOURCE ↗
                </a>
                <Button onClick={() => onUse(r)}>USE IN ITEM</Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function TemplatesView({ onUse }: any) {
  return (
    <>
      <SectionTitle
        eyebrow="REUSABLE SYSTEMS"
        title="BRIEF TEMPLATES"
        action={<Button>+ NEW TEMPLATE</Button>}
      />
      <p className="page-intro">
        Start with a proven structure. Replace every placeholder before production.
      </p>
      <div className="template-grid">
        {templates.map((t, index) => (
          <article className="template-card" key={t[0]}>
            <span className="template-index">0{index + 1}</span>
            <Pill>{t[1]}</Pill>
            <h2>{t[0]}</h2>
            <p>{t[2]}</p>
            <div className="template-footer">
              <span>{t[1] === "Reel" ? "6" : "4"} CHECKS INCLUDED</span>
              <Button
                onClick={() =>
                  onUse({
                    title: t[0],
                    type: t[1],
                    brief: t[2],
                    pillar: t[0].includes("Offer")
                      ? "Offer"
                      : t[0].includes("Festival")
                        ? "Festive"
                        : t[0].includes("Behind")
                          ? "Behind the Scenes"
                          : t[0].includes("Value")
                            ? "Value"
                            : "Proof",
                  })
                }
              >
                USE TEMPLATE
              </Button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function PlannerView({ step, setStep, month, setMonth, counts, setCounts, onGenerate }: any) {
  const total = Object.values(counts).reduce((a: any, b: any) => a + b, 0) as number;
  return (
    <>
      <SectionTitle
        eyebrow="MONTHLY PLANNER"
        title="PLAN NEXT MONTH"
        action={<Pill>STEP 0{step} / 04</Pill>}
      />
      <div className="planner">
        <aside>
          {["PICK THE MONTH", "SET THE MIX", "GENERATE DATES", "REVIEW PLAN"].map((x, i) => (
            <button
              className={step === i + 1 ? "active" : ""}
              onClick={() => setStep(i + 1)}
              key={x}
            >
              <span>0{i + 1}</span>
              {x}
            </button>
          ))}
        </aside>
        <section>
          {step === 1 && (
            <>
              <span className="eyebrow">STEP ONE</span>
              <h2>SELECT THE MONTH</h2>
              <p>Plan before the lock date. December is ready for the next cycle.</p>
              <Field label="Planning month">
                <Input type="month" value={month} onChange={(e: any) => setMonth(e.target.value)} />
              </Field>
              <Button variant="primary" onClick={() => setStep(2)}>
                CONTINUE
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <span className="eyebrow">STEP TWO</span>
              <h2>SET THE CONTENT MIX</h2>
              <p>Set an intentional volume for every pillar.</p>
              <div className="count-list">
                {pillars.map((p) => (
                  <div key={p}>
                    <span className={`pillar-dot pillar-${slug(p)}`} />
                    <strong>{p}</strong>
                    <div>
                      <Button
                        onClick={() => setCounts({ ...counts, [p]: Math.max(0, counts[p] - 1) })}
                      >
                        −
                      </Button>
                      <span>{counts[p]}</span>
                      <Button onClick={() => setCounts({ ...counts, [p]: counts[p] + 1 })}>
                        +
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="primary" onClick={() => setStep(3)}>
                BUILD DATE PATTERN
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <span className="eyebrow">STEP THREE</span>
              <h2>GENERATE THE DATES</h2>
              <p>
                {total} empty cards will be placed across Monday, Wednesday, Friday and Saturday.
              </p>
              <div className="pattern">
                <span>MON</span>
                <span>WED</span>
                <span>FRI</span>
                <span>SAT</span>
              </div>
              <Button variant="primary" onClick={() => setStep(4)}>
                PREVIEW PLAN
              </Button>
            </>
          )}
          {step === 4 && (
            <>
              <span className="eyebrow">STEP FOUR</span>
              <h2>REVIEW THE PLAN</h2>
              <p>{total} cards. Six pillars. One production rhythm.</p>
              <div className="review-stats">
                <div>
                  <strong>{total}</strong>
                  <span>TOTAL ITEMS</span>
                </div>
                <div>
                  <strong>4</strong>
                  <span>POSTING DAYS</span>
                </div>
                <div>
                  <strong>{month}</strong>
                  <span>MONTH</span>
                </div>
              </div>
              <Button variant="primary" onClick={onGenerate}>
                GENERATE MONTH
              </Button>
            </>
          )}
        </section>
        <div className="planner-preview">
          <span>OUTPUT PREVIEW</span>
          <strong>{total}</strong>
          <p>EMPTY CARDS</p>
          <small>MON / WED / FRI / SAT</small>
        </div>
      </div>
    </>
  );
}

function LeadsView({ leads, setLeads, onAddLead, onUpdateLead }: any) {
  const add = () => {
    if (onAddLead) {
      onAddLead();
    } else {
      setLeads([
        ...leads,
        {
          id: `l${Date.now()}`,
          date: "2026-11-20",
          source: "Organic",
          name: "New lead",
          contact: "",
          service: "",
          budget: "",
          status: "New",
          followUp: "",
        },
      ]);
    }
  };
  const set = (id: string, key: string, value: string) => {
    if (onUpdateLead) {
      onUpdateLead(id, { [key]: value });
    }
    setLeads(leads.map((l: any) => (l.id === id ? { ...l, [key]: value } : l)));
  };
  return (
    <>
      <SectionTitle
        eyebrow="CLIENT PIPELINE"
        title="LEAD TRACKER"
        action={
          <Button variant="primary" onClick={add}>
            + ADD LEAD
          </Button>
        }
      />
      <div className="lead-stats">
        {[
          ["LEADS THIS WEEK", leads.length],
          ["QUALIFIED", leads.filter((l: any) => l.status === "Qualified").length],
          ["CALLS BOOKED", leads.filter((l: any) => l.status === "Call booked").length],
          ["CLOSED", leads.filter((l: any) => l.status === "Closed").length],
        ].map(([a, b]) => (
          <div key={a}>
            <strong>{String(b).padStart(2, "0")}</strong>
            <span>{a}</span>
          </div>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {[
                "DATE",
                "SOURCE",
                "NAME",
                "CONTACT",
                "SERVICE NEEDED",
                "BUDGET",
                "STATUS",
                "FOLLOW-UP",
              ].map((x) => (
                <th key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((l: any) => (
              <tr key={l.id}>
                <td>
                  <Input
                    type="date"
                    value={l.date}
                    onChange={(e: any) => set(l.id, "date", e.target.value)}
                  />
                </td>
                <td>
                  <Select
                    value={l.source}
                    onChange={(e: any) => set(l.id, "source", e.target.value)}
                  >
                    {["Ad", "Organic", "Outreach", "Referral"].map((x) => (
                      <option>{x}</option>
                    ))}
                  </Select>
                </td>
                {["name", "contact", "service", "budget"].map((k) => (
                  <td key={k}>
                    <Input value={l[k]} onChange={(e: any) => set(l.id, k, e.target.value)} />
                  </td>
                ))}
                <td>
                  <Select
                    value={l.status}
                    onChange={(e: any) => set(l.id, "status", e.target.value)}
                  >
                    {["New", "Qualified", "Call booked", "Closed", "Lost"].map((x) => (
                      <option>{x}</option>
                    ))}
                  </Select>
                </td>
                <td>
                  <Input
                    type="date"
                    value={l.followUp}
                    onChange={(e: any) => set(l.id, "followUp", e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DetailDrawer({
  item,
  onClose,
  onUpdate,
  onCopy,
  onDuplicate,
  onDuplicateNext,
  setToast,
  currentUserName,
  onAddComment,
}: any) {
  const [tab, setTab] = useState("brief");
  const [comment, setComment] = useState("");
  const copyBrief = () => {
    const text = `${item.title}\n${item.type} · ${item.pillar} · ${item.date} ${item.time}\n\nGOAL\n${item.goal}\n\nBRIEF\n${item.brief}\n\nON-SCREEN TEXT\n${item.copy.onScreen}\n\nCAPTION\n${item.copy.caption}\n\nCTA\n${item.copy.cta}\n\nSPECS\n${item.specs.join("\n")}`;
    navigator.clipboard?.writeText(text);
    setToast("Brief copied for sharing.");
  };
  const addComment = () => {
    if (!comment.trim()) return;
    if (onAddComment) {
      onAddComment(comment);
    } else {
      onUpdate({
        comments: [...item.comments, { author: currentUserName || "Aryan Kapoor", text: comment, time: "Now" }],
      });
    }
    setComment("");
  };
  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(e: any) => e.target === e.currentTarget && onClose()}
    >
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Content item detail">
        <header>
          <div>
            <Pill tone={`pillar-${slug(item.pillar)}`}>{item.pillar}</Pill>
            {item.verifyDate && <Pill tone="verify">VERIFY DATE</Pill>}
            <h2>{item.title}</h2>
            <span>
              {item.date} · {item.time}
            </span>
          </div>
          <button className="close" onClick={onClose} aria-label="Close detail">
            ×
          </button>
        </header>
        <div className="drawer-toolbar">
          <Button onClick={copyBrief}>COPY BRIEF</Button>
          <Button onClick={onDuplicate}>DUPLICATE</Button>
          <Button onClick={onDuplicateNext}>NEXT MONTH</Button>
        </div>
        <nav className="tabs">
          {["brief", "copy", "shots", "assets", "review"].map((x) => (
            <button className={tab === x ? "active" : ""} onClick={() => setTab(x)}>
              {x.toUpperCase()}
            </button>
          ))}
        </nav>
        <div className="drawer-content">
          {tab === "brief" && (
            <>
              <div className="form-grid">
                <Field label="TITLE" required className="span-2">
                  <Input
                    value={item.title}
                    onChange={(e: any) => onUpdate({ title: e.target.value })}
                  />
                </Field>
                <Field label="CONTENT TYPE" required>
                  <Select
                    value={item.type}
                    onChange={(e: any) =>
                      onUpdate({ type: e.target.value, specs: specMap[e.target.value] })
                    }
                  >
                    {types.map((x) => (
                      <option>{x}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="PILLAR" required>
                  <Select
                    value={item.pillar}
                    onChange={(e: any) => onUpdate({ pillar: e.target.value })}
                  >
                    {pillars.map((x) => (
                      <option>{x}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="POST DATE" required>
                  <Input
                    type="date"
                    value={item.date}
                    onChange={(e: any) => onUpdate({ date: e.target.value })}
                  />
                </Field>
                <Field label="TIME">
                  <Input
                    type="time"
                    value={item.time}
                    onChange={(e: any) => onUpdate({ time: e.target.value })}
                  />
                </Field>
                <Field label="ASSIGNEE" required>
                  <Select
                    value={item.assignee}
                    onChange={(e: any) => onUpdate({ assignee: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    <option>Aryan Kapoor</option>
                    <option>Mira Shah</option>
                  </Select>
                </Field>
                <Field label="STATUS">
                  <Select
                    value={item.status}
                    onChange={(e: any) => onUpdate({ status: e.target.value })}
                  >
                    {statuses.map((x) => (
                      <option>{x}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="GOAL">
                  <Select
                    value={item.goal}
                    onChange={(e: any) => onUpdate({ goal: e.target.value })}
                  >
                    {["Get Clients", "Build Trust", "Festive", "Product/Merch"].map((x) => (
                      <option>{x}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="PRIORITY">
                  <Select
                    value={item.priority}
                    onChange={(e: any) => onUpdate({ priority: e.target.value })}
                  >
                    {["Low", "Normal", "High"].map((x) => (
                      <option>{x}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="BRIEF" required className="span-2">
                  <Textarea
                    rows={5}
                    value={item.brief}
                    placeholder="State the objective, sequence and outcome."
                    onChange={(e: any) => onUpdate({ brief: e.target.value })}
                  />
                </Field>
              </div>
              <DetailReferences item={item} onUpdate={onUpdate} />
              <div className="spec-block">
                <span className="eyebrow">AUTO-ATTACHED SPECS</span>
                <h3>{item.type.toUpperCase()}</h3>
                <div>
                  {item.specs.map((x: string) => (
                    <Pill key={x}>{x}</Pill>
                  ))}
                </div>
              </div>
            </>
          )}
          {tab === "copy" && (
            <div className="copy-fields">
              <Field label="ON-SCREEN TEXT — ONE SCENE OR SLIDE PER LINE" required>
                <Textarea
                  rows={6}
                  value={item.copy.onScreen}
                  onChange={(e: any) => onCopy("onScreen", e.target.value)}
                />
              </Field>
              <Field label="CAPTION" required>
                <Textarea
                  rows={6}
                  value={item.copy.caption}
                  onChange={(e: any) => onCopy("caption", e.target.value)}
                />
              </Field>
              <Field label="HASHTAGS — MAX 5">
                <Input
                  value={item.copy.hashtags}
                  onChange={(e: any) =>
                    onCopy("hashtags", e.target.value.split(" ").slice(0, 5).join(" "))
                  }
                />
              </Field>
              <Field label="CALL TO ACTION" required>
                <Input value={item.copy.cta} onChange={(e: any) => onCopy("cta", e.target.value)} />
              </Field>
              <Field label="VOICEOVER OR SCRIPT">
                <Textarea
                  rows={8}
                  value={item.copy.script}
                  onChange={(e: any) => onCopy("script", e.target.value)}
                />
              </Field>
            </div>
          )}
          {tab === "shots" && (
            <div>
              <div className="shot-head">
                <div>
                  <span className="eyebrow">PRODUCTION ORDER</span>
                  <h3>SHOT / SLIDE LIST</h3>
                </div>
                <Button
                  onClick={() =>
                    onUpdate({
                      shots: [
                        ...item.shots,
                        {
                          order: String(item.shots.length + 1).padStart(2, "0"),
                          visual: "",
                          text: "",
                        },
                      ],
                    })
                  }
                >
                  + ADD ROW
                </Button>
              </div>
              {item.shots.map((s: any, index: number) => (
                <div className="shot-row" key={index}>
                  <Input
                    value={s.order}
                    onChange={(e: any) => {
                      const n = [...item.shots];
                      n[index] = { ...s, order: e.target.value };
                      onUpdate({ shots: n });
                    }}
                  />
                  <Textarea
                    rows={2}
                    placeholder="Visual description"
                    value={s.visual}
                    onChange={(e: any) => {
                      const n = [...item.shots];
                      n[index] = { ...s, visual: e.target.value };
                      onUpdate({ shots: n });
                    }}
                  />
                  <Textarea
                    rows={2}
                    placeholder="Text on screen"
                    value={s.text}
                    onChange={(e: any) => {
                      const n = [...item.shots];
                      n[index] = { ...s, text: e.target.value };
                      onUpdate({ shots: n });
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          {tab === "assets" && (
            <div>
              <div className="upload">
                <span>UPLOAD DRAFT OR FINAL</span>
                <strong>DROP FILES HERE</strong>
                <p>Label each version clearly: v1, v2 or final.</p>
                <Input
                  type="file"
                  onChange={(e: any) => {
                    const f = e.target.files?.[0];
                    if (f)
                      onUpdate({
                        assets: [
                          ...item.assets,
                          { name: f.name, version: `v${item.assets.length + 1}` },
                        ],
                      });
                  }}
                />
              </div>
              <div className="asset-list">
                {item.assets.map((a: any) => (
                  <div>
                    <span>{a.version.toUpperCase()}</span>
                    <strong>{a.name}</strong>
                    <small>Added this session</small>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === "review" && (
            <>
              <span className="eyebrow">PRE-SUBMISSION</span>
              <h3>QUALITY CHECKLIST</h3>
              <div className="checklist">
                {item.checklist.map((c: any, index: number) => (
                  <label>
                    <input
                      type="checkbox"
                      checked={c.done}
                      onChange={() => {
                        const n = [...item.checklist];
                        n[index] = { ...c, done: !c.done };
                        onUpdate({ checklist: n });
                      }}
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
              <div className="comments">
                <span className="eyebrow">REVIEW THREAD</span>
                {item.comments.map((c: any) => (
                  <div>
                    <span className="avatar">
                      {c.author
                        .split(" ")
                        .map((x: string) => x[0])
                        .join("")}
                    </span>
                    <p>
                      <strong>{c.author}</strong>
                      <small>{c.time}</small>
                      {c.text}
                    </p>
                  </div>
                ))}
                <Field label="ADD COMMENT">
                  <Textarea
                    rows={3}
                    value={comment}
                    onChange={(e: any) => setComment(e.target.value)}
                  />
                </Field>
                <Button onClick={addComment}>POST COMMENT</Button>
              </div>
              <div className="approval">
                <Button
                  onClick={() => {
                    onUpdate({ status: "In Design/Edit" });
                    setToast("Changes requested.");
                  }}
                >
                  REQUEST CHANGES
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    onUpdate({ status: "Approved" });
                    setToast("Item approved.");
                  }}
                >
                  APPROVE
                </Button>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function DetailReferences({ item, onUpdate }: any) {
  const add = () =>
    onUpdate({
      references: [
        ...item.references,
        { url: "", label: "New reference", instruction: "", type: "Inspiration" },
      ],
    });
  return (
    <div className="detail-section">
      <div className="shot-head">
        <div>
          <span className="eyebrow">SOURCE MATERIAL</span>
          <h3>REFERENCES</h3>
        </div>
        <Button onClick={add}>+ ADD LINK</Button>
      </div>
      {item.references.length ? (
        item.references.map((r: any, index: number) => (
          <div className="reference-row" key={index}>
            <Select
              value={r.type}
              onChange={(e: any) => {
                const n = [...item.references];
                n[index] = { ...r, type: e.target.value };
                onUpdate({ references: n });
              }}
            >
              {["Inspiration", "Raw footage (Drive)", "Brand asset", "Competitor/Ad Library"].map(
                (x) => (
                  <option>{x}</option>
                ),
              )}
            </Select>
            <Input
              value={r.label}
              onChange={(e: any) => {
                const n = [...item.references];
                n[index] = { ...r, label: e.target.value };
                onUpdate({ references: n });
              }}
            />
            <Input
              value={r.url}
              placeholder="https://"
              onChange={(e: any) => {
                const n = [...item.references];
                n[index] = { ...r, url: e.target.value };
                onUpdate({ references: n });
              }}
            />
            <Input
              value={r.instruction}
              placeholder="What should the editor copy?"
              onChange={(e: any) => {
                const n = [...item.references];
                n[index] = { ...r, instruction: e.target.value };
                onUpdate({ references: n });
              }}
            />
          </div>
        ))
      ) : (
        <p className="muted">No references added. Add one clear source before production.</p>
      )}
    </div>
  );
}

function generatePlan(month: string, counts: Record<Pillar, number>, setItems: any) {
  const [y, m] = month.split("-").map(Number);
  const valid = Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => i + 1).filter((d) =>
    [1, 3, 5, 6].includes(new Date(y, m - 1, d).getDay()),
  );
  let n = 0;
  const created: Item[] = [];
  pillars.forEach((p) => {
    for (let i = 0; i < counts[p]; i++) {
      const day = valid[n % valid.length];
      created.push(
        makeItem(
          `i${Date.now()}-${n}`,
          `${month}-${String(day).padStart(2, "0")}`,
          "Reel",
          p,
          `${p} content placeholder`,
        ),
      );
      n++;
    }
  });
  setItems((v: Item[]) => [...v, ...created]);
}
const slug = (x: string) => x.toLowerCase().replaceAll(" ", "-").replaceAll("/", "-");
const missing = (i: Item) => !i.assignee || !i.copy.onScreen || !i.references.length;
export default App;
