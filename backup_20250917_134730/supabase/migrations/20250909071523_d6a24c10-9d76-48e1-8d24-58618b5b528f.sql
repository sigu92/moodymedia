-- Insert seed data for media outlets and metrics without foreign key references
-- We'll use dummy UUIDs that don't reference actual users for now

-- Insert media outlets with dummy publisher IDs
INSERT INTO public.media_outlets (domain, language, country, niches, category, price, currency, guidelines, lead_time_days, publisher_id) VALUES
('badlands.nu', 'Swedish', 'SE', '{"Gaming", "Entertainment"}', 'Gaming', 155, 'EUR', 'No gambling content. Max 1 outbound link per 500 words. Swedish language required.', 3, gen_random_uuid()),
('dittandralag.se', 'Swedish', 'SE', '{"Sports", "Football"}', 'Sports', 200, 'EUR', 'Sports-related content only. No competitor mentions. Min 800 words.', 5, gen_random_uuid()),
('roda-dagar.se', 'Swedish', 'SE', '{"Lifestyle", "Food", "Travel"}', 'Lifestyle', 245, 'EUR', 'High-quality lifestyle content. Professional images required. Min 1000 words.', 7, gen_random_uuid()),
('mediahyllan.se', 'Swedish', 'SE', '{"Technology", "Media", "Digital"}', 'Technology', 175, 'EUR', 'Tech and media content focus. No adult content. Include relevant statistics.', 4, gen_random_uuid()),
('bengansbonus.se', 'Swedish', 'SE', '{"Business", "Finance", "Investment"}', 'Business', 245, 'EUR', 'Financial and business content. Must comply with Swedish financial regulations.', 5, gen_random_uuid()),
('followusaik.se', 'Swedish', 'SE', '{"Sports", "Football", "Soccer"}', 'Sports', 245, 'EUR', 'Football-focused content. Team-neutral stance required. Include match statistics.', 3, gen_random_uuid()),
('svenskhandelstidning.se', 'Swedish', 'SE', '{"Business", "Trade", "Commerce"}', 'Business', 320, 'EUR', 'B2B content focus. Industry expertise required. Min 1200 words.', 7, gen_random_uuid()),
('teknikfokus.se', 'Swedish', 'SE', '{"Technology", "Innovation", "Startups"}', 'Technology', 280, 'EUR', 'Cutting-edge tech content. Include technical details and sources.', 6, gen_random_uuid()),
('naturguiden.se', 'Swedish', 'SE', '{"Nature", "Environment", "Outdoor"}', 'Lifestyle', 190, 'EUR', 'Nature and outdoor content. Environmental focus preferred. Include location details.', 4, gen_random_uuid()),
('halsokost.se', 'Swedish', 'SE', '{"Health", "Nutrition", "Wellness"}', 'Health', 225, 'EUR', 'Evidence-based health content. Medical claims must be sourced. No supplements promotion.', 5, gen_random_uuid());

-- Insert corresponding metrics for each media outlet
INSERT INTO public.metrics (media_outlet_id, ahrefs_dr, moz_da, semrush_as, spam_score, organic_traffic, referring_domains)
SELECT id, 
  CASE domain
    WHEN 'badlands.nu' THEN 11
    WHEN 'dittandralag.se' THEN 32
    WHEN 'roda-dagar.se' THEN 48
    WHEN 'mediahyllan.se' THEN 15
    WHEN 'bengansbonus.se' THEN 38
    WHEN 'followusaik.se' THEN 15
    WHEN 'svenskhandelstidning.se' THEN 55
    WHEN 'teknikfokus.se' THEN 43
    WHEN 'naturguiden.se' THEN 25
    WHEN 'halsokost.se' THEN 33
  END as ahrefs_dr,
  CASE domain
    WHEN 'badlands.nu' THEN 15
    WHEN 'dittandralag.se' THEN 13
    WHEN 'roda-dagar.se' THEN 5
    WHEN 'mediahyllan.se' THEN 17
    WHEN 'bengansbonus.se' THEN 6
    WHEN 'followusaik.se' THEN 7
    WHEN 'svenskhandelstidning.se' THEN 42
    WHEN 'teknikfokus.se' THEN 28
    WHEN 'naturguiden.se' THEN 19
    WHEN 'halsokost.se' THEN 22
  END as moz_da,
  CASE domain
    WHEN 'badlands.nu' THEN 16
    WHEN 'dittandralag.se' THEN 12
    WHEN 'roda-dagar.se' THEN 8
    WHEN 'mediahyllan.se' THEN 10
    WHEN 'bengansbonus.se' THEN 11
    WHEN 'followusaik.se' THEN 11
    WHEN 'svenskhandelstidning.se' THEN 35
    WHEN 'teknikfokus.se' THEN 22
    WHEN 'naturguiden.se' THEN 18
    WHEN 'halsokost.se' THEN 20
  END as semrush_as,
  CASE domain
    WHEN 'badlands.nu' THEN 56
    WHEN 'dittandralag.se' THEN 5
    WHEN 'roda-dagar.se' THEN 2
    WHEN 'mediahyllan.se' THEN 12
    WHEN 'bengansbonus.se' THEN 8
    WHEN 'followusaik.se' THEN 15
    WHEN 'svenskhandelstidning.se' THEN 1
    WHEN 'teknikfokus.se' THEN 3
    WHEN 'naturguiden.se' THEN 7
    WHEN 'halsokost.se' THEN 4
  END as spam_score,
  CASE domain
    WHEN 'badlands.nu' THEN 0
    WHEN 'dittandralag.se' THEN 1250
    WHEN 'roda-dagar.se' THEN 3400
    WHEN 'mediahyllan.se' THEN 890
    WHEN 'bengansbonus.se' THEN 2100
    WHEN 'followusaik.se' THEN 670
    WHEN 'svenskhandelstidning.se' THEN 8900
    WHEN 'teknikfokus.se' THEN 5600
    WHEN 'naturguiden.se' THEN 1800
    WHEN 'halsokost.se' THEN 2750
  END as organic_traffic,
  CASE domain
    WHEN 'badlands.nu' THEN 32
    WHEN 'dittandralag.se' THEN 89
    WHEN 'roda-dagar.se' THEN 156
    WHEN 'mediahyllan.se' THEN 67
    WHEN 'bengansbonus.se' THEN 134
    WHEN 'followusaik.se' THEN 45
    WHEN 'svenskhandelstidning.se' THEN 298
    WHEN 'teknikfokus.se' THEN 187
    WHEN 'naturguiden.se' THEN 98
    WHEN 'halsokost.se' THEN 145
  END as referring_domains
FROM public.media_outlets
WHERE domain IN ('badlands.nu', 'dittandralag.se', 'roda-dagar.se', 'mediahyllan.se', 'bengansbonus.se', 'followusaik.se', 'svenskhandelstidning.se', 'teknikfokus.se', 'naturguiden.se', 'halsokost.se');

-- Create listings for all media outlets
INSERT INTO public.listings (media_outlet_id, is_active)
SELECT id, true
FROM public.media_outlets;