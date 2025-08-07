'use client';

import * as Slider from '@radix-ui/react-slider';
import * as Select from '@radix-ui/react-select';
import { Label } from '@radix-ui/react-label';
import { RotateCw, Home, ChevronDown, Activity, Zap } from 'lucide-react';
import { useCatEarsStore } from '@/store/catears-store';
import { ServoMode } from '@/types/catears';

export function ServoControl() {
  const { state, earSelection, setServoMode, setLeftServoMode, setRightServoMode } = useCatEarsStore();
  
  const getCurrentMode = (servo: ServoMode): string => {
    return Object.keys(servo)[0];
  };
  
  const getCurrentModeData = (servo: ServoMode) => {
    return Object.values(servo)[0];
  };
  
  const handleModeChange = (ear: 'left' | 'right' | 'both', mode: string) => {
    let newMode: ServoMode;
    switch (mode) {
      case 'Static':
        newMode = { Static: 125 }; // Default to center
        break;
      case 'Sweep':
        newMode = { 
          Sweep: {
            min: 50,
            max: 200,
            speed_ms: 1000
          }
        };
        break;
      case 'Twitch':
        newMode = {
          Twitch: {
            center: 125,
            amplitude: 20,
            interval_ms: 500
          }
        };
        break;
      default:
        return;
    }
    
    if (ear === 'both') {
      setServoMode(newMode);
    } else if (ear === 'left') {
      setLeftServoMode(newMode);
    } else {
      setRightServoMode(newMode);
    }
  };
  
  const handleStaticPositionChange = (ear: 'left' | 'right' | 'both', position: number) => {
    const newMode: ServoMode = { Static: position };
    if (ear === 'both') {
      setServoMode(newMode);
    } else if (ear === 'left') {
      setLeftServoMode(newMode);
    } else {
      setRightServoMode(newMode);
    }
  };
  
  const handleSweepUpdate = (ear: 'left' | 'right' | 'both', update: Partial<{ min: number; max: number; speed_ms: number }>) => {
    const currentServo = ear === 'right' ? state.servos.right : state.servos.left;
    if ('Sweep' in currentServo) {
      const newMode: ServoMode = {
        Sweep: { ...currentServo.Sweep, ...update }
      };
      if (ear === 'both') {
        setServoMode(newMode);
      } else if (ear === 'left') {
        setLeftServoMode(newMode);
      } else {
        setRightServoMode(newMode);
      }
    }
  };
  
  const handleTwitchUpdate = (ear: 'left' | 'right' | 'both', update: Partial<{ center: number; amplitude: number; interval_ms: number }>) => {
    const currentServo = ear === 'right' ? state.servos.right : state.servos.left;
    if ('Twitch' in currentServo) {
      const newMode: ServoMode = {
        Twitch: { ...currentServo.Twitch, ...update }
      };
      if (ear === 'both') {
        setServoMode(newMode);
      } else if (ear === 'left') {
        setLeftServoMode(newMode);
      } else {
        setRightServoMode(newMode);
      }
    }
  };
  
  const renderServoControl = (ear: 'left' | 'right' | 'both') => {
    const servo = ear === 'right' ? state.servos.right : state.servos.left;
    const mode = getCurrentMode(servo);
    const data = getCurrentModeData(servo);
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium">
            {ear === 'both' ? 'Both Ears' : ear === 'left' ? 'Left Ear' : 'Right Ear'}
          </Label>
          <Select.Root value={mode} onValueChange={(newMode) => handleModeChange(ear, newMode)}>
            <Select.Trigger className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-md flex items-center gap-2">
              <Select.Value />
              <ChevronDown className="w-4 h-4" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 z-50">
                <Select.Viewport className="p-1">
                  <Select.Item value="Static" className="px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                    <Select.ItemText>Static</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="Sweep" className="px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                    <Select.ItemText>Sweep</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="Twitch" className="px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                    <Select.ItemText>Twitch</Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
        
        {mode === 'Static' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm">Position: {data}</Label>
              <button
                onClick={() => handleStaticPositionChange(ear, 125)}
                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex items-center gap-1"
              >
                <Home className="w-3 h-3" />
                Center
              </button>
            </div>
            <Slider.Root
              value={[data as number]}
              onValueChange={([position]) => handleStaticPositionChange(ear, position)}
              max={255}
              step={1}
              className="relative flex items-center select-none touch-none w-full h-5"
            >
              <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-5 h-5 bg-white dark:bg-gray-200 border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300" />
            </Slider.Root>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>0°</span>
              <span>90° (125)</span>
              <span>180°</span>
            </div>
          </div>
        )}
        
        {mode === 'Sweep' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Activity className="w-4 h-4" />
              <span>Continuous sweep between positions</span>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Min Position: {(data as { min: number; max: number; speed_ms: number }).min}</Label>
              <Slider.Root
                value={[(data as { min: number; max: number; speed_ms: number }).min]}
                onValueChange={([min]) => handleSweepUpdate(ear, { min })}
                max={255}
                step={1}
                className="relative flex items-center select-none touch-none w-full h-5"
              >
                <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                  <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white dark:bg-gray-200 border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300" />
              </Slider.Root>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Max Position: {(data as { min: number; max: number; speed_ms: number }).max}</Label>
              <Slider.Root
                value={[(data as { min: number; max: number; speed_ms: number }).max]}
                onValueChange={([max]) => handleSweepUpdate(ear, { max })}
                max={255}
                step={1}
                className="relative flex items-center select-none touch-none w-full h-5"
              >
                <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                  <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white dark:bg-gray-200 border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300" />
              </Slider.Root>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Speed: {(data as { min: number; max: number; speed_ms: number }).speed_ms} ms</Label>
              <Slider.Root
                value={[(data as { min: number; max: number; speed_ms: number }).speed_ms]}
                onValueChange={([speed_ms]) => handleSweepUpdate(ear, { speed_ms })}
                min={100}
                max={5000}
                step={100}
                className="relative flex items-center select-none touch-none w-full h-5"
              >
                <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                  <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white dark:bg-gray-200 border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300" />
              </Slider.Root>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Fast</span>
                <span>Medium</span>
                <span>Slow</span>
              </div>
            </div>
          </div>
        )}
        
        {mode === 'Twitch' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Zap className="w-4 h-4" />
              <span>Random twitching movements</span>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Center: {(data as { center: number; amplitude: number; interval_ms: number }).center}</Label>
              <Slider.Root
                value={[(data as { center: number; amplitude: number; interval_ms: number }).center]}
                onValueChange={([center]) => handleTwitchUpdate(ear, { center })}
                max={255}
                step={1}
                className="relative flex items-center select-none touch-none w-full h-5"
              >
                <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                  <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white dark:bg-gray-200 border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300" />
              </Slider.Root>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Amplitude: {(data as { center: number; amplitude: number; interval_ms: number }).amplitude}</Label>
              <Slider.Root
                value={[(data as { center: number; amplitude: number; interval_ms: number }).amplitude]}
                onValueChange={([amplitude]) => handleTwitchUpdate(ear, { amplitude })}
                max={50}
                step={1}
                className="relative flex items-center select-none touch-none w-full h-5"
              >
                <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                  <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white dark:bg-gray-200 border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300" />
              </Slider.Root>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Small</span>
                <span>Medium</span>
                <span>Large</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Interval: {(data as { center: number; amplitude: number; interval_ms: number }).interval_ms} ms</Label>
              <Slider.Root
                value={[(data as { center: number; amplitude: number; interval_ms: number }).interval_ms]}
                onValueChange={([interval_ms]) => handleTwitchUpdate(ear, { interval_ms })}
                min={100}
                max={3000}
                step={100}
                className="relative flex items-center select-none touch-none w-full h-5"
              >
                <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                  <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white dark:bg-gray-200 border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300" />
              </Slider.Root>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Frequent</span>
                <span>Moderate</span>
                <span>Rare</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-gray-900 dark:text-gray-100">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <RotateCw className="w-5 h-5" />
        Servo Control
      </h2>
      
      <div className="space-y-6">
        {earSelection === 'both' && renderServoControl('both')}
        {earSelection === 'left' && renderServoControl('left')}
        {earSelection === 'right' && renderServoControl('right')}
      </div>
    </div>
  );
}