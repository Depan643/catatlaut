-- Create profiles table for user info
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create kapal_data table to store ship data per user
CREATE TABLE public.kapal_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_kapal TEXT NOT NULL,
  tanda_selar_gt TEXT NOT NULL,
  tanda_selar_no TEXT NOT NULL,
  tanda_selar_huruf TEXT NOT NULL,
  jenis_pendataan TEXT NOT NULL CHECK (jenis_pendataan IN ('ikan', 'cumi')),
  tanggal TIMESTAMP WITH TIME ZONE NOT NULL,
  mulai_bongkar TIMESTAMP WITH TIME ZONE,
  selesai_bongkar TIMESTAMP WITH TIME ZONE,
  done_pipp BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create entries table to store entry data per kapal
CREATE TABLE public.entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kapal_id UUID NOT NULL REFERENCES public.kapal_data(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jenis TEXT NOT NULL,
  berat NUMERIC NOT NULL,
  waktu_input TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kapal_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Kapal data policies
CREATE POLICY "Users can view their own kapal" 
  ON public.kapal_data FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own kapal" 
  ON public.kapal_data FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own kapal" 
  ON public.kapal_data FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own kapal" 
  ON public.kapal_data FOR DELETE 
  USING (auth.uid() = user_id);

-- Entries policies
CREATE POLICY "Users can view their own entries" 
  ON public.entries FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own entries" 
  ON public.entries FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries" 
  ON public.entries FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entries" 
  ON public.entries FOR DELETE 
  USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kapal_data_updated_at
  BEFORE UPDATE ON public.kapal_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_kapal_data_user_id ON public.kapal_data(user_id);
CREATE INDEX idx_entries_kapal_id ON public.entries(kapal_id);
CREATE INDEX idx_entries_user_id ON public.entries(user_id);