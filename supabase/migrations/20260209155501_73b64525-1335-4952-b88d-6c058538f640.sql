
-- Create storage bucket for kapal photos
INSERT INTO storage.buckets (id, name, public) VALUES ('kapal-photos', 'kapal-photos', true);

-- Allow authenticated users to upload photos to their own folder
CREATE POLICY "Users can upload kapal photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kapal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow anyone to view kapal photos (public bucket)
CREATE POLICY "Anyone can view kapal photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'kapal-photos');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own kapal photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'kapal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own photos
CREATE POLICY "Users can update their own kapal photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'kapal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
