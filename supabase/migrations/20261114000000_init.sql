-- ============================================================
-- Aspire World Content Studio — Full Supabase Migration
-- ============================================================

-- ************************************************************
-- 1. TABLES
-- ************************************************************

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT        NOT NULL,
  role            TEXT        NOT NULL DEFAULT 'editor'
                              CHECK (role IN ('admin', 'editor', 'reviewer')),
  avatar_initials TEXT        NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- items ----------
CREATE TABLE IF NOT EXISTS public.items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT        NOT NULL,
  content_type    TEXT        NOT NULL
                              CHECK (content_type IN (
                                'Reel', 'Post', 'Carousel', 'Story',
                                'Story series', 'Festival Creative'
                              )),
  pillar          TEXT        NOT NULL
                              CHECK (pillar IN (
                                'Proof', 'Behind the Scenes', 'Value',
                                'People', 'Offer', 'Festive'
                              )),
  goal            TEXT        NOT NULL DEFAULT 'Build Trust',
  post_date       DATE        NOT NULL,
  post_time       TIME        NOT NULL DEFAULT '18:30',
  status          TEXT        NOT NULL DEFAULT 'Idea'
                              CHECK (status IN (
                                'Idea', 'Briefed', 'In Design/Edit',
                                'In Review', 'Approved', 'Scheduled', 'Posted'
                              )),
  priority        TEXT        NOT NULL DEFAULT 'Normal'
                              CHECK (priority IN ('Low', 'Normal', 'High')),
  brief           TEXT        NOT NULL DEFAULT '',
  copy_on_screen  TEXT        NOT NULL DEFAULT '',
  copy_caption    TEXT        NOT NULL DEFAULT '',
  copy_hashtags   TEXT        NOT NULL DEFAULT '',
  copy_cta        TEXT        NOT NULL DEFAULT '',
  copy_script     TEXT        NOT NULL DEFAULT '',
  verify_date     BOOLEAN     NOT NULL DEFAULT false,
  assignee_id     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by      UUID        NOT NULL REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- item_references ----------
CREATE TABLE IF NOT EXISTS public.item_references (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  url         TEXT NOT NULL DEFAULT '',
  instruction TEXT NOT NULL DEFAULT '',
  ref_type    TEXT NOT NULL DEFAULT 'Inspiration',
  sort_order  INT  NOT NULL DEFAULT 0
);

-- ---------- item_shots ----------
CREATE TABLE IF NOT EXISTS public.item_shots (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id        UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  shot_order     TEXT NOT NULL DEFAULT '01',
  visual         TEXT NOT NULL DEFAULT '',
  text_on_screen TEXT NOT NULL DEFAULT '',
  sort_order     INT  NOT NULL DEFAULT 0
);

-- ---------- item_assets ----------
CREATE TABLE IF NOT EXISTS public.item_assets (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID        NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  file_name     TEXT        NOT NULL,
  version_label TEXT        NOT NULL DEFAULT 'v1',
  storage_path  TEXT,          -- nullable, for Phase 2
  mime_type     TEXT,          -- nullable
  file_size     BIGINT,        -- nullable
  uploaded_by   UUID        REFERENCES public.profiles(id),
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- item_checklist ----------
CREATE TABLE IF NOT EXISTS public.item_checklist (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    UUID    NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  label      TEXT    NOT NULL,
  done       BOOLEAN NOT NULL DEFAULT false,
  sort_order INT     NOT NULL DEFAULT 0
);

-- ---------- item_comments ----------
CREATE TABLE IF NOT EXISTS public.item_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    UUID        NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  author_id  UUID        NOT NULL REFERENCES public.profiles(id),
  body       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- leads ----------
CREATE TABLE IF NOT EXISTS public.leads (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_date  DATE        NOT NULL,
  source     TEXT        NOT NULL DEFAULT 'Organic'
                         CHECK (source IN ('Ad', 'Organic', 'Outreach', 'Referral')),
  name       TEXT        NOT NULL,
  contact    TEXT        NOT NULL DEFAULT '',
  service    TEXT        NOT NULL DEFAULT '',
  budget     TEXT        NOT NULL DEFAULT '',
  status     TEXT        NOT NULL DEFAULT 'New'
                         CHECK (status IN ('New', 'Qualified', 'Call booked', 'Closed', 'Lost')),
  follow_up  DATE,
  owner_id   UUID        NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ************************************************************
-- 2. TRIGGERS — updated_at
-- ************************************************************

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_items_updated_at ON public.items;
CREATE TRIGGER trg_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ************************************************************
-- 3. TRIGGER — auto-create profile on signup
-- ************************************************************

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _full_name TEXT;
  _initials  TEXT;
BEGIN
  -- Derive full_name from metadata or fall back to email
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

  -- Build initials: first letter of each word, uppercased, max 2 chars
  _initials := UPPER(LEFT(
    ARRAY_TO_STRING(
      ARRAY(
        SELECT LEFT(word, 1)
        FROM unnest(STRING_TO_ARRAY(TRIM(_full_name), ' ')) AS word
        WHERE word <> ''
        LIMIT 2
      ),
      ''
    ),
    2
  ));

  INSERT INTO public.profiles (id, full_name, avatar_initials)
  VALUES (NEW.id, _full_name, _initials)
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      avatar_initials = EXCLUDED.avatar_initials;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ************************************************************
-- 4. HELPER FUNCTION: user_role()
-- ************************************************************
-- Returns the role of the currently authenticated user.
-- SECURITY DEFINER so RLS policies can read profiles safely.

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
DECLARE
  _role TEXT;
BEGIN
  SELECT role INTO _role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(_role, 'editor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ************************************************************
-- 5. ENABLE ROW LEVEL SECURITY
-- ************************************************************

ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_references  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_shots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_assets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_checklist   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads            ENABLE ROW LEVEL SECURITY;


-- ************************************************************
-- 5. RLS POLICIES
-- ************************************************************

-- ===================== profiles =====================

-- All authenticated users can read all profiles (needed for assignee dropdowns)
CREATE POLICY "profiles: select for authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update only their own profile row
CREATE POLICY "profiles: update own row"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ===================== items =====================

-- All authenticated users can read items
CREATE POLICY "items: select for authenticated"
  ON public.items FOR SELECT
  TO authenticated
  USING (true);

-- Admin or editor can create items
CREATE POLICY "items: insert for admin/editor"
  ON public.items FOR INSERT
  TO authenticated
  WITH CHECK (public.user_role() IN ('admin', 'editor'));

-- Admin can update any item; editor can update items they created or are assigned to
CREATE POLICY "items: update for admin or owner/assignee editor"
  ON public.items FOR UPDATE
  TO authenticated
  USING (
    public.user_role() = 'admin'
    OR (
      public.user_role() = 'editor'
      AND (created_by = auth.uid() OR assignee_id = auth.uid())
    )
  )
  WITH CHECK (
    public.user_role() = 'admin'
    OR (
      public.user_role() = 'editor'
      AND (created_by = auth.uid() OR assignee_id = auth.uid())
    )
  );

-- Only admin can delete items
CREATE POLICY "items: delete for admin"
  ON public.items FOR DELETE
  TO authenticated
  USING (public.user_role() = 'admin');


-- ===================== item_references =====================

CREATE POLICY "item_references: select for authenticated"
  ON public.item_references FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "item_references: insert for admin/editor"
  ON public.item_references FOR INSERT
  TO authenticated
  WITH CHECK (public.user_role() IN ('admin', 'editor'));

CREATE POLICY "item_references: update for admin/editor"
  ON public.item_references FOR UPDATE
  TO authenticated
  USING (public.user_role() IN ('admin', 'editor'))
  WITH CHECK (public.user_role() IN ('admin', 'editor'));

CREATE POLICY "item_references: delete for admin/editor"
  ON public.item_references FOR DELETE
  TO authenticated
  USING (public.user_role() IN ('admin', 'editor'));


-- ===================== item_shots =====================

CREATE POLICY "item_shots: select for authenticated"
  ON public.item_shots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "item_shots: insert for admin/editor"
  ON public.item_shots FOR INSERT
  TO authenticated
  WITH CHECK (public.user_role() IN ('admin', 'editor'));

CREATE POLICY "item_shots: update for admin/editor"
  ON public.item_shots FOR UPDATE
  TO authenticated
  USING (public.user_role() IN ('admin', 'editor'))
  WITH CHECK (public.user_role() IN ('admin', 'editor'));

CREATE POLICY "item_shots: delete for admin/editor"
  ON public.item_shots FOR DELETE
  TO authenticated
  USING (public.user_role() IN ('admin', 'editor'));


-- ===================== item_assets =====================

CREATE POLICY "item_assets: select for authenticated"
  ON public.item_assets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "item_assets: insert for admin/editor"
  ON public.item_assets FOR INSERT
  TO authenticated
  WITH CHECK (public.user_role() IN ('admin', 'editor'));

CREATE POLICY "item_assets: update for admin/editor"
  ON public.item_assets FOR UPDATE
  TO authenticated
  USING (public.user_role() IN ('admin', 'editor'))
  WITH CHECK (public.user_role() IN ('admin', 'editor'));

-- Only admin can delete assets
CREATE POLICY "item_assets: delete for admin"
  ON public.item_assets FOR DELETE
  TO authenticated
  USING (public.user_role() = 'admin');


-- ===================== item_checklist =====================

CREATE POLICY "item_checklist: select for authenticated"
  ON public.item_checklist FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "item_checklist: insert for admin/editor"
  ON public.item_checklist FOR INSERT
  TO authenticated
  WITH CHECK (public.user_role() IN ('admin', 'editor'));

-- All authenticated users can update checklist items (reviewers can toggle checkboxes)
CREATE POLICY "item_checklist: update for authenticated"
  ON public.item_checklist FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "item_checklist: delete for admin/editor"
  ON public.item_checklist FOR DELETE
  TO authenticated
  USING (public.user_role() IN ('admin', 'editor'));


-- ===================== item_comments =====================

CREATE POLICY "item_comments: select for authenticated"
  ON public.item_comments FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can insert comments
CREATE POLICY "item_comments: insert for authenticated"
  ON public.item_comments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update only their own comments
CREATE POLICY "item_comments: update own comment"
  ON public.item_comments FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Only admin can delete comments
CREATE POLICY "item_comments: delete for admin"
  ON public.item_comments FOR DELETE
  TO authenticated
  USING (public.user_role() = 'admin');


-- ===================== leads =====================

CREATE POLICY "leads: select for admin/editor"
  ON public.leads FOR SELECT
  TO authenticated
  USING (public.user_role() IN ('admin', 'editor'));

CREATE POLICY "leads: insert for admin/editor"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (public.user_role() IN ('admin', 'editor'));

CREATE POLICY "leads: update for admin/editor"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (public.user_role() IN ('admin', 'editor'))
  WITH CHECK (public.user_role() IN ('admin', 'editor'));

-- Only admin can delete leads
CREATE POLICY "leads: delete for admin"
  ON public.leads FOR DELETE
  TO authenticated
  USING (public.user_role() = 'admin');


-- ************************************************************
-- 7. BACKFILL EXISTING AUTH USERS
-- ************************************************************
-- Ensures any users created before this migration ran get profiles and admin role
INSERT INTO public.profiles (id, full_name, avatar_initials, role)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', email), 
  UPPER(LEFT(COALESCE(raw_user_meta_data->>'full_name', email), 2)),
  'admin'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

