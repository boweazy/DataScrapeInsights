import { useEffect, useState } from 'react';
import { X, Keyboard } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  category: 'Navigation' | 'Actions' | 'General';
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ['⌘', 'K'], description: 'Open command palette', category: 'Navigation' },
  { keys: ['G', 'D'], description: 'Go to Dashboard', category: 'Navigation' },
  { keys: ['G', 'S'], description: 'Go to Scrapers', category: 'Navigation' },
  { keys: ['G', 'Q'], description: 'Go to Queries', category: 'Navigation' },
  { keys: ['G', 'E'], description: 'Go to Exports', category: 'Navigation' },

  // Actions
  { keys: ['N'], description: 'New scraper/query', category: 'Actions' },
  { keys: ['⌘', 'S'], description: 'Save current item', category: 'Actions' },
  { keys: ['⌘', 'Enter'], description: 'Execute/Submit', category: 'Actions' },
  { keys: ['⌘', 'F'], description: 'Focus search', category: 'Actions' },

  // General
  { keys: ['?'], description: 'Show shortcuts', category: 'General' },
  { keys: ['ESC'], description: 'Close dialog/modal', category: 'General' },
  { keys: ['⌘', '/'], description: 'Toggle theme', category: 'General' },
];

export default function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with "?"
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Check if not in an input field
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsOpen(true);
        }
      }

      // Close with ESC
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] animate-in fade-in duration-200"
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-[101] px-4">
        <div className="bg-[#0D0D0D]/95 border-2 border-[#FFD700]/30 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#3B2F2F]/50">
            <div className="flex items-center gap-3">
              <div className="bg-[#FFD700]/20 p-2 rounded-lg">
                <Keyboard className="w-5 h-5 text-[#FFD700]" />
              </div>
              <h2 className="text-xl font-bold text-[#F5F5DC]">Keyboard Shortcuts</h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#F5F5DC]/60 hover:text-[#FFD700] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {Object.entries(groupedShortcuts).map(([category, items]) => (
              <div key={category} className="mb-6 last:mb-0">
                <h3 className="text-sm font-semibold text-[#FFD700] uppercase tracking-wider mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {items.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#3B2F2F]/30 transition-colors"
                    >
                      <span className="text-[#F5F5DC]/80">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <kbd className="px-2 py-1 text-xs font-semibold bg-[#3B2F2F] text-[#FFD700] border border-[#FFD700]/30 rounded shadow-sm">
                              {key}
                            </kbd>
                            {i < shortcut.keys.length - 1 && (
                              <span className="text-[#F5F5DC]/40 text-xs">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#3B2F2F]/50 bg-[#0D0D0D]/50">
            <p className="text-sm text-[#F5F5DC]/50 text-center">
              Press <kbd className="px-1.5 py-0.5 bg-[#3B2F2F] text-[#FFD700] rounded text-xs mx-1">?</kbd>
              anytime to view shortcuts or{' '}
              <kbd className="px-1.5 py-0.5 bg-[#3B2F2F] text-[#FFD700] rounded text-xs mx-1">ESC</kbd>
              to close
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
