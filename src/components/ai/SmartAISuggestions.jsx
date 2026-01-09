import React, { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, 
  Sparkles,
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  BookOpen, 
  Users, 
  CheckCircle,
  Clock,
  Target,
  Award,
  ChevronDown,
  ChevronUp,
  X,
  Table2
} from 'lucide-react';
import {
  getCachedSuggestions,
  cacheSuggestions,
} from '../../utils/aiSuggestions';
import { toast } from 'react-hot-toast';

// Icon mapping for AI-selected icons
const ICONS = {
  alert: AlertTriangle,
  trending: TrendingUp,
  calendar: Calendar,
  book: BookOpen,
  users: Users,
  check: CheckCircle,
  clock: Clock,
  target: Target,
  award: Award,
};

// Color styles for each priority
const COLOR_STYLES = {
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    titleColor: 'text-red-800',
    textColor: 'text-red-700',
    purpleBg: 'bg-red-500/20',
    purpleBorder: 'border-red-400/40',
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    titleColor: 'text-yellow-800',
    textColor: 'text-yellow-700',
    purpleBg: 'bg-yellow-500/20',
    purpleBorder: 'border-yellow-400/40',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    titleColor: 'text-green-800',
    textColor: 'text-green-700',
    purpleBg: 'bg-green-500/20',
    purpleBorder: 'border-green-400/40',
  },
  default: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    titleColor: 'text-slate-800',
    textColor: 'text-slate-700',
    purpleBg: 'bg-white/10',
    purpleBorder: 'border-white/20',
  },
};

/**
 * Table Popup Component for showing detailed data
 */
function TablePopup({ title, data, columns, onClose }) {
  if (!data || data.length === 0) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="font-semibold text-black">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                {columns.map((col, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-slate-50">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-4 py-3 text-sm text-black">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Expandable Suggestion Card
 */
function SuggestionCard({ suggestion, isPurple, getCardStyle, getIconContainerStyle, getIconStyle, getTitleStyle, getDetailStyle }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTable, setShowTable] = useState(false);
  
  const isObject = typeof suggestion === 'object' && suggestion !== null;
  const suggTitle = isObject ? suggestion.title : null;
  const detail = isObject ? (suggestion.detail || suggestion.text) : suggestion;
  const summary = isObject ? suggestion.summary : null; // Short one-liner
  const color = isObject ? suggestion.color : 'default';
  const iconName = isObject ? suggestion.icon : 'book';
  const tableData = isObject ? suggestion.tableData : null;
  const tableColumns = isObject ? suggestion.tableColumns : null;
  const Icon = ICONS[iconName] || BookOpen;
  
  // Extract summary from detail if not provided (first sentence or 60 chars)
  const displaySummary = summary || (detail.length > 80 
    ? detail.split(/[.!?]/)[0].slice(0, 80) + '...'
    : detail);
  const hasMoreDetail = detail.length > 80 || tableData;
  
  // For purple variant, use transparent backgrounds with no visible borders
  const cardBg = isPurple 
    ? 'bg-white/10 border-transparent hover:bg-white/15' 
    : getCardStyle(color);
  
  return (
    <>
      <div 
        className={`p-3 rounded-xl border transition-all ${isPurple ? '' : 'hover:shadow-md'} cursor-pointer ${cardBg}`}
        onClick={() => hasMoreDetail && setIsExpanded(!isExpanded)}
      >
        <div className="flex gap-3">
          <div className={`p-2 rounded-lg ${getIconContainerStyle(color)} flex-shrink-0 self-start`}>
            <Icon className={`w-4 h-4 ${getIconStyle(color)}`} />
          </div>
          <div className="flex-1 min-w-0">
            {suggTitle && (
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm ${getTitleStyle(color)}`}>
                  {suggTitle}
                </p>
                {hasMoreDetail && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {tableData && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowTable(true); }}
                        className={`p-1 rounded hover:bg-black/10 ${isPurple ? 'text-white/70' : 'text-slate-400'}`}
                        title="View details"
                      >
                        <Table2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isExpanded ? (
                      <ChevronUp className={`w-4 h-4 ${isPurple ? 'text-white/50' : 'text-slate-400'}`} />
                    ) : (
                      <ChevronDown className={`w-4 h-4 ${isPurple ? 'text-white/50' : 'text-slate-400'}`} />
                    )}
                  </div>
                )}
              </div>
            )}
            <p className={`text-sm leading-relaxed ${getDetailStyle(color)}`}>
              {isExpanded ? detail : displaySummary}
            </p>
          </div>
        </div>
      </div>
      
      {showTable && tableData && (
        <TablePopup
          title={suggTitle || 'Details'}
          data={tableData}
          columns={tableColumns || [
            { key: 'name', label: 'Name' },
            { key: 'value', label: 'Value' }
          ]}
          onClose={() => setShowTable(false)}
        />
      )}
    </>
  );
}

/**
 * SmartAISuggestions Component
 * Uses Gemini to generate contextual suggestions
 * Auto-caches suggestions for 1 hour per session
 * Expandable cards with table popups for detailed data
 */
export default function SmartAISuggestions({
  contextKey,
  generateSuggestions,  
  title = 'AI Suggestions',
  variant = 'default', // 'default' or 'purple'
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load or generate suggestions on mount
  useEffect(() => {
    loadSuggestions(false);
  }, [contextKey]);

  const loadSuggestions = useCallback(async (isManual = false) => {
    // Check cache first (unless manual refresh)
    if (!isManual) {
      const cached = getCachedSuggestions(contextKey);
      if (cached && cached.data && cached.data.length > 0 && !cached.isExpired) {
        setSuggestions(cached.data);
        setLastUpdated(new Date(cached.timestamp));
        return;
      }
    }

    // Generate new suggestions via Gemini
    setIsLoading(true);
    try {
      const newSuggestions = await generateSuggestions();
      const resolved = Array.isArray(newSuggestions) ? newSuggestions : [];
      setSuggestions(resolved);
      
      // Cache the result
      cacheSuggestions(contextKey, resolved);
      setLastUpdated(new Date());

      if (isManual && resolved.length > 0) {
        toast.success('Suggestions refreshed!');
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast.error('Failed to generate suggestions');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [contextKey, generateSuggestions]);

  const handleRegenerate = () => {
    loadSuggestions(true);
  };

  const isPurple = variant === 'purple';

  const getCardStyle = (color) => {
    const styles = COLOR_STYLES[color] || COLOR_STYLES.default;
    if (isPurple) {
      return `${styles.purpleBg} ${styles.purpleBorder}`;
    }
    return `${styles.bg} ${styles.border}`;
  };

  const getIconContainerStyle = (color) => {
    const styles = COLOR_STYLES[color] || COLOR_STYLES.default;
    if (isPurple) {
      return 'bg-white/20';
    }
    return styles.iconBg;
  };

  const getIconStyle = (color) => {
    const styles = COLOR_STYLES[color] || COLOR_STYLES.default;
    if (isPurple) {
      return 'text-white';
    }
    return styles.iconColor;
  };

  const getTitleStyle = (color) => {
    const styles = COLOR_STYLES[color] || COLOR_STYLES.default;
    if (isPurple) {
      return 'text-white font-semibold';
    }
    return `${styles.titleColor} font-semibold`;
  };

  const getDetailStyle = (color) => {
    const styles = COLOR_STYLES[color] || COLOR_STYLES.default;
    if (isPurple) {
      return 'text-white/90';
    }
    return styles.textColor;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isPurple ? 'bg-white/20' : 'bg-indigo-100'}`}>
            <Sparkles className={`w-4 h-4 ${isPurple ? 'text-white' : 'text-indigo-600'}`} />
          </div>
          <h3 className={`text-base font-semibold ${isPurple ? 'text-white' : 'text-black'}`}>
            {title}
          </h3>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={isLoading}
          className={`p-2 rounded-lg transition-all ${
            isPurple 
              ? 'text-white/80 hover:text-white bg-white/10 hover:bg-white/20'
              : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Refresh suggestions"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className={`p-3 rounded-full ${isPurple ? 'bg-white/10' : 'bg-indigo-50'} mb-2`}>
              <Sparkles className={`w-6 h-6 ${isPurple ? 'text-white' : 'text-indigo-600'} animate-pulse`} />
            </div>
            <p className={`text-sm ${isPurple ? 'text-white' : 'text-slate-700'}`}>
              Analyzing data...
            </p>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-2">
            {suggestions.map((suggestion, idx) => (
              <SuggestionCard
                key={idx}
                suggestion={suggestion}
                isPurple={isPurple}
                getCardStyle={getCardStyle}
                getIconContainerStyle={getIconContainerStyle}
                getIconStyle={getIconStyle}
                getTitleStyle={getTitleStyle}
                getDetailStyle={getDetailStyle}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <Sparkles className={`w-6 h-6 ${isPurple ? 'text-white/50' : 'text-slate-400'} mb-2`} />
            <button 
              onClick={handleRegenerate}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isPurple
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
              }`}
            >
              Generate Insights
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      {lastUpdated && suggestions.length > 0 && (
        <p className={`text-xs mt-2 ${isPurple ? 'text-white/40' : 'text-slate-400'}`}>
          Updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
