import React, { useState } from 'react';
import { GenerationHistoryItem } from '../../types';
import { Search, Trash2, FileAudio, LayoutGrid, ListFilter, Plus } from 'lucide-react';
import { AudioEngine } from '../../utils/audioEngine';
import { ConfirmDialog } from '../ConfirmDialog';
import { RenameProjectModal } from '../studio/RenameProjectModal';
import { ProjectCard } from './ProjectCard';
import { ProjectVersionRow } from './ProjectVersionRow';
import { isWithinPeriod } from '../../utils/timeFormat';

interface ProjectsPageProps {
  history: GenerationHistoryItem[];
  onLoadHistoryIntoStudio: (item: GenerationHistoryItem) => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearHistory: () => void;
  onRenameHistoryItem: (id: string, newTitle: string) => void;
  onCreateNewProject: () => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  history,
  onLoadHistoryIntoStudio,
  onShowToast,
  onDeleteHistoryItem,
  onClearHistory,
  onRenameHistoryItem,
  onCreateNewProject,
}) => {
  const [search, setSearch] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'All' | 'Today' | 'This week' | 'This month'>('All');
  const [sortBy, setSortBy] = useState<'Newest' | 'Oldest' | 'Name' | 'Duration'>('Newest');
  const [viewMode, setViewMode] = useState<'projects' | 'flat'>('projects');
  
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [renamingItem, setRenamingItem] = useState<GenerationHistoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<GenerationHistoryItem | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<{ projectId: string; title: string } | null>(null);

  // 1. Filter items first
  const filtered = history.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.voiceName.toLowerCase().includes(search.toLowerCase()) ||
      item.scriptSnippet.toLowerCase().includes(search.toLowerCase()) ||
      (item.fullScript && item.fullScript.toLowerCase().includes(search.toLowerCase()));

    const matchesPeriod = isWithinPeriod(item.updatedAt || item.createdAt, filterPeriod);

    return matchesSearch && matchesPeriod;
  });

  // 2. Group by projectId (for projects view)
  const projectsMap: { [projectId: string]: { name: string; versions: GenerationHistoryItem[] } } = {};
  filtered.forEach((item) => {
    const pId = item.projectId || `proj-legacy-${item.id}`;
    if (!projectsMap[pId]) {
      projectsMap[pId] = {
        name: item.title,
        versions: [],
      };
    }
    projectsMap[pId].versions.push(item);
  });

  // 3. Sort projects by latest modified timestamp of any version in that project
  const sortedProjects = Object.entries(projectsMap).map(([pId, data]) => {
    const timestamps = data.versions.map((v) => new Date(v.updatedAt || v.createdAt).getTime());
    const latestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : 0;
    
    const sortedVers = [...data.versions].sort((a, b) => (b.version || 0) - (a.version || 0));
    const latestName = sortedVers[0]?.title || data.name;

    return {
      projectId: pId,
      projectName: latestName,
      versions: data.versions,
      latestTimestamp,
      maxDuration: Math.max(...data.versions.map(v => v.durationSec)),
    };
  });

  const sortedAndFilteredProjects = sortedProjects.sort((a, b) => {
    if (sortBy === 'Newest') {
      return b.latestTimestamp - a.latestTimestamp;
    }
    if (sortBy === 'Oldest') {
      return a.latestTimestamp - b.latestTimestamp;
    }
    if (sortBy === 'Name') {
      return a.projectName.localeCompare(b.projectName);
    }
    if (sortBy === 'Duration') {
      return b.maxDuration - a.maxDuration;
    }
    return 0;
  });

  // 4. Sort flat generations list (filter out active drafts from flat files list)
  const sortedFlatGenerations = filtered.filter(item => !item.id.startsWith('draft-')).sort((a, b) => {
    if (sortBy === 'Newest') {
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    }
    if (sortBy === 'Oldest') {
      return new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime();
    }
    if (sortBy === 'Name') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'Duration') {
      return b.durationSec - a.durationSec;
    }
    return 0;
  });

  // Audio Playback
  const handleTogglePlay = (item: GenerationHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingId === item.id) {
      AudioEngine.stop();
      setPlayingId(null);
    } else {
      setPlayingId(item.id);
      if (item.audioBlob) {
        AudioEngine.playAudioFile(item.audioBlob, () => setPlayingId(null));
      } else {
        AudioEngine.playSpeechPreview(item.scriptSnippet, 1.0, () => setPlayingId(null));
      }
    }
  };

  // WAV Download
  const handleDownload = (item: GenerationHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.audioBlob) {
      const url = URL.createObjectURL(item.audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.title.replace(/\s+/g, '_')}_V${item.version || 1}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast('Downloaded WAV file', item.title, 'success');
    } else {
      onShowToast('Download simulated', 'No audio blob found for this item.', 'info');
    }
  };

  // Copy Script
  const handleCopyText = (item: GenerationHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = item.fullScript || item.scriptSnippet;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(item.id);
    onShowToast('Copied to clipboard', 'Script text copied successfully', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteVersionClick = (item: GenerationHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingItem(item);
  };

  const handleDeleteProjectClick = (projectId: string, title: string) => {
    setProjectToDelete({ projectId, title });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header Row */}
      <div className="pb-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">Projects Workspace</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Manage your creative audio projects and access historical timeline versions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setIsConfirmClearOpen(true)}
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 transition-all cursor-pointer"
              title="Delete all projects permanently"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete All</span>
            </button>
          )}

          <button
            type="button"
            onClick={onCreateNewProject}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Filter, Sort, View Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shrink-0 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 p-0.5 bg-[var(--bg-inner)] border border-[var(--border-subtle)] rounded-lg">
            <button
              onClick={() => setViewMode('projects')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider text-[10px] transition-colors cursor-pointer ${
                viewMode === 'projects'
                  ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Projects</span>
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider text-[10px] transition-colors cursor-pointer ${
                viewMode === 'flat'
                  ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <ListFilter className="w-3 h-3" />
              <span>Flat List</span>
            </button>
          </div>

          {/* Period Pills */}
          <div className="flex items-center gap-1 p-0.5 bg-[var(--bg-inner)] border border-[var(--border-subtle)] rounded-lg">
            {(['All', 'Today', 'This week', 'This month'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setFilterPeriod(period)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider text-[10px] transition-colors cursor-pointer ${
                  filterPeriod === period
                    ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {period === 'All' ? 'All Time' : period}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Sorting */}
          <div className="relative w-full sm:w-auto flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-bold shrink-0">Sort By</span>
            <div className="flex items-center gap-1 p-0.5 bg-[var(--bg-inner)] border border-[var(--border-subtle)] rounded-lg">
              {(['Newest', 'Oldest', 'Name', 'Duration'] as const).map((sortOpt) => (
                <button
                  key={sortOpt}
                  onClick={() => setSortBy(sortOpt)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider text-[10px] transition-colors cursor-pointer ${
                    sortBy === sortOpt
                      ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {sortOpt === 'Name' ? 'A-Z' : sortOpt}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[var(--text-dim)] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search projects or logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-inner)] border border-[var(--border-subtle)] rounded-lg text-xs text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-hidden focus:border-purple-500/60"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'projects' ? (
        sortedAndFilteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-panel)] border border-[var(--border-main)] border-dashed rounded-2xl text-center max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-purple-600/10 flex items-center justify-center text-purple-400">
              <FileAudio className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">No Projects Found</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                Click "+ New Project" to create a fresh audio workspace in the studio.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedAndFilteredProjects.map((project) => (
              <ProjectCard
                key={project.projectId}
                projectId={project.projectId}
                projectName={project.projectName}
                versions={project.versions}
                playingId={playingId}
                copiedId={copiedId}
                onTogglePlay={handleTogglePlay}
                onDownload={handleDownload}
                onCopyText={handleCopyText}
                onLoadIntoStudio={onLoadHistoryIntoStudio}
                onDeleteVersion={handleDeleteVersionClick}
                onDeleteProject={handleDeleteProjectClick}
                onRenameProject={(item) => setRenamingItem(item)}
              />
            ))}
          </div>
        )
      ) : sortedFlatGenerations.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-panel)] border border-[var(--border-main)] border-dashed rounded-2xl text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-purple-600/10 flex items-center justify-center text-purple-400">
            <FileAudio className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">No Records</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              No matching generated records were found in this workspace.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedFlatGenerations.map((item) => (
            <ProjectVersionRow
              key={item.id}
              item={item}
              isPlaying={playingId === item.id}
              copiedId={copiedId}
              onTogglePlay={handleTogglePlay}
              onDownload={handleDownload}
              onCopyText={handleCopyText}
              onLoadIntoStudio={onLoadHistoryIntoStudio}
              onDelete={handleDeleteVersionClick}
            />
          ))}
        </div>
      )}

      {/* Delete Record Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deletingItem !== null}
        title="Delete Version"
        description={`Are you sure you want to delete version ${deletingItem?.version || 1} of "${deletingItem?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Version"
        cancelLabel="Keep Version"
        isDanger={true}
        onConfirm={() => {
          if (deletingItem) {
            onDeleteHistoryItem(deletingItem.id);
            onShowToast('Version deleted', `Version ${deletingItem.version || 1} of ${deletingItem.title}`, 'info');
          }
          setDeletingItem(null);
        }}
        onCancel={() => setDeletingItem(null)}
      />

      {/* Delete Project Confirmation Dialog */}
      <ConfirmDialog
        isOpen={projectToDelete !== null}
        title="Delete Project Workspace"
        description={`Are you sure you want to delete the project "${projectToDelete?.title}"? This will permanently remove all ${
          history.filter((item) => (item.projectId || `proj-legacy-${item.id}`) === projectToDelete?.projectId).length
        } versions. This action cannot be undone.`}
        confirmLabel="Delete Project"
        cancelLabel="Keep Project"
        isDanger={true}
        onConfirm={() => {
          if (projectToDelete) {
            const versionsToDelete = history.filter(
              (item) => (item.projectId || `proj-legacy-${item.id}`) === projectToDelete.projectId
            );
            versionsToDelete.forEach((v) => onDeleteHistoryItem(v.id));
            onShowToast('Project deleted', projectToDelete.title, 'info');
          }
          setProjectToDelete(null);
        }}
        onCancel={() => setProjectToDelete(null)}
      />

      {/* Clear All Projects Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmClearOpen}
        title="Delete All Projects"
        description="Are you sure you want to delete all projects? This will permanently remove all audio clips and composition history from the database. This action cannot be undone."
        confirmLabel="Delete All Permanently"
        cancelLabel="Keep Projects"
        isDanger={true}
        onConfirm={() => {
          onClearHistory();
          setIsConfirmClearOpen(false);
        }}
        onCancel={() => setIsConfirmClearOpen(false)}
      />

      {/* Rename Project Modal */}
      <RenameProjectModal
        isOpen={renamingItem !== null}
        currentName={renamingItem?.title || ''}
        onSave={(newName) => {
          if (renamingItem) {
            onRenameHistoryItem(renamingItem.id, newName);
          }
          setRenamingItem(null);
        }}
        onClose={() => setRenamingItem(null)}
      />
    </div>
  );
};
