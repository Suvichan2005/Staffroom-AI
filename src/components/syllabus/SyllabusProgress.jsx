import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Clock, X } from "lucide-react";
import { ProgressBar } from '../charts';

const STATUS_FLOW = ["not-started", "ongoing", "done"];
const STATUS_META = {
  "not-started": { 
    label: "Not Started", 
    icon: Circle, 
    badgeClass: "bg-neutral-200 text-neutral-700",
    iconClass: "text-neutral-400"
  },
  "ongoing": { 
    label: "Ongoing", 
    icon: Clock, 
    badgeClass: "bg-indigo-100 text-indigo-700",
    iconClass: "text-indigo-600"
  },
  "done": { 
    label: "Done", 
    icon: CheckCircle2, 
    badgeClass: "bg-green-100 text-green-700",
    iconClass: "text-green-600"
  },
};

const DEFAULT_STATUS = STATUS_FLOW[0];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Vertical Scroll Page Picker Component (Portal-based to avoid clipping)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PageScrollPicker({ value, min, max, onChange, onClose, anchorEl }) {
  const containerRef = useRef(null);
  const pickerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const ITEM_HEIGHT = 32;
  const VISIBLE_ITEMS = 5; // Show 5 items (2 above, selected, 2 below)

  const pages = useMemo(() => {
    const arr = [];
    for (let i = min; i <= max; i++) arr.push(i);
    return arr;
  }, [min, max]);

  // Calculate position based on anchor element
  useEffect(() => {
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      // Position below the button, right-aligned
      setPosition({
        top: rect.bottom + 4,
        left: rect.right - 110 // 110 is picker width
      });
    }
  }, [anchorEl]);

  // Scroll to current value on mount
  useEffect(() => {
    if (containerRef.current) {
      const index = value - min;
      containerRef.current.scrollTop = index * ITEM_HEIGHT;
    }
  }, [value, min]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target) &&
          anchorEl && !anchorEl.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorEl]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Calculate which item is in the center
    const scrollTop = containerRef.current.scrollTop;
    const centerIndex = Math.round(scrollTop / ITEM_HEIGHT);
    const newValue = Math.min(Math.max(min + centerIndex, min), max);
    
    // Update value if changed
    if (newValue !== value) {
      onChange(newValue);
    }

    // Snap to center after scrolling stops
    scrollTimeoutRef.current = setTimeout(() => {
      if (containerRef.current) {
        const snapIndex = Math.round(containerRef.current.scrollTop / ITEM_HEIGHT);
        containerRef.current.scrollTo({
          top: snapIndex * ITEM_HEIGHT,
          behavior: 'smooth'
        });
      }
    }, 100);
  }, [value, min, max, onChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  const scrollToValue = (targetValue) => {
    if (!containerRef.current) return;
    const index = targetValue - min;
    containerRef.current.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: 'smooth'
    });
    onChange(targetValue);
  };

  const pickerContent = (
    <motion.div
      ref={pickerRef}
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.15 }}
      className="fixed bg-white rounded-lg shadow-2xl border-2 border-indigo-300"
      style={{ 
        width: '110px',
        zIndex: 99999,
        top: position.top,
        left: position.left
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-indigo-50 border-b border-indigo-200 rounded-t-lg">
        <span className="text-[10px] font-semibold text-indigo-700">Page</span>
        <button 
          type="button"
          onClick={onClose}
          className="p-0.5 rounded hover:bg-indigo-100 text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Scroll Container with gradient mask */}
      <div className="relative" style={{ height: `${VISIBLE_ITEMS * ITEM_HEIGHT}px` }}>
        {/* Top gradient fade */}
        <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-white via-white/60 to-transparent pointer-events-none z-10" />
        
        {/* Center highlight bar */}
        <div 
          className="absolute left-2 right-2 bg-indigo-500/20 backdrop-blur-sm rounded-md pointer-events-none z-10 border border-indigo-400"
          style={{ 
            height: `${ITEM_HEIGHT}px`,
            top: `${(VISIBLE_ITEMS - 1) / 2 * ITEM_HEIGHT}px`
          }}
        />
        
        {/* Scrollable list */}
        <div
          ref={containerRef}
          className="relative overflow-y-scroll scrollbar-hide h-full"
          style={{ 
            scrollSnapType: 'y mandatory',
            paddingTop: `${((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT}px`,
            paddingBottom: `${((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT}px`
          }}
        >
          {pages.map((page) => {
            const isSelected = page === value;
            const distance = Math.abs(page - value);
            
            return (
              <div
                key={page}
                onClick={() => scrollToValue(page)}
                className="flex items-center justify-center cursor-pointer select-none transition-all duration-150"
                style={{ 
                  height: `${ITEM_HEIGHT}px`,
                  scrollSnapAlign: 'center',
                  opacity: 1,
                  transform: isSelected ? 'scale(1.2)' : distance === 1 ? 'scale(1.05)' : 'scale(1)',
                  fontWeight: isSelected ? 700 : distance === 1 ? 500 : 400
                }}
              >
                <span 
                  className={`
                    transition-all duration-150
                    ${isSelected 
                      ? 'text-indigo-700 text-xl font-bold' 
                      : distance === 1
                        ? 'text-gray-600 text-base'
                        : 'text-gray-400 text-sm'}
                  `}
                >
                  {page}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white via-white/60 to-transparent pointer-events-none z-10" />
      </div>

      {/* Footer */}
      <div className="px-2.5 py-1.5 bg-indigo-50 border-t border-indigo-200 rounded-b-lg">
        <div className="text-center">
          <span className="text-[9px] text-gray-600">
            <span className="font-bold text-indigo-700 text-[11px]">{value}</span>
            <span className="text-gray-500"> / {max}</span>
          </span>
        </div>
      </div>
    </motion.div>
  );

  // Render via portal to document.body to avoid clipping issues
  return createPortal(pickerContent, document.body);
}

/**
 * Progress structure:
 * {
 *   [chapterIndex]: {
 *     topics: {
 *       [topicIndex]: {
 *         status: "not-started" | "ongoing" | "done",
 *         currentPage: number | null,  // Only for ongoing topics - tracks where teacher left off
 *         notes: string | null,          // Teacher's notes about this topic (e.g., "students confused about quadratic formula")
 *         lastCoveredAt: Date | null     // Timestamp when this topic was last worked on
 *       }
 *     }
 *   }
 * }
 */

const buildNormalizedProgress = (syllabus, rawProgress = {}) => {
  const normalized = {};
  (syllabus?.chapters || []).forEach((chapter) => {
    const chapterTopics = {};
    (chapter.subTopics || []).forEach((topic) => {
      const rawTopic = rawProgress?.[chapter.index]?.topics?.[topic.index];
      // Handle both old format (string status) and new format (object with status + currentPage + notes)
      let status, currentPage, notes, lastCoveredAt;
      if (typeof rawTopic === 'string') {
        status = STATUS_FLOW.includes(rawTopic) ? rawTopic : DEFAULT_STATUS;
        currentPage = null;
        notes = null;
        lastCoveredAt = null;
      } else if (rawTopic && typeof rawTopic === 'object') {
        status = STATUS_FLOW.includes(rawTopic.status) ? rawTopic.status : DEFAULT_STATUS;
        currentPage = rawTopic.currentPage ?? null;
        notes = rawTopic.notes ?? null;
        lastCoveredAt = rawTopic.lastCoveredAt ?? null;
      } else {
        status = DEFAULT_STATUS;
        currentPage = null;
        notes = null;
        lastCoveredAt = null;
      }
      chapterTopics[topic.index] = { status, currentPage, notes, lastCoveredAt };
    });
    normalized[chapter.index] = { topics: chapterTopics };
  });
  return normalized;
};

const getTopicData = (map, chapterIndex, subIndex) => {
  const data = map?.[chapterIndex]?.topics?.[subIndex];
  if (!data) return { status: DEFAULT_STATUS, currentPage: null, notes: null, lastCoveredAt: null };
  return data;
};

const getTopicStatus = (map, chapterIndex, subIndex) =>
  getTopicData(map, chapterIndex, subIndex).status;

export default function SyllabusProgress({
  syllabus,
  progressMap = {},
  onChange,
  onSave,
  editable = false,
  statusMessage = "",
  autoSave = true, // New prop: enable auto-save (default true)
  autoSaveDelay = 2000, // Debounce delay in ms
}) {
  const [localProgress, setLocalProgress] = useState(() => buildNormalizedProgress(syllabus, progressMap));
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState(''); // 'saving', 'saved', ''
  const [expandedChapters, setExpandedChapters] = useState({});
  const [editingPage, setEditingPage] = useState(null); // { chapterIndex, topicIndex, buttonEl }
  const [editingNotes, setEditingNotes] = useState(null); // { chapterIndex, topicIndex }
  const [confirmingDone, setConfirmingDone] = useState(null); // { chapterIndex, topicIndex }
  const autoSaveTimeoutRef = useRef(null);
  const savedStatusTimeoutRef = useRef(null);

  useEffect(() => {
    if (!editable || !isDirty) {
      setLocalProgress(buildNormalizedProgress(syllabus, progressMap));
    }
  }, [syllabus, progressMap, editable, isDirty]);

  // Auto-save effect with debounce
  useEffect(() => {
    if (!autoSave || !editable || !onSave || !isDirty) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new debounced save
    autoSaveTimeoutRef.current = setTimeout(() => {
      setAutoSaveStatus('saving');
      onSave(localProgress);
      setIsDirty(false);
      
      // Show "saved" status briefly
      setTimeout(() => {
        setAutoSaveStatus('saved');
        savedStatusTimeoutRef.current = setTimeout(() => {
          setAutoSaveStatus('');
        }, 2000);
      }, 300);
    }, autoSaveDelay);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [localProgress, isDirty, autoSave, editable, onSave, autoSaveDelay]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      if (savedStatusTimeoutRef.current) clearTimeout(savedStatusTimeoutRef.current);
    };
  }, []);

  // Auto-expand chapters with ongoing topics
  useEffect(() => {
    const initialExpanded = {};
    if (syllabus?.chapters) {
      syllabus.chapters.forEach(chapter => {
        const hasOngoing = chapter.subTopics?.some(t => {
          const status = getTopicStatus(localProgress, chapter.index, t.index);
          return status === 'ongoing';
        });
        if (hasOngoing) {
          initialExpanded[chapter.index] = true;
        }
      });
      // If no ongoing, expand first incomplete chapter
      if (Object.keys(initialExpanded).length === 0) {
        for (const chapter of syllabus.chapters) {
          const isComplete = chapter.subTopics?.every(t =>
            getTopicStatus(localProgress, chapter.index, t.index) === 'done'
          );
          if (!isComplete) {
            initialExpanded[chapter.index] = true;
            break;
          }
        }
      }
      // Always expand first chapter if nothing else
      if (Object.keys(initialExpanded).length === 0 && syllabus.chapters.length > 0) {
        initialExpanded[syllabus.chapters[0].index] = true;
      }
      setExpandedChapters(prev => ({ ...prev, ...initialExpanded }));
    }
  }, [syllabus]);

  const toggleChapter = (index) => {
    setExpandedChapters(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleAll = (expand) => {
    const next = {};
    syllabus.chapters.forEach(c => next[c.index] = expand);
    setExpandedChapters(next);
  };

  const chapterStats = useMemo(() => {
    return (syllabus?.chapters || []).map((chapter) => {
      const subTopics = chapter?.subTopics || [];
      const pages = subTopics.reduce(
        (sum, topic) => sum + Math.max(0, (topic.pageTo ?? 0) - (topic.pageFrom ?? 0) + 1),
        0
      );
      // Calculate completed pages including partial progress from ongoing topics
      const completedPages = subTopics.reduce((sum, topic) => {
        const topicData = getTopicData(localProgress, chapter.index, topic.index);
        const status = topicData.status;
        const topicPages = Math.max(0, (topic.pageTo ?? 0) - (topic.pageFrom ?? 0) + 1);
        
        if (status === "done") {
          return sum + topicPages;
        } else if (status === "ongoing" && topicData.currentPage != null) {
          // Calculate partial progress: pages covered up to currentPage
          const pagesCovered = Math.max(0, topicData.currentPage - (topic.pageFrom ?? 0));
          return sum + pagesCovered;
        }
        return sum;
      }, 0);
      const percent = pages ? Math.round((completedPages / pages) * 100) : 0;
      const isComplete = completedPages === pages && pages > 0;
      const hasOngoing = subTopics.some(t => getTopicStatus(localProgress, chapter.index, t.index) === 'ongoing');

      return {
        chapter,
        totalPages: pages,
        completedPages,
        percent,
        isComplete,
        hasOngoing,
      };
    });
  }, [syllabus, localProgress]);

  const totalPages = chapterStats.reduce((sum, entry) => sum + entry.totalPages, 0);
  const donePages = chapterStats.reduce((sum, entry) => sum + entry.completedPages, 0);
  const overallPercent = totalPages ? Math.round((donePages / totalPages) * 100) : 0;

  const handleTopicCycle = (chapterIndex, subIndex, e) => {
    e?.stopPropagation();
    if (!editable) return;

    const currentData = getTopicData(localProgress, chapterIndex, subIndex);
    const currentStatus = currentData.status;
    const nextStatus = STATUS_FLOW[(STATUS_FLOW.indexOf(currentStatus) + 1) % STATUS_FLOW.length];
    
    // If moving from ongoing to done, show confirmation
    if (currentStatus === 'ongoing' && nextStatus === 'done') {
      setConfirmingDone({ chapterIndex, subIndex });
      return;
    }

    // Direct transition for other cases
    performStatusChange(chapterIndex, subIndex, nextStatus);
  };

  const performStatusChange = (chapterIndex, subIndex, nextStatus) => {
    setLocalProgress((prev) => {
      const currentData = getTopicData(prev, chapterIndex, subIndex);
      
      // When moving to ongoing or done, update lastCoveredAt
      // When moving to ongoing, keep currentPage if exists, otherwise null
      // When moving to done or not-started, clear currentPage
      const nextCurrentPage = nextStatus === 'ongoing' ? currentData.currentPage : null;
      const nextLastCoveredAt = (nextStatus === 'ongoing' || nextStatus === 'done') ? new Date().toISOString() : currentData.lastCoveredAt;

      const nextChapter = {
        ...(prev?.[chapterIndex] || {}),
        topics: {
          ...(prev?.[chapterIndex]?.topics || {}),
          [subIndex]: { 
            status: nextStatus, 
            currentPage: nextCurrentPage,
            notes: currentData.notes,
            lastCoveredAt: nextLastCoveredAt
          },
        },
      };
      const next = {
        ...prev,
        [chapterIndex]: nextChapter,
      };
      setTimeout(() => onChange?.(next), 0);
      setIsDirty(true);
      return next;
    });
  };

  const handlePageChange = (chapterIndex, topicIndex, newPage) => {
    setLocalProgress((prev) => {
      const currentData = getTopicData(prev, chapterIndex, topicIndex);
      const nextChapter = {
        ...(prev?.[chapterIndex] || {}),
        topics: {
          ...(prev?.[chapterIndex]?.topics || {}),
          [topicIndex]: { 
            ...currentData, 
            currentPage: newPage,
            lastCoveredAt: new Date().toISOString()
          },
        },
      };
      const next = {
        ...prev,
        [chapterIndex]: nextChapter,
      };
      setTimeout(() => onChange?.(next), 0);
      setIsDirty(true);
      return next;
    });
  };

  const handleNotesChange = (chapterIndex, topicIndex, notes) => {
    setLocalProgress((prev) => {
      const currentData = getTopicData(prev, chapterIndex, topicIndex);
      const nextChapter = {
        ...(prev?.[chapterIndex] || {}),
        topics: {
          ...(prev?.[chapterIndex]?.topics || {}),
          [topicIndex]: { ...currentData, notes },
        },
      };
      const next = {
        ...prev,
        [chapterIndex]: nextChapter,
      };
      setTimeout(() => onChange?.(next), 0);
      setIsDirty(true);
      return next;
    });
  };

  const handleSave = () => {
    if (!editable || !onSave || !isDirty) return;
    // Clear any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    setAutoSaveStatus('saving');
    onSave(localProgress);
    setIsDirty(false);
    setTimeout(() => {
      setAutoSaveStatus('saved');
      savedStatusTimeoutRef.current = setTimeout(() => {
        setAutoSaveStatus('');
      }, 2000);
    }, 300);
  };

  // Get save button text based on status
  const getSaveButtonContent = () => {
    if (autoSaveStatus === 'saving') return 'Saving...';
    if (autoSaveStatus === 'saved') return '✓ Saved';
    if (autoSave && isDirty) return 'Auto-saving...';
    return 'Save Progress';
  };

  // Get last covered topic
  const lastCoveredTopic = useMemo(() => {
    let latest = null;
    (syllabus?.chapters || []).forEach(chapter => {
      (chapter.subTopics || []).forEach(topic => {
        const topicData = getTopicData(localProgress, chapter.index, topic.index);
        if (topicData.lastCoveredAt) {
          if (!latest || new Date(topicData.lastCoveredAt) > new Date(latest.timestamp)) {
            latest = {
              chapter,
              topic,
              status: topicData.status,
              currentPage: topicData.currentPage,
              timestamp: topicData.lastCoveredAt
            };
          }
        }
      });
    });
    return latest;
  }, [syllabus, localProgress]);

  if (!syllabus) return null;

  return (
    <div className="sc-card">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="sc-heading text-base">Syllabus Progress</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            {donePages} of {totalPages} pages covered
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleAll(true)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Expand All
          </button>
          <span className="text-neutral-300">|</span>
          <button
            onClick={() => toggleAll(false)}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-700"
          >
            Collapse
          </button>

          {editable && (
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty && autoSaveStatus !== 'saved'}
              className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                autoSaveStatus === 'saved'
                  ? "bg-green-100 text-green-700"
                  : autoSaveStatus === 'saving' || (autoSave && isDirty)
                    ? "bg-indigo-100 text-indigo-600"
                    : isDirty
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                      : "bg-neutral-200 text-neutral-500 cursor-not-allowed"
              }`}
            >
              {getSaveButtonContent()}
            </button>
          )}
          <span className="sc-badge">{overallPercent}%</span>
        </div>
      </div>

      {statusMessage && !isDirty && !autoSaveStatus && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] text-green-600 font-medium mb-2 text-right"
        >
          {statusMessage}
        </motion.p>
      )}

      <ProgressBar value={overallPercent} className="mb-4" />

      {/* Last Covered Section */}
      {lastCoveredTopic && (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-900 mb-1">Last Covered</p>
              <p className="text-sm text-indigo-800 font-medium truncate">
                Ch {lastCoveredTopic.chapter.index}: {lastCoveredTopic.topic.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-indigo-600">
                  {lastCoveredTopic.chapter.title}
                </span>
                {lastCoveredTopic.currentPage && (
                  <>
                    <span className="text-indigo-300">–</span>
                    <span className="text-[10px] text-indigo-600 font-semibold">
                      @ p.{lastCoveredTopic.currentPage}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_META[lastCoveredTopic.status].badgeClass}`}>
              {STATUS_META[lastCoveredTopic.status].label}
            </div>
          </div>
        </div>
      )}

      {/* Chapters List */}
      <div className="space-y-2 max-h-80 overflow-y-auto overflow-x-visible pr-1">
        {chapterStats.map(({ chapter, totalPages, completedPages, percent, isComplete, hasOngoing }) => {
          const isExpanded = !!expandedChapters[chapter.index];

          return (
            <div
              key={chapter.index}
              className={`border rounded-lg transition-all duration-200 ${
                isComplete ? 'bg-green-50/50 border-green-200' : 
                hasOngoing ? 'bg-indigo-50/30 border-indigo-200' : 
                'bg-white/50 border-neutral-200'
              }`}
            >
              {/* Chapter Header */}
              <button
                onClick={() => toggleChapter(chapter.index)}
                className="w-full flex items-center justify-between p-2.5 text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`
                    p-1 rounded transition-colors
                    ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-neutral-100 text-neutral-500'}
                  `}>
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className={`text-sm font-medium truncate ${isComplete ? 'text-green-700' : 'text-neutral-800'}`}>
                      {chapter.index}. {chapter.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1 w-20 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-indigo-500'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-neutral-500 font-medium">{percent}%</span>
                    </div>
                  </div>
                </div>

                <div className="text-right pl-2 flex items-center gap-2">
                  {isComplete && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {hasOngoing && !isComplete && <Clock className="w-4 h-4 text-indigo-500" />}
                  <span className={`text-xs font-medium ${isComplete ? 'text-green-600' : 'text-neutral-500'}`}>
                    {completedPages}/{totalPages}p
                  </span>
                </div>
              </button>

              {/* Topics List (Accordion Body) */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-visible border-t border-neutral-100"
                  >
                    <ul className="p-1.5 space-y-1.5 overflow-visible">
                      {(chapter.subTopics || []).map((topic) => {
                        const topicData = getTopicData(localProgress, chapter.index, topic.index);
                        const status = topicData.status;
                        const currentPage = topicData.currentPage;
                        const notes = topicData.notes;
                        const meta = STATUS_META[status];
                        const Icon = meta.icon;
                        const pageCount = Math.max(0, (topic.pageTo ?? 0) - (topic.pageFrom ?? 0) + 1);
                        const isEditingThis = editingPage?.chapterIndex === chapter.index && 
                                              editingPage?.topicIndex === topic.index;
                        const isEditingNotesThis = editingNotes?.chapterIndex === chapter.index &&
                                                    editingNotes?.topicIndex === topic.index;

                        return (
                          <li
                            key={topic.index}
                            className={`
                              border rounded-lg transition-colors overflow-visible
                              ${status === 'done' ? 'bg-green-50 border-green-100' : 
                                status === 'ongoing' ? 'bg-indigo-50 border-indigo-100' : 
                                'bg-neutral-50 border-neutral-100'}
                            `}
                          >
                            {/* Topic Row */}
                            <div className={`
                              group flex items-center justify-between text-xs px-2 py-1.5
                              ${editable ? 'cursor-pointer hover:border-indigo-300' : ''}
                            `}>
                            {/* Left: Icon + Title */}
                            <div 
                              className="flex items-center gap-2 min-w-0 flex-1"
                              onClick={(e) => handleTopicCycle(chapter.index, topic.index, e)}
                              title={editable ? "Click to cycle status" : undefined}
                            >
                              <div className={`transition-colors ${meta.iconClass}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className={`truncate block ${status === 'done' ? 'text-neutral-500' : 'text-neutral-700'}`}>
                                  {topic.title}
                                </span>
                                <span className="text-[10px] text-neutral-400">
                                  p.{topic.pageFrom}-{topic.pageTo} ({pageCount} pages)
                                </span>
                              </div>
                            </div>

                            {/* Right: Status Badge + Current Page Tracker */}
                            <div className="relative flex items-center gap-2 pl-2">
                              {/* Current Page Tracker (only for ongoing) */}
                              {status === 'ongoing' && editable && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isEditingThis) {
                                        setEditingPage(null);
                                      } else {
                                        setEditingPage({ 
                                          chapterIndex: chapter.index, 
                                          topicIndex: topic.index,
                                          buttonEl: e.currentTarget 
                                        });
                                      }
                                    }}
                                    className={`
                                      flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all
                                      ${currentPage 
                                        ? 'bg-indigo-500 text-white shadow-sm hover:bg-indigo-600' 
                                        : 'bg-indigo-100 text-indigo-700 border border-indigo-200 hover:bg-indigo-200'}
                                    `}
                                    title="Set current page"
                                  >
                                    <span className="text-[10px] font-semibold">
                                      {currentPage ? `p.${currentPage}` : 'Set page'}
                                    </span>
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                  
                                  <AnimatePresence>
                                    {isEditingThis && editingPage?.buttonEl && (
                                      <PageScrollPicker
                                        value={currentPage ?? topic.pageFrom}
                                        min={topic.pageFrom}
                                        max={topic.pageTo}
                                        onChange={(newPage) => handlePageChange(chapter.index, topic.index, newPage)}
                                        onClose={() => setEditingPage(null)}
                                        anchorEl={editingPage.buttonEl}
                                      />
                                    )}
                                  </AnimatePresence>
                                </>
                              )}

                              {/* Read-only current page display */}
                              {status === 'ongoing' && !editable && currentPage && (
                                <span className="text-[10px] font-semibold text-white px-2 py-1 rounded-lg bg-indigo-500">
                                  p.{currentPage}
                                </span>
                              )}

                              {/* Status Badge */}
                              <span className={`px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${meta.badgeClass}`}>
                                {meta.label}
                              </span>
                            </div>
                            </div>

                            {/* Notes Section */}
                            {editable && (
                              <div className="px-2 pb-1.5 pt-0">
                                {isEditingNotesThis ? (
                                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="text"
                                      placeholder="e.g., Students confused about quadratic formula..."
                                      defaultValue={notes || ''}
                                      onBlur={(e) => {
                                        handleNotesChange(chapter.index, topic.index, e.target.value || null);
                                        setEditingNotes(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleNotesChange(chapter.index, topic.index, e.target.value || null);
                                          setEditingNotes(null);
                                        } else if (e.key === 'Escape') {
                                          setEditingNotes(null);
                                        }
                                      }}
                                      autoFocus
                                      className="flex-1 text-[11px] px-2 py-1 border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                                    />
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingNotes({ chapterIndex: chapter.index, topicIndex: topic.index });
                                    }}
                                    className="w-full text-left text-[11px] px-2 py-1 rounded hover:bg-white/60 transition-colors"
                                  >
                                    {notes ? (
                                      <span className="text-neutral-600 italic">ðŸ“ {notes}</span>
                                    ) : (
                                      <span className="text-neutral-400">+ Add notes...</span>
                                    )}
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Read-only notes */}
                            {!editable && notes && (
                              <div className="px-2 pb-1.5 pt-0">
                                <p className="text-[11px] text-neutral-600 italic">ðŸ“ {notes}</p>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog for marking as Done */}
      <AnimatePresence>
        {confirmingDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]"
            onClick={() => setConfirmingDone(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl p-5 max-w-sm mx-4 border border-neutral-200"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-800 mb-1">Mark as Complete?</h3>
                  <p className="text-sm text-neutral-600">
                    Are you sure you want to mark this topic as done? This will move it to completed status.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmingDone(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    performStatusChange(confirmingDone.chapterIndex, confirmingDone.subIndex, 'done');
                    setConfirmingDone(null);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  Mark as Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
