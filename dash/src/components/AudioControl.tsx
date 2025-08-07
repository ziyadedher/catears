'use client';

import * as Select from '@radix-ui/react-select';
import * as Slider from '@radix-ui/react-slider';
import * as Switch from '@radix-ui/react-switch';
import { Label } from '@radix-ui/react-label';
import { Volume2, ChevronDown, Music } from 'lucide-react';
import { useCatEarsStore } from '@/store/catears-store';
import { AudioMode, CHIPTUNES, ChiptuneName, Note, ChiptuneSequence } from '@/types/catears';

export function AudioControl() {
  const { state, setAudioMode, setVolume } = useCatEarsStore();
  
  const getCurrentMode = (): string => {
    const mode = state.speakers.mode;
    return Object.keys(mode)[0];
  };
  
  const getCurrentModeData = () => {
    const mode = state.speakers.mode;
    return Object.values(mode)[0];
  };

  const handleModeChange = (mode: string) => {
    let newMode: AudioMode;
    switch (mode) {
      case 'Silent':
        newMode = { Silent: null };
        break;
      case 'Tone':
        newMode = { 
          Tone: {
            frequency: 440, // A4
            duration_ms: 1000,
            volume: undefined
          }
        };
        break;
      case 'Chiptune':
        newMode = { 
          Chiptune: {
            notes: [
              { frequency: 523.0, duration_ms: 150, volume: undefined },
              { frequency: 659.0, duration_ms: 150, volume: undefined },
              { frequency: 784.0, duration_ms: 150, volume: undefined },
            ],
            length: 3,
            default_volume: 128,
            looping: false
          }
        };
        break;
      default:
        return;
    }
    setAudioMode(newMode);
  };

  const handleChiptunePreset = (preset: ChiptuneName) => {
    let notes: Note[] = [];
    
    switch (preset) {
      case 'coin_collect':
        notes = [
          { frequency: 988.0, duration_ms: 100, volume: undefined },
          { frequency: 1319.0, duration_ms: 400, volume: undefined },
        ];
        break;
      case 'power_up':
        notes = [
          { frequency: 523.0, duration_ms: 100, volume: undefined },
          { frequency: 659.0, duration_ms: 100, volume: undefined },
          { frequency: 784.0, duration_ms: 100, volume: undefined },
          { frequency: 1047.0, duration_ms: 200, volume: undefined },
        ];
        break;
      case 'level_complete':
        notes = [
          { frequency: 523.0, duration_ms: 150, volume: undefined },
          { frequency: 659.0, duration_ms: 150, volume: undefined },
          { frequency: 784.0, duration_ms: 150, volume: undefined },
          { frequency: 1047.0, duration_ms: 150, volume: undefined },
          { frequency: 784.0, duration_ms: 150, volume: undefined },
          { frequency: 1047.0, duration_ms: 400, volume: undefined },
        ];
        break;
      case 'game_over':
        notes = [
          { frequency: 523.0, duration_ms: 200, volume: undefined },
          { frequency: 494.0, duration_ms: 200, volume: undefined },
          { frequency: 466.0, duration_ms: 200, volume: undefined },
          { frequency: 440.0, duration_ms: 600, volume: undefined },
        ];
        break;
      case 'menu_select':
        notes = [
          { frequency: 1047.0, duration_ms: 50, volume: undefined },
          { frequency: 1319.0, duration_ms: 50, volume: undefined },
        ];
        break;
      case 'alert':
        notes = [
          { frequency: 880.0, duration_ms: 100, volume: undefined },
          { frequency: 0.0, duration_ms: 50, volume: undefined }, // rest
          { frequency: 880.0, duration_ms: 100, volume: undefined },
        ];
        break;
      case 'happy':
        notes = [
          { frequency: 523.0, duration_ms: 150, volume: undefined },
          { frequency: 659.0, duration_ms: 150, volume: undefined },
          { frequency: 784.0, duration_ms: 150, volume: undefined },
          { frequency: 659.0, duration_ms: 150, volume: undefined },
          { frequency: 1047.0, duration_ms: 300, volume: undefined },
        ];
        break;
      case 'sad':
        notes = [
          { frequency: 440.0, duration_ms: 300, volume: undefined },
          { frequency: 415.0, duration_ms: 300, volume: undefined },
          { frequency: 392.0, duration_ms: 300, volume: undefined },
          { frequency: 349.0, duration_ms: 600, volume: undefined },
        ];
        break;
      case 'startup':
        notes = [
          { frequency: 262.0, duration_ms: 100, volume: undefined },
          { frequency: 392.0, duration_ms: 100, volume: undefined },
          { frequency: 523.0, duration_ms: 100, volume: undefined },
          { frequency: 659.0, duration_ms: 100, volume: undefined },
          { frequency: 784.0, duration_ms: 200, volume: undefined },
        ];
        break;
      case 'shutdown':
        notes = [
          { frequency: 784.0, duration_ms: 100, volume: undefined },
          { frequency: 659.0, duration_ms: 100, volume: undefined },
          { frequency: 523.0, duration_ms: 100, volume: undefined },
          { frequency: 392.0, duration_ms: 100, volume: undefined },
          { frequency: 262.0, duration_ms: 200, volume: undefined },
        ];
        break;
    }
    
    const newMode: AudioMode = {
      Chiptune: {
        notes: notes,
        length: notes.length,
        default_volume: 128,
        looping: false
      }
    };
    setAudioMode(newMode);
  };

  const renderModeConfig = () => {
    const mode = getCurrentMode();
    const data = getCurrentModeData();

    switch (mode) {
      case 'Tone':
        const tone = data as Note;
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Frequency: {tone.frequency} Hz</Label>
              <Slider.Root
                value={[tone.frequency]}
                onValueChange={([frequency]) => {
                  const newMode: AudioMode = { Tone: { ...tone, frequency } };
                  setAudioMode(newMode);
                }}
                max={2000}
                min={20}
                step={1}
                className="relative flex items-center select-none touch-none w-full h-5"
              >
                <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                  <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white dark:bg-gray-200 border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300" />
              </Slider.Root>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>20 Hz</span>
                <span>440 Hz (A4)</span>
                <span>2000 Hz</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Duration: {tone.duration_ms} ms</Label>
              <Slider.Root
                value={[tone.duration_ms]}
                onValueChange={([duration_ms]) => {
                  const newMode: AudioMode = { Tone: { ...tone, duration_ms } };
                  setAudioMode(newMode);
                }}
                max={5000}
                min={50}
                step={50}
                className="relative flex items-center select-none touch-none w-full h-5"
              >
                <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                  <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white dark:bg-gray-200 border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300" />
              </Slider.Root>
            </div>
          </div>
        );
      
      case 'Chiptune':
        const chiptune = data as ChiptuneSequence;
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Preset Melodies</Label>
              <Select.Root value="" onValueChange={(value) => handleChiptunePreset(value as ChiptuneName)}>
                <Select.Trigger className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-md flex items-center justify-between">
                  <Select.Value placeholder="Choose a preset..." />
                  <ChevronDown className="w-4 h-4" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 z-50">
                    <Select.Viewport className="p-1">
                      {Object.keys(CHIPTUNES).map((preset) => (
                        <Select.Item
                          key={preset}
                          value={preset}
                          className="px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                        >
                          <Select.ItemText>{preset.replace('_', ' ')}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Active Notes: {chiptune.length}</Label>
              <div className="max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded p-2">
                {chiptune.notes.map((note: Note, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-xs py-1">
                    <span className="w-8">#{index + 1}</span>
                    <span className="flex-1">
                      {note.frequency > 0 ? `${note.frequency.toFixed(1)} Hz` : 'Rest'}
                    </span>
                    <span className="w-20">{note.duration_ms} ms</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch.Root
                checked={chiptune.looping}
                onCheckedChange={(looping) => {
                  const newMode: AudioMode = { Chiptune: { ...chiptune, looping } };
                  setAudioMode(newMode);
                }}
                className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full relative data-[state=checked]:bg-gray-600 dark:data-[state=checked]:bg-gray-400 transition-colors"
              >
                <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
              </Switch.Root>
              <Label className="text-sm">Loop</Label>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Volume2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Audio is muted</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-gray-900 dark:text-gray-100">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Music className="w-5 h-5" />
        Audio Control
      </h2>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Mode</Label>
          <Select.Root value={getCurrentMode()} onValueChange={handleModeChange}>
            <Select.Trigger className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-md flex items-center justify-between">
              <Select.Value />
              <ChevronDown className="w-4 h-4" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 z-50">
                <Select.Viewport className="p-1">
                  {['Silent', 'Tone', 'Chiptune'].map((mode) => (
                    <Select.Item
                      key={mode}
                      value={mode}
                      className="px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                    >
                      <Select.ItemText>{mode}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Volume: {state.speakers.volume}</Label>
          <Slider.Root
            value={[state.speakers.volume]}
            onValueChange={([volume]) => setVolume(volume)}
            max={255}
            min={0}
            step={1}
            className="relative flex items-center select-none touch-none w-full h-5"
          >
            <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
              <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb className="block w-5 h-5 bg-white dark:bg-gray-200 border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300" />
          </Slider.Root>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Mute</span>
            <span>50%</span>
            <span>Max</span>
          </div>
        </div>

        {renderModeConfig()}
      </div>
    </div>
  );
}