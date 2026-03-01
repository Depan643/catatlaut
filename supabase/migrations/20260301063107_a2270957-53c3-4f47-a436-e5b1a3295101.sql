
-- Create fish_species table for admin to manage fish types
CREATE TABLE public.fish_species (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_ikan TEXT NOT NULL,
  nama_latin TEXT DEFAULT '',
  harga INTEGER DEFAULT 0,
  kategori TEXT DEFAULT 'ikan', -- 'ikan' or 'cumi'
  urutan INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.fish_species ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Anyone can view fish species" ON public.fish_species
  FOR SELECT USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage fish species" ON public.fish_species
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert seed data from the PDF borang
INSERT INTO public.fish_species (nama_ikan, nama_latin, harga, kategori, urutan) VALUES
('ALU-ALU/KACANGAN', 'Sphyraena obtusata', 13500, 'ikan', 1),
('ARUAN TASEK/WUDUN', 'Rachycentron canadum', 12000, 'ikan', 2),
('AYAM-AYAM/ETONG', 'Abalistes stellaris', 15000, 'ikan', 3),
('BARAKUDA/TUNUL', 'Sphyraena jello', 15000, 'ikan', 4),
('BARONANG/SEMADAR', 'Siganus javus', 0, 'ikan', 5),
('BAWAL HITAM/TIPLEK', 'Parastromateus niger', 35000, 'ikan', 6),
('BELOSO/BOSO', 'Saurida tumbil', 8500, 'ikan', 7),
('BIJI NANGKA/JENGGOTAN', 'Parupeneus heptacanthus', 22000, 'ikan', 8),
('BUNTAL/BUNTEK', 'Diodon hystrix', 4000, 'ikan', 9),
('CENDRO/TRACAS', 'Tylosurus crocodilus', 12000, 'ikan', 10),
('COKLATAN', 'Scolopsis affinis', 11500, 'ikan', 11),
('CUMI-CUMI', 'Loligo Chinensis', 150000, 'cumi', 12),
('GEMPRANG/SELOK', 'Ilisha elongata', 10000, 'ikan', 13),
('GOLOK-GOLOK', 'Chirocentrus dorab', 8000, 'ikan', 14),
('GULAMAH/BLAMAH', 'Johnius borneensis', 8000, 'ikan', 15),
('GURITA', 'Octopus vulgaris', 25000, 'cumi', 16),
('HIU BONGOL/DONOL', 'Chiloscyllium punctatum', 10000, 'ikan', 17),
('HIU PILUS/CUCUT', 'Rhizoprionodon acutus', 10000, 'ikan', 18),
('HIU TOKEK', 'Atelomycterus marmoratus', 5000, 'ikan', 19),
('JAKET/BUKUR', 'Aluterus monoceros', 40000, 'ikan', 20),
('JAPUH', 'Dussumieria acuta', 6000, 'ikan', 21),
('KACI-KACI/BABU NYAI', 'Diagramma labiosum', 11000, 'ikan', 22),
('KAKAP JENAHA/NGANGAS', 'Lutjanus johnii', 30000, 'ikan', 23),
('KAKAP MERAH/BAMBANGAN', 'Lutjanus malabaricus', 35000, 'ikan', 24),
('KAPASAN', 'Gerres filamentosus', 10000, 'ikan', 25),
('KEMBUNG LELAKI/BANYAR', 'Rastrelliger kanagurta', 12000, 'ikan', 26),
('KERAPU LUMPUR/BALONG', 'Epinephelus coioides', 20000, 'ikan', 27),
('KERAPU SUNU/LODI', 'Plectropomus maculatus', 25000, 'ikan', 28),
('KERISI/CURUTAN', 'Pentapodus emeryii', 8500, 'ikan', 29),
('KERONG-KERONG/KEROT', 'Terapon theraps', 6250, 'ikan', 30),
('KUNIRAN/KUNIRAN KUNING', 'Upeneus sulphureus', 8500, 'ikan', 31),
('KURISI/ABANGAN/TRISI', 'Nemipterus virgatus', 10750, 'ikan', 32),
('KURO/LAOSAN', 'Polydactylus microstomus', 9500, 'ikan', 33),
('KWEE/KWEE LILIN/GATEP/KIMPUL/KANANG', '', 10000, 'ikan', 34),
('LAYANG BENGGOL/BLOCO CEMPLUK', '', 12500, 'ikan', 35),
('LAYANG DELES/BLOCO DELES', 'Decapterus macrosoma', 12500, 'ikan', 36),
('LAYARAN/MARLIN', 'Istiophorus platypterus', 12000, 'ikan', 37),
('LAYUR', 'Trichiurus lepturus', 12000, 'ikan', 38),
('LEMADANG', 'Coryphaena hippurus', 14000, 'ikan', 39),
('LEMURU', 'Sardinella Lemuru', 10000, 'ikan', 40),
('LENCAM', 'Lethrinus lentjan', 10000, 'ikan', 41),
('LIDAH/ILAT-ILAT', 'Cynoglossus lingua', 9500, 'ikan', 42),
('MALA/EKOR KUNING', 'Lutjanus vitta', 10750, 'ikan', 43),
('MANYUNG/UTIK/JAHAN/SONGOT/KETING', 'Netuma thalassina', 20500, 'ikan', 44),
('PARI BURUNG/MANUK', 'Aetomylaeus maculatus', 11000, 'ikan', 45),
('PARI HIDUNG SEKOP', 'Rhina ancylostoma', 0, 'ikan', 46),
('PARI KEKEH/YONGBUN', 'Rhynchobatus australiae', 17000, 'ikan', 47),
('PARI KEMBANG/BLENTIK', 'Dasyatis kuhlii', 18500, 'ikan', 48),
('PARI MUTIARA/CENGIR', 'Himantura jenkinsii', 19500, 'ikan', 49),
('PEPEREK/PIRIK/PETHEK', 'Leiognathus equul', 5200, 'ikan', 50),
('PILOK/WADUNG/SEMAR', 'Mene maculata', 8000, 'ikan', 51),
('REJUM/REJUNG', 'Sillago sihama', 22000, 'ikan', 52),
('REMANG/LARAK', 'Gymnothorax undulatus', 35000, 'ikan', 53),
('SEBELAH/PIHI', 'Psettodes erumei', 18000, 'ikan', 54),
('SELAR BENTONG/BENTONG', 'Selar crumenophthalmus', 8000, 'ikan', 55),
('SELAR HIJAU/GALUH', 'Atule mate', 10000, 'ikan', 56),
('SELAR KOMO/KOMO', 'Alepes djedaba', 11000, 'ikan', 57),
('SELAR KUNING/GONTOR', 'Selaroides leptolepis', 8150, 'ikan', 58),
('SILPER/KEBEL', 'Platax boersii', 13000, 'ikan', 59),
('SIRO/LECI/LESI', 'Amblygaster sirm', 10000, 'ikan', 60),
('SOTONG/BLEKUTHAK', 'Sepia pharaonis', 85000, 'cumi', 61),
('SUNGLIR', 'Elagatis bipinnulata', 0, 'ikan', 62),
('SWANGGI/MATA BESAR/DEMANG/OYES', 'Priacanthus tayenus', 8500, 'ikan', 63),
('TALANG-TALANG/WAIS', 'Scomberoides tala', 13000, 'ikan', 64),
('TEMBANG/TANJAN', 'Sardinella fimbriata', 6000, 'ikan', 65),
('TENGGIRI', 'Scomberomorus commerson', 30000, 'ikan', 66),
('TENGGIRI PAPAN/KAWANG/COLETAN', 'Scomberomorus guttatus', 16000, 'ikan', 67),
('TERI MERAH/GLAGAH', 'Stolephorus commersonii', 6000, 'ikan', 68),
('TETENGKEK/TEROS/CELIK', 'Megalaspis cordyla', 8000, 'ikan', 69),
('TONGKOL ABU-ABU', 'Thunnus tonggol', 20000, 'ikan', 70),
('TONGKOL LISONG/PISANG BALAKI', 'Auxis thazard', 18000, 'ikan', 71),
('TONGKOL PUTIH', 'Euthynnus affinis', 18000, 'ikan', 72),
-- Cumi specific grades
('2B', '', 0, 'cumi', 73),
('3B', '', 0, 'cumi', 74),
('4B', '', 0, 'cumi', 75),
('5B', '', 0, 'cumi', 76),
('2L', '', 0, 'cumi', 77),
('3L', '', 0, 'cumi', 78),
('4L', '', 0, 'cumi', 79),
('5L', '', 0, 'cumi', 80),
('CK', '', 0, 'cumi', 81),
('CDL', '', 0, 'cumi', 82),
('SEMAMPAR', '', 0, 'cumi', 83);

-- Update trigger
CREATE TRIGGER update_fish_species_updated_at
  BEFORE UPDATE ON public.fish_species
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
