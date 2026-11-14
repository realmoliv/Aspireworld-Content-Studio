# Aspire World — Content Studio

A production-ready creative operations dashboard built for **Aspire World**. It streamlines content planning, multi-format production pipelines (Reels, Carousels, Stories, Festival Creatives), asset versioning with cloud storage, reference library management, and client lead tracking.

![Aspire World Content Studio](public/aspire-logo-white.svg)

---

## Tech Stack

- **Frontend Framework**: [React 19](https://react.dev/) + [React DOM 19](https://react.dev/)
- **Routing**: [React Router v7](https://reactrouter.com/) (Deep-linkable paths: `/calendar`, `/board`, `/leads`, `/planner`, `/items/:id`)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + Custom Design Tokens (`Barlow`, `Barlow Condensed`, `Bebas Neue`)
- **Backend & Database**: [Supabase](https://supabase.com/)
  - **Auth**: Email & password authentication with Role-Based Access Control (`admin`, `editor`, `reviewer`)
  - **PostgreSQL**: Normalized schema for items, references, shots, checklist, comments, leads, and profiles
  - **Storage**: `content-assets` bucket for video/image draft and final uploads (up to 50MB) with signed URLs
- **Build Tooling**: [Vite 8](https://vite.dev/) + [TypeScript 5.9](https://www.typescriptlang.org/)
- **Hosting**: [Vercel](https://vercel.com/) with native SPA rewriting

---

## Project Structure

```
├── public/                 # Static assets (favicons, SVGs, robots.txt)
├── src/
│   ├── components/
│   │   ├── layout/         # AppLayout (Sidebar, Topbar, navigation, profile)
│   │   ├── ui/             # Atomic design system (Button, Field, Input, Select, Pill, Empty)
│   │   ├── AssetUploadManager.tsx # Real cloud file uploads with v1/v2/final versioning
│   │   └── AuthView.tsx    # Email sign-in and registration modal
│   ├── constants/          # Presets, content pillars, specs, checklist defaults
│   ├── hooks/
│   │   ├── useAuth.ts      # Session management and role checking (admin/editor/reviewer)
│   │   └── useContentStudio.ts # Supabase data layer with optimistic UI updates
│   ├── lib/
│   │   ├── database.types.ts # TypeScript definitions matching PostgreSQL schema
│   │   ├── storage.ts      # Cloud storage upload, signed URL generator, delete handler
│   │   └── supabase.ts     # Supabase client initialization
│   ├── types/              # Domain TypeScript interfaces (Item, Lead, Asset, etc.)
│   ├── views/              # Feature screens
│   │   ├── BoardView.tsx   # Week Kanban board
│   │   ├── CalendarView.tsx# Content calendar with drag-and-drop scheduling
│   │   ├── DetailDrawer.tsx# 5-tab item inspector (Brief, Copy, Shots, Assets, Review)
│   │   ├── LeadsView.tsx   # Client pipeline lead tracker
│   │   ├── PlannerView.tsx # 4-step monthly volume & pattern planner
│   │   ├── ReferenceView.tsx # Searchable inspiration & Drive footage library
│   │   └── TemplatesView.tsx # Reusable content brief templates
│   ├── App.tsx             # Root router and application state orchestration
│   ├── index.css           # Global CSS variables, typography, and Tailwind base layers
│   └── main.tsx            # React application entrypoint
├── supabase/
│   ├── migrations/         # Auto-deployed migrations via Supabase GitHub integration
│   │   ├── 20261114000000_init.sql    # Tables, RLS policies, auto-profile trigger
│   │   └── 20261114000001_storage.sql # Storage bucket and security policies
│   └── seed.sql            # Initial November 2026 content items and leads
├── vercel.json             # Vercel deployment configuration with SPA route rewrite
└── vite.config.ts          # Clean Vite 8 configuration
```

---

## Local Development

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v9+

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/realmoliv/Aspireworld-Content-Studio.git
cd Aspireworld-Content-Studio

# Install dependencies
pnpm install
```

### 3. Environment Variables
Copy the template and fill in your Supabase project credentials:
```bash
cp .env.example .env
```
Inside `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 4. Run Development Server
```bash
pnpm dev
```
Open [http://localhost:8443](http://localhost:8443) in your browser.

### 5. Typecheck & Build
```bash
# Verify TypeScript types
pnpm run typecheck

# Build production bundle
pnpm run build

# Preview production build locally
pnpm run preview
```

---

## Deployment to Vercel

1. Push your code to your GitHub repository.
2. In [Vercel](https://vercel.com/new), select **Import Project** and pick `realmoliv/Aspireworld-Content-Studio`.
3. Framework Preset: **Vite** (automatically detected).
4. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**. Vercel will build and assign your production URL.

---

## License

Proprietary — Aspire World. All rights reserved.
