'use client';

import * as Slider from '@radix-ui/react-slider';
import { Label } from '@radix-ui/react-label';
import { RotateCw, Home } from 'lucide-react';
import { useCatEarsStore } from '@/store/catears-store';

export function ServoControl() {
  const { state, earSelection, setServoPosition, setLeftServo, setRightServo } = useCatEarsStore();
  
  const handlePositionChange = (values: number[]) => {
    setServoPosition(values[0]);
  };
  
  const handleLeftChange = (values: number[]) => {
    setLeftServo(values[0]);
  };
  
  const handleRightChange = (values: number[]) => {
    setRightServo(values[0]);
  };

  return (
    <div className="space-y-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <RotateCw className="w-5 h-5" />
          Servo Control
        </h2>
        <button
          onClick={() => setServoPosition(125)}
          className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md flex items-center gap-1 transition-colors"
        >
          <Home className="w-4 h-4" />
          Center
        </button>
      </div>
      
      <div className="space-y-4">
        {earSelection === 'both' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Position</Label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                L: {state.servos.left} | R: {state.servos.right}
              </span>
            </div>
            <Slider.Root
              value={[state.servos.left]}
              onValueChange={handlePositionChange}
              max={255}
              step={1}
              className="relative flex items-center select-none touch-none w-full h-5"
            >
              <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb 
                className="block w-5 h-5 bg-white dark:bg-gray-200 border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300 focus:ring-offset-2"
                aria-label="Servo position"
              />
            </Slider.Root>
          </div>
        )}
        
        {earSelection === 'left' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Left Ear</Label>
              <span className="text-sm text-gray-500 dark:text-gray-400">{state.servos.left}</span>
            </div>
            <Slider.Root
              value={[state.servos.left]}
              onValueChange={handleLeftChange}
              max={255}
              step={1}
              className="relative flex items-center select-none touch-none w-full h-5"
            >
              <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb 
                className="block w-5 h-5 bg-white dark:bg-gray-200 border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300 focus:ring-offset-2"
                aria-label="Left servo position"
              />
            </Slider.Root>
          </div>
        )}
        
        {earSelection === 'right' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Right Ear</Label>
              <span className="text-sm text-gray-500 dark:text-gray-400">{state.servos.right}</span>
            </div>
            <Slider.Root
              value={[state.servos.right]}
              onValueChange={handleRightChange}
              max={255}
              step={1}
              className="relative flex items-center select-none touch-none w-full h-5"
            >
              <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb 
                className="block w-5 h-5 bg-white dark:bg-gray-200 border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300 focus:ring-offset-2"
                aria-label="Right servo position"
              />
            </Slider.Root>
          </div>
        )}
        
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>0°</span>
          <span>90° (Center: 125)</span>
          <span>180°</span>
        </div>
      </div>
    </div>
  );
}