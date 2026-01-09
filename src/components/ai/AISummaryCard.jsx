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
  Award
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  getCachedSuggestions,
  cacheSuggestions,
} from '../../utils/aiSuggestions';
import { generateDashboardInsights } from '../../services/aiService';

// Available icons for AI to choose from
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
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    titleColor: 'text-yellow-800',
    textColor: 'text-yellow-700',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    titleColor: 'text-green-800',
    textColor: 'text-green-700',
  },
  default: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    titleColor: 'text-slate-800',
    textColor: 'text-slate-700',
  },
};

export default function AISummaryCard({ className = "" }) {
  const [insights, setInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load insights on mount
  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = useCallback(async (isManual = false) => {
    const contextKey = 'dashboard_insights_card';
    
    // Check cache first (unless manual refresh)
    if (!isManual) {
      const cached = getCachedSuggestions(contextKey);
      if (cached && cached.data && cached.data.length > 0 && !cached.isExpired) {
        setInsights(cached.data);
        setLastUpdated(new Date(cached.timestamp));
        return;
      }
    }

    // Generate new insights using Gemini
    setIsLoading(true);
    try {
      const newInsights = await generateDashboardInsights();
      setInsights(newInsights);
      cacheSuggestions(contextKey, newInsights);
      setLastUpdated(new Date());

      if (isManual && newInsights.length > 0) {
        toast.success('Insights refreshed!');
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error('Failed to generate insights');
      setInsights([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRegenerate = () => {
    loadInsights(true);
  };

  return (
    <div className={`sc-card ${className}`.trim()}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-100">
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <h3 className="sc-heading text-base">AI Insights</h3>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={isLoading}
          className={`p-2 rounded-lg transition-all ${
            isLoading
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
          }`}
          title="Refresh insights"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      {isLoading && insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="p-4 rounded-full bg-indigo-50 mb-3">
            <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
          </div>
          <p className="text-sm font-medium text-slate-700">Analyzing your classes...</p>
          <p className="text-xs text-slate-500 mt-1">This may take a moment</p>
        </div>
      ) : insights.length > 0 ? (
        <div className="space-y-3">
          {insights.map((item, idx) => {
            const Icon = ICONS[item.icon] || BookOpen;
            const colors = COLOR_STYLES[item.color] || COLOR_STYLES.default;

            return (
              <div 
                key={idx} 
                className={`${colors.bg} ${colors.border} border-2 rounded-xl p-4 transition-all hover:shadow-md`}
              >
                <div className="flex gap-3">
                  <div className={`p-2 rounded-lg ${colors.iconBg} flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${colors.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${colors.titleColor}`}>{item.title}</p>
                    <p className={`text-sm leading-relaxed ${colors.textColor} mt-1`}>{item.detail}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="p-4 rounded-full bg-slate-100 mb-3">
            <Sparkles className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">No insights yet</p>
          <button 
            onClick={handleRegenerate}
            className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition-all"
          >
            Generate Insights
          </button>
        </div>
      )}

      {/* Footer - Last Updated */}
      {lastUpdated && insights.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs text-slate-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}