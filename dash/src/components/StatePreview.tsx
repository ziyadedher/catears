'use client';

import { useState, useEffect, useCallback } from 'react';
import { Copy, Upload, Download, Check, Clock, Wifi, Lock, LogOut, User, Loader2 } from 'lucide-react';
import { useCatEarsStore } from '@/store/catears-store';
import { useAuthStore } from '@/store/auth-store';

export function StatePreview() {
  const { state, exportState, loadState } = useCatEarsStore();
  const { isAuthenticated, username, login, logout, verifySession, isLoading: authLoading } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error' | 'auth_required'>('idle');
  const [formattedTime, setFormattedTime] = useState('Never');
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Check auth status on mount
  useEffect(() => {
    verifySession();
  }, [verifySession]);
  
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
        if (response.status === 401) {
          // Authentication required
          setSyncStatus('auth_required');
          // Don't reload, just show auth form
          return;
        }
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
  
  // Auto-sync debouncing - only if authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    
    const timeoutId = setTimeout(() => {
      syncToCloud();
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [state, syncToCloud, isAuthenticated]);
  
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
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (!loginUsername || !loginPassword) {
      setLoginError('Please enter both username and password');
      return;
    }
    
    const success = await login(loginUsername, loginPassword);
    if (success) {
      setLoginUsername('');
      setLoginPassword('');
      setSyncStatus('idle');
      // Trigger a sync after successful login
      setTimeout(syncToCloud, 100);
    } else {
      setLoginError('Invalid password');
    }
  };
  
  const handleLogout = async () => {
    await logout();
    setSyncStatus('auth_required');
    setLastSyncTime(null);
  };

  return (
    <div className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">State Configuration</h2>
          <div className="flex items-center gap-2 mt-1">
            {isAuthenticated ? (
              <>
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
                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <User className="w-3 h-3" />
                  <span>{username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex items-center gap-1 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <Lock className="w-3 h-3" />
                <span>Login required</span>
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
      
      {/* Login form - only show when not authenticated */}
      {!isAuthenticated && (syncStatus === 'auth_required' || !lastSyncTime) && (
        <div className="border-t dark:border-gray-700 pt-4">
          <form onSubmit={handleLogin} className="space-y-3">
            {loginError && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {loginError}
              </div>
            )}
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Username (any name)"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
                disabled={authLoading}
              />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
                disabled={authLoading}
              />
              <button
                type="submit"
                disabled={authLoading || !loginUsername || !loginPassword}
                className="px-4 py-1.5 text-sm bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

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