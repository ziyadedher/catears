'use client';

import { useState, useEffect, useCallback } from 'react';
import { Copy, Upload, Download, Check, Clock, Wifi } from 'lucide-react';
import { useCatEarsStore } from '@/store/catears-store';

export function StatePreview() {
  const { state, exportState, loadState } = useCatEarsStore();
  const [copied, setCopied] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [formattedTime, setFormattedTime] = useState('Never');
  
  const syncToCloud = useCallback(async () => {
    setSyncStatus('syncing');
    
    try {
      // Get the current state for upload
      const stateJson = exportState();
      const stateObject = JSON.parse(stateJson);
      
      // Upload to Google Cloud Storage via API route
      const response = await fetch('/api/upload-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stateObject),
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await response.json();
      console.log('State uploaded:', result);
      
      setLastSyncTime(new Date());
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to sync state:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [exportState]);
  
  // Auto-sync debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      syncToCloud();
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [state, syncToCloud]);
  
  // Update sync time display every second
  useEffect(() => {
    const updateFormattedTime = () => {
      if (!lastSyncTime) {
        setFormattedTime('Never');
        return;
      }
      
      const now = new Date();
      const diff = now.getTime() - lastSyncTime.getTime();
      
      if (diff < 1000) setFormattedTime('Just now');
      else if (diff < 60000) setFormattedTime(`${Math.floor(diff / 1000)}s ago`);
      else if (diff < 3600000) setFormattedTime(`${Math.floor(diff / 60000)}m ago`);
      else setFormattedTime(lastSyncTime.toLocaleTimeString());
    };
    
    updateFormattedTime();
    const interval = setInterval(updateFormattedTime, 1000);
    
    return () => clearInterval(interval);
  }, [lastSyncTime]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportState());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const json = exportState();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'catears-state.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const newState = JSON.parse(json);
        loadState(newState);
      } catch {
        console.error('Failed to load state');
      }
    };
    reader.readAsText(file);
  };
  

  return (
    <div className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">State Configuration</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="w-3 h-3" />
              <span>Last sync: {formattedTime}</span>
            </div>
            {syncStatus === 'syncing' && (
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                <Wifi className="w-3 h-3 animate-pulse" />
                <span>Syncing...</span>
              </div>
            )}
            {syncStatus === 'success' && (
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Check className="w-3 h-3" />
                <span>Synced</span>
              </div>
            )}
            {syncStatus === 'error' && (
              <div className="text-xs text-red-600 dark:text-red-400">
                Sync failed
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="p-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            title="Copy JSON"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            title="Download JSON"
          >
            <Download className="w-4 h-4" />
          </button>
          <label className="p-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors cursor-pointer"
            title="Load JSON">
            <Upload className="w-4 h-4" />
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <details className="group">
        <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          Show JSON Preview
        </summary>
        <div className="mt-2">
          <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md text-xs overflow-x-auto max-h-64 overflow-y-auto">
            {exportState()}
          </pre>
        </div>
      </details>
    </div>
  );
}