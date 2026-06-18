
CREATE POLICY "Howl media public read" ON storage.objects FOR SELECT
USING (bucket_id = 'howl-media');

CREATE POLICY "Users upload own howl media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'howl-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own howl media" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'howl-media' AND auth.uid()::text = (storage.foldername(name))[1]);
