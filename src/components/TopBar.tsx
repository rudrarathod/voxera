import React, { useState, useEffect } from 'react';
import { AppTab, NotificationItem } from '../types';
import { Settings, Menu, Sun, Moon, Laptop, Link2, Bell, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface TopBarProps {
  activeTab: AppTab;
  onOpenSettings: () => void;
  onOpenMobileSidebar: () => void;
  isBackendConnected: boolean;
  onOpenConnectionModal: () => void;
  appearance: 'Light' | 'Dark' | 'System';
  setAppearance: (appearance: 'Light' | 'Dark' | 'System') => void;
  notificationHistory: NotificationItem[];
  onClearNotificationHistory: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onOpenSettings,
  onOpenMobileSidebar,
  isBackendConnected,
  onOpenConnectionModal,
  appearance,
  setAppearance,
  notificationHistory,
  onClearNotificationHistory,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLightMode, setIsLightMode] = useState(() => {
    return appearance === 'System'
      ? (typeof window !== 'undefined' ? !window.matchMedia('(prefers-color-scheme: dark)').matches : true)
      : appearance === 'Light';
  });

  useEffect(() => {
    setIsLightMode(
      appearance === 'System'
        ? (typeof window !== 'undefined' ? !window.matchMedia('(prefers-color-scheme: dark)').matches : true)
        : appearance === 'Light'
    );

    if (appearance === 'System') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        setIsLightMode(!e.matches);
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [appearance]);

  const toggleTheme = () => {
    if (appearance === 'Light') {
      setAppearance('Dark');
    } else if (appearance === 'Dark') {
      setAppearance('System');
    } else {
      setAppearance('Light');
    }
  };

  const titles: Record<AppTab, { title: string; subtitle: string }> = {
    studio: {
      title: 'Studio',
      subtitle: 'Generate natural, expressive speech',
    },
    voices: {
      title: 'Voices',
      subtitle: 'Create and manage your custom voices',
    },
    'create-voice': {
      title: 'Create voice',
      subtitle: 'Create a reusable voice from a reference recording',
    },
    projects: {
      title: 'Projects',
      subtitle: 'View and manage your audio projects',
    },
    settings: {
      title: 'Settings',
      subtitle: 'System and application preferences',
    },
  };

  const current = titles[activeTab];

  return (
    <header className="h-16 px-6 border-b border-[var(--border-main)] bg-[var(--bg-topbar)] backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-main)]"
          aria-label="Open sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div>
          <h2 className="text-sm font-semibold text-[var(--text-main)] tracking-tight">
            {current.title}
          </h2>
          <p className="text-xs text-[var(--text-muted)] font-normal">{current.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Backend Connection Status Indicator */}
        <button
          type="button"
          onClick={onOpenConnectionModal}
          className="p-2 rounded-full hover:bg-[var(--bg-card)] transition-colors cursor-pointer flex items-center justify-center"
          title={isBackendConnected ? "Backend Online - Click to view details" : "Backend Offline - Click to paste backend link"}
          aria-label={isBackendConnected ? "Backend Online" : "Backend Offline"}
        >
          <span className="w-4 h-4 flex items-center justify-center">
            <span className="flex h-2 w-2 relative shrink-0">
              {isBackendConnected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              ) : (
                <>
                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-40"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </>
              )}
            </span>
          </span>
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-md bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--border-card)] transition-colors"
          title={
            appearance === 'Light'
              ? 'Theme: Light (Switch to Dark)'
              : appearance === 'Dark'
              ? 'Theme: Dark (Switch to System)'
              : 'Theme: System (Switch to Light)'
          }
          aria-label="Toggle Theme"
        >
          {appearance === 'Light' && <Sun className="w-4 h-4 text-amber-500" />}
          {appearance === 'Dark' && <Moon className="w-4 h-4 text-purple-600" />}
          {appearance === 'System' && <Laptop className="w-4 h-4 text-purple-600" />}
        </button>

        {/* Notification Bell with Dropdown */}
        <div className="relative flex">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-md bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--border-card)] transition-colors cursor-pointer relative flex items-center justify-center ${
              showNotifications ? 'text-[var(--text-main)] border-[var(--border-card)] bg-[var(--bg-inner)]' : ''
            }`}
            title="Notification History"
          >
            <Bell className="w-4 h-4" />
            {notificationHistory.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 ring-[var(--bg-card)] animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <>
              {/* Overlay to close on click outside */}
              <div 
                className="fixed inset-0 z-40 cursor-default" 
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 mt-10 w-80 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg shadow-xl z-50 text-xs overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2.5 bg-[var(--bg-card)] border-b border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="font-semibold text-[var(--text-main)]">Session Notifications</span>
                  {notificationHistory.length > 0 && (
                    <button
                      onClick={() => {
                        onClearNotificationHistory();
                      }}
                      className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider cursor-pointer border-0 bg-transparent p-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                <div className="max-h-64 overflow-y-auto divide-y divide-[var(--border-subtle)]">
                  {notificationHistory.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[var(--text-dim)]">
                      No notifications in this session
                    </div>
                  ) : (
                    notificationHistory.map((item) => {
                      const isSuccess = item.type === 'success';
                      const isError = item.type === 'error';
                      return (
                        <div key={item.id} className="p-3 hover:bg-[var(--bg-inner)] transition-colors flex items-start gap-2.5">
                          {isSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />}
                          {isError && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />}
                          {!isSuccess && !isError && <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />}
                          
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <p className="font-medium text-[var(--text-main)] leading-snug">{item.title}</p>
                            {item.description && (
                              <p className="text-[10px] text-[var(--text-muted)] leading-snug">{item.description}</p>
                            )}
                            <p className="text-[9px] text-[var(--text-dim)]">{item.timestamp}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-md bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--border-card)] transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};


