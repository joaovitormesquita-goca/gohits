-- Content metrics — idempotente via ON CONFLICT (id)

INSERT INTO content_metrics (id, content_id, click_count, impressions, views, spend, thumbstop_ratio, roas, engagement_rate, date) VALUES

('2991ad52-c772-4beb-aed6-abc046a3c4f2',
 '063ad40f-5100-4398-8fc1-ca5a90596d06',
 15000, 1200000, 234000,
 5400.00, 0.2200, 4.2000, 0.0870,
 '2026-04-01'),

('65e33a7c-9a85-45fa-9bd7-19869efd0706',
 'fe73e45a-9ba1-4b97-af60-adee9ed9d50b',
 42000, 3400000, 890000,
 8200.00, 0.3100, 6.1000, 0.1240,
 '2026-04-15')

ON CONFLICT (id) DO UPDATE SET
  click_count     = EXCLUDED.click_count,
  impressions     = EXCLUDED.impressions,
  views           = EXCLUDED.views,
  spend           = EXCLUDED.spend,
  thumbstop_ratio = EXCLUDED.thumbstop_ratio,
  roas            = EXCLUDED.roas,
  engagement_rate = EXCLUDED.engagement_rate,
  date            = EXCLUDED.date;
