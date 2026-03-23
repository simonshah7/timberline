'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Campaign, Status } from '@/db/schema';
import {
  SolarMagniferLinear,
  SolarChartLinear,
  SolarAltArrowDown,
  SolarCheckLinear,
  SolarBookmarkLinear,
  SolarCloseLinear,
  SolarAddLinear,
} from '@/components/SolarIcons';

interface SavedFilter {
  id: string;
  name: string;
  searchQuery: string;
  campaignIds: string[];
  statusIds: string[];
}

interface FilterBarProps {
  campaigns: Campaign[];
  statuses: Status[];
  searchQuery: string;
  selectedCampaignIds: string[];
  selectedStatusIds: string[];
  onSearchChange: (query: string) => void;
  onCampaignChange: (campaignIds: string[]) => void;
  onStatusChange: (statusIds: string[]) => void;
}

const SAVED_FILTERS_KEY = 'timberline_saved_filters';

function loadSavedFilters(): SavedFilter[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_FILTERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSavedFilters(filters: SavedFilter[]) {
  localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(filters));
}

export function FilterBar({
  campaigns,
  statuses,
  searchQuery,
  selectedCampaignIds,
  selectedStatusIds,
  onSearchChange,
  onCampaignChange,
  onStatusChange,
}: FilterBarProps) {
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [savingFilter, setSavingFilter] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  const campaignRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef<HTMLDivElement>(null);
  const saveInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSavedFilters(loadSavedFilters());
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (campaignRef.current && !campaignRef.current.contains(event.target as Node)) {
        setCampaignOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setStatusOpen(false);
      }
      if (savedRef.current && !savedRef.current.contains(event.target as Node)) {
        setSavedOpen(false);
        setSavingFilter(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (savingFilter && saveInputRef.current) {
      saveInputRef.current.focus();
    }
  }, [savingFilter]);

  const hasActiveFilters = selectedCampaignIds.length > 0 || selectedStatusIds.length > 0 || !!searchQuery;

  const toggleCampaign = useCallback((id: string) => {
    if (selectedCampaignIds.includes(id)) {
      onCampaignChange(selectedCampaignIds.filter((c) => c !== id));
    } else {
      onCampaignChange([...selectedCampaignIds, id]);
    }
  }, [selectedCampaignIds, onCampaignChange]);

  const toggleStatus = useCallback((id: string) => {
    if (selectedStatusIds.includes(id)) {
      onStatusChange(selectedStatusIds.filter((s) => s !== id));
    } else {
      onStatusChange([...selectedStatusIds, id]);
    }
  }, [selectedStatusIds, onStatusChange]);

  const handleSaveFilter = () => {
    if (!filterName.trim()) return;
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName.trim(),
      searchQuery,
      campaignIds: selectedCampaignIds,
      statusIds: selectedStatusIds,
    };
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    persistSavedFilters(updated);
    setFilterName('');
    setSavingFilter(false);
  };

  const handleLoadFilter = (filter: SavedFilter) => {
    onSearchChange(filter.searchQuery);
    onCampaignChange(filter.campaignIds);
    onStatusChange(filter.statusIds);
    setSavedOpen(false);
  };

  const handleDeleteFilter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedFilters.filter((f) => f.id !== id);
    setSavedFilters(updated);
    persistSavedFilters(updated);
  };

  const campaignLabel = selectedCampaignIds.length > 0
    ? `Campaign (${selectedCampaignIds.length})`
    : 'Campaign';

  const statusLabel = selectedStatusIds.length > 0
    ? `Status (${selectedStatusIds.length})`
    : 'All Statuses';

  return (
    <div className="bg-background border-b border-card-border px-3 sm:px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 min-w-0">
          {/* Search */}
          <div className="relative flex-1 min-w-[140px] max-w-xs">
            <SolarMagniferLinear className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple text-foreground"
            />
          </div>

          {/* Campaign Filter */}
          <div className="relative" ref={campaignRef}>
            <button
              onClick={() => { setCampaignOpen(!campaignOpen); setStatusOpen(false); setSavedOpen(false); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                selectedCampaignIds.length > 0
                  ? 'bg-accent-soft text-accent border border-accent/20 font-medium'
                  : 'bg-muted text-muted-foreground hover:text-foreground border border-transparent'
              }`}
            >
              <SolarChartLinear className="w-3.5 h-3.5" />
              <span>{campaignLabel}</span>
              <SolarAltArrowDown className={`w-3.5 h-3.5 transition-transform ${campaignOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {campaignOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-1.5 w-56 bg-card rounded-xl shadow-lg shadow-black/8 border border-card-border z-50 overflow-hidden"
                >
                  <div className="py-1 max-h-64 overflow-y-auto">
                    <button
                      onClick={() => { onCampaignChange([]); }}
                      className={`w-full px-3.5 py-2 text-left text-sm transition-colors ${
                        selectedCampaignIds.length === 0 ? 'bg-accent-soft text-accent font-medium' : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      All Campaigns
                    </button>
                    {campaigns.map((campaign) => {
                      const isSelected = selectedCampaignIds.includes(campaign.id);
                      return (
                        <button
                          key={campaign.id}
                          onClick={() => toggleCampaign(campaign.id)}
                          className={`w-full px-3.5 py-2 text-left text-sm flex items-center gap-2.5 transition-colors ${
                            isSelected ? 'bg-accent-soft text-accent font-medium' : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-accent border-accent' : 'border-card-border'
                          }`}>
                            {isSelected && (
                              <SolarCheckLinear className="w-3 h-3 text-white" />
                            )}
                          </span>
                          {campaign.name}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Status Filter */}
          <div className="relative" ref={statusRef}>
            <button
              onClick={() => { setStatusOpen(!statusOpen); setCampaignOpen(false); setSavedOpen(false); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                selectedStatusIds.length > 0
                  ? 'bg-accent-soft text-accent border border-accent/20 font-medium'
                  : 'bg-card border border-card-border hover:bg-muted'
              }`}
            >
              <span className="text-foreground">{statusLabel}</span>
              <SolarAltArrowDown className={`w-4 h-4 text-muted-foreground transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {statusOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-1.5 w-52 bg-card rounded-xl shadow-lg shadow-black/8 border border-card-border z-50 overflow-hidden"
                >
                  <div className="py-1 max-h-64 overflow-y-auto">
                    <button
                      onClick={() => { onStatusChange([]); }}
                      className={`w-full px-3.5 py-2 text-left text-sm transition-colors ${
                        selectedStatusIds.length === 0 ? 'bg-accent-soft text-accent font-medium' : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      All Statuses
                    </button>
                    {statuses.map((status) => {
                      const isSelected = selectedStatusIds.includes(status.id);
                      return (
                        <button
                          key={status.id}
                          onClick={() => toggleStatus(status.id)}
                          className={`w-full px-3.5 py-2 text-left text-sm flex items-center gap-2.5 transition-colors ${
                            isSelected ? 'bg-accent-soft text-accent font-medium' : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-accent border-accent' : 'border-card-border'
                          }`}>
                            {isSelected && (
                              <SolarCheckLinear className="w-3 h-3 text-white" />
                            )}
                          </span>
                          <span className="w-2.5 h-2.5 rounded-full ring-1 ring-black/10 flex-shrink-0" style={{ backgroundColor: status.color }} />
                          {status.name}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Saved Filters */}
          <div className="relative" ref={savedRef}>
            <button
              onClick={() => { setSavedOpen(!savedOpen); setCampaignOpen(false); setStatusOpen(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-muted text-muted-foreground hover:text-foreground border border-transparent transition-all"
            >
              <SolarBookmarkLinear className="w-3.5 h-3.5" />
              <span>Saved</span>
              {savedFilters.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-accent-soft text-accent rounded-full leading-none">
                  {savedFilters.length}
                </span>
              )}
              <SolarAltArrowDown className={`w-3.5 h-3.5 transition-transform ${savedOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {savedOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-1.5 w-64 bg-card rounded-xl shadow-lg shadow-black/8 border border-card-border z-50 overflow-hidden"
                >
                  <div className="py-1 max-h-64 overflow-y-auto">
                    {savedFilters.length === 0 && !savingFilter && (
                      <div className="px-3.5 py-3 text-sm text-muted-foreground text-center">
                        No saved filters yet
                      </div>
                    )}
                    {savedFilters.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => handleLoadFilter(filter)}
                        className="w-full px-3.5 py-2 text-left text-sm flex items-center justify-between gap-2 text-foreground hover:bg-muted transition-colors group"
                      >
                        <span className="truncate">{filter.name}</span>
                        <span
                          onClick={(e) => handleDeleteFilter(filter.id, e)}
                          className="flex-shrink-0 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          <SolarCloseLinear className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    ))}
                    {savingFilter ? (
                      <div className="px-3 py-2 flex items-center gap-2">
                        <input
                          ref={saveInputRef}
                          type="text"
                          placeholder="Filter name..."
                          value={filterName}
                          onChange={(e) => setFilterName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveFilter();
                            if (e.key === 'Escape') { setSavingFilter(false); setFilterName(''); }
                          }}
                          className="flex-1 px-2 py-1 text-sm bg-background border border-card-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-accent-purple"
                        />
                        <button
                          onClick={handleSaveFilter}
                          disabled={!filterName.trim()}
                          className="px-2 py-1 text-xs font-medium bg-accent text-white rounded hover:bg-accent/90 disabled:opacity-40 transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      hasActiveFilters && (
                        <button
                          onClick={() => setSavingFilter(true)}
                          className="w-full px-3.5 py-2 text-left text-sm text-accent hover:bg-muted transition-colors border-t border-card-border flex items-center gap-2"
                        >
                          <SolarAddLinear className="w-3.5 h-3.5" />
                          Save current filters
                        </button>
                      )
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Clear All Filters */}
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => {
                onSearchChange('');
                onCampaignChange([]);
                onStatusChange([]);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
            >
              <SolarCloseLinear className="w-3.5 h-3.5" />
              Clear filters
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Chips */}
      <AnimatePresence>
        {(selectedCampaignIds.length > 0 || selectedStatusIds.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-wrap items-center gap-1.5 pt-2 overflow-hidden"
          >
            {selectedCampaignIds.map((id) => {
              const campaign = campaigns.find((c) => c.id === id);
              if (!campaign) return null;
              return (
                <motion.span
                  key={`campaign-${id}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-accent-soft text-accent rounded-full"
                >
                  {campaign.name}
                  <span
                    onClick={() => toggleCampaign(id)}
                    className="cursor-pointer hover:text-foreground transition-colors"
                  >
                    <SolarCloseLinear className="w-3 h-3" />
                  </span>
                </motion.span>
              );
            })}
            {selectedStatusIds.map((id) => {
              const status = statuses.find((s) => s.id === id);
              if (!status) return null;
              return (
                <motion.span
                  key={`status-${id}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-accent-soft text-accent rounded-full"
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
                  {status.name}
                  <span
                    onClick={() => toggleStatus(id)}
                    className="cursor-pointer hover:text-foreground transition-colors"
                  >
                    <SolarCloseLinear className="w-3 h-3" />
                  </span>
                </motion.span>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
