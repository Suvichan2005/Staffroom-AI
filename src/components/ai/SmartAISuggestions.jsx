import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Sparkles, ChevronRight } from 'lucide-react';
import {
  getCachedSuggestions,
  cacheSuggestions,
  shouldRegenerateSuggestions,
  markRegeneration,
  formatTimeRemaining,
} from '../../utils/aiSuggestions';
import { toast } from 'react-hot-toast';

/**
 * SmartAISuggestions Component
 * Auto-caches suggestions for 1 hour per session
 * Allows manual regeneration with rate limiting (5 min cooldown)
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
  const [canRegenerate, setCanRegenerate] = useState(true);
  const [timeUntilRegen, setTimeUntilRegen] = useState(0);

  // Load or generate suggestions on mount
  useEffect(() => {
    loadSuggestions(false);
  }, [contextKey]);

  // Update regeneration timer
  useEffect(() => {
    if (timeUntilRegen > 0) {
      const interval = setInterval(() => {
        setTimeUntilRegen(prev => {
          const newTime = Math.max(0, prev - 1000);
          if (newTime === 0) {
            setCanRegenerate(true);
          }
          return newTime;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [timeUntilRegen]);

  const loadSuggestions = useCallback((isManual = false) => {
    const decision = shouldRegenerateSuggestions(contextKey, isManual);

    // If rate limited
    if (isManual && decision.reason === 'rate_limited') {
      setCanRegenerate(false);
      setTimeUntilRegen(decision.timeUntilNextAllowed);
      toast.error(`Please wait ${formatTimeRemaining(decision.timeUntilNextAllowed)} before regenerating`);
      return;
    }

    // Use cached data if available and valid
    if (!decision.shouldRegenerate && decision.cachedData) {
      setSuggestions(decision.cachedData);
      const cached = getCachedSuggestions(contextKey);
      if (cached) {
        setLastUpdated(new Date(cached.timestamp));
      }
      return;
    }

    // Generate new suggestions
    setIsLoading(true);
    try {
      const newSuggestions = generateSuggestions();
      const resolved = Array.isArray(newSuggestions) ? newSuggestions : [];
      setSuggestions(resolved);
      
      // Cache the result
      cacheSuggestions(contextKey, resolved);
      setLastUpdated(new Date());

      // Mark regeneration if manual
      if (isManual) {
        markRegeneration(contextKey);
        setCanRegenerate(false);
        setTimeUntilRegen(5 * 60 * 1000); // 5 minutes
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
    if (!canRegenerate && timeUntilRegen > 0) {
      toast.error(`Please wait ${formatTimeRemaining(timeUntilRegen)} before regenerating`);
      return;
    }
    loadSuggestions(true);
  };

  const isPurple = variant === 'purple';
  const headerClass = isPurple ? 'text-white' : 'text-black-800';
  const buttonClass = isPurple 
    ? 'text-white/80 hover:text-white bg-white/10 hover:bg-white/20'
    : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100';
  const suggestionClass = isPurple
    ? 'flex items-start gap-2 p-3 bg-white/10 rounded-xl text-sm'
    : 'border border-black-200 rounded-lg p-2 bg-white/60 text-sm text-black-700';

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`sc-heading text-base font-semibold ${headerClass}`}>{title}</h3>
        <button
          onClick={handleRegenerate}
          disabled={isLoading || (!canRegenerate && timeUntilRegen > 0)}
          className={`p-1.5 rounded-lg transition-all ${buttonClass} disabled:opacity-50 disabled:cursor-not-allowed`}
          title={
            !canRegenerate && timeUntilRegen > 0
              ? `Wait ${formatTimeRemaining(timeUntilRegen)}`
              : 'Regenerate suggestions'
          }
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Suggestions List */}
      {isLoading && suggestions.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <RefreshCw className={`w-5 h-5 ${isPurple ? 'text-white' : 'text-indigo-600'} animate-spin`} />
        </div>
      ) : suggestions.length > 0 ? (
        <ul className="space-y-2">
          {suggestions.map((suggestion, idx) => (
            <li key={idx} className={suggestionClass}>
              {isPurple && <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              {typeof suggestion === 'string' ? suggestion : suggestion.text || suggestion}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-4">
          <p className={`text-sm ${isPurple ? 'text-white/70' : 'text-black-500'}`}>No suggestions yet</p>
        </div>
      )}

      {/* Rate limit warning */}
      {!canRegenerate && timeUntilRegen > 0 && (
        <p className={`text-xs mt-2 ${isPurple ? 'text-white/60' : 'text-yellow-600'}`}>
          Next refresh in {formatTimeRemaining(timeUntilRegen)}
        </p>
      )}
    </>
  );
}
