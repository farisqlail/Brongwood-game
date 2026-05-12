/**
 * NPC Configuration - All 10 townspeople of Brongwood.
 * Each has a unique position, personality, and dialogue.
 */

import { TEXTURE_KEYS } from './assets.manifest';
import { GAME_CONFIG } from './game.config';
import { DialogueDefinition } from '@/dialogue/DialogueTypes';

const ts = GAME_CONFIG.TILE_SIZE;

export interface NPCData {
  id: string;
  name: string;
  textureKey: string;
  x: number;
  y: number;
  wanderRadius: number;
  dialogue: DialogueDefinition;
}

interface TownDialogueProfile {
  id: string;
  speakerName: string;
  morning: [string, string];
  afternoon: [string, string];
  evening: [string, string];
  night: [string, string];
  friend: [string, string, string];
  prompt: string;
  warmChoice: string;
  warmReply: string;
  thoughtfulChoice: string;
  thoughtfulReply: string;
  typeSpeed?: number;
}

function createTownDialogue(profile: TownDialogueProfile): DialogueDefinition {
  const speaker = profile.id;
  const name = profile.speakerName;

  const textNode = (id: string, text: string, next: string | null) => ({
    type: 'text' as const,
    id,
    speaker,
    speakerName: name,
    text,
    typeSpeed: profile.typeSpeed ?? 0.8,
    next,
  });

  return {
    id: `${profile.id}_chat`,
    startNode: 'start',
    nodes: {
      start: {
        type: 'branch',
        id: 'start',
        branches: [
          { condition: { relationship: { npcId: profile.id, minStage: 'acquaintance' } }, next: 'friend_1' },
        ],
        fallback: 'time_branch',
      },
      time_branch: {
        type: 'branch',
        id: 'time_branch',
        branches: [
          { condition: { timePeriod: ['dawn', 'morning'] }, next: 'morning_1' },
          { condition: { timePeriod: ['afternoon'] }, next: 'afternoon_1' },
          { condition: { timePeriod: ['evening'] }, next: 'evening_1' },
          { condition: { timePeriod: ['night', 'late_night'] }, next: 'night_1' },
        ],
        fallback: 'afternoon_1',
      },
      morning_1: textNode('morning_1', profile.morning[0], 'morning_2'),
      morning_2: textNode('morning_2', profile.morning[1], 'choice'),
      afternoon_1: textNode('afternoon_1', profile.afternoon[0], 'afternoon_2'),
      afternoon_2: textNode('afternoon_2', profile.afternoon[1], 'choice'),
      evening_1: textNode('evening_1', profile.evening[0], 'evening_2'),
      evening_2: textNode('evening_2', profile.evening[1], 'choice'),
      night_1: textNode('night_1', profile.night[0], 'night_2'),
      night_2: textNode('night_2', profile.night[1], 'choice'),
      friend_1: textNode('friend_1', profile.friend[0], 'friend_2'),
      friend_2: textNode('friend_2', profile.friend[1], 'friend_3'),
      friend_3: textNode('friend_3', profile.friend[2], 'friend_bond'),
      friend_bond: {
        type: 'action',
        id: 'friend_bond',
        actions: [
          { type: 'add_affection', npcId: profile.id, amount: 3 },
          { type: 'add_trust', npcId: profile.id, amount: 1 },
        ],
        next: null,
      },
      choice: {
        type: 'choice',
        id: 'choice',
        prompt: profile.prompt,
        choices: [
          {
            text: profile.warmChoice,
            choiceId: 'warm',
            next: 'warm_reply',
            effects: [{ type: 'add_affection', npcId: profile.id, amount: 5 }],
          },
          {
            text: profile.thoughtfulChoice,
            choiceId: 'thoughtful',
            next: 'thoughtful_reply',
            effects: [{ type: 'add_trust', npcId: profile.id, amount: 3 }],
          },
        ],
      },
      warm_reply: textNode('warm_reply', profile.warmReply, null),
      thoughtful_reply: textNode('thoughtful_reply', profile.thoughtfulReply, null),
    },
  };
}

export const TOWN_NPCS: NPCData[] = [
  {
    id: 'baker',
    name: 'Hana',
    textureKey: TEXTURE_KEYS.NPC_BAKER,
    x: ts * 3, y: ts * 3.5,
    wanderRadius: 30,
    dialogue: createTownDialogue({
      id: 'baker',
      speakerName: 'Hana',
      typeSpeed: 0.75,
      morning: ['Adonan pagi itu paling jujur. Kalau dia ngambek, satu dapur ikut tahu.', 'Hari ini ngembangnya cantik. Aku anggap itu pertanda baik.'],
      afternoon: ['Sore begini cocoknya roti manis dan kaki yang istirahat.', 'Orang bilang cari makanan, tapi seringnya mereka cuma butuh tempat bernapas.'],
      evening: ['Roti keras kusimpan buat sup malam. Sayang kalau dibuang, tepung itu butuh sabar.', 'Kalau kamu mencium kayu manis, berarti aku kalah sama keinginan bikin yang hangat-hangat.'],
      night: ['Ovennya sudah tidur, tapi batunya masih hangat lama sekali.', 'Kadang setelah tutup aku duduk di sini, dengar kota pelan-pelan tenang.'],
      friend: ['Aku sisihkan roti kecil buatmu. Bukan karena kamu minta, cuma rasanya kamu bakal lewat.', 'Mukamu kelihatan lagi bawa banyak pikiran.', 'Makan dulu. Kekhawatiran biasanya kalah kalau perut sudah isi.'],
      prompt: 'Hana menepuk sisa tepung dari tangannya lalu tersenyum hangat.',
      warmChoice: 'Toko roti ini bikin kota terasa hidup.',
      warmReply: 'Kalimat begitu bisa bikin tukang roti rela bangun sebelum subuh. Terima kasih.',
      thoughtfulChoice: 'Kamu peka sekali sama orang.',
      thoughtfulReply: 'Roti yang mengajari. Tiap orang melunak dengan cara berbeda kalau diberi hangat.',
    }),
  },
  {
    id: 'fisher',
    name: 'Old Taro',
    textureKey: TEXTURE_KEYS.NPC_FISHER,
    x: ts * 13, y: ts * 8.5,
    wanderRadius: 25,
    dialogue: createTownDialogue({
      id: 'fisher',
      speakerName: 'Old Taro',
      typeSpeed: 1.05,
      morning: ['Air pagi bicara jujur sebelum manusia mulai ribut.', 'Kalau camar terbang rendah, pasang biasanya baik. Kalau tidak, ya pemandangannya tetap lumayan.'],
      afternoon: ['Ikan-ikan sedang mengabaikanku dengan disiplin luar biasa.', 'Tidak apa. Manusia perlu belajar ditolak alam dengan sopan.'],
      evening: ['Sore itu waktu laut bicara seperti kawan lama.', 'Katanya tidak pernah baru, tapi entah kenapa tetap perlu kudengar.'],
      night: ['Memancing malam itu kebanyakan mendengar. Senar, angin, tulang sendiri.', 'Jangan buru-buru pulang kalau hatimu masih berisik. Biar gelap membasuh sedikit.'],
      friend: ['Nah, kau datang. Kupikir kota ini sudah menelanmu bulat-bulat.', 'Aku bawa dua cangkir teh. Yang satu optimisme. Yang satu boleh untukmu.', 'Duduk sebentar. Sunyi lebih mudah kalau dibagi.'],
      prompt: 'Old Taro mengecek kail tanpa mengalihkan mata dari air.',
      warmChoice: 'Sunyi di sini enak.',
      warmReply: 'Betul. Sunyi itu bukan kosong. Ia penuh hal-hal yang berhenti berteriak.',
      thoughtfulChoice: 'Kakek pernah kesepian di sini?',
      thoughtfulReply: 'Tentu. Tapi kesepian dan damai bisa duduk di perahu yang sama.',
    }),
  },
  {
    id: 'elder',
    name: 'Grandma Mei',
    textureKey: TEXTURE_KEYS.NPC_ELDER,
    x: ts * 8, y: ts * 2,
    wanderRadius: 20,
    dialogue: createTownDialogue({
      id: 'elder',
      speakerName: 'Grandma Mei',
      typeSpeed: 1.15,
      morning: ['Nenek bangun sebelum matahari karena kebiasaan. Tulang tua punya jadwal tua.', 'Pagi membuat kota ini tampak muda, sebelum jejak kaki mengingatkannya pada kemarin.'],
      afternoon: ['Dulu Nenek sering mengeluh soal sore yang lambat. Sekarang rasanya itu hadiah sederhana.', 'Duduk terlalu lama, kau bisa dengar rumah-rumah berderit seperti sedang mengingat nama.'],
      evening: ['Cahaya senja baik kepada jalan tua.', 'Ia menyembunyikan retak, tapi meninggalkan cerita. Nenek suka kesepakatan itu.'],
      night: ['Malam-malam Nenek menghitung jendela yang menyala. Cara orang tua memastikan semua pulang.', 'Jangan tertawa. Harus ada yang menghitung.'],
      friend: ['Ah, bagus. Nenek berharap kau mampir.', 'Hari ini Nenek ingat satu cerita, dan cerita bisa basi kalau tidak didengar.', 'Kalau ada waktu, Nenek ceritakan bagaimana kota ini selamat dari badai besar pertamanya.'],
      prompt: 'Grandma Mei menatapmu dengan mata sabar dan terang.',
      warmChoice: 'Aku suka dengar cerita Nenek.',
      warmReply: 'Kalau begitu Nenek simpan beberapa cerita terbaik untukmu, Nak.',
      thoughtfulChoice: 'Kota ini terasa berbeda sekarang?',
      thoughtfulReply: 'Berbeda, iya. Hilang, tidak. Tempat berganti baju, bukan jiwa.',
    }),
  },
  {
    id: 'girl',
    name: 'Yuki',
    textureKey: TEXTURE_KEYS.NPC_GIRL,
    x: ts * 11, y: ts * 3,
    wanderRadius: 40,
    dialogue: createTownDialogue({
      id: 'girl',
      speakerName: 'Yuki',
      typeSpeed: 0.45,
      morning: ['Aku nemu tiga batu kinclong sebelum sarapan. Berarti hari ini penting banget!', 'Satu bentuknya kayak bulan mini, tapi aku balikin. Mungkin tanahnya masih butuh.'],
      afternoon: ['Rumput dekat jalan besar punya jalur rahasia.', 'Kayaknya semut lagi bikin kota. Wali kotanya sibuk parah.'],
      evening: ['Langit jadi warna persik lagi. Aku tanya kenapa, tapi dia sok misterius.', 'Orang dewasa bilang senja itu biasa. Menurutku yang biasa juga bisa aja ajaib.'],
      night: ['Aku nggak boleh jalan jauh malam-malam, tapi dari sini masih kelihatan kunang-kunang.', 'Mereka kayak bintang kecil yang berubah pikiran.'],
      friend: ['Aku simpan daun keberuntungan buatmu. Ada bekas gigitannya, jadi dia sudah pernah petualangan.', 'Kalau kamu bawa, mungkin kamu ikut beruntung.', 'Tapi kalau dia kesepian, taruh dekat tanaman ya. Daun suka punya teman.'],
      prompt: 'Yuki melonjak kecil, menunggu jawabanmu.',
      warmChoice: 'Kedengarannya ajaib.',
      warmReply: 'Kan! Aku tahu kamu juga bisa lihat keajaibannya.',
      thoughtfulChoice: 'Mungkin hal kecil punya hidup besar.',
      thoughtfulReply: 'Iya! Makanya kita harus jalan pelan-pelan.',
    }),
  },
  {
    id: 'boy',
    name: 'Kenta',
    textureKey: TEXTURE_KEYS.NPC_BOY,
    x: ts * 5, y: ts * 7,
    wanderRadius: 45,
    dialogue: createTownDialogue({
      id: 'boy',
      speakerName: 'Kenta',
      typeSpeed: 0.5,
      morning: ['Aku gambar peta kota di buku, tapi harus hapus bagian pagar karena Grandma Mei bilang pagar itu tetap wilayah orang.', 'Kartografi susah kalau orang dewasa terus punya properti.'],
      afternoon: ['Aku latihan buat ekspedisi masa depan. Hari ini aku nyebrang alun-alun tanpa injak retakan.', 'Itu pada dasarnya mendaki gunung, kalau imajinasimu cukup serius.'],
      evening: ['Kalau lampu mulai nyala, kota ini kayak pintu masuk dungeon.', 'Dungeon yang nyaman. Ada camilan. Tapi tetap dungeon.'],
      night: ['Malam bikin semua gang jadi dua kali lebih panjang.', 'Aku bukan takut. Aku waspada strategis. Beda, ya.'],
      friend: ['Kalau suatu hari aku keluar kota, namamu masuk dedikasi jurnal penjelajahku.', 'Bukan halaman pertama. Itu buat peta. Tapi halaman kedua, pasti.', 'Kamu jadi Konsultan Utama Anti-Tersesat.'],
      prompt: 'Kenta merendahkan suara seperti membocorkan rahasia negara.',
      warmChoice: 'Kamu bakal jadi penjelajah hebat.',
      warmReply: 'Jelas. Tapi bagus juga ada yang sadar selain aku.',
      thoughtfulChoice: 'Mulai dari kenali kota ini dulu.',
      thoughtfulReply: 'Itu pintar juga. Semua penjelajah legendaris butuh peta pertama.',
    }),
  },
  {
    id: 'merchant',
    name: 'Mr. Sato',
    textureKey: TEXTURE_KEYS.NPC_MERCHANT,
    x: ts * 12, y: ts * 6,
    wanderRadius: 25,
    dialogue: createTownDialogue({
      id: 'merchant',
      speakerName: 'Mr. Sato',
      typeSpeed: 0.7,
      morning: ['Pembeli pagi biasanya mencari yang praktis: garam, benang, minyak lampu.', 'Menjelang sore baru mereka ingat yang sebenarnya diinginkan. Saat itulah permen laku.'],
      afternoon: ['Bisnis sedang pelan, tapi ritme pelan membuat pola terlihat jelas.', 'Orang membeli payung sebelum mereka mengaku khawatir hujan.'],
      evening: ['Saat senja saya menghitung koin, dan selalu menemukan lebih banyak cerita daripada laba.', 'Itu bukan akuntansi yang baik, tapi hidup jadi lebih baik.'],
      night: ['Toko sudah tutup secara resmi. Tapi kalau ada yang butuh obat atau baterai, saya dengar belnya.', 'Kota hanya terasa kecil kalau orang berhenti menjawab.'],
      friend: ['Saya sisihkan beberapa benih kuat dari pemasok yang lewat.', 'Hari ini tidak perlu bayar. Anggap investasi untuk kebunmu.', 'Nanti kembali dan ceritakan mana yang tumbuh. Saya suka tahu akhir perjalanan barang.'],
      prompt: 'Mr. Sato mengetuk meja dengan tenang dan rapi.',
      warmChoice: 'Bapak menjaga kota tetap terpenuhi.',
      warmReply: 'Saya berusaha. Rak hanya rak sampai seseorang membutuhkan isinya.',
      thoughtfulChoice: 'Bapak tahu kebiasaan semua orang.',
      thoughtfulReply: 'Pedagang belajar apa yang orang minta, dan apa yang terlalu malu mereka minta.',
    }),
  },
  {
    id: 'farmer',
    name: 'Daichi',
    textureKey: TEXTURE_KEYS.NPC_FARMER,
    x: ts * 2, y: ts * 7.5,
    wanderRadius: 35,
    dialogue: createTownDialogue({
      id: 'farmer',
      speakerName: 'Daichi',
      typeSpeed: 0.85,
      morning: ['Pagi itu waktunya cek daun. Tanaman mengeluh pelan, jadi harus dilihat dekat.', 'Sedikit layu, pinggir pucat, tanah retak. Semua ada artinya.'],
      afternoon: ['Matahari mengerjakan separuh tugasku dan menggandakan keringatku.', 'Kalau mau menanam, siram sebelum tanahnya keras kepala.'],
      evening: ['Siram sore bikin akar tenang.', 'Orang juga begitu. Lebih sedikit suara, lebih sedikit pura-pura.'],
      night: ['Aku tidak kerja di ladang malam-malam kecuali cuaca memaksa.', 'Akar butuh gelap. Mungkin manusia juga.'],
      friend: ['Tanganmu mulai kelihatan seperti benar-benar paham tanah.', 'Itu pujian. Tangan bersih tidak salah, tapi tanah ingat usaha.', 'Kalau panen gagal, jangan dimasukkan hati. Pelajari bahasanya saja.'],
      prompt: 'Daichi membersihkan tanah dari telapak tangannya.',
      warmChoice: 'Nasihat kebunmu membantu.',
      warmReply: 'Bagus. Nasihat harus berguna, bukan cuma hiasan.',
      thoughtfulChoice: 'Tanaman terdengar rumit.',
      thoughtfulReply: 'Mereka hidup. Rumit itu bagian dari paketnya.',
    }),
  },
  {
    id: 'artist',
    name: 'Mio',
    textureKey: TEXTURE_KEYS.NPC_ARTIST,
    x: ts * 9, y: ts * 8,
    wanderRadius: 30,
    dialogue: createTownDialogue({
      id: 'artist',
      speakerName: 'Mio',
      typeSpeed: 0.8,
      morning: ['Warna pagi terlalu jujur. Mereka muncul sebelum aku siap.', 'Aku terus mencoba melukis emas pucat pertama itu, tapi kuasku suka baper.'],
      afternoon: ['Bayangan siang punya siku tajam.', 'Mereka membuat bangunan terlihat lebih yakin daripada manusia.'],
      evening: ['Senja itu curang. Semua jadi indah tepat saat cahaya pergi.', 'Mungkin itu sebabnya aku terus melukisnya. Aku buruk dalam melepas.'],
      night: ['Malam-malam aku menggambar jendela, bukan wajah.', 'Jendela menyala bilang ada seseorang di sana tanpa memaksa kita memahaminya.'],
      friend: ['Aku mulai menggambarmu di pinggir adegan kota.', 'Bukan potret. Lebih seperti bukti bahwa ada yang mendengarkan tempat ini.', 'Jangan panik. Rambutmu kubuat lebih nurut dari aslinya.'],
      prompt: 'Mio memiringkan buku sketsanya, setengah malu setengah geli.',
      warmChoice: 'Suatu hari aku ingin melihatnya.',
      warmReply: 'Suatu hari, ya. Kalau aku sudah berhenti berdebat dengan bayangan.',
      thoughtfulChoice: 'Mungkin karya yang belum selesai tetap jujur.',
      thoughtfulReply: 'Itu menyebalkan bagusnya. Mungkin akan kucuri.',
    }),
  },
  {
    id: 'postman',
    name: 'Jiro',
    textureKey: TEXTURE_KEYS.NPC_POSTMAN,
    x: ts * 6, y: ts * 5.5,
    wanderRadius: 50,
    dialogue: createTownDialogue({
      id: 'postman',
      speakerName: 'Jiro',
      typeSpeed: 0.65,
      morning: ['Rute pagi dimulai dengan tas kosong dan harapan tinggi.', 'Tagihan lebih berat dari surat, secara emosional. Kadang secara fisik juga.'],
      afternoon: ['Menjelang sore aku tahu siapa yang di rumah dari tirai yang bergerak.', 'Tenang, aku bukan kepo. Aku observan secara profesional.'],
      evening: ['Antaran sore terasa beda. Orang membuka pintu lebih pelan.', 'Mungkin kabar lebih mudah mendarat saat hari sudah lelah.'],
      night: ['Aku tidak mengantar malam kecuali mendesak.', 'Beberapa pesan harus menunggu terang. Beberapa tidak. Tahu bedanya, itu pekerjaanku.'],
      friend: ['Aku pernah lihat namamu di daftar paket dan hampir ikut senang.', 'Ternyata untuk orang lain dengan tulisan mirip. Tragis, sungguh.', 'Tetap, akan kuawasi. Semua orang pantas dapat surat bagus.'],
      prompt: 'Jiro merapikan tali tasnya dengan cekatan.',
      warmChoice: 'Rutemu menghubungkan banyak orang.',
      warmReply: 'Itu harapannya. Bahkan pengumuman membosankan bilang, "dunia masih ingat kamu."',
      thoughtfulChoice: 'Kamu kangen surat sungguhan?',
      thoughtfulReply: 'Setiap hari. Pesan sekarang lebih cepat, tapi surat tahu cara tiba.',
    }),
  },
  {
    id: 'librarian',
    name: 'Aoi',
    textureKey: TEXTURE_KEYS.NPC_LIBRARIAN,
    x: ts * 10, y: ts * 2.5,
    wanderRadius: 20,
    dialogue: createTownDialogue({
      id: 'librarian',
      speakerName: 'Aoi',
      typeSpeed: 0.9,
      morning: ['Aku menata buku yang dikembalikan pagi hari karena buku terasa lebih tenang saat itu.', 'Mungkin terdengar aneh. Pustakawan boleh punya satu kepercayaan aneh per rak.'],
      afternoon: ['Ada yang meminjam sejarah kota lagi.', 'Entah rasa ingin tahu sedang menular, atau orang yang sama lupa sudah membaca bab tiga.'],
      evening: ['Sore cocok untuk cerita dengan lentera, dapur, dan orang yang hampir mengatakan maksudnya.', 'Aku lemah pada kata "hampir". Itu yang membuat halaman terus dibalik.'],
      night: ['Malam hari, setiap buku terdengar lebih keras saat ditutup.', 'Perpustakaan mengajari bahwa sunyi tetap bisa punya tanda baca.'],
      friend: ['Aku menemukan buku yang mungkin kamu suka.', 'Tentang membangun kembali rumah yang terlantar, tapi sebenarnya tentang memaafkan diri pelan-pelan.', 'Sudah kusisihkan. Tidak ada tekanan tenggat. Beberapa buku harus menunggu dengan sopan.'],
      prompt: 'Aoi menahan halaman dengan satu jari agar tidak kehilangan tempat.',
      warmChoice: 'Rekomendasimu selalu penuh perhatian.',
      warmReply: 'Buku lebih mudah dipasangkan kalau pembacanya diperhatikan.',
      thoughtfulChoice: 'Kenapa cerita sepenting itu?',
      thoughtfulReply: 'Karena hidup terjadi sekali, tapi cerita membuat kita berlatih merasakannya.',
    }),
  },
];
