import { TEXTURE_KEYS } from '@config/assets.manifest';

export type PrologueMusicMode = 'city' | 'minimarket' | 'resignation' | 'train' | 'arrival' | 'theme';
export type PrologueSequenceId = 'city' | 'minimarket' | 'resignation' | 'train' | 'arrival' | 'rika';
export type PrologueSequenceNext = PrologueSequenceId | 'title';
export type PrologueEndingEffect = 'fade' | 'apartmentLightOff';

export interface PrologueSequenceConfig {
  id: PrologueSequenceId;
  shots: readonly string[];
  lines: readonly (readonly string[])[];
  music: PrologueMusicMode;
  next: PrologueSequenceNext;
  endingEffect?: PrologueEndingEffect;
}

export const PROLOGUE_SEQUENCES: Record<PrologueSequenceId, PrologueSequenceConfig> = {
  city: {
    id: 'city',
    shots: [
      'prologue_scene_1_1',
      'prologue_scene_1_2',
      'prologue_scene_1_3',
      'prologue_scene_1_4',
    ],
    lines: [
      [
        '00:41',
        'Keyboard kantor. Notifikasi HP. Kereta bawah tanah. Hujan.',
        'Suara orang bicara samar menempel di dinding apartemen kecil.',
      ],
      [
        'Monitor masih menyala.',
        'Apartment kecil. Gelap. Berantakan.',
        'Tidak ada musik. Hanya ambience kota.',
      ],
      [
        'Deadline lagi besok.',
        'Kopi sudah dingin.',
        'Reminder meeting. Client revision. Missed call: Mom.',
      ],
      [
        'Kota malam penuh lampu.',
        'Tapi dari jendela ini, semuanya terasa kosong.',
        'Aku bahkan sudah lupa kapan terakhir kali merasa tenang.',
      ],
    ],
    music: 'city',
    next: 'minimarket',
  },

  minimarket: {
    id: 'minimarket',
    shots: [
      'prologue_scene_2_1',
      'prologue_scene_2_2',
      'prologue_scene_2_3',
      'prologue_scene_2_4',
      'prologue_scene_2_5',
    ],
    lines: [
      [
        'Lail berjalan keluar apartemen.',
        'Hujan gerimis turun di jalan kota.',
        'Untuk pertama kalinya malam itu, piano pelan mulai masuk.',
      ],
      [
        'Minimarket kecil. Lampu putih dingin. Sepi.',
        'Lail membeli kopi kaleng.',
        'Ia duduk sendirian dekat kasir.',
      ],
      [
        'TV kecil di atas kasir menyala.',
        'TV: Festival Musim Panas Brongwood akan dimulai minggu depan.',
        'Di layar: danau. Lentera. Laut. Festival malam.',
      ],
      [
        'Warna hangat itu terasa seperti dunia lain.',
        'Kontras dengan kota Lail yang dingin dan terlalu terang.',
        'Lail menatap layar cukup lama.',
      ],
      [
        'Kasir: Tempat kecil begitu masih ada ya...',
        'Lail diam.',
        'Brongwood...',
      ],
    ],
    music: 'minimarket',
    next: 'resignation',
  },

  resignation: {
    id: 'resignation',
    shots: [
      TEXTURE_KEYS.PROLOGUE_SCENE_3_1,
      TEXTURE_KEYS.PROLOGUE_SCENE_3_2,
      TEXTURE_KEYS.PROLOGUE_SCENE_3_3,
      TEXTURE_KEYS.PROLOGUE_SCENE_3_4,
      TEXTURE_KEYS.PROLOGUE_SCENE_3_5,
      TEXTURE_KEYS.PROLOGUE_SCENE_3_6,
    ],
    lines: [
      [
        'Subject: Pengunduran diri.',
        'Aku membaca ulang kalimat pertama sampai lima kali.',
        'Tidak ada versi yang terasa benar. Hanya ada versi yang selesai.',
      ],
      [
        'Apartemen ini tidak pernah luas.',
        'Tapi saat dibereskan, barangnya seperti punya cara sendiri untuk bertambah.',
        'Satu kardus untuk dibawa. Dua kardus untuk tidak dipikirkan dulu.',
      ],
      [
        'Meja dijual ke orang yang datang tepat waktu.',
        'Kursi ditawar terlalu rendah, tapi aku iya-kan juga.',
        'Aku baru sadar beberapa benda tidak penting sampai harus melepasnya.',
      ],
      [
        'Kabel monitor agak keras dicabut.',
        'Suara kecilnya membuat ruangan terasa resmi kosong.',
        'Seperti pekerjaan itu akhirnya berhenti ikut bernapas di sini.',
      ],
      [
        'Aku mengecek saklar, jendela, pintu.',
        'Hal-hal biasa. Hal-hal yang menahan orang agar tidak panik.',
        'Di luar, hari tetap berjalan seperti tidak ada keputusan besar.',
      ],
      [
        'Sebelum keluar, aku melihat sekali lagi.',
        'Tidak ada tepuk tangan. Tidak ada musik besar.',
        'Hanya ruangan kosong, dan aku yang akhirnya mematikan lampu.',
      ],
    ],
    music: 'resignation',
    next: 'train',
    endingEffect: 'apartmentLightOff',
  },

  train: {
    id: 'train',
    shots: [
      'prologue_scene_4_1',
      'prologue_scene_4_2',
      'prologue_scene_4_3',
      'prologue_scene_4_4',
      'prologue_scene_4_5',
    ],
    lines: [
      [
        'Rel kereta berbunyi pelan di bawah hujan.',
        'Kota mundur di balik kaca, seperti sesuatu yang tidak lagi memanggil.',
        'Aku tidak tahu apa yang aku cari.',
      ],
      [
        'Aku duduk dekat jendela karena tidak tahu harus melihat ke mana lagi.',
        'Lampu gedung tinggi pecah jadi garis-garis basah.',
        'Untuk pertama kalinya malam ini, tidak ada yang perlu kubalas.',
      ],
      [
        'Aku membuka HP.',
        'Tidak ada notifikasi baru.',
        'Aneh. Sunyinya tidak menyakitkan. Hanya sunyi.',
      ],
      [
        'Gedung tinggi berubah jadi sawah neon, lalu jalan padat, lalu laut gelap.',
        'Dunia di luar seperti mengganti napasnya sendiri.',
        'Tapi aku tahu aku tidak bisa terus hidup seperti itu.',
      ],
      [
        'Hutan mulai muncul di sisi rel.',
        'Aku menyandarkan kepala ke kaca yang dingin.',
        'Kalau aku tidak menemukan apa-apa di sana, setidaknya aku sudah pergi.',
      ],
    ],
    music: 'train',
    next: 'arrival',
  },

  arrival: {
    id: 'arrival',
    shots: [
      'prologue_scene_5_1',
      'prologue_scene_5_2',
      'prologue_scene_5_3',
      'prologue_scene_5_4',
    ],
    lines: [
      [
        'Announcer: Brongwood Station.',
        'Musik berhenti perlahan. Yang tersisa hanya rem kereta dan pagi.',
        'Kabut tipis menunggu di luar pintu.',
      ],
      [
        'Stasiunnya kecil. Terlalu kecil untuk terburu-buru.',
        'Ada suara burung, angin pagi, dan ombak yang jauh sekali.',
        'Tidak ada objective marker. Tidak ada instruksi. Hanya jalan.',
      ],
      [
        'Poster Festival: Summer Lantern Festival - 7 Days Left.',
        'Cafe kecil masih tutup.',
        'Di seberang jalan, toko bunga sudah menyalakan lampunya.',
      ],
      [
        'Aku berjalan tanpa tahu harus ke mana.',
        'Anehnya, untuk pertama kalinya, itu tidak terasa seperti masalah.',
        'Brongwood terasa pelan. Mungkin aku bisa ikut pelan.',
      ],
    ],
    music: 'arrival',
    next: 'rika',
  },

  rika: {
    id: 'rika',
    shots: [
      'prologue_scene_6_1',
      'prologue_scene_6_2',
      'prologue_scene_6_3',
      'prologue_scene_6_4',
      'prologue_scene_6_5',
    ],
    lines: [
      [
        'Bell pintu berbunyi kecil.',
        'Udara di dalam toko bunga hangat, kontras dengan pagi di luar.',
        'Rika sedang menyusun bunga dan belum melihatku.',
      ],
      [
        'Rika: Maaf, kami belum buka.',
        'Lail: Oh... maaf.',
        'Rika akhirnya menoleh. Diam sebentar.',
      ],
      [
        'Rika melihat koper di samping kakiku.',
        'Rika: Pendatang baru?',
        'Lail: Kelihatan ya?',
      ],
      [
        'Rika: Orang sini jarang kelihatan bingung milih mie instan dan bunga sekaligus.',
        'Aku tertawa kecil.',
        'Rasanya asing, tapi tidak buruk.',
      ],
      [
        'Rika: Brongwood kota kecil.',
        'Rika: Kalau terlalu lama tinggal di sini... waktu berjalan aneh.',
        'Lail: Mungkin itu yang aku butuhkan.',
        'Rika diam sebentar. Lalu tersenyum kecil.',
      ],
    ],
    music: 'theme',
    next: 'title',
  },
} as const;
