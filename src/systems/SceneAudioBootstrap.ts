import Phaser from 'phaser';
import { AUDIO_KEYS } from '@config/assets.manifest';
import { proceduralAudio } from '@/audio/ProceduralAudio';
import { gameManager } from '@/managers/GameManager';
import { AudioSystem } from '@/systems/AudioSystem';

/**
 * Starts gameplay audio for scenes that can be loaded directly from a save.
 * If another gameplay scene is sleeping, reuse its AudioSystem so BGM does not duplicate.
 */
export function bootstrapGameplayAudio(scene: Phaser.Scene): AudioSystem | null {
  const savedBgmVol = parseFloat(localStorage.getItem('brongwood_bgm_volume') ?? '0.4');
  const bgmVolume = isNaN(savedBgmVol) ? 0.4 : savedBgmVol;

  let audioSystem = gameManager.sceneSystems.audio;
  let ownsAudioSystem = false;

  if (!audioSystem) {
    audioSystem = new AudioSystem(scene);
    gameManager.registerSceneSystems({ audio: audioSystem });
    ownsAudioSystem = true;
  }

  audioSystem.setBGMVolume(bgmVolume);

  const startAudio = () => {
    proceduralAudio.init();
    proceduralAudio.resume();
    audioSystem?.playBGM(AUDIO_KEYS.BGM_DOWNTOWN);
  };

  if (scene.sound.locked) {
    scene.sound.once('unlocked', startAudio);
  } else {
    startAudio();
  }

  return ownsAudioSystem ? audioSystem : null;
}
