
-- Ensure RLS is enabled on activity_logs (idempotent)
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Fix chat-attachments storage upload policy to enforce folder ownership
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
CREATE POLICY "Users can upload to own chat folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);
