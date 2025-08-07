'use client';

import * as Tabs from '@radix-ui/react-tabs';
import { Cat } from 'lucide-react';
import { EarSelector } from '@/components/EarSelector';
import { ServoControl } from '@/components/ServoControl';
import { LightControl } from '@/components/LightControl';
import { AudioControl } from '@/components/AudioControl';
import { StatePreview } from '@/components/StatePreview';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useCatEarsStore } from '@/store/catears-store';

export default function Home() {
  const { earSelection, setEarSelection } = useCatEarsStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cat className="w-8 h-8 text-gray-800 dark:text-gray-200" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Catears
              </h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {/* Ear Selection */}
        <div className="mb-6 flex justify-center">
          <EarSelector value={earSelection} onChange={setEarSelection} />
        </div>

        {/* Control Tabs for Mobile, Grid for Desktop */}
        <div className="block md:hidden">
          <Tabs.Root defaultValue="servo" className="w-full">
            <Tabs.List className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
              <Tabs.Trigger
                value="servo"
                className="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm"
              >
                Rotation
              </Tabs.Trigger>
              <Tabs.Trigger
                value="lights"
                className="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm"
              >
                LEDs
              </Tabs.Trigger>
              <Tabs.Trigger
                value="audio"
                className="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm"
              >
                Audio
              </Tabs.Trigger>
            </Tabs.List>
            
            <Tabs.Content value="servo" className="space-y-4">
              <ServoControl />
            </Tabs.Content>
            
            <Tabs.Content value="lights" className="space-y-4">
              <LightControl />
            </Tabs.Content>
            
            <Tabs.Content value="audio" className="space-y-4">
              <AudioControl />
            </Tabs.Content>
          </Tabs.Root>
          
          {/* State Preview below tabs on mobile */}
          <div className="mt-6">
            <StatePreview />
          </div>
        </div>

        {/* Desktop Responsive Grid Layout */}
        <div className="hidden md:block">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <ServoControl />
            <LightControl />
            <AudioControl />
          </div>
          
          {/* State Preview at the bottom */}
          <div className="mt-6">
            <StatePreview />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t dark:border-gray-800 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              <a 
                href="https://github.com/ziyadedher/catears" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Made
              </a>
              {' '}with ❤️ for robotic felines by{' '}
              <a 
                href="https://claude.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Claude
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}