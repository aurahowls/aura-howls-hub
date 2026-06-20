
CREATE POLICY "dm media participants read" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'dm-media' AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = split_part(name, '/', 1)
        AND auth.uid() IN (c.user_a, c.user_b)
    )
  );

CREATE POLICY "dm media participants insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'dm-media' AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = split_part(name, '/', 1)
        AND auth.uid() IN (c.user_a, c.user_b)
    )
  );

CREATE POLICY "dm media owner delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'dm-media' AND owner = auth.uid()
  );
