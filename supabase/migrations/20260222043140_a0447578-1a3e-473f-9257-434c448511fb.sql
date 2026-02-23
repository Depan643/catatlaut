
-- Add last_seen for online status tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone DEFAULT now();

-- Add edited_at column to chat_messages for edit tracking
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone DEFAULT NULL;

-- Allow users to update their own messages (for edit feature)
CREATE POLICY "Users can update own messages" ON public.chat_messages
FOR UPDATE USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- Allow users to update their own last_seen
-- (profiles already has update policies for own profile)
