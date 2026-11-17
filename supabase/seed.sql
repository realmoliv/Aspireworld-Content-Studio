-- ============================================================
-- Aspire World Content Studio — Seed Data (November 2026)
-- ============================================================
--
-- Run this in the Supabase SQL Editor AFTER your first user
-- has signed up and a row exists in public.profiles.
--
-- 1. Go to Auth → Users and copy the user's UUID.
-- 2. Replace 'REPLACE_WITH_YOUR_USER_ID' below with that UUID.
-- 3. Execute the entire script.
-- ============================================================

DO $$
DECLARE
  uid UUID := (SELECT id FROM public.profiles LIMIT 1);

  -- Item IDs (generated once so child rows can reference them)
  item01 UUID := gen_random_uuid();
  item02 UUID := gen_random_uuid();
  item03 UUID := gen_random_uuid();
  item04 UUID := gen_random_uuid();
  item05 UUID := gen_random_uuid();
  item06 UUID := gen_random_uuid();
  item07 UUID := gen_random_uuid();
  item08 UUID := gen_random_uuid();
  item09 UUID := gen_random_uuid();
  item10 UUID := gen_random_uuid();
  item11 UUID := gen_random_uuid();
  item12 UUID := gen_random_uuid();
  item13 UUID := gen_random_uuid();
  item14 UUID := gen_random_uuid();
  item15 UUID := gen_random_uuid();
  item16 UUID := gen_random_uuid();
BEGIN

  -- ************************************************************
  -- ITEMS (16 content items)
  -- ************************************************************

  INSERT INTO public.items
    (id, title, content_type, pillar, goal, post_date, post_time, status, priority,
     brief, copy_on_screen, copy_cta, verify_date, assignee_id, created_by)
  VALUES
    -- 1. Aspire World intro reel
    (item01,
     'Aspire World intro reel',
     'Reel', 'Proof', 'Get Clients',
     '2026-11-14', '18:30', 'Idea', 'Normal',
     'Introduce Aspire World through a fast proof-led montage. Lead with outcomes. Show the team''s strongest design and edit work. End on one clear consultation action.',
     E'You create. We build the system around it.\nDesign. Edit. Launch.',
     'DM BOOK for a free consultation',
     false, NULL, uid),

    -- 2. Trendzilla Shark Tank
    (item02,
     'Trendzilla Shark Tank Artist Sourcing, case study',
     'Reel', 'Proof', 'Get Clients',
     '2026-11-16', '18:30', 'Idea', 'Normal',
     '', '', '', false, NULL, uid),

    -- 3. Trendzilla Campaign OTN
    (item03,
     'Trendzilla Campaign OTN, campaign breakdown',
     'Reel', 'Proof', 'Get Clients',
     '2026-11-18', '18:30', 'Idea', 'Normal',
     '', '', '', false, NULL, uid),

    -- 4. RAD Event Flow State
    (item04,
     'RAD Event Flow State, event recap',
     'Reel', 'Proof', 'Get Clients',
     '2026-11-20', '18:30', 'Idea', 'Normal',
     '', '', '', false, NULL, uid),

    -- 5. 10KD BTS
    (item05,
     '10KD BTS',
     'Reel', 'Behind the Scenes', 'Build Trust',
     '2026-11-21', '18:30', 'Idea', 'Normal',
     '', '', '', false, NULL, uid),

    -- 6. 3 mistakes artists make
    (item06,
     '3 mistakes artists make in their first music video',
     'Reel', 'Value', 'Build Trust',
     '2026-11-23', '18:30', 'Idea', 'Normal',
     '', '', '', false, NULL, uid),

    -- 7. How much does a music video really cost?
    (item07,
     'How much does a music video really cost?',
     'Reel', 'Value', 'Build Trust',
     '2026-11-25', '18:30', 'Idea', 'Normal',
     '', '', '', false, NULL, uid),

    -- 8. Editing and print-on-demand services
    (item08,
     'Editing and print-on-demand services',
     'Carousel', 'Offer', 'Get Clients',
     '2026-11-27', '18:30', 'Idea', 'High',
     '', '', '', false, NULL, uid),

    -- 9. Why every artist needs a website
    (item09,
     'Why every artist needs a website',
     'Reel', 'Value', 'Build Trust',
     '2026-11-28', '18:30', 'Idea', 'Normal',
     '', '', '', false, NULL, uid),

    -- 10. Meet the team
    (item10,
     'Meet the team',
     'Story series', 'People', 'Build Trust',
     '2026-11-30', '18:30', 'Idea', 'Normal',
     '', '', '', false, NULL, uid),

    -- 11. Children's Day
    (item11,
     'Children''s Day',
     'Festival Creative', 'Festive', 'Festive',
     '2026-11-14', '18:30', 'Idea', 'Normal',
     '', '', '', true, NULL, uid),

    -- 12. Guru Nanak Jayanti
    (item12,
     'Guru Nanak Jayanti',
     'Festival Creative', 'Festive', 'Festive',
     '2026-11-24', '18:30', 'Idea', 'Normal',
     '', '', '', true, NULL, uid),

    -- 13. Black Friday offer
    (item13,
     'Black Friday offer',
     'Festival Creative', 'Offer', 'Get Clients',
     '2026-11-27', '18:30', 'Idea', 'High',
     '', '', '', true, NULL, uid),

    -- 14. Slots open for next month
    (item14,
     'Slots open for next month, DM BOOK',
     'Story', 'Offer', 'Get Clients',
     '2026-11-21', '18:30', 'Idea', 'High',
     '', '', '', false, NULL, uid),

    -- 15. Christmas placeholder
    (item15,
     'Christmas placeholder',
     'Festival Creative', 'Festive', 'Festive',
     '2026-12-25', '18:30', 'Idea', 'Normal',
     '', '', '', true, NULL, uid),

    -- 16. New Year placeholder
    (item16,
     'New Year placeholder',
     'Festival Creative', 'Festive', 'Festive',
     '2026-12-31', '18:30', 'Idea', 'Normal',
     '', '', '', true, NULL, uid);


  -- ************************************************************
  -- ITEM REFERENCES (for items 2–5)
  -- ************************************************************

  INSERT INTO public.item_references (item_id, label, url, instruction, ref_type, sort_order)
  VALUES
    (item02,
     'Raw footage',
     'https://drive.google.com/drive/folders/1ibKPX6oXL0cbpCg-VnGRIzuosG571Xhr?usp=sharing',
     'Use the strongest proof moments. Do not change the source files.',
     'Raw footage (Drive)', 0),

    (item03,
     'Raw footage',
     'https://drive.google.com/drive/folders/1FNH_Wg6qYAUZtzVZNB28rGJUT3P0tifA?usp=sharing',
     'Use the strongest proof moments. Do not change the source files.',
     'Raw footage (Drive)', 0),

    (item04,
     'Raw footage',
     'https://drive.google.com/drive/folders/1y4ZPCTTbKT7iTaeRYN9oWlEA9vDBs37E?usp=sharing',
     'Use the strongest proof moments. Do not change the source files.',
     'Raw footage (Drive)', 0),

    (item05,
     'Raw footage',
     'https://drive.google.com/drive/folders/1cR4VJi6Np40TNgS38Rhxyqq40XGN-ZBn?usp=sharing',
     'Use the strongest proof moments. Do not change the source files.',
     'Raw footage (Drive)', 0);


  -- ************************************************************
  -- ITEM SHOTS (1 default shot per item)
  -- ************************************************************

  INSERT INTO public.item_shots (item_id, shot_order, visual, text_on_screen, sort_order)
  VALUES
    (item01, '01', '', '', 0),
    (item02, '01', '', '', 0),
    (item03, '01', '', '', 0),
    (item04, '01', '', '', 0),
    (item05, '01', '', '', 0),
    (item06, '01', '', '', 0),
    (item07, '01', '', '', 0),
    (item08, '01', '', '', 0),
    (item09, '01', '', '', 0),
    (item10, '01', '', '', 0),
    (item11, '01', '', '', 0),
    (item12, '01', '', '', 0),
    (item13, '01', '', '', 0),
    (item14, '01', '', '', 0),
    (item15, '01', '', '', 0),
    (item16, '01', '', '', 0);


  -- ************************************************************
  -- ITEM CHECKLIST (8 standard checks × 16 items = 128 rows)
  -- ************************************************************

  INSERT INTO public.item_checklist (item_id, label, done, sort_order)
  SELECT
    item.id,
    chk.label,
    false,
    chk.sort_order
  FROM
    (VALUES
      (item01), (item02), (item03), (item04),
      (item05), (item06), (item07), (item08),
      (item09), (item10), (item11), (item12),
      (item13), (item14), (item15), (item16)
    ) AS item(id)
  CROSS JOIN
    (VALUES
      ('Hook in first 2 seconds',   1),
      ('Captions burned in',        2),
      ('Text inside safe zone',     3),
      ('Logo or end card present',  4),
      ('CTA present',               5),
      ('Music licensed or original', 6),
      ('No suggestive content',     7),
      ('Caption proofread',         8)
    ) AS chk(label, sort_order);


  -- ************************************************************
  -- LEADS (4 seed leads)
  -- ************************************************************

  INSERT INTO public.leads
    (lead_date, source, name, contact, service, budget, status, follow_up, owner_id)
  VALUES
    ('2026-11-16', 'Organic',  'Aarav Mehta',   '@aaravmusic',        'Music video',      '₹75,000',     'Qualified',   '2026-11-20', uid),
    ('2026-11-17', 'Referral', 'Studio North',  'hello@studionorth.in','Campaign edit',    '₹1,20,000',   'Call booked', '2026-11-19', uid),
    ('2026-11-18', 'Outreach', 'Maya Rao',      '@mayarao.art',       'Website',           '₹90,000',     'New',         '2026-11-21', uid),
    ('2026-11-19', 'Ad',       'Rhyme House',   '+91 90000 00000',    'Monthly content',   '₹60,000/mo',  'Closed',      '2026-12-01', uid);

  RAISE NOTICE 'Seed complete — 16 items, 4 references, 16 shots, 128 checklist rows, 4 leads.';
END $$;
