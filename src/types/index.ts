export interface Kapal {
  id: string;
  namaKapal: string;
  tandaSelar: {
    gt: string;
    no: string;
    huruf: string;
  };
  jenisPendataan: 'ikan' | 'cumi';
  tanggal: Date;
  mulaiBongkar?: Date;
  selesaiBongkar?: Date;
  donePIPP: boolean;
  alatTangkap: string;
  posisiDermaga: string;
  entries: Entry[];
}

export interface Entry {
  id: string;
  kapalId: string;
  jenis: string;
  berat: number;
  waktuInput: Date;
}

export const JENIS_IKAN = [
  "Alu-Alu/Kacangan",
  "Aruan Tasek/Wudun",
  "Ayam-ayam/Etong",
  "Barakuda/Tunul",
  "Baronang/Semadar",
  "Bawal Hitam/Tiplek",
  "Beloso/Boso",
  
  "Buntal/Buntek",
  "Cendro/Tracas",
  "Coklatan",
  "Gemprang/Selok",
  "Golok-Golok",
  "Gulamah/Blamah",
  "Hiu Bongol/Donol",
  "Hiu Pilus/Cucut",
  "Hiu Tokek",
  "Jaket/Bukur",
  "Japuh",
  "Kaci-Kaci/Babu Nyai",
  "Kakap Jenaha/Ngangas",
  "Kakap Merah/Bambangan",
  "Kapasan",
  "Kembung Lelaki/Banyar",
  "Kerapu Lumbur/Balong",
  "Kerapu Sunu/Lodi",
  "Kerisi/Curutan",
  "Kerong-Kerong/Kerot",
  "Kuniran",
  "Kurisi/Abangan",
  "Trisi",
  "Kuro/Laosan",
  "Kwee/Gatep/Kimpul/Kanang",
  "Layang Benggol/Bloco Cempluk",
  "Layang Deles/Bloco Deles",
  "Layaran/Marlin",
  "Layur",
  "Lemadang",
  "Lencam",
  "Lidah/Ilat-Ilat",
  "Mala/Ekor Kuning",
  "Manyung/Utik/Jahan/Songot/Keting",
  "Pari Burung/Manuk",
  "Pari Hidung Sekop",
  "Pari Kekeh/Yongbun",
  "Pari Kembang/Blentik",
  "Pari Mutiara/Cengir",
  "Peperek/Perek/Pirik/Pethek",
  "Pilok/Wadung/Semar",
  "Rejum/Rejung",
  "Remang/Larak",
  "Sebelah/Pihi",
  "Selar Bentong",
  "Selar Hijau/Galuh",
  "Selar Komo",
  "Selar Kuning/Gontor",
  "Silper/Kebel",
  "Siro/Leci/Lesi",
  "Sunglir",
  "Swanggi/Mata Besar/Demang/Oyes",
  "Talang-Talang/Wais",
  "Tembang/Tanjan",
  "Tenggiri",
  "Tenggiri Papan/Kawang/Coletan",
  "Teri Merah/Glagah",
  "Tetengkek/Teros/Celik",
  "Tongkol Abu-Abu",
  "Tongkol Lisong/Pisang Balaki",
  "Tongkol Putih",
] as const;

export const JENIS_CUMI = [
  "2B",
  "3B",
  "4B",
  "5B",
  "2L",
  "3L",
  "4L",
  "5L",
  "CK",
  "CDL",
  "Sotong",
  "Semampar",
  "Gurita",
] as const;

export const KATEGORI_CUMI = {
  sotongSemampar: ["Sotong", "Semampar"], // Sotong dan Semampar digabung jadi 1 hasil
  gurita: ["Gurita"],
  cumi: ["2B", "3B", "4B", "5B", "2L", "3L", "4L", "5L", "CK", "CDL"], // Selain Gurita & Sotong/Semampar = Cumi
} as const;
