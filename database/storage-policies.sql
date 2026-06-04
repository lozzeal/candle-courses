-- ============================================================
-- Storage Policies - дозволяємо авторизованим адмінам
-- заливати/змінювати/видаляти файли в обох buckets
-- Запустити у Supabase SQL Editor → Run
-- ============================================================

-- Public can read (вже працює бо bucket Public, але для надійності)
DROP POLICY IF EXISTS "public_read_photos" ON storage.objects;
CREATE POLICY "public_read_photos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-photos');

DROP POLICY IF EXISTS "public_read_videos" ON storage.objects;
CREATE POLICY "public_read_videos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-videos');

-- Authenticated (logged-in) admins can upload
DROP POLICY IF EXISTS "auth_upload_photos" ON storage.objects;
CREATE POLICY "auth_upload_photos" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-photos');

DROP POLICY IF EXISTS "auth_upload_videos" ON storage.objects;
CREATE POLICY "auth_upload_videos" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-videos');

-- Update (rename, replace)
DROP POLICY IF EXISTS "auth_update_photos" ON storage.objects;
CREATE POLICY "auth_update_photos" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-photos');

DROP POLICY IF EXISTS "auth_update_videos" ON storage.objects;
CREATE POLICY "auth_update_videos" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-videos');

-- Delete
DROP POLICY IF EXISTS "auth_delete_photos" ON storage.objects;
CREATE POLICY "auth_delete_photos" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-photos');

DROP POLICY IF EXISTS "auth_delete_videos" ON storage.objects;
CREATE POLICY "auth_delete_videos" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-videos');
