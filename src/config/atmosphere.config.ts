/**
 * Atmosphere Configuration - Color palettes and lighting for each time period.
 * 
 * WHY THIS MATTERS EMOTIONALLY:
 * Color is the #1 tool for conveying emotion in pixel art games.
 * - Warm oranges = nostalgia, comfort, golden memories
 * - Deep blues = loneliness, introspection, melancholy
 * - Soft pinks = romance, tenderness, vulnerability
 * - Dark purples = mystery, late-night intimacy
 * 
 * Each time period has a carefully chosen color overlay that tints the entire scene.
 * The overlay uses multiply blending — it darkens and colorizes simultaneously.
 * 
 * TECHNICAL APPROACH:
 * We use a full-screen rectangle with alpha blending.
 * This is simpler than shaders and works perfectly for pixel art because:
 * - Pixel art already has limited color palettes
 * - A subtle tint unifies all colors on screen
 * - It's GPU-cheap (single quad with blend mode)
 * - Easy to animate (just tween the color/alpha)
 * 
 * TRANSITION STRATEGY:
 * Colors interpolate smoothly between periods using linear lerp.
 * The transition duration is long (several game-minutes) so it feels natural.
 * Players should barely notice the change happening — it just "feels" different.
 */

import { TimePeriod } from '@/core/EventBus';

/**
 * RGBA color for atmosphere overlay.
 * Alpha controls intensity (0 = no tint, 1 = full color).
 */
export interface AtmosphereColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-1 (overlay intensity)
}

/**
 * Complete atmosphere state for a time period.
 */
export interface AtmospherePreset {
  /** Overlay tint color */
  overlay: AtmosphereColor;
  /** Ambient light level (0 = pitch black, 1 = full bright) */
  ambientLight: number;
  /** Whether window glows should be visible */
  windowGlow: boolean;
  /** Window glow intensity (0-1) */
  windowGlowIntensity: number;
  /** Street lamp intensity (0-1) */
  lampIntensity: number;
}

/**
 * Atmosphere presets for each time period.
 * 
 * COLOR DESIGN NOTES:
 * - Dawn: soft pink-orange, very subtle. Hope, new beginnings.
 * - Morning: almost no tint. Clean, clear, energetic.
 * - Afternoon: very slight warm yellow. Comfortable, active.
 * - Evening: golden orange. Nostalgia, warmth, "golden hour" photography.
 * - Night: deep blue with moderate alpha. Loneliness, quiet, intimate.
 * - Late Night: darker blue-purple. Introspective, melancholic, vulnerable.
 */
export const ATMOSPHERE_PRESETS: Record<TimePeriod, AtmospherePreset> = {
  dawn: {
    overlay: { r: 255, g: 180, b: 140, a: 0.12 },
    ambientLight: 0.7,
    windowGlow: true,
    windowGlowIntensity: 0.3,
    lampIntensity: 0.5,
  },
  morning: {
    overlay: { r: 255, g: 250, b: 230, a: 0.03 },
    ambientLight: 1.0,
    windowGlow: false,
    windowGlowIntensity: 0,
    lampIntensity: 0,
  },
  afternoon: {
    overlay: { r: 255, g: 240, b: 200, a: 0.05 },
    ambientLight: 1.0,
    windowGlow: false,
    windowGlowIntensity: 0,
    lampIntensity: 0,
  },
  evening: {
    overlay: { r: 255, g: 160, b: 80, a: 0.18 },
    ambientLight: 0.8,
    windowGlow: true,
    windowGlowIntensity: 0.6,
    lampIntensity: 0.7,
  },
  night: {
    overlay: { r: 40, g: 60, b: 140, a: 0.3 },
    ambientLight: 0.5,
    windowGlow: true,
    windowGlowIntensity: 0.9,
    lampIntensity: 1.0,
  },
  late_night: {
    overlay: { r: 20, g: 30, b: 80, a: 0.4 },
    ambientLight: 0.35,
    windowGlow: true,
    windowGlowIntensity: 0.7,
    lampIntensity: 0.8,
  },
};

/**
 * How long (in game-minutes) a period transition takes.
 * Longer = more gradual = more natural feeling.
 */
export const TRANSITION_DURATION_MINUTES = 30;

/**
 * Interpolate between two atmosphere colors.
 * @param from - Starting color
 * @param to - Target color
 * @param t - Progress (0 = from, 1 = to)
 */
export function lerpColor(from: AtmosphereColor, to: AtmosphereColor, t: number): AtmosphereColor {
  const clamp = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(from.r + (to.r - from.r) * clamp),
    g: Math.round(from.g + (to.g - from.g) * clamp),
    b: Math.round(from.b + (to.b - from.b) * clamp),
    a: from.a + (to.a - from.a) * clamp,
  };
}

/**
 * Interpolate between two atmosphere presets.
 */
export function lerpPreset(from: AtmospherePreset, to: AtmospherePreset, t: number): AtmospherePreset {
  const clamp = Math.max(0, Math.min(1, t));
  return {
    overlay: lerpColor(from.overlay, to.overlay, clamp),
    ambientLight: from.ambientLight + (to.ambientLight - from.ambientLight) * clamp,
    windowGlow: clamp > 0.5 ? to.windowGlow : from.windowGlow,
    windowGlowIntensity: from.windowGlowIntensity + (to.windowGlowIntensity - from.windowGlowIntensity) * clamp,
    lampIntensity: from.lampIntensity + (to.lampIntensity - from.lampIntensity) * clamp,
  };
}
