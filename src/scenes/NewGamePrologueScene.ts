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

export class NewGamePrologueScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private promptText!: Phaser.GameObjects.Text;
  private monologueText!: Phaser.GameObjects.Text;
  private objects: PrologueObject[] = [];
  private nearestObject: PrologueObject | null = null;
  private locked = true;
  private ending = false;
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private timers: Phaser.Time.TimerEvent[] = [];
  private rumbleOsc: OscillatorNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private pianoTimer: Phaser.Time.TimerEvent | null = null;

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

    this.cameras.main.fadeIn(1800, 0, 0, 0);
    this.time.delayedCall(1700, () => this.startApartmentAutoSequence());

    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E).on('down', () => this.interact());
    this.events.once('shutdown', () => this.cleanupAudio());
  }

  update(): void {
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
    this.locked = true;
    this.showTimedLines([
      '00:41',
      'Deadline lagi besok.',
      'Sudah dingin.',
      'Reminder meeting',
      'Client revision',
      'Missed call: Mom',
      'Tidak ada tombol untuk membalas.',
    ], () => this.walkToWindow());
  }

  private buildApartment(): void {
    const g = this.add.graphics();
    g.setDepth(DEPTH.GROUND);

    g.fillStyle(0x090b12, 1);
    g.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    g.fillStyle(0x18121a, 1);
    g.fillRect(62, 42, 356, 212);
    g.lineStyle(2, 0x2b2633, 1);
    g.strokeRect(62, 42, 356, 212);

    // Window and city lights.
    g.fillStyle(0x050814, 1);
    g.fillRect(292, 50, 108, 62);
    g.lineStyle(1, 0x2a3856, 1);
    g.strokeRect(292, 50, 108, 62);
    for (let i = 0; i < 38; i++) {
      const x = 298 + ((i * 19) % 94);
      const y = 56 + ((i * 23) % 48);
      g.fillStyle(i % 3 === 0 ? 0xffd27a : i % 3 === 1 ? 0x80bfff : 0xf2f0d0, 0.55);
      g.fillRect(x, y, 2, 1);
    }

    // Desk, monitor, chair, clutter.
    g.fillStyle(0x4a3027, 1);
    g.fillRect(92, 126, 132, 28);
    g.fillStyle(0x1f1512, 1);
    g.fillRect(104, 154, 10, 44);
    g.fillRect(204, 154, 10, 44);
    g.fillStyle(0x10172a, 1);
    g.fillRect(128, 91, 62, 34);
    g.fillStyle(0x8fb8ff, 0.35);
    g.fillRect(133, 96, 52, 24);
    g.fillStyle(0x2b2d39, 1);
    g.fillRect(149, 125, 20, 5);

    g.fillStyle(0x2c1f20, 1);
    g.fillRect(120, 176, 54, 32);
    g.fillStyle(0x151018, 1);
    g.fillRect(134, 165, 28, 14);

    g.fillStyle(0x1b1a24, 1);
    g.fillRect(260, 170, 84, 38);
    g.fillStyle(0x31252a, 1);
    g.fillRect(74, 214, 64, 24);

    for (const p of [
      { x: 234, y: 132, w: 18, h: 5 },
      { x: 242, y: 140, w: 24, h: 5 },
      { x: 202, y: 102, w: 12, h: 8 },
      { x: 355, y: 130, w: 20, h: 5 },
    ]) {
      g.fillStyle(0x6e6576, 0.75);
      g.fillRect(p.x, p.y, p.w, p.h);
    }

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

    this.monologueText = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 62, '', {
      fontSize: '9px',
      color: '#d8e4ff',
      fontFamily: 'monospace',
      align: 'center',
      wordWrap: { width: GAME_CONFIG.WIDTH - 80 },
      backgroundColor: '#050610cc',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI + 2).setVisible(false);
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
    if (this.locked || this.ending || !this.nearestObject) return;
    this.playNotification(0.05);
    this.showLines(this.nearestObject.lines);
  }

  private showLines(lines: string[]): void {
    this.locked = true;
    this.player.setVelocity(0, 0);
    let index = 0;
    const next = () => {
      if (index >= lines.length) {
        this.monologueText.setVisible(false);
        this.locked = false;
        return;
      }
      this.showLine(lines[index]);
      index++;
      this.time.delayedCall(1500, next);
    };
    next();
  }

  private showTimedLines(lines: string[], onComplete: () => void, hold = 1450): void {
    this.locked = true;
    this.player?.setVelocity(0, 0);
    let index = 0;
    const next = () => {
      if (index >= lines.length) {
        this.monologueText.setVisible(false);
        onComplete();
        return;
      }
      this.showLine(lines[index]);
      index++;
      this.time.delayedCall(hold, next);
    };
    next();
  }

  private showLine(text: string): void {
    this.monologueText.setText(text).setAlpha(0).setVisible(true);
    this.tweens.add({ targets: this.monologueText, alpha: 1, duration: 220 });
  }

  private startWindowSequence(): void {
    this.ending = true;
    this.locked = true;
    this.promptText.setVisible(false);
    this.player.setVelocity(0, 0);
    this.cameras.main.pan(346, 80, 1800, 'Sine.easeInOut');
    this.cameras.main.zoomTo(1.75, 2600, 'Sine.easeInOut');
    this.time.delayedCall(1600, () => {
      this.showLine('Aku bahkan sudah lupa kapan terakhir kali merasa tenang.');
    });
    this.time.delayedCall(4300, () => {
      this.cameras.main.fadeOut(1800, 0, 0, 0);
    });
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.cleanupAudio();
      this.startMinimarketSequence();
    });
  }

  private walkToWindow(): void {
    this.monologueText.setVisible(false);
    this.tweens.add({
      targets: this.player,
      x: 332,
      y: 83,
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

    this.cameras.main.fadeIn(1200, 0, 0, 0);
    this.time.delayedCall(1200, () => {
      this.walkMinimarketPath();
    });
  }

  private buildMinimarket(): void {
    const g = this.add.graphics().setDepth(DEPTH.GROUND);
    g.fillStyle(0x05070d, 1);
    g.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    // Rainy street.
    g.fillStyle(0x121a25, 1);
    g.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    for (let i = 0; i < 55; i++) {
      const x = (i * 37) % GAME_CONFIG.WIDTH;
      const y = (i * 53) % GAME_CONFIG.HEIGHT;
      g.lineStyle(1, 0x8db5d8, 0.22);
      g.lineBetween(x, y, x - 4, y + 10);
    }

    // Minimarket building: cold white light, empty.
    g.fillStyle(0x1d2430, 1);
    g.fillRect(70, 62, 340, 168);
    g.lineStyle(2, 0xdce8ff, 0.85);
    g.strokeRect(70, 62, 340, 168);
    g.fillStyle(0xe8f4ff, 0.92);
    g.fillRect(82, 76, 316, 66);
    g.fillStyle(0x9bb4ce, 0.35);
    g.fillRect(90, 84, 88, 50);
    g.fillRect(190, 84, 96, 50);
    g.fillRect(298, 84, 88, 50);
    g.fillStyle(0x2c3848, 1);
    g.fillRect(82, 152, 316, 68);

    this.add.text(240, 70, '24 MINI', {
      fontSize: '12px',
      color: '#1b2b3a',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH.GROUND_DECOR);

    // Counter, cashier, vending shelves.
    g.fillStyle(0x5f6d7e, 1);
    g.fillRect(286, 168, 92, 24);
    g.fillStyle(0x202633, 1);
    g.fillRect(330, 116, 56, 34);
    g.fillStyle(0xf1c8a6, 1);
    g.fillRect(344, 152, 16, 24);
    g.fillStyle(0x1d1b29, 1);
    g.fillRect(341, 144, 22, 10);
    g.fillStyle(0x6f7a8c, 1);
    g.fillRect(94, 158, 84, 38);
    g.fillRect(194, 158, 58, 38);

    // Bench/seat and canned coffee.
    g.fillStyle(0x343d4c, 1);
    g.fillRect(140, 212, 84, 10);
    g.fillRect(150, 222, 8, 18);
    g.fillRect(208, 222, 8, 18);
    g.fillStyle(0xb56b35, 1);
    g.fillRect(244, 202, 8, 14);
    g.fillStyle(0xe8dcc5, 1);
    g.fillRect(244, 204, 8, 4);

    // TV with warm Brongwood images.
    g.fillStyle(0x11131c, 1);
    g.fillRect(220, 88, 72, 44);
    g.fillStyle(0xffb65c, 0.9);
    g.fillRect(225, 93, 62, 34);
    g.fillStyle(0x395f8f, 0.9);
    g.fillRect(225, 110, 62, 17);
    g.fillStyle(0xffdd8f, 1);
    for (let i = 0; i < 8; i++) {
      g.fillCircle(232 + i * 7, 102 + (i % 2) * 4, 2);
    }
    g.fillStyle(0x26384d, 1);
    g.fillRect(250, 128, 12, 6);
  }

  private createMinimarketLail(): void {
    this.player = this.physics.add.sprite(46, 204, TEXTURE_KEYS.PLAYER, 0);
    this.player.setScale(0.58);
    this.player.setDepth(this.player.y + 20);
  }

  private walkMinimarketPath(): void {
    this.showLine('Gerimis menempel di jaket Lail.');
    this.tweens.add({
      targets: this.player,
      x: 234,
      y: 198,
      duration: 2900,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.player.setDepth(this.player.y + 20),
      onComplete: () => this.buyCoffeeSequence(),
    });
  }

  private buyCoffeeSequence(): void {
    this.showTimedLines(['Kopi kaleng. Hangat sebentar, pahit setelahnya.'], () => {
      this.tweens.add({
        targets: this.player,
        x: 178,
        y: 218,
        duration: 1600,
        ease: 'Sine.easeInOut',
        onUpdate: () => this.player.setDepth(this.player.y + 20),
        onComplete: () => this.tvAnnouncementSequence(),
      });
    }, 1500);
  }

  private tvAnnouncementSequence(): void {
    this.cameras.main.pan(256, 110, 1300, 'Sine.easeInOut');
    this.cameras.main.zoomTo(1.35, 1600, 'Sine.easeInOut');
    this.time.delayedCall(1100, () => {
      this.showTimedLines([
        'TV: Festival Musim Panas Brongwood akan dimulai minggu depan.',
        'Danau. Lentera. Laut. Festival malam.',
        'Warna hangat itu terasa seperti dunia lain.',
        'Kasir: Tempat kecil begitu masih ada ya...',
        'Brongwood...',
      ], () => this.finishPrologue(), 1750);
    });
  }

  private finishPrologue(): void {
    this.cameras.main.fadeOut(2200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.cleanupAudio();
      this.scene.start(SCENE_KEYS.WORLD);
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
}
