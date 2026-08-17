import React from 'react';
import { AppTab } from '../types';
import { Mic2, FolderOpen, Settings, Sparkles, X } from 'lucide-react';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems = [
    { id: 'projects' as AppTab, label: 'Projects', icon: FolderOpen },
    { id: 'studio' as AppTab, label: 'Studio', icon: Sparkles },
    { id: 'voices' as AppTab, label: 'Voices', icon: Mic2 },
  ];

  const handleNav = (tab: AppTab) => {
    setActiveTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/70 z-40 md:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-[230px] bg-[var(--bg-sidebar)] border-r border-[var(--border-main)] flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header */}
        <div>
          <div className="p-5 flex items-center justify-between border-b border-[var(--border-subtle)]">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-purple-600/20 border border-purple-500/40 flex items-center justify-center">
                  <span className="text-purple-500 font-bold text-xs tracking-wider">VX</span>
                </div>
                <h1 className="text-base font-bold text-[var(--text-main)] tracking-wider font-mono">
                  VOXERA
                </h1>
              </div>
              <p className="text-[11px] text-[var(--text-dim)] font-medium mt-0.5 tracking-wide">
                AI Voice Studio
              </p>
            </div>
            <button
              onClick={onCloseMobile}
              className="md:hidden text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] border border-[var(--nav-active-border)] shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--nav-hover)]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-500' : 'text-[var(--text-dim)]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-3 border-t border-[var(--border-subtle)] space-y-3">
          {/* Inference Worker Status */}
          <div className="px-3 py-2 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] text-[var(--text-muted)] font-medium truncate">
              Inference worker ready
            </span>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => handleNav('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] border border-[var(--nav-active-border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--nav-hover)]'
            }`}
          >
            <Settings className="w-4 h-4 text-[var(--text-dim)]" />
            <span>Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
};
