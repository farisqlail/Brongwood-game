import Phaser from 'phaser';
import { DEPTH, GAME_CONFIG } from '@config/game.config';
import { FIRST_DAY_OBJECTIVES } from '@config/firstDay.config';
import { gameManager } from '@/managers/GameManager';

export class FirstDayObjectiveUI {
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private visible = true;
  private lastStage: string | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const cx = GAME_CONFIG.WIDTH / 2;
    this.bg = scene.add.rectangle(cx, 16, 248, 34, 0x0d1117, 0.9);
    this.bg.setOrigin(0.5, 0);
    this.bg.setStrokeStyle(1, 0x58677a, 0.85);
    this.bg.setScrollFactor(0);
    this.bg.setDepth(DEPTH.UI + 18);

    this.title = scene.add.text(cx, 21, 'Hari Pertama', {
      fontSize: '7px',
      color: '#f2a65a',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.UI + 19);

    this.body = scene.add.text(cx, 30, '', {
      fontSize: '7px',
      color: '#ffffff',
      fontFamily: 'monospace',
      align: 'center',
      wordWrap: { width: 220 },
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.UI + 19);

    this.refresh();
  }

  update(): void {
    this.refresh();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.refresh();
  }

  destroy(): void {
    this.bg.destroy();
    this.title.destroy();
    this.body.destroy();
  }

  private refresh(): void {
    const stage = gameManager.firstDayStage;
    const shouldShow = this.visible && stage !== 'complete';

    this.bg.setVisible(shouldShow);
    this.title.setVisible(shouldShow);
    this.body.setVisible(shouldShow);

    if (!shouldShow || !stage) {
      this.lastStage = stage;
      return;
    }

    if (this.lastStage !== stage) {
      this.lastStage = stage;
      this.body.setText(FIRST_DAY_OBJECTIVES[stage]);
    }
  }
}

