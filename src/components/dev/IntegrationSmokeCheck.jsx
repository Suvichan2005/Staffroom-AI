/**
 * Integration Smoke Check Component
 * 
 * This component runs runtime checks to verify that all integrations
 * are properly wired. Use in development to catch issues early.
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

// Integration checks
const integrationChecks = [
  {
    name: 'Plugin System',
    check: async () => {
      const { registerChatPlugin, getChatPlugins, createPluginAPI, initializeAllPlugins } = await import('../../plugins');
      return (
        typeof registerChatPlugin === 'function' &&
        typeof getChatPlugins === 'function' &&
        typeof createPluginAPI === 'function' &&
        typeof initializeAllPlugins === 'function'
      );
    },
  },
  {
    name: 'VoiceProgressLogger Plugin',
    check: async () => {
      const { voiceProgressLoggerPlugin } = await import('../../plugins');
      return (
        voiceProgressLoggerPlugin &&
        voiceProgressLoggerPlugin.id === 'voice-progress-logger' &&
        typeof voiceProgressLoggerPlugin.renderExpandedPanel === 'function'
      );
    },
  },
  {
    name: 'SyllabusAIHelper Plugin',
    check: async () => {
      const { syllabusAIHelperPlugin } = await import('../../plugins');
      return (
        syllabusAIHelperPlugin &&
        syllabusAIHelperPlugin.id === 'syllabus-ai-helper' &&
        typeof syllabusAIHelperPlugin.renderExpandedPanel === 'function'
      );
    },
  },
  {
    name: 'AIContext Provider',
    check: async () => {
      const { AIProvider, useAI } = await import('../../context/AIContext');
      return typeof AIProvider === 'function' && typeof useAI === 'function';
    },
  },
  {
    name: 'PersistentChatBar (Mobile)',
    check: async () => {
      const module = await import('../ai/PersistentChatBar');
      return typeof module.default === 'function';
    },
  },
  {
    name: 'DesktopChatBar',
    check: async () => {
      const module = await import('../ai/DesktopChatBar');
      return typeof module.default === 'function';
    },
  },
  {
    name: 'Design System Components',
    check: async () => {
      const ds = await import('../design-system');
      return (
        ds.Button &&
        ds.Card &&
        ds.Modal &&
        ds.Toast &&
        ds.useToasts
      );
    },
  },
  {
    name: 'Teacher Components',
    check: async () => {
      const tc = await import('../teacher');
      return tc.AssignmentCard && tc.StudentCard;
    },
  },
  {
    name: 'Dashboard Components',
    check: async () => {
      const dc = await import('../dashboard');
      return dc.WeeklySchedule && dc.UpcomingClassesNew;
    },
  },
  {
    name: 'AI Service',
    check: async () => {
      const aiService = await import('../../services/aiService');
      return (
        typeof aiService.parseVoiceTranscript === 'function' &&
        typeof aiService.generateQuiz === 'function' &&
        typeof aiService.createAssignment === 'function'
      );
    },
  },
  {
    name: 'Voice Service',
    check: async () => {
      const voiceService = await import('../../services/voiceService');
      return (
        typeof voiceService.startRecording === 'function' ||
        typeof voiceService.transcribe === 'function' ||
        voiceService.default !== undefined
      );
    },
  },
];

export default function IntegrationSmokeCheck() {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    const runChecks = async () => {
      const checkResults = [];
      
      for (const integration of integrationChecks) {
        try {
          const passed = await integration.check();
          checkResults.push({
            name: integration.name,
            status: passed ? 'pass' : 'fail',
            error: passed ? null : 'Check returned false',
          });
        } catch (error) {
          checkResults.push({
            name: integration.name,
            status: 'error',
            error: error.message,
          });
        }
        setResults([...checkResults]);
      }
      
      setRunning(false);
    };

    runChecks();
  }, []);

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Integration Smoke Check</h3>
        {running ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Running checks...
          </div>
        ) : (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-emerald-600 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> {passCount} passed
            </span>
            {failCount > 0 && (
              <span className="text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> {failCount} failed
              </span>
            )}
            {errorCount > 0 && (
              <span className="text-red-600 flex items-center gap-1">
                <XCircle className="w-4 h-4" /> {errorCount} errors
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {results.map((result, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-3 rounded-lg ${
              result.status === 'pass'
                ? 'bg-emerald-50 border border-emerald-200'
                : result.status === 'fail'
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <span className="text-sm font-medium text-slate-700">{result.name}</span>
            <div className="flex items-center gap-2">
              {result.status === 'pass' && (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              )}
              {result.status === 'fail' && (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              {result.status === 'error' && (
                <>
                  <span className="text-xs text-red-600 max-w-[200px] truncate" title={result.error}>
                    {result.error}
                  </span>
                  <XCircle className="w-5 h-5 text-red-600" />
                </>
              )}
            </div>
          </div>
        ))}
        
        {/* Pending checks */}
        {running && integrationChecks.slice(results.length).map((check, index) => (
          <div
            key={`pending-${index}`}
            className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
          >
            <span className="text-sm font-medium text-slate-400">{check.name}</span>
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        ))}
      </div>

      {/* Summary */}
      {!running && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className={`text-sm font-medium ${
            failCount === 0 && errorCount === 0
              ? 'text-emerald-600'
              : 'text-amber-600'
          }`}>
            {failCount === 0 && errorCount === 0
              ? '✅ All integrations verified successfully!'
              : `⚠️ ${failCount + errorCount} integration(s) need attention`}
          </div>
        </div>
      )}
    </div>
  );
}
