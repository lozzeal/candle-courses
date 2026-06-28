-- Конвертація .mov → .mp4 URL у БД
-- ЗГЕНЕРОВАНО: 2026-06-28T13:35:07.619Z
BEGIN;

-- 1780390027266-7sw3ai.mov
UPDATE product_media SET url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780390027266-7sw3ai.mp4' WHERE url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780390027266-7sw3ai.mov';
UPDATE landing_courses SET photo_path = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780390027266-7sw3ai.mp4' WHERE photo_path = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780390027266-7sw3ai.mov';
UPDATE landing_reviews SET photo_url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780390027266-7sw3ai.mp4' WHERE photo_url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780390027266-7sw3ai.mov';
UPDATE landing_courses SET page_blocks = REPLACE(page_blocks::text, 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780390027266-7sw3ai.mov', 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780390027266-7sw3ai.mp4')::jsonb WHERE page_blocks::text LIKE '%https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780390027266-7sw3ai.mov%';

-- 1780395209134-pmmppl.mov
UPDATE product_media SET url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780395209134-pmmppl.mp4' WHERE url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780395209134-pmmppl.mov';
UPDATE landing_courses SET photo_path = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780395209134-pmmppl.mp4' WHERE photo_path = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780395209134-pmmppl.mov';
UPDATE landing_reviews SET photo_url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780395209134-pmmppl.mp4' WHERE photo_url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780395209134-pmmppl.mov';
UPDATE landing_courses SET page_blocks = REPLACE(page_blocks::text, 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780395209134-pmmppl.mov', 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780395209134-pmmppl.mp4')::jsonb WHERE page_blocks::text LIKE '%https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780395209134-pmmppl.mov%';

-- 1780397129787-gosvwp.mov
UPDATE product_media SET url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780397129787-gosvwp.mp4' WHERE url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780397129787-gosvwp.mov';
UPDATE landing_courses SET photo_path = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780397129787-gosvwp.mp4' WHERE photo_path = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780397129787-gosvwp.mov';
UPDATE landing_reviews SET photo_url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780397129787-gosvwp.mp4' WHERE photo_url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780397129787-gosvwp.mov';
UPDATE landing_courses SET page_blocks = REPLACE(page_blocks::text, 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780397129787-gosvwp.mov', 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780397129787-gosvwp.mp4')::jsonb WHERE page_blocks::text LIKE '%https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780397129787-gosvwp.mov%';

-- 1780568590091-c6lbil.mov
UPDATE product_media SET url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780568590091-c6lbil.mp4' WHERE url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780568590091-c6lbil.mov';
UPDATE landing_courses SET photo_path = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780568590091-c6lbil.mp4' WHERE photo_path = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780568590091-c6lbil.mov';
UPDATE landing_reviews SET photo_url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780568590091-c6lbil.mp4' WHERE photo_url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780568590091-c6lbil.mov';
UPDATE landing_courses SET page_blocks = REPLACE(page_blocks::text, 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780568590091-c6lbil.mov', 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780568590091-c6lbil.mp4')::jsonb WHERE page_blocks::text LIKE '%https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780568590091-c6lbil.mov%';

-- 1780572012377-3nw295.mov
UPDATE product_media SET url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780572012377-3nw295.mp4' WHERE url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780572012377-3nw295.mov';
UPDATE landing_courses SET photo_path = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780572012377-3nw295.mp4' WHERE photo_path = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780572012377-3nw295.mov';
UPDATE landing_reviews SET photo_url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780572012377-3nw295.mp4' WHERE photo_url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780572012377-3nw295.mov';
UPDATE landing_courses SET page_blocks = REPLACE(page_blocks::text, 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780572012377-3nw295.mov', 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780572012377-3nw295.mp4')::jsonb WHERE page_blocks::text LIKE '%https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780572012377-3nw295.mov%';

-- 1780753403108-phvbrm.mov
UPDATE product_media SET url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780753403108-phvbrm.mp4' WHERE url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780753403108-phvbrm.mov';
UPDATE landing_courses SET photo_path = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780753403108-phvbrm.mp4' WHERE photo_path = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780753403108-phvbrm.mov';
UPDATE landing_reviews SET photo_url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780753403108-phvbrm.mp4' WHERE photo_url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780753403108-phvbrm.mov';
UPDATE landing_courses SET page_blocks = REPLACE(page_blocks::text, 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780753403108-phvbrm.mov', 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780753403108-phvbrm.mp4')::jsonb WHERE page_blocks::text LIKE '%https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1780753403108-phvbrm.mov%';

-- 1781081681311-02un8s.mov
UPDATE product_media SET url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781081681311-02un8s.mp4' WHERE url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781081681311-02un8s.mov';
UPDATE landing_courses SET photo_path = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781081681311-02un8s.mp4' WHERE photo_path = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781081681311-02un8s.mov';
UPDATE landing_reviews SET photo_url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781081681311-02un8s.mp4' WHERE photo_url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781081681311-02un8s.mov';
UPDATE landing_courses SET page_blocks = REPLACE(page_blocks::text, 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781081681311-02un8s.mov', 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781081681311-02un8s.mp4')::jsonb WHERE page_blocks::text LIKE '%https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781081681311-02un8s.mov%';

-- 1781082275694-gddgkd.mov
UPDATE product_media SET url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781082275694-gddgkd.mp4' WHERE url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781082275694-gddgkd.mov';
UPDATE landing_courses SET photo_path = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781082275694-gddgkd.mp4' WHERE photo_path = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781082275694-gddgkd.mov';
UPDATE landing_reviews SET photo_url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781082275694-gddgkd.mp4' WHERE photo_url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781082275694-gddgkd.mov';
UPDATE landing_courses SET page_blocks = REPLACE(page_blocks::text, 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781082275694-gddgkd.mov', 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781082275694-gddgkd.mp4')::jsonb WHERE page_blocks::text LIKE '%https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781082275694-gddgkd.mov%';

-- 1781084717438-ermcsx.mov
UPDATE product_media SET url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781084717438-ermcsx.mp4' WHERE url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781084717438-ermcsx.mov';
UPDATE landing_courses SET photo_path = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781084717438-ermcsx.mp4' WHERE photo_path = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781084717438-ermcsx.mov';
UPDATE landing_reviews SET photo_url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781084717438-ermcsx.mp4' WHERE photo_url = 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781084717438-ermcsx.mov';
UPDATE landing_courses SET page_blocks = REPLACE(page_blocks::text, 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781084717438-ermcsx.mov', 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781084717438-ermcsx.mp4')::jsonb WHERE page_blocks::text LIKE '%https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/product-videos/1781084717438-ermcsx.mov%';


COMMIT;
