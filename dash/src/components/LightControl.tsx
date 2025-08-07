'use client';

import * as Select from '@radix-ui/react-select';
import * as Slider from '@radix-ui/react-slider';
import * as Switch from '@radix-ui/react-switch';
import { Label } from '@radix-ui/react-label';
import { Lightbulb, ChevronDown, Sparkles } from 'lucide-react';
import { useCatEarsStore } from '@/store/catears-store';
import { ColorPicker } from './ColorPicker';
import { LightMode, RGB8, LIGHT_PATTERNS, LightPatternName, ChasePattern, PulsePattern, RainbowPattern, LedPattern } from '@/types/catears';

export function LightControl() {
  const { state, earSelection, setLightMode, setBrightness } = useCatEarsStore();
  
  const getCurrentMode = (): string => {
    const mode = earSelection === 'right' ? state.lights.right : state.lights.left;
    return Object.keys(mode)[0];
  };
  
  const getCurrentModeData = () => {
    const mode = earSelection === 'right' ? state.lights.right : state.lights.left;
    return Object.values(mode)[0];
  };

  const handleModeChange = (mode: string) => {
    let newMode: LightMode;
    switch (mode) {
      case 'Off':
        newMode = { Off: null };
        break;
      case 'Solid':
        newMode = { Solid: { r: 255, g: 255, b: 255 } };
        break;
      case 'Gradient':
        newMode = { Gradient: [{ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 }] };
        break;
      case 'Chase':
        newMode = { 
          Chase: {
            color: { r: 0, g: 100, b: 255 },
            background: { r: 0, g: 0, b: 0 },
            length: 3,
            speed_ms: 150,
            clockwise: true
          }
        };
        break;
      case 'Pulse':
        newMode = { 
          Pulse: {
            color: { r: 255, g: 255, b: 255 },
            min_brightness: 20,
            max_brightness: 255,
            period_ms: 2000
          }
        };
        break;
      case 'Rainbow':
        newMode = { 
          Rainbow: {
            speed_ms: 100,
            spread: true,
            brightness: 255
          }
        };
        break;
      case 'Custom':
        newMode = { 
          Custom: {
            leds: Array(12).fill({ r: 0, g: 0, b: 0 }),
            looping: false
          }
        };
        break;
      default:
        return;
    }
    setLightMode(newMode);
  };

  const handlePresetPattern = (pattern: LightPatternName) => {
    let newMode: LightMode;
    switch (pattern) {
      case 'police':
        newMode = { 
          Chase: {
            color: { r: 255, g: 0, b: 0 },
            background: { r: 0, g: 0, b: 255 },
            length: 6,
            speed_ms: 100,
            clockwise: true
          }
        };
        break;
      case 'breathing':
        newMode = { 
          Pulse: {
            color: { r: 255, g: 255, b: 255 },
            min_brightness: 20,
            max_brightness: 255,
            period_ms: 3000
          }
        };
        break;
      case 'party':
        newMode = { 
          Rainbow: {
            speed_ms: 50,
            spread: true,
            brightness: 255
          }
        };
        break;
      case 'alert':
        newMode = { 
          Pulse: {
            color: { r: 255, g: 0, b: 0 },
            min_brightness: 0,
            max_brightness: 255,
            period_ms: 500
          }
        };
        break;
      case 'success':
        newMode = { 
          Pulse: {
            color: { r: 0, g: 255, b: 0 },
            min_brightness: 50,
            max_brightness: 255,
            period_ms: 1000
          }
        };
        break;
      case 'loading':
        newMode = { 
          Chase: {
            color: { r: 0, g: 100, b: 255 },
            background: { r: 0, g: 0, b: 0 },
            length: 3,
            speed_ms: 150,
            clockwise: true
          }
        };
        break;
      case 'cat_eyes':
        newMode = { 
          Custom: {
            leds: [
              { r: 255, g: 150, b: 0 },
              { r: 0, g: 0, b: 0 },
              { r: 0, g: 0, b: 0 },
              { r: 0, g: 0, b: 0 },
              { r: 0, g: 0, b: 0 },
              { r: 0, g: 0, b: 0 },
              { r: 255, g: 150, b: 0 },
              { r: 0, g: 0, b: 0 },
              { r: 0, g: 0, b: 0 },
              { r: 0, g: 0, b: 0 },
              { r: 0, g: 0, b: 0 },
              { r: 0, g: 0, b: 0 },
            ],
            looping: false
          }
        };
        break;
      case 'notification':
        newMode = { 
          Pulse: {
            color: { r: 0, g: 150, b: 255 },
            min_brightness: 30,
            max_brightness: 200,
            period_ms: 2000
          }
        };
        break;
      case 'fire':
        newMode = { Gradient: [{ r: 255, g: 0, b: 0 }, { r: 255, g: 150, b: 0 }] };
        break;
      case 'ocean':
        newMode = { Gradient: [{ r: 0, g: 0, b: 255 }, { r: 0, g: 255, b: 255 }] };
        break;
      default:
        return;
    }
    setLightMode(newMode);
  };

  const renderModeConfig = () => {
    const mode = getCurrentMode();
    const data = getCurrentModeData();

    switch (mode) {
      case 'Solid':
        return (
          <ColorPicker
            label="Color"
            color={data as RGB8}
            onChange={(color) => setLightMode({ Solid: color })}
          />
        );
      
      case 'Gradient':
        const gradient = data as [RGB8, RGB8];
        return (
          <div className="space-y-4">
            <ColorPicker
              label="Start Color"
              color={gradient[0]}
              onChange={(color) => setLightMode({ Gradient: [color, gradient[1]] })}
            />
            <ColorPicker
              label="End Color"
              color={gradient[1]}
              onChange={(color) => setLightMode({ Gradient: [gradient[0], color] })}
            />
          </div>
        );
      
      case 'Chase':
        const chase = data as ChasePattern;
        return (
          <div className="space-y-4">
            <ColorPicker
              label="Chase Color"
              color={chase.color}
              onChange={(color) => setLightMode({ Chase: { ...chase, color } })}
            />
            <ColorPicker
              label="Background Color"
              color={chase.background}
              onChange={(color) => setLightMode({ Chase: { ...chase, background: color } })}
            />
            <div className="space-y-2">
              <Label className="text-sm">Length: {chase.length}</Label>
              <Slider.Root
                value={[chase.length]}
                onValueChange={([length]) => setLightMode({ Chase: { ...chase, length } })}
                max={12}
                min={1}
                step={1}
                className="relative flex items-center select-none touch-none w-full h-5"
              >
                <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                  <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300" />
              </Slider.Root>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Speed: {chase.speed_ms}ms</Label>
              <Slider.Root
                value={[chase.speed_ms]}
                onValueChange={([speed_ms]) => setLightMode({ Chase: { ...chase, speed_ms } })}
                max={1000}
                min={50}
                step={50}
                className="relative flex items-center select-none touch-none w-full h-5"
              >
                <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                  <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300" />
              </Slider.Root>
            </div>
            <div className="flex items-center gap-2">
              <Switch.Root
                checked={chase.clockwise}
                onCheckedChange={(clockwise) => setLightMode({ Chase: { ...chase, clockwise } })}
                className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full relative data-[state=checked]:bg-gray-700 dark:bg-gray-300 transition-colors"
              >
                <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
              </Switch.Root>
              <Label className="text-sm">Clockwise</Label>
            </div>
          </div>
        );
      
      case 'Pulse':
        const pulse = data as PulsePattern;
        return (
          <div className="space-y-4">
            <ColorPicker
              label="Color"
              color={pulse.color}
              onChange={(color) => setLightMode({ Pulse: { ...pulse, color } })}
            />
            <div className="space-y-2">
              <Label className="text-sm">Min Brightness: {pulse.min_brightness}</Label>
              <Slider.Root
                value={[pulse.min_brightness]}
                onValueChange={([min_brightness]) => setLightMode({ Pulse: { ...pulse, min_brightness } })}
                max={255}
                min={0}
                step={1}
                className="relative flex items-center select-none touch-none w-full h-5"
              >
                <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                  <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300" />
              </Slider.Root>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Max Brightness: {pulse.max_brightness}</Label>
              <Slider.Root
                value={[pulse.max_brightness]}
                onValueChange={([max_brightness]) => setLightMode({ Pulse: { ...pulse, max_brightness } })}
                max={255}
                min={0}
                step={1}
                className="relative flex items-center select-none touch-none w-full h-5"
              >
                <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                  <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300" />
              </Slider.Root>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Period: {pulse.period_ms}ms</Label>
              <Slider.Root
                value={[pulse.period_ms]}
                onValueChange={([period_ms]) => setLightMode({ Pulse: { ...pulse, period_ms } })}
                max={5000}
                min={100}
                step={100}
                className="relative flex items-center select-none touch-none w-full h-5"
              >
                <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                  <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300" />
              </Slider.Root>
            </div>
          </div>
        );
      
      case 'Rainbow':
        const rainbow = data as RainbowPattern;
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Speed: {rainbow.speed_ms}ms</Label>
              <Slider.Root
                value={[rainbow.speed_ms]}
                onValueChange={([speed_ms]) => setLightMode({ Rainbow: { ...rainbow, speed_ms } })}
                max={500}
                min={10}
                step={10}
                className="relative flex items-center select-none touch-none w-full h-5"
              >
                <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                  <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300" />
              </Slider.Root>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Brightness: {rainbow.brightness}</Label>
              <Slider.Root
                value={[rainbow.brightness]}
                onValueChange={([brightness]) => setLightMode({ Rainbow: { ...rainbow, brightness } })}
                max={255}
                min={0}
                step={1}
                className="relative flex items-center select-none touch-none w-full h-5"
              >
                <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                  <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300" />
              </Slider.Root>
            </div>
            <div className="flex items-center gap-2">
              <Switch.Root
                checked={rainbow.spread}
                onCheckedChange={(spread) => setLightMode({ Rainbow: { ...rainbow, spread } })}
                className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full relative data-[state=checked]:bg-gray-700 dark:bg-gray-300 transition-colors"
              >
                <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
              </Switch.Root>
              <Label className="text-sm">Spread across LEDs</Label>
            </div>
          </div>
        );
      
      case 'Custom':
        const custom = data as LedPattern;
        return (
          <div className="space-y-4">
            <Label className="text-sm">Individual LED Control</Label>
            <div className="grid grid-cols-3 gap-2">
              {custom.leds.map((led: RGB8, index: number) => (
                <div key={index} className="flex items-center gap-1">
                  <span className="text-xs">#{index + 1}</span>
                  <input
                    type="color"
                    value={`#${led.r.toString(16).padStart(2, '0')}${led.g.toString(16).padStart(2, '0')}${led.b.toString(16).padStart(2, '0')}`}
                    onChange={(e) => {
                      const newLeds = [...custom.leds];
                      const hex = e.target.value;
                      newLeds[index] = {
                        r: parseInt(hex.slice(1, 3), 16),
                        g: parseInt(hex.slice(3, 5), 16),
                        b: parseInt(hex.slice(5, 7), 16),
                      };
                      setLightMode({ Custom: { ...custom, leds: newLeds } });
                    }}
                    className="h-8 w-12 rounded border cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          LED Control
        </h2>
        <Select.Root value="" onValueChange={handlePresetPattern}>
          <Select.Trigger className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md flex items-center gap-1 transition-colors">
            <Sparkles className="w-4 h-4" />
            <Select.Value placeholder="Presets" />
            <ChevronDown className="w-4 h-4" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 z-50">
              <Select.Viewport className="p-1">
                {Object.keys(LIGHT_PATTERNS).map((pattern) => (
                  <Select.Item
                    key={pattern}
                    value={pattern}
                    className="px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                  >
                    <Select.ItemText>{pattern.replace('_', ' ')}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

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
                  {['Off', 'Solid', 'Gradient', 'Chase', 'Pulse', 'Rainbow', 'Custom'].map((mode) => (
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
          <Label className="text-sm font-medium">Global Brightness: {state.lights.brightness}</Label>
          <Slider.Root
            value={[state.lights.brightness]}
            onValueChange={([brightness]) => setBrightness(brightness)}
            max={255}
            min={0}
            step={1}
            className="relative flex items-center select-none touch-none w-full h-5"
          >
            <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
              <Slider.Range className="absolute bg-gray-700 dark:bg-gray-300 rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-gray-700 dark:border-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-gray-300" />
          </Slider.Root>
        </div>

        {renderModeConfig()}
      </div>
    </div>
  );
}