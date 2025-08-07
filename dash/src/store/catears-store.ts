import { create } from 'zustand';
import { State, EarSelection, createDefaultState, LightMode, AudioMode, ServoMode } from '@/types/catears';

interface CatEarsStore {
  state: State;
  earSelection: EarSelection;
  
  // Backup states for independent ear control
  leftBackup: {
    servo: ServoMode;
    light: LightMode;
  } | null;
  rightBackup: {
    servo: ServoMode;
    light: LightMode;
  } | null;
  
  // Ear selection
  setEarSelection: (selection: EarSelection) => void;
  
  // Sync current settings to both ears
  syncToBothEars: () => void;
  
  // Servo controls
  setServoMode: (mode: ServoMode) => void;
  setLeftServoMode: (mode: ServoMode) => void;
  setRightServoMode: (mode: ServoMode) => void;
  
  // Light controls
  setLightMode: (mode: LightMode) => void;
  setLeftLightMode: (mode: LightMode) => void;
  setRightLightMode: (mode: LightMode) => void;
  setBrightness: (brightness: number) => void;
  
  // Audio controls
  setAudioMode: (mode: AudioMode) => void;
  setVolume: (volume: number) => void;
  
  // State management
  resetState: () => void;
  loadState: (state: State) => void;
  exportState: () => string;
}

export const useCatEarsStore = create<CatEarsStore>((set, get) => ({
  state: createDefaultState(),
  earSelection: 'both',
  leftBackup: null,
  rightBackup: null,
  
  setEarSelection: (selection) => {
    const current = get();
    
    // Save current state when switching from 'both' to individual
    if (current.earSelection === 'both' && selection !== 'both') {
      set({
        earSelection: selection,
        leftBackup: {
          servo: current.state.servos.left,
          light: current.state.lights.left,
        },
        rightBackup: {
          servo: current.state.servos.right,
          light: current.state.lights.right,
        },
      });
    } 
    // Restore saved state when switching back to individual ears
    else if (current.earSelection !== selection && selection !== 'both' && current.leftBackup && current.rightBackup) {
      set({
        earSelection: selection,
      });
    } else {
      set({ earSelection: selection });
    }
  },
  
  syncToBothEars: () => {
    const current = get();
    const activeServo = current.earSelection === 'right' ? current.state.servos.right : current.state.servos.left;
    const activeLight = current.earSelection === 'right' ? current.state.lights.right : current.state.lights.left;
    
    set({
      state: {
        ...current.state,
        servos: {
          left: activeServo,
          right: activeServo,
        },
        lights: {
          ...current.state.lights,
          left: activeLight,
          right: activeLight,
        },
      },
    });
  },
  
  // Servo controls
  setServoMode: (mode) => set((state) => {
    const { earSelection } = state;
    const newServos = { ...state.state.servos };
    
    if (earSelection === 'left' || earSelection === 'both') {
      newServos.left = mode;
    }
    if (earSelection === 'right' || earSelection === 'both') {
      newServos.right = mode;
    }
    
    return {
      state: {
        ...state.state,
        servos: newServos,
      },
    };
  }),
  
  setLeftServoMode: (mode) => set((state) => ({
    state: {
      ...state.state,
      servos: {
        ...state.state.servos,
        left: mode,
      },
    },
  })),
  
  setRightServoMode: (mode) => set((state) => ({
    state: {
      ...state.state,
      servos: {
        ...state.state.servos,
        right: mode,
      },
    },
  })),
  
  // Light controls
  setLightMode: (mode) => set((state) => {
    const { earSelection } = state;
    const newLights = { ...state.state.lights };
    
    if (earSelection === 'left' || earSelection === 'both') {
      newLights.left = mode;
    }
    if (earSelection === 'right' || earSelection === 'both') {
      newLights.right = mode;
    }
    
    return {
      state: {
        ...state.state,
        lights: newLights,
      },
    };
  }),
  
  setLeftLightMode: (mode) => set((state) => ({
    state: {
      ...state.state,
      lights: {
        ...state.state.lights,
        left: mode,
      },
    },
  })),
  
  setRightLightMode: (mode) => set((state) => ({
    state: {
      ...state.state,
      lights: {
        ...state.state.lights,
        right: mode,
      },
    },
  })),
  
  setBrightness: (brightness) => set((state) => ({
    state: {
      ...state.state,
      lights: {
        ...state.state.lights,
        brightness,
      },
    },
  })),
  
  // Audio controls
  setAudioMode: (mode: AudioMode) => set((state) => ({
    state: {
      ...state.state,
      speakers: {
        ...state.state.speakers,
        mode,
      },
    },
  })),
  
  setVolume: (volume) => set((state) => ({
    state: {
      ...state.state,
      speakers: {
        ...state.state.speakers,
        volume,
      },
    },
  })),
  
  // State management
  resetState: () => set({ state: createDefaultState() }),
  
  loadState: (newState) => {
    // Handle the Chiptune array padding if needed
    const transformedState = {
      ...newState,
      speakers: {
        ...newState.speakers,
        mode: 'Chiptune' in newState.speakers.mode && newState.speakers.mode.Chiptune
          ? {
              Chiptune: {
                ...newState.speakers.mode.Chiptune,
                // Only use valid notes based on length
                notes: newState.speakers.mode.Chiptune.notes.slice(0, newState.speakers.mode.Chiptune.length)
              }
            }
          : newState.speakers.mode
      }
    };
    
    set({ state: transformedState });
  },
  
  exportState: () => {
    const state = get().state;
    
    // Transform the state to match Rust's expected JSON format
    const transformedState = {
      servos: state.servos,
      lights: state.lights,
      speakers: {
        mode: 'Chiptune' in state.speakers.mode && state.speakers.mode.Chiptune
          ? {
              Chiptune: {
                ...state.speakers.mode.Chiptune,
                // Rust expects exactly 64 notes in the array
                notes: [
                  ...state.speakers.mode.Chiptune.notes,
                  ...Array(64 - state.speakers.mode.Chiptune.notes.length).fill({ frequency: 0, duration_ms: 0 })
                ].slice(0, 64)
              }
            }
          : state.speakers.mode,
        volume: state.speakers.volume
      }
    };
    
    return JSON.stringify(transformedState, null, 2);
  },
}));