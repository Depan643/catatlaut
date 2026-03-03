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
  "ALU-ALU/KACANGAN",
  "ARUAN TASEK/WUDUN",
  "AYAM-AYAM/ETONG",
  "BARAKUDA/TUNUL",
  "BARONANG/SEMADAR",
  "BAWAL HITAM/TIPLEK",
  "BELOSO/BOSO",
  "BIJI NANGKA/JENGGOTAN",
  "BUNTAL/BUNTEK",
  "CENDRO/TRACAS",
  "COKLATAN",
  "GEMPRANG/SELOK",
  "GOLOK-GOLOK",
  "GULAMAH/BLAMAH",
  "HIU BONGOL/DONOL",
  "HIU PILUS/CUCUT",
  "HIU TOKEK",
  "JAKET/BUKUR",
  "JAPUH",
  "KACI-KACI/BABU NYAI",
  "KAKAP JENAHA/NGANGAS",
  "KAKAP MERAH/BAMBANGAN",
  "KAPASAN",
  "KEMBUNG LELAKI/BANYAR",
  "KERAPU LUMPUR/BALONG",
  "KERAPU SUNU/LODI",
  "KERISI/CURUTAN",
  "KERONG-KERONG/KEROT",
  "KUNIRAN/KUNIRAN KUNING",
  "KURISI/ABANGAN/TRISI",
  "KURO/LAOSAN",
  "KWEE/KWEE LILIN/GATEP/KIMPUL/KANANG",
  "LAYANG BENGGOL/BLOCO CEMPLUK",
  "LAYANG DELES/BLOCO DELES",
  "LAYARAN/MARLIN",
  "LAYUR",
  "LEMADANG",
  "LEMURU",
  "LENCAM",
  "LIDAH/ILAT-ILAT",
  "MALA/EKOR KUNING",
  "MANYUNG/UTIK/JAHAN/SONGOT/KETING",
  "PARI BURUNG/MANUK",
  "PARI HIDUNG SEKOP",
  "PARI KEKEH/YONGBUN",
  "PARI KEMBANG/BLENTIK",
  "PARI MUTIARA/CENGIR",
  "PEPEREK/PIRIK/PETHEK",
  "PILOK/WADUNG/SEMAR",
  "REJUM/REJUNG",
  "REMANG/LARAK",
  "SEBELAH/PIHI",
  "SELAR BENTONG/BENTONG",
  "SELAR HIJAU/GALUH",
  "SELAR KOMO/KOMO",
  "SELAR KUNING/GONTOR",
  "SILPER/KEBEL",
  "SIRO/LECI/LESI",
  "SUNGLIR",
  "SWANGGI/MATA BESAR/DEMANG/OYES",
  "TALANG-TALANG/WAIS",
  "TEMBANG/TANJAN",
  "TENGGIRI",
  "TENGGIRI PAPAN/KAWANG/COLETAN",
  "TERI MERAH/GLAGAH",
  "TETENGKEK/TEROS/CELIK",
  "TONGKOL ABU-ABU",
  "TONGKOL LISONG/PISANG BALAKI",
  "TONGKOL PUTIH",
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
  "SOTONG/BLEKUTHAK",
  "SEMAMPAR",
  "GURITA",
  "CUMI-CUMI",
] as const;

export const KATEGORI_CUMI = {
  cumiCumi: ["2B", "3B", "4B", "5B", "2L", "3L", "4L", "5L", "CK", "CDL"] as readonly string[],
  cumi: ["SOTONG/BLEKUTHAK", "SEMAMPAR", "CUMI-CUMI"] as readonly string[],
  gurita: ["GURITA"] as readonly string[],
} as const;
