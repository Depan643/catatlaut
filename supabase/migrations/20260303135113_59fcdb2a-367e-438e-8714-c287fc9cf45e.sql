
-- Fix chat-attachments storage upload policy to allow admin group folder uploads
DROP POLICY IF EXISTS "Users can upload to own chat folder" ON storage.objects;

CREATE POLICY "Users can upload to own or group chat folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.uid() IS NOT NULL
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] = 'group'
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
);
