
-- Add typing_at column to profiles for typing indicator
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS typing_at timestamp with time zone DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS typing_to text DEFAULT NULL;

-- Add notes column to kapal_data for simple notes feature
ALTER TABLE public.kapal_data ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
