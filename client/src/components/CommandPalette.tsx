import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Search, ArrowRight, Clock, Hash, FileText, Database, Download, Settings, HelpCircle, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'navigation' | 'recent' | 'actions' | 'search';
  keywords?: string[];
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, setLocation] = useLocation();

  // Fetch recent data for quick access
  const { data: recentQueries } = useQuery({
    queryKey: ['/api/queries'],
    enabled: isOpen,
  });

  const { data: scrapers } = useQuery({
    queryKey: ['/api/scrapers'],
    enabled: isOpen,
  });

  // Open/close with CMD+K or CTRL+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setSearch('');
        setSelectedIndex(0);
      }

      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Navigation items
  const navigationCommands: CommandItem[] = [
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      subtitle: 'View your analytics dashboard',
      icon: <Zap className="w-5 h-5" />,
      action: () => { setLocation('/'); setIsOpen(false); },
      category: 'navigation',
      keywords: ['home', 'overview', 'stats'],
    },
    {
      id: 'nav-scraper',
      title: 'Web Scraper',
      subtitle: 'Configure data scrapers',
      icon: <Database className="w-5 h-5" />,
      action: () => { setLocation('/scraper'); setIsOpen(false); },
      category: 'navigation',
      keywords: ['scrape', 'crawl', 'collect'],
    },
    {
      id: 'nav-social',
      title: 'Social Media',
      subtitle: 'Social media analytics',
      icon: <Hash className="w-5 h-5" />,
      action: () => { setLocation('/social'); setIsOpen(false); },
      category: 'navigation',
      keywords: ['twitter', 'facebook', 'sentiment'],
    },
    {
      id: 'nav-nlsql',
      title: 'Natural Language to SQL',
      subtitle: 'AI-powered query builder',
      icon: <FileText className="w-5 h-5" />,
      action: () => { setLocation('/nl-sql'); setIsOpen(false); },
      category: 'navigation',
      keywords: ['ai', 'query', 'natural language'],
    },
    {
      id: 'nav-queries',
      title: 'Query History',
      subtitle: 'View saved queries',
      icon: <Clock className="w-5 h-5" />,
      action: () => { setLocation('/queries'); setIsOpen(false); },
      category: 'navigation',
      keywords: ['history', 'saved'],
    },
    {
      id: 'nav-exports',
      title: 'Exports',
      subtitle: 'Download your data',
      icon: <Download className="w-5 h-5" />,
      action: () => { setLocation('/exports'); setIsOpen(false); },
      category: 'navigation',
      keywords: ['download', 'csv', 'json', 'excel'],
    },
    {
      id: 'nav-settings',
      title: 'Settings',
      subtitle: 'Configure your workspace',
      icon: <Settings className="w-5 h-5" />,
      action: () => { setLocation('/settings'); setIsOpen(false); },
      category: 'navigation',
      keywords: ['preferences', 'config'],
    },
    {
      id: 'nav-help',
      title: 'Help & Documentation',
      subtitle: 'Get help and support',
      icon: <HelpCircle className="w-5 h-5" />,
      action: () => { setLocation('/help'); setIsOpen(false); },
      category: 'navigation',
      keywords: ['docs', 'support', 'guide'],
    },
  ];

  // Recent queries as commands
  const recentCommands: CommandItem[] = (recentQueries || []).slice(0, 5).map((query: any, index: number) => ({
    id: `recent-${query.id}`,
    title: query.naturalLanguageQuery || query.name || 'Untitled Query',
    subtitle: `SQL: ${query.sqlQuery?.substring(0, 50)}...`,
    icon: <Clock className="w-5 h-5" />,
    action: () => { setLocation('/queries'); setIsOpen(false); },
    category: 'recent' as const,
    keywords: [query.naturalLanguageQuery, query.sqlQuery],
  }));

  // Scraper commands
  const scraperCommands: CommandItem[] = (scrapers || []).slice(0, 5).map((scraper: any) => ({
    id: `scraper-${scraper.id}`,
    title: scraper.name,
    subtitle: `Scraper: ${scraper.url}`,
    icon: <Database className="w-5 h-5" />,
    action: () => { setLocation('/scraper'); setIsOpen(false); },
    category: 'search' as const,
    keywords: [scraper.name, scraper.url],
  }));

  // Combine all commands
  const allCommands = [...navigationCommands, ...recentCommands, ...scraperCommands];

  // Filter commands based on search
  const filteredCommands = search
    ? allCommands.filter(cmd => {
        const searchLower = search.toLowerCase();
        return (
          cmd.title.toLowerCase().includes(searchLower) ||
          cmd.subtitle?.toLowerCase().includes(searchLower) ||
          cmd.keywords?.some(k => k?.toLowerCase().includes(searchLower))
        );
      })
    : allCommands;

  // Group commands by category
  const groupedCommands = {
    navigation: filteredCommands.filter(c => c.category === 'navigation'),
    recent: filteredCommands.filter(c => c.category === 'recent'),
    search: filteredCommands.filter(c => c.category === 'search'),
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault();
        filteredCommands[selectedIndex].action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] animate-in fade-in duration-200"
      />

      {/* Command Palette */}
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-[101] px-4">
        <div className="bg-[#0D0D0D]/95 border-2 border-[#FFD700]/30 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in slide-in-from-top duration-200">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-[#3B2F2F]/50">
            <Search className="w-5 h-5 text-[#FFD700]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or type a command..."
              className="flex-1 bg-transparent text-[#F5F5DC] placeholder-[#F5F5DC]/50 outline-none text-lg"
              autoFocus
            />
            <kbd className="px-2 py-1 text-xs bg-[#3B2F2F] text-[#FFD700] rounded border border-[#FFD700]/30">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-12 text-center text-[#F5F5DC]/50">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No results found for "{search}"</p>
              </div>
            ) : (
              <>
                {/* Navigation Section */}
                {groupedCommands.navigation.length > 0 && (
                  <div className="py-2">
                    <div className="px-4 py-2 text-xs font-semibold text-[#FFD700] uppercase tracking-wider">
                      Navigation
                    </div>
                    {groupedCommands.navigation.map((cmd, index) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      return (
                        <button
                          key={cmd.id}
                          onClick={cmd.action}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 ${
                            globalIndex === selectedIndex
                              ? 'bg-[#FFD700]/20 border-l-2 border-[#FFD700]'
                              : 'hover:bg-[#3B2F2F]/30'
                          }`}
                        >
                          <div className="text-[#FFD700]">{cmd.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-[#F5F5DC]">{cmd.title}</div>
                            {cmd.subtitle && (
                              <div className="text-sm text-[#F5F5DC]/60 truncate">{cmd.subtitle}</div>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#FFD700]/50" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Recent Section */}
                {groupedCommands.recent.length > 0 && (
                  <div className="py-2 border-t border-[#3B2F2F]/50">
                    <div className="px-4 py-2 text-xs font-semibold text-[#FFD700] uppercase tracking-wider">
                      Recent
                    </div>
                    {groupedCommands.recent.map((cmd) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      return (
                        <button
                          key={cmd.id}
                          onClick={cmd.action}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 ${
                            globalIndex === selectedIndex
                              ? 'bg-[#FFD700]/20 border-l-2 border-[#FFD700]'
                              : 'hover:bg-[#3B2F2F]/30'
                          }`}
                        >
                          <div className="text-[#FFD700]/70">{cmd.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-[#F5F5DC]">{cmd.title}</div>
                            {cmd.subtitle && (
                              <div className="text-sm text-[#F5F5DC]/60 truncate">{cmd.subtitle}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Scrapers Section */}
                {groupedCommands.search.length > 0 && (
                  <div className="py-2 border-t border-[#3B2F2F]/50">
                    <div className="px-4 py-2 text-xs font-semibold text-[#FFD700] uppercase tracking-wider">
                      Scrapers
                    </div>
                    {groupedCommands.search.map((cmd) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      return (
                        <button
                          key={cmd.id}
                          onClick={cmd.action}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 ${
                            globalIndex === selectedIndex
                              ? 'bg-[#FFD700]/20 border-l-2 border-[#FFD700]'
                              : 'hover:bg-[#3B2F2F]/30'
                          }`}
                        >
                          <div className="text-[#FFD700]/70">{cmd.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-[#F5F5DC]">{cmd.title}</div>
                            {cmd.subtitle && (
                              <div className="text-sm text-[#F5F5DC]/60 truncate">{cmd.subtitle}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-[#3B2F2F]/50 bg-[#0D0D0D]/50">
            <div className="flex items-center justify-between text-xs text-[#F5F5DC]/50">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[#3B2F2F] text-[#FFD700] rounded text-[10px]">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[#3B2F2F] text-[#FFD700] rounded text-[10px]">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[#3B2F2F] text-[#FFD700] rounded text-[10px]">ESC</kbd>
                  Close
                </span>
              </div>
              <span>⌘K to open</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
