
-- Chat group settings table for group photo and description
CREATE TABLE public.chat_group_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_name text NOT NULL DEFAULT 'Grup Semua Petugas',
  group_photo_url text,
  group_description text DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Insert default row
INSERT INTO public.chat_group_settings (group_name) VALUES ('Grup Semua Petugas');

-- RLS
ALTER TABLE public.chat_group_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view group settings" ON public.chat_group_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage group settings" ON public.chat_group_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for chat_messages (for notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
