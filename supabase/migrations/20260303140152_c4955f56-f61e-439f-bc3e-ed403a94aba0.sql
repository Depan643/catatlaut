
-- Create admin text settings table for species sidebar styling
CREATE TABLE public.admin_text_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.admin_text_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can view text settings"
ON public.admin_text_settings FOR SELECT
USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage text settings"
ON public.admin_text_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Insert default settings
INSERT INTO public.admin_text_settings (setting_key, setting_value) VALUES
('sidebar_species_style', '{"fontSize": "14", "fontWeight": "normal", "textTransform": "none", "fontFamily": "default"}'::jsonb);
