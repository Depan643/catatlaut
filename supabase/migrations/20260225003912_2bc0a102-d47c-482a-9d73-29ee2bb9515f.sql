
-- Add reply_to column for reply feature
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL;

-- Add reactions column (JSON array of {user_id, emoji})  
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '[]'::jsonb;
