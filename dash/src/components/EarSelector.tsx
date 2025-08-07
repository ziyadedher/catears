'use client';

import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Cat, Copy } from 'lucide-react';
import { EarSelection } from '@/types/catears';
import { useCatEarsStore } from '@/store/catears-store';

interface EarSelectorProps {
  value: EarSelection;
  onChange: (value: EarSelection) => void;
}

export function EarSelector({ value, onChange }: EarSelectorProps) {
  const { syncToBothEars } = useCatEarsStore();
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <ToggleGroup.Root
          type="single"
          value={value}
          onValueChange={(newValue) => {
            if (newValue) onChange(newValue as EarSelection);
          }}
          className="inline-flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1"
        >
          <ToggleGroup.Item
            value="left"
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=on]:bg-white dark:data-[state=on]:bg-gray-700 data-[state=on]:shadow-sm hover:bg-gray-50 dark:hover:bg-gray-750 flex items-center gap-2"
          >
            <Cat className="w-4 h-4 scale-x-[-1]" />
            <span>Left</span>
          </ToggleGroup.Item>
          
          <ToggleGroup.Item
            value="both"
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=on]:bg-white dark:data-[state=on]:bg-gray-700 data-[state=on]:shadow-sm hover:bg-gray-50 dark:hover:bg-gray-750 flex items-center gap-2"
          >
            <div className="flex">
              <Cat className="w-4 h-4 scale-x-[-1]" />
              <Cat className="w-4 h-4" />
            </div>
            <span>Both</span>
          </ToggleGroup.Item>
          
          <ToggleGroup.Item
            value="right"
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=on]:bg-white dark:data-[state=on]:bg-gray-700 data-[state=on]:shadow-sm hover:bg-gray-50 dark:hover:bg-gray-750 flex items-center gap-2"
          >
            <Cat className="w-4 h-4" />
            <span>Right</span>
          </ToggleGroup.Item>
        </ToggleGroup.Root>
        
        <button
          onClick={syncToBothEars}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
            value !== 'both' 
              ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 opacity-100' 
              : 'opacity-0 pointer-events-none'
          }`}
          title="Sync current ear to both"
          aria-hidden={value === 'both'}
        >
          <Copy className="w-4 h-4" />
          <span>Sync</span>
        </button>
      </div>
    </div>
  );
}