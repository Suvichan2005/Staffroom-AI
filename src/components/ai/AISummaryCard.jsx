import React, { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, 
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
  shouldRegenerateSuggestions,
  markRegeneration,
  formatTimeRemaining,
} from '../../utils/aiSuggestions';
import { generateAIInsights } from '../../services/aiService';

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

export default function AISummaryCard({ className = "" }) {
  const [insights, setInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [canRegenerate, setCanRegenerate] = useState(true);
  const [timeUntilRegen, setTimeUntilRegen] = useState(0);

  // Load insights on mount
  useEffect(() => {
    loadInsights();
  }, []);

  // Timer for regenerate button cooldown
  useEffect(() => {
    if (timeUntilRegen <= 0) {
      setCanRegenerate(true);
      return;
    }

    const interval = setInterval(() => {
      setTimeUntilRegen((prev) => {
        const next = prev - 1000;
        if (next <= 0) {
          setCanRegenerate(true);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeUntilRegen]);

  const loadInsights = useCallback((isManual = false) => {
    const contextKey = 'dashboard_insights';
    const decision = shouldRegenerateSuggestions(contextKey, isManual);

    // Rate limited
    if (isManual && decision.reason === 'rate_limited') {
      setCanRegenerate(false);
      setTimeUntilRegen(decision.timeUntilNextAllowed);
      toast.error(`Please wait ${formatTimeRemaining(decision.timeUntilNextAllowed)} before regenerating`);
      return;
    }

    // Use cache if valid
    if (!decision.shouldRegenerate && decision.cachedData) {
      setInsights(decision.cachedData);
      return;
    }

    // Generate new insights
    setIsLoading(true);
    try {
      const newInsights = generateAIInsights();
      setInsights(newInsights);
      cacheSuggestions(contextKey, newInsights);

      if (isManual) {
        markRegeneration(contextKey);
        setCanRegenerate(false);
        setTimeUntilRegen(5 * 60 * 1000);
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
      <div className="flex items-center justify-between mb-3">
        <h3 className="sc-heading text-base">AI Insights</h3>
        <button
          onClick={handleRegenerate}
          disabled={isLoading || (!canRegenerate && timeUntilRegen > 0)}
          className={`p-1.5 rounded-lg transition-all ${
            isLoading || (!canRegenerate && timeUntilRegen > 0)
              ? 'bg-black-100 text-black-400 cursor-not-allowed'
              : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
          }`}
          title={
            !canRegenerate && timeUntilRegen > 0
              ? `Wait ${formatTimeRemaining(timeUntilRegen)}`
              : 'Regenerate insights'
          }
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading && insights.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
        </div>
      ) : insights.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {insights.map((item, idx) => {
            const Icon = ICONS[item.icon] || BookOpen;
            const colorClasses = {
              red: 'bg-red-50 border-red-200 text-red-700',
              yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
              green: 'bg-green-50 border-green-200 text-green-700',
            }[item.color] || 'bg-white/60 border-black-200 text-black-700';

            return (
              <li key={idx} className={`border rounded-lg p-2.5 ${colorClasses}`}>
                <div className="flex items-start gap-2">
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs leading-relaxed opacity-90 mt-0.5">{item.detail}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-black-500">No insights yet</p>
        </div>
      )}

      {!canRegenerate && timeUntilRegen > 0 && (
        <p className="text-xs text-yellow-600 mt-2">
          Next refresh in {formatTimeRemaining(timeUntilRegen)}
        </p>
      )}
    </div>
  );
}