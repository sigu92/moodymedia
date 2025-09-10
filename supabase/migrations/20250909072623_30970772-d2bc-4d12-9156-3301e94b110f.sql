-- Enhance media_outlets table with more detailed content guidelines
ALTER TABLE public.media_outlets 
ADD COLUMN IF NOT EXISTS content_types TEXT[] DEFAULT ARRAY['article', 'blog_post'];

ALTER TABLE public.media_outlets 
ADD COLUMN IF NOT EXISTS min_word_count INTEGER DEFAULT 500;

ALTER TABLE public.media_outlets 
ADD COLUMN IF NOT EXISTS max_word_count INTEGER DEFAULT 1500;

ALTER TABLE public.media_outlets 
ADD COLUMN IF NOT EXISTS forbidden_topics TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE public.media_outlets 
ADD COLUMN IF NOT EXISTS required_format TEXT DEFAULT 'markdown';

ALTER TABLE public.media_outlets 
ADD COLUMN IF NOT EXISTS turnaround_time TEXT DEFAULT '3-5 business days';

-- Update existing media outlets with sample content guidelines
UPDATE public.media_outlets 
SET 
  guidelines = CASE domain
    WHEN 'badlands.nu' THEN 'Focus on lifestyle and wellness topics. Articles should be engaging and include personal anecdotes. No promotional content without disclosure. Images must be high quality and relevant.'
    WHEN 'dittandralag.se' THEN 'Sports-focused content with expert analysis. Include statistics and recent developments. Avoid controversial opinions. Must fact-check all claims.'
    WHEN 'roda-dagar.se' THEN 'Business and finance articles with actionable insights. Include data visualization when possible. Cite credible sources. Professional tone required.'
    WHEN 'mediahyllan.se' THEN 'Technology and innovation content. Include technical details but keep accessible. Screenshots and code examples welcome. Current trends preferred.'
    ELSE guidelines
  END,
  content_types = CASE domain
    WHEN 'badlands.nu' THEN ARRAY['article', 'blog_post', 'interview']
    WHEN 'dittandralag.se' THEN ARRAY['article', 'news', 'analysis']
    WHEN 'roda-dagar.se' THEN ARRAY['article', 'opinion', 'analysis']
    WHEN 'mediahyllan.se' THEN ARRAY['article', 'tutorial', 'review']
    ELSE content_types
  END,
  min_word_count = CASE domain
    WHEN 'badlands.nu' THEN 800
    WHEN 'dittandralag.se' THEN 600
    WHEN 'roda-dagar.se' THEN 1000
    WHEN 'mediahyllan.se' THEN 700
    ELSE min_word_count
  END,
  max_word_count = CASE domain
    WHEN 'badlands.nu' THEN 2000
    WHEN 'dittandralag.se' THEN 1500
    WHEN 'roda-dagar.se' THEN 2500
    WHEN 'mediahyllan.se' THEN 1800
    ELSE max_word_count
  END,
  forbidden_topics = CASE domain
    WHEN 'badlands.nu' THEN ARRAY['politics', 'extreme_sports', 'medical_advice']
    WHEN 'dittandralag.se' THEN ARRAY['politics', 'gambling', 'doping']
    WHEN 'roda-dagar.se' THEN ARRAY['get_rich_quick', 'cryptocurrency_speculation', 'political_opinions']
    WHEN 'mediahyllan.se' THEN ARRAY['piracy', 'hacking_tutorials', 'illegal_activities']
    ELSE forbidden_topics
  END,
  turnaround_time = CASE domain
    WHEN 'badlands.nu' THEN '2-3 business days'
    WHEN 'dittandralag.se' THEN '1-2 business days'
    WHEN 'roda-dagar.se' THEN '3-5 business days'
    WHEN 'mediahyllan.se' THEN '2-4 business days'
    ELSE turnaround_time
  END;