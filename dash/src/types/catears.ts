export interface RGB8 {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface State {
  servos: Servos;
  lights: Lights;
  speakers: Speakers;
}

export interface Servos {
  left: number;  // 0-255, center at 125
  right: number; // 0-255, center at 125
}

export interface Lights {
  left: LightMode;
  right: LightMode;
  brightness: number; // 0-255
}

export interface Speakers {
  mode: AudioMode;
  volume: number; // 0-255
}

export type LightMode = 
  | { Off: null }
  | { Solid: RGB8 }
  | { Gradient: [RGB8, RGB8] }
  | { Chase: ChasePattern }
  | { Pulse: PulsePattern }
  | { Rainbow: RainbowPattern }
  | { Custom: LedPattern };

export interface ChasePattern {
  color: RGB8;
  background: RGB8;
  length: number;      // 1-12
  speed_ms: number;
  clockwise: boolean;
}

export interface PulsePattern {
  color: RGB8;
  min_brightness: number; // 0-255
  max_brightness: number; // 0-255
  period_ms: number;
}

export interface RainbowPattern {
  speed_ms: number;
  spread: boolean;
  brightness: number; // 0-255
}

export interface LedPattern {
  leds: RGB8[]; // Array of 12 RGB values
  looping: boolean;
}

export type AudioMode =
  | { Silent: null }
  | { Tone: Note }
  | { Chiptune: ChiptuneSequence }
  | { Audio: AudioClip };

export interface Note {
  frequency: number;
  duration_ms: number;
  volume?: number; // 0-255
}

export interface ChiptuneSequence {
  notes: Note[];
  length: number;
  default_volume: number;
  looping: boolean;
}

export interface AudioClip {
  sample_rate: number;
  bits_per_sample: number;
  is_stereo: boolean;
  looping: boolean;
}

// Predefined chiptune types
export const CHIPTUNES = {
  coin_collect: 'coin_collect',
  power_up: 'power_up',
  level_complete: 'level_complete',
  game_over: 'game_over',
  menu_select: 'menu_select',
  alert: 'alert',
  happy: 'happy',
  sad: 'sad',
  startup: 'startup',
  shutdown: 'shutdown',
} as const;

export type ChiptuneName = keyof typeof CHIPTUNES;

// Predefined light patterns
export const LIGHT_PATTERNS = {
  police: 'police',
  breathing: 'breathing',
  party: 'party',
  alert: 'alert',
  success: 'success',
  loading: 'loading',
  cat_eyes: 'cat_eyes',
  notification: 'notification',
  fire: 'fire',
  ocean: 'ocean',
} as const;

export type LightPatternName = keyof typeof LIGHT_PATTERNS;

// Helper to create default state
export const createDefaultState = (): State => ({
  servos: {
    left: 125,
    right: 125,
  },
  lights: {
    left: { Pulse: {
      color: { r: 255, g: 0, b: 0 },
      min_brightness: 0,
      max_brightness: 255,
      period_ms: 250,
    }},
    right: { Pulse: {
      color: { r: 255, g: 0, b: 0 },
      min_brightness: 0,
      max_brightness: 255,
      period_ms: 250,
    }},
    brightness: 255,
  },
  speakers: {
    mode: { Silent: null },
    volume: 128,
  },
});

// Control mode for UI
export type EarSelection = 'left' | 'both' | 'right';