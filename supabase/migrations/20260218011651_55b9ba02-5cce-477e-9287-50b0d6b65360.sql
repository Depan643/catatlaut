
-- 1. Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- 2. Create chat_messages table for officer messaging
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid,
  message text NOT NULL,
  is_group boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages they sent or received
CREATE POLICY "Users can view own messages"
ON public.chat_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR is_group = true);

CREATE POLICY "Users can send messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete own messages"
ON public.chat_messages FOR DELETE
USING (auth.uid() = sender_id);

-- Admins can see all
CREATE POLICY "Admins can view all messages"
ON public.chat_messages FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Create role_notes table for admin notes on roles
CREATE TABLE public.role_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.role_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view role notes"
ON public.role_notes FOR SELECT
USING (true);

CREATE POLICY "Admins can manage role notes"
ON public.role_notes FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default role notes
INSERT INTO public.role_notes (role, description) VALUES
  ('admin', 'Administrator sistem dengan akses penuh ke semua fitur dan data.'),
  ('moderator', 'Moderator yang dapat membantu mengelola data dan pengguna.'),
  ('user', 'Petugas pendataan yang melakukan input data bongkar kapal.');

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
