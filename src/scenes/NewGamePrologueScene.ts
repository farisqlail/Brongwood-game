import Phaser from 'phaser';
import { DEPTH, GAME_CONFIG, SCENE_KEYS } from '@config/game.config';
import { TEXTURE_KEYS } from '@config/assets.manifest';

interface PrologueObject {
  id: string;
  x: number;
  y: number;
  radius: number;
  label: string;
  lines: string[];
}

const RESIGNATION_SHOTS = [
  TEXTURE_KEYS.PROLOGUE_SCENE_3_1,
  TEXTURE_KEYS.PROLOGUE_SCENE_3_2,
  TEXTURE_KEYS.PROLOGUE_SCENE_3_3,
  TEXTURE_KEYS.PROLOGUE_SCENE_3_4,
  TEXTURE_KEYS.PROLOGUE_SCENE_3_5,
  TEXTURE_KEYS.PROLOGUE_SCENE_3_6,
] as const;

const RESIGNATION_LINES: readonly string[][] = [
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
] as const;

interface VisualNovelSequence {
  shots: readonly string[];
  lines: readonly (readonly string[])[];
  music: 'resignation' | 'train' | 'arrival' | 'theme';
  onComplete: () => void;
}

const TRAIN_SHOTS = [
  'prologue_scene_4_1',
  'prologue_scene_4_2',
  'prologue_scene_4_3',
  'prologue_scene_4_4',
  'prologue_scene_4_5',
] as const;

const TRAIN_LINES = [
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
] as const;

const ARRIVAL_SHOTS = [
  'prologue_scene_5_1',
  'prologue_scene_5_2',
  'prologue_scene_5_3',
  'prologue_scene_5_4',
] as const;

const ARRIVAL_LINES = [
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
] as const;

const RIKA_SHOTS = [
  'prologue_scene_6_1',
  'prologue_scene_6_2',
  'prologue_scene_6_3',
  'prologue_scene_6_4',
  'prologue_scene_6_5',
] as const;

const RIKA_LINES = [
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
] as const;

export class NewGamePrologueScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private promptText!: Phaser.GameObjects.Text;
  private dialogueContainer!: Phaser.GameObjects.Container;
  private dialogueBox!: Phaser.GameObjects.Rectangle;
  private dialogueText!: Phaser.GameObjects.Text;
  private dialogueIndicator!: Phaser.GameObjects.Text;
  private uiCamera: Phaser.Cameras.Scene2D.Camera | null = null;
  private vnCaption: Phaser.GameObjects.Container | null = null;
  private vnImage: Phaser.GameObjects.Image | null = null;
  private vnSequence: VisualNovelSequence | null = null;
  private vnShotIndex = 0;
  private vnLineIndex = 0;
  private vnInputLocked = false;
  private objects: PrologueObject[] = [];
  private nearestObject: PrologueObject | null = null;
  private dialogueLines: string[] = [];
  private dialogueIndex = 0;
  private dialogueOnComplete: (() => void) | null = null;
  private unlockAfterDialogue = false;
  private dialogueActive = false;
  private visualNovelMode = false;
  private locked = true;
  private ending = false;
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private timers: Phaser.Time.TimerEvent[] = [];
  private rumbleOsc: OscillatorNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private pianoTimer: Phaser.Time.TimerEvent | null = null;
  private ambienceTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: SCENE_KEYS.NEW_GAME_PROLOGUE });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x000000);
    this.physics.world.setBounds(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    this.createCityAmbience();
    this.buildApartment();
    this.createPlayer();
    this.createUI();
    this.setupUICamera();

    this.cameras.main.fadeIn(1800, 0, 0, 0);
    this.time.delayedCall(1700, () => this.startApartmentAutoSequence());

    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E).on('down', () => this.interact());
    this.input.keyboard!.on('keydown-ENTER', this.advanceDialogue, this);
    this.input.keyboard!.on('keydown-SPACE', this.advanceDialogue, this);
    this.input.keyboard!.on('keydown-Z', this.advanceDialogue, this);
    this.input.on('pointerdown', this.advanceDialogue, this);
    this.events.once('shutdown', () => this.cleanupAudio());
  }

  update(): void {
    if (this.visualNovelMode) return;

    if (!this.player || this.locked) {
      this.player?.setVelocity(0, 0);
      return;
    }

    const speed = 42;
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;
    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }
    this.player.setVelocity(vx * speed, vy * speed);
    this.player.setDepth(this.player.y + 20);

    this.updateInteractionPrompt();
    if (!this.ending && this.player.y < 76 && this.player.x > 292) {
      this.startWindowSequence();
    }
  }

  private startApartmentAutoSequence(): void {
    this.showDialogueSequence([
      '00:41',
      'Deadline lagi besok.',
      'Sudah dingin.',
      'Reminder meeting',
      'Client revision',
      'Missed call: Mom',
      'Tidak ada tombol untuk membalas.',
    ], () => this.walkToWindow(), false);
  }

  private buildApartment(): void {
    this.addSceneBackdrop(TEXTURE_KEYS.PROLOGUE_SCENE_1);

    this.add.text(156, 82, '00:41', {
      fontSize: '8px',
      color: '#9fb4d8',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(DEPTH.GROUND_DECOR);

    this.objects = [
      {
        id: 'desk',
        x: 158,
        y: 140,
        radius: 42,
        label: 'Meja kerja',
        lines: ['Deadline lagi besok.'],
      },
      {
        id: 'coffee',
        x: 207,
        y: 113,
        radius: 28,
        label: 'Gelas kopi dingin',
        lines: ['Sudah dingin.'],
      },
      {
        id: 'phone',
        x: 246,
        y: 140,
        radius: 30,
        label: 'HP',
        lines: ['Reminder meeting', 'Client revision', 'Missed call: Mom', 'Tidak ada tombol untuk membalas.'],
      },
    ];
  }

  private createPlayer(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.player = this.physics.add.sprite(158, 176, TEXTURE_KEYS.PLAYER, 0);
    this.player.setScale(0.58);
    this.player.setCollideWorldBounds(true);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 10);
    body.setOffset(35, 74);

    const walls = [
      this.physics.add.staticBody(62, 38, 356, 8),
      this.physics.add.staticBody(62, 254, 356, 8),
      this.physics.add.staticBody(56, 42, 8, 212),
      this.physics.add.staticBody(418, 42, 8, 212),
      this.physics.add.staticBody(88, 118, 146, 44),
      this.physics.add.staticBody(256, 166, 92, 46),
    ];
    for (const wall of walls) {
      this.physics.add.collider(this.player, wall as unknown as Phaser.Physics.Arcade.StaticBody);
    }
  }

  private createUI(): void {
    this.promptText = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 36, '', {
      fontSize: '8px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#00000099',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI).setVisible(false);

    const boxWidth = GAME_CONFIG.WIDTH - 24;
    const boxHeight = 58;
    this.dialogueContainer = this.add.container(12, GAME_CONFIG.HEIGHT - boxHeight - 10);
    this.dialogueContainer.setScrollFactor(0).setDepth(DEPTH.UI + 5).setVisible(false).setAlpha(0);

    this.dialogueBox = this.add.rectangle(0, 0, boxWidth, boxHeight, 0x121422, 0.94);
    this.dialogueBox.setOrigin(0, 0);
    this.dialogueBox.setStrokeStyle(1, 0xf2a65a, 0.65);
    this.dialogueContainer.add(this.dialogueBox);

    this.dialogueText = this.add.text(12, 10, '', {
      fontSize: '9px',
      color: '#ffffff',
      fontFamily: 'monospace',
      lineSpacing: 3,
      wordWrap: { width: boxWidth - 34 },
    });
    this.dialogueContainer.add(this.dialogueText);

    this.dialogueIndicator = this.add.text(boxWidth - 18, boxHeight - 17, 'v', {
      fontSize: '8px',
      color: '#f2a65a',
      fontFamily: 'monospace',
    });
    this.dialogueContainer.add(this.dialogueIndicator);

    this.tweens.add({
      targets: this.dialogueIndicator,
      alpha: 0.2,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  private updateInteractionPrompt(): void {
    let closest: PrologueObject | null = null;
    let closestDist = Infinity;
    for (const object of this.objects) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, object.x, object.y);
      if (dist < object.radius && dist < closestDist) {
        closest = object;
        closestDist = dist;
      }
    }

    this.nearestObject = closest;
    if (closest) {
      this.promptText.setText(`[E] ${closest.label}`).setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }
  }

  private interact(): void {
    if (this.dialogueActive) {
      this.advanceDialogue();
      return;
    }
    if (this.locked || this.ending || !this.nearestObject) return;
    this.playNotification(0.05);
    this.showDialogueSequence(this.nearestObject.lines, null, true);
  }

  private showDialogueSequence(
    lines: string[],
    onComplete: (() => void) | null = null,
    unlockAfterDialogue = false,
  ): void {
    this.locked = true;
    this.player?.setVelocity(0, 0);
    this.promptText?.setVisible(false);
    this.dialogueLines = lines;
    this.dialogueIndex = 0;
    this.dialogueOnComplete = onComplete;
    this.unlockAfterDialogue = unlockAfterDialogue;
    this.dialogueActive = true;
    this.showDialogueLine();
  }

  private showDialogueLine(): void {
    const line = this.dialogueLines[this.dialogueIndex] ?? '';
    this.dialogueText.setText(line);
    this.dialogueContainer.setPosition(12, GAME_CONFIG.HEIGHT - 68);
    this.dialogueContainer.setScale(1);
    this.dialogueContainer.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.dialogueContainer, alpha: 1, duration: 160 });
  }

  private advanceDialogue(): void {
    if (this.visualNovelMode) {
      this.advanceVisualNovelSequence();
      return;
    }

    if (!this.dialogueActive) return;

    this.dialogueIndex++;
    if (this.dialogueIndex < this.dialogueLines.length) {
      this.showDialogueLine();
      return;
    }

    this.dialogueActive = false;
    this.dialogueContainer.setVisible(false);
    const onComplete = this.dialogueOnComplete;
    this.dialogueOnComplete = null;
    this.dialogueLines = [];

    if (this.unlockAfterDialogue) {
      this.locked = false;
      this.unlockAfterDialogue = false;
    }

    onComplete?.();
  }

  private startWindowSequence(): void {
    this.ending = true;
    this.locked = true;
    this.promptText.setVisible(false);
    this.player.setVelocity(0, 0);
    this.cameras.main.pan(346, 80, 1800, 'Sine.easeInOut');
    this.cameras.main.zoomTo(1.75, 2600, 'Sine.easeInOut');
    this.time.delayedCall(1600, () => {
      this.showDialogueSequence(['Aku bahkan sudah lupa kapan terakhir kali merasa tenang.'], () => {
        this.cameras.main.fadeOut(1800, 0, 0, 0);
      }, false);
    });
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.cleanupAudio();
      this.startMinimarketSequence();
    });
  }

  private walkToWindow(): void {
    this.dialogueContainer.setVisible(false);
    this.tweens.add({
      targets: this.player,
      y: 232,
      duration: 2600,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.player.setDepth(this.player.y + 20),
      onComplete: () => this.startWindowSequence(),
    });
  }

  private startMinimarketSequence(): void {
    this.children.removeAll(true);
    this.physics.world.colliders.destroy();
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2);
    this.cameras.main.setBackgroundColor(0x05070d);

    this.createMinimarketAmbience();
    this.buildMinimarket();
    this.createMinimarketLail();
    this.createUI();
    this.setupUICamera();

    this.cameras.main.fadeIn(1200, 0, 0, 0);
    this.time.delayedCall(1200, () => {
      this.walkMinimarketPath();
    });
  }

  private buildMinimarket(): void {
    this.addSceneBackdrop(TEXTURE_KEYS.PROLOGUE_SCENE_2);

    const g = this.add.graphics().setDepth(DEPTH.GROUND_DECOR);
    for (let i = 0; i < 55; i++) {
      const x = (i * 37) % GAME_CONFIG.WIDTH;
      const y = (i * 53) % GAME_CONFIG.HEIGHT;
      g.lineStyle(1, 0x8db5d8, 0.22);
      g.lineBetween(x, y, x - 4, y + 10);
    }
  }

  private addSceneBackdrop(textureKey: string): Phaser.GameObjects.Image {
    const bg = this.add.image(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2, textureKey);
    const scale = Math.max(GAME_CONFIG.WIDTH / bg.width, GAME_CONFIG.HEIGHT / bg.height);
    bg.setScale(scale);
    bg.setDepth(DEPTH.GROUND);
    return bg;
  }

  private setupUICamera(): void {
    if (this.uiCamera) {
      this.cameras.remove(this.uiCamera);
    }

    this.uiCamera = this.cameras.add(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    this.uiCamera.setScroll(0, 0);
    this.uiCamera.setZoom(1);
    this.uiCamera.ignore(this.children.list.filter((child) => child !== this.promptText && child !== this.dialogueContainer));
    this.cameras.main.ignore([this.promptText, this.dialogueContainer]);
  }

  private createMinimarketLail(): void {
    this.player = this.physics.add.sprite(46, 204, TEXTURE_KEYS.PLAYER, 0);
    this.player.setScale(0.58);
    this.player.setDepth(this.player.y + 20);
  }

  private walkMinimarketPath(): void {
    this.showDialogueSequence(['Gerimis menempel di jaket Lail.'], () => {
      this.tweens.add({
        targets: this.player,
        x: 234,
        y: 198,
        duration: 2900,
        ease: 'Sine.easeInOut',
        onUpdate: () => this.player.setDepth(this.player.y + 20),
        onComplete: () => this.buyCoffeeSequence(),
      });
    }, false);
  }

  private buyCoffeeSequence(): void {
    this.showDialogueSequence(['Kopi kaleng. Hangat sebentar, pahit setelahnya.'], () => {
      this.tweens.add({
        targets: this.player,
        x: 178,
        y: 218,
        duration: 1600,
        ease: 'Sine.easeInOut',
        onUpdate: () => this.player.setDepth(this.player.y + 20),
        onComplete: () => this.tvAnnouncementSequence(),
      });
    }, false);
  }

  private tvAnnouncementSequence(): void {
    this.cameras.main.pan(256, 110, 1300, 'Sine.easeInOut');
    this.cameras.main.zoomTo(1.35, 1600, 'Sine.easeInOut');
    this.time.delayedCall(1100, () => {
      this.showDialogueSequence([
        'TV: Festival Musim Panas Brongwood akan dimulai minggu depan.',
        'Danau. Lentera. Laut. Festival malam.',
        'Warna hangat itu terasa seperti dunia lain.',
        'Kasir: Tempat kecil begitu masih ada ya...',
        'Brongwood...',
      ], () => this.startResignationSequence(), false);
    });
  }

  private finishPrologue(): void {
    this.cameras.main.fadeOut(2200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.cleanupAudio();
      this.scene.start(SCENE_KEYS.WORLD);
    });
  }

  private startResignationSequence(): void {
    this.startVisualNovelSequence({
      shots: RESIGNATION_SHOTS,
      lines: RESIGNATION_LINES,
      music: 'resignation',
      onComplete: () => this.startTrainSequence(),
    });
  }

  private startTrainSequence(): void {
    this.startVisualNovelSequence({
      shots: TRAIN_SHOTS,
      lines: TRAIN_LINES,
      music: 'train',
      onComplete: () => this.startArrivalSequence(),
    });
  }

  private startArrivalSequence(): void {
    this.startVisualNovelSequence({
      shots: ARRIVAL_SHOTS,
      lines: ARRIVAL_LINES,
      music: 'arrival',
      onComplete: () => this.startRikaSequence(),
    });
  }

  private startRikaSequence(): void {
    this.startVisualNovelSequence({
      shots: RIKA_SHOTS,
      lines: RIKA_LINES,
      music: 'theme',
      onComplete: () => this.showTitleCard(),
    });
  }

  private startVisualNovelSequence(sequence: VisualNovelSequence): void {
    this.visualNovelMode = true;
    this.locked = true;
    this.dialogueActive = false;
    this.vnSequence = sequence;
    this.vnShotIndex = 0;
    this.vnLineIndex = 0;
    this.cleanupAudio();
    this.createVisualNovelAudio(sequence.music);

    this.removeUICamera();
    this.children.removeAll(true);
    this.physics.world.colliders.destroy();
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2);
    this.cameras.main.setBackgroundColor(0x000000);
    this.cameras.main.fadeIn(900, 0, 0, 0);

    this.playVisualNovelShot(0);
  }

  private playVisualNovelShot(index: number): void {
    if (!this.vnSequence || index >= this.vnSequence.shots.length) {
      this.vnSequence?.onComplete();
      return;
    }

    this.vnShotIndex = index;
    this.vnLineIndex = 0;
    this.vnInputLocked = true;

    const image = this.addSceneBackdrop(this.vnSequence.shots[index]);
    this.vnImage = image;
    image.setAlpha(0);
    this.tweens.add({
      targets: image,
      alpha: 1,
      duration: 700,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.showVisualNovelCaption(this.vnSequence?.lines[index]?.[0] ?? '');
        this.vnInputLocked = false;
      },
    });
  }

  private advanceVisualNovelSequence(): void {
    if (this.vnInputLocked || !this.vnSequence) return;

    const lines = this.vnSequence.lines[this.vnShotIndex] ?? [];
    this.vnLineIndex++;
    if (this.vnLineIndex < lines.length) {
      this.showVisualNovelCaption(lines[this.vnLineIndex]);
      return;
    }

    if (this.vnShotIndex === this.vnSequence.shots.length - 1) {
      this.vnInputLocked = true;
      this.destroyVisualNovelCaption();
      if (this.vnSequence.shots === RESIGNATION_SHOTS) {
        this.turnOffApartmentLight(() => this.vnSequence?.onComplete());
      } else {
        this.fadeOutVisualNovelImage(() => this.vnSequence?.onComplete());
      }
      return;
    }

    this.vnInputLocked = true;
    this.fadeOutVisualNovelImage(() => this.playVisualNovelShot(this.vnShotIndex + 1));
  }

  private fadeOutVisualNovelImage(onComplete: () => void): void {
    const image = this.vnImage;
    const caption = this.vnCaption;
    this.tweens.add({
      targets: [image, caption].filter(Boolean),
      alpha: 0,
      duration: 650,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        image?.destroy();
        this.vnImage = null;
        this.destroyVisualNovelCaption();
        onComplete();
      },
    });
  }

  private showVisualNovelCaption(text: string): void {
    this.destroyVisualNovelCaption();

    const boxWidth = GAME_CONFIG.WIDTH - 34;
    const boxHeight = 56;
    const x = 17;
    const y = GAME_CONFIG.HEIGHT - boxHeight - 16;

    const container = this.add.container(x, y);
    container.setDepth(DEPTH.UI + 10);
    container.setAlpha(0);

    const box = this.add.rectangle(0, 0, boxWidth, boxHeight, 0x0d0f18, 0.78);
    box.setOrigin(0, 0);
    box.setStrokeStyle(1, 0xc8b37a, 0.38);
    container.add(box);

    const line = this.add.text(12, 12, text, {
      fontSize: '9px',
      color: '#f3eee0',
      fontFamily: 'monospace',
      lineSpacing: 3,
      wordWrap: { width: boxWidth - 24 },
    });
    container.add(line);

    const indicator = this.add.text(boxWidth - 18, boxHeight - 17, 'v', {
      fontSize: '8px',
      color: '#c8b37a',
      fontFamily: 'monospace',
    });
    container.add(indicator);

    this.vnCaption = container;
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 650,
      ease: 'Sine.easeInOut',
    });
  }

  private destroyVisualNovelCaption(): void {
    this.vnCaption?.destroy();
    this.vnCaption = null;
  }

  private turnOffApartmentLight(onComplete: () => void): void {
    const blackout = this.add.rectangle(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT, 0x000000, 0);
    blackout.setOrigin(0, 0);
    blackout.setDepth(DEPTH.UI + 20);
    this.tweens.add({
      targets: blackout,
      alpha: 1,
      duration: 1200,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.vnImage?.destroy();
        this.vnImage = null;
        this.time.delayedCall(900, onComplete);
      },
    });
  }

  private showTitleCard(): void {
    this.children.removeAll(true);
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2);
    this.cameras.main.setBackgroundColor(0x05070d);
    this.createVisualNovelAudio('theme');

    const title = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 8, 'BRONGWOOD', {
      fontSize: '28px',
      color: '#f3eee0',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
    const subtitle = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 + 22, '7 hari sebelum Festival Lentera Musim Panas', {
      fontSize: '8px',
      color: '#c8b37a',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: [title, subtitle],
      alpha: 1,
      duration: 1600,
      ease: 'Sine.easeInOut',
      onComplete: () => this.time.delayedCall(1800, () => this.finishPrologue()),
    });
  }

  private createMinimarketAmbience(): void {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.audioCtx = new AudioCtx();
    void this.audioCtx.resume();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 0.06;
    this.masterGain.connect(this.audioCtx.destination);
    this.startRainNoise();
    this.startSoftPiano();
  }

  private createResignationMusic(): void {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.audioCtx = new AudioCtx();
    void this.audioCtx.resume();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 0.045;
    this.masterGain.connect(this.audioCtx.destination);
    this.startSoftPiano();
  }

  private createVisualNovelAudio(mode: VisualNovelSequence['music']): void {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.audioCtx = new AudioCtx();
    void this.audioCtx.resume();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = mode === 'theme' ? 0.07 : 0.045;
    this.masterGain.connect(this.audioCtx.destination);

    this.startSoftPiano();
    if (mode === 'train') {
      this.startRainNoise();
      this.startTrainRhythm();
    } else if (mode === 'arrival') {
      this.startMorningAmbience();
    } else if (mode === 'theme') {
      this.startMorningAmbience();
      this.startThemePulse();
    }
  }

  private startTrainRhythm(): void {
    this.ambienceTimer?.destroy();
    this.ambienceTimer = this.time.addEvent({
      delay: 240,
      loop: true,
      callback: () => {
        if (!this.audioCtx || !this.masterGain) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 78;
        gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.09);
      },
    });
  }

  private startMorningAmbience(): void {
    this.ambienceTimer?.destroy();
    let tick = 0;
    this.ambienceTimer = this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        if (!this.audioCtx || !this.masterGain) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = tick % 3 === 0 ? 920 : 1280;
        gain.gain.setValueAtTime(0.018, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.3);
        tick++;
      },
    });
  }

  private startThemePulse(): void {
    this.timers.push(this.time.addEvent({
      delay: 1400,
      loop: true,
      callback: () => {
        if (!this.audioCtx || !this.masterGain) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 196;
        gain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.04, this.audioCtx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 1.25);
      },
    }));
  }

  private startSoftPiano(): void {
    this.pianoTimer?.destroy();
    const notes = [261.63, 329.63, 392.0, 493.88, 440.0, 349.23];
    let index = 0;
    this.pianoTimer = this.time.addEvent({
      delay: 680,
      loop: true,
      callback: () => {
        if (!this.audioCtx || !this.masterGain) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const filter = this.audioCtx.createBiquadFilter();
        osc.type = 'sine';
        osc.frequency.value = notes[index % notes.length];
        filter.type = 'lowpass';
        filter.frequency.value = 900;
        gain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.07, this.audioCtx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.62);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.66);
        index++;
      },
    });
  }

  private createCityAmbience(): void {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.audioCtx = new AudioCtx();
    void this.audioCtx.resume();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 0.045;
    this.masterGain.connect(this.audioCtx.destination);

    this.startRumble();
    this.startRainNoise();
    this.timers.push(this.time.addEvent({ delay: 140, loop: true, callback: () => this.playKeyboardClick() }));
    this.timers.push(this.time.addEvent({ delay: 3100, loop: true, callback: () => this.playNotification() }));
    this.timers.push(this.time.addEvent({ delay: 2300, loop: true, callback: () => this.playMurmur() }));
  }

  private startRumble(): void {
    if (!this.audioCtx || !this.masterGain) return;
    this.rumbleOsc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    this.rumbleOsc.type = 'sine';
    this.rumbleOsc.frequency.value = 46;
    gain.gain.value = 0.35;
    this.rumbleOsc.connect(gain);
    gain.connect(this.masterGain);
    this.rumbleOsc.start();
  }

  private startRainNoise(): void {
    if (!this.audioCtx || !this.masterGain) return;
    const buffer = this.audioCtx.createBuffer(1, this.audioCtx.sampleRate * 2, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.35;
    const source = this.audioCtx.createBufferSource();
    const filter = this.audioCtx.createBiquadFilter();
    const gain = this.audioCtx.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    gain.gain.value = 0.22;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start();
    this.rainSource = source;
  }

  private playKeyboardClick(): void {
    if (!this.audioCtx || !this.masterGain || Math.random() < 0.35) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = Phaser.Math.Between(900, 1400);
    gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.035);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.04);
  }

  private playNotification(volume = 0.16): void {
    if (!this.audioCtx || !this.masterGain) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
    osc.frequency.setValueAtTime(1174, this.audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.24);
  }

  private playMurmur(): void {
    if (!this.audioCtx || !this.masterGain) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = Phaser.Math.Between(120, 180);
    gain.gain.setValueAtTime(0.025, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.85);
  }

  private cleanupAudio(): void {
    for (const timer of this.timers) timer.destroy();
    this.timers = [];
    this.ambienceTimer?.destroy();
    this.ambienceTimer = null;
    this.pianoTimer?.destroy();
    this.pianoTimer = null;
    try {
      this.rumbleOsc?.stop();
    } catch {
      // Audio nodes may already be stopped when scene shutdown follows fade-out.
    }
    this.rumbleOsc = null;
    try {
      this.rainSource?.stop();
    } catch {
      // Audio nodes may already be stopped when scene shutdown follows fade-out.
    }
    this.rainSource = null;
    this.masterGain?.disconnect();
    this.masterGain = null;
    this.audioCtx?.close();
    this.audioCtx = null;
  }

  private removeUICamera(): void {
    if (!this.uiCamera) return;
    this.cameras.remove(this.uiCamera);
    this.uiCamera = null;
  }
}
