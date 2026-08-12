import React, { useState, useEffect } from 'react';
import { AppTab } from '../types';
import { Settings, Menu, Sun, Moon, Link2 } from 'lucide-react';

interface TopBarProps {
  activeTab: AppTab;
  onOpenSettings: () => void;
  onOpenMobileSidebar: () => void;
  isBackendConnected: boolean;
  onOpenConnectionModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onOpenSettings,
  onOpenMobileSidebar,
  isBackendConnected,
  onOpenConnectionModal,
}) => {
  const [isLightMode, setIsLightMode] = useState(() => {
    return document.documentElement.classList.contains('light');
  });

  const toggleTheme = () => {
    if (isLightMode) {
      document.documentElement.classList.remove('light');
      setIsLightMode(false);
    } else {
      document.documentElement.classList.add('light');
      setIsLightMode(true);
    }
  };

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLightMode(document.documentElement.classList.contains('light'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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
    history: {
      title: 'History',
      subtitle: 'View and manage past speech generations',
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
        {/* Backend Connection Status Badge */}
        <button
          type="button"
          onClick={onOpenConnectionModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--border-main)] bg-[var(--bg-card)] hover:bg-[var(--bg-inner)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer shadow-xs"
          title={isBackendConnected ? "Backend Online - Click to view details" : "Backend Offline - Click to paste backend link"}
        >
          <span className="flex h-1.5 w-1.5 relative shrink-0">
            {isBackendConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
            )}
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isBackendConnected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></span>
          </span>
          <span>{isBackendConnected ? 'Online' : 'Offline'}</span>
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-md bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--border-card)] transition-colors"
          title={isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          aria-label="Toggle Theme"
        >
          {isLightMode ? <Moon className="w-4 h-4 text-purple-600" /> : <Sun className="w-4 h-4 text-amber-500" />}
        </button>

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


