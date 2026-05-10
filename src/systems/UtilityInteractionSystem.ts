import Phaser from 'phaser';
import { DEPTH, GAME_CONFIG } from '@config/game.config';
import { proceduralAudio } from '@/audio/ProceduralAudio';

export const UTILITY_OBJECT_FRAMES = {
  ember: [
    'ember_1', 'ember_2', 'ember_2_1', 'ember_2_2',
    'ember_3_1', 'ember_3_2', 'ember_4_1', 'ember_4_2',
  ],
  box: [
    'box_1', 'box_2', 'box_3', 'box_4',
    'circle_box_1', 'circle_box_2', 'circle_box_3',
    'peti_1', 'peti_2',
  ],
} as const;

export type UtilityObjectKind = keyof typeof UTILITY_OBJECT_FRAMES;

export interface UtilityObjectPlacement {
  kind: UtilityObjectKind;
  x: number;
  y: number;
  startFrame?: number;
  scale?: number;
  interactionRadius?: number;
  collider?: { width: number; height: number };
}

interface UtilityObjectInstance {
  kind: UtilityObjectKind;
  sprite: Phaser.GameObjects.Image;
  frameIndex: number;
  interactionRadius: number;
}

export class UtilityInteractionSystem {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private objects: UtilityObjectInstance[] = [];
  private bodies: Phaser.Physics.Arcade.StaticBody[] = [];
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private promptText: Phaser.GameObjects.Text;
  private nearbyObject: UtilityObjectInstance | null = null;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    placements: UtilityObjectPlacement[],
    promptY: number = GAME_CONFIG.HEIGHT - 72,
  ) {
    this.scene = scene;
    this.player = player;

    for (const placement of placements) {
      this.createObject(placement);
    }

    this.promptText = scene.add.text(
      GAME_CONFIG.WIDTH / 2,
      promptY,
      '',
      {
        fontSize: '8px',
        color: '#ffffff',
        fontFamily: 'monospace',
        backgroundColor: '#00000099',
        padding: { x: 8, y: 4 },
      },
    );
    this.promptText.setOrigin(0.5);
    this.promptText.setScrollFactor(0);
    this.promptText.setDepth(DEPTH.UI + 16);
    this.promptText.setVisible(false);
  }

  update(): void {
    this.nearbyObject = this.findNearestObject();

    if (!this.nearbyObject) {
      this.promptText.setVisible(false);
      return;
    }

    this.promptText.setText(`[E] Interact ${this.getFrameName(this.nearbyObject)}`);
    this.promptText.setVisible(true);
  }

  tryInteract(): boolean {
    if (!this.nearbyObject) return false;

    const object = this.nearbyObject;
    const frames = UTILITY_OBJECT_FRAMES[object.kind];

    proceduralAudio.playClick();
    object.frameIndex = (object.frameIndex + 1) % frames.length;
    object.sprite.setTexture(this.getTextureKey(object.kind, object.frameIndex));
    this.promptText.setText(`[E] Interact ${this.getFrameName(object)}`);

    this.scene.tweens.add({
      targets: object.sprite,
      y: object.sprite.y - 3,
      duration: 90,
      yoyo: true,
      ease: 'Sine.easeOut',
    });

    return true;
  }

  destroy(): void {
    this.promptText.destroy();
    for (const collider of this.colliders) {
      collider.destroy();
    }
    for (const body of this.bodies) {
      body.destroy();
    }
    for (const object of this.objects) {
      object.sprite.destroy();
    }
    this.objects = [];
    this.bodies = [];
    this.colliders = [];
    this.nearbyObject = null;
  }

  private createObject(placement: UtilityObjectPlacement): void {
    const frames = UTILITY_OBJECT_FRAMES[placement.kind];
    const frameIndex = placement.startFrame ?? 0;
    const sprite = this.scene.add.image(
      placement.x,
      placement.y,
      this.getTextureKey(placement.kind, frameIndex % frames.length),
    );
    sprite.setScale(placement.scale ?? 1);
    sprite.setDepth(placement.y);

    this.objects.push({
      kind: placement.kind,
      sprite,
      frameIndex: frameIndex % frames.length,
      interactionRadius: placement.interactionRadius ?? 46,
    });

    const collider = placement.collider ?? { width: 24, height: 20 };
    const body = this.scene.physics.add.staticBody(
      placement.x - collider.width / 2,
      placement.y - collider.height / 2,
      collider.width,
      collider.height,
    ) as Phaser.Physics.Arcade.StaticBody;
    this.bodies.push(body);
    this.colliders.push(this.scene.physics.add.collider(this.player, body));
  }

  private findNearestObject(): UtilityObjectInstance | null {
    let closest: UtilityObjectInstance | null = null;
    let closestDistance = Infinity;

    for (const object of this.objects) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        object.sprite.x,
        object.sprite.y,
      );
      if (distance < object.interactionRadius && distance < closestDistance) {
        closest = object;
        closestDistance = distance;
      }
    }

    return closest;
  }

  private getFrameName(object: UtilityObjectInstance): string {
    return UTILITY_OBJECT_FRAMES[object.kind][object.frameIndex];
  }

  private getTextureKey(kind: UtilityObjectKind, index: number): string {
    return `utility-${UTILITY_OBJECT_FRAMES[kind][index]}`;
  }
}
