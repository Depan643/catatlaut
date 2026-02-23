
-- Add alat_tangkap and posisi_dermaga columns to kapal_data
ALTER TABLE public.kapal_data ADD COLUMN alat_tangkap text DEFAULT '';
ALTER TABLE public.kapal_data ADD COLUMN posisi_dermaga text DEFAULT '';
