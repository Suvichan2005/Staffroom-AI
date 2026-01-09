import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Download, Trash2, RefreshCcw, Cloud,
  ChevronDown, ChevronUp, Clock, User,
  AlertTriangle, Info, Bug, XCircle, Sparkles, MapPin, Mail
} from 'lucide-react';
import { 
  getFirestoreLogs,
  getFirestoreUniqueEmails,
  clearFirestoreLogs,
  LogLevel,
  LogCategory 
} from '../../services/activityLogger';

/**
 * Activity Logs Viewer (Admin Only)
 * Shows detailed logs of all user activity from Firestore (cross-device)
 * Filterable by user email
 */
export default function ActivityLogsViewer() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState('all');
  const [expandedLog, setExpandedLog] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uniqueEmails, setUniqueEmails] = useState([]);

  // Load logs from Firestore
  const loadLogs = async () => {
    setIsRefreshing(true);
    
    // Fetch from Firestore (cross-device)
    const allLogs = await getFirestoreLogs(500);
    const emails = await getFirestoreUniqueEmails();
    setUniqueEmails(emails);
    setLogs(allLogs);
    
    // Calculate stats
    const statsData = {
      total: allLogs.length,
      geminiCalls: {
        total: allLogs.filter(l => l.category === 'gemini').length
      },
      byCategory: {},
      byLevel: {}
    };
    allLogs.forEach(log => {
      statsData.byCategory[log.category] = (statsData.byCategory[log.category] || 0) + 1;
      statsData.byLevel[log.level] = (statsData.byLevel[log.level] || 0) + 1;
    });
    setStats(statsData);
    setTimeout(() => setIsRefreshing(false), 300);
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, []);

  // Filter logs
  const filteredLogs = useMemo(() => {
    let result = [...logs];
    
    if (selectedEmail !== 'all') {
      result = result.filter(l => l.userEmail === selectedEmail);
    }
    if (selectedLevel !== 'all') {
      result = result.filter(l => l.level === selectedLevel);
    }
    if (selectedCategory !== 'all') {
      result = result.filter(l => l.category === selectedCategory);
    }
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(l => 
        l.message.toLowerCase().includes(lower) ||
        JSON.stringify(l.data).toLowerCase().includes(lower) ||
        l.url?.toLowerCase().includes(lower) ||
        l.userEmail?.toLowerCase().includes(lower)
      );
    }
    
    return result;
  }, [logs, selectedEmail, selectedLevel, selectedCategory, searchQuery]);

  const handleClearLogs = async () => {
    if (window.confirm('Are you sure you want to clear all cloud activity logs? This cannot be undone.')) {
      await clearFirestoreLogs();
      loadLogs();
    }
  };

  const handleDownload = () => {
    // Export current filtered logs as JSON
    const content = JSON.stringify(filteredLogs, null, 2);
    const filename = `activity_logs_${new Date().toISOString().split('T')[0]}.json`;
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case LogLevel.ERROR: return <XCircle className="w-4 h-4 text-red-500" />;
      case LogLevel.WARN: return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case LogLevel.INFO: return <Info className="w-4 h-4 text-blue-500" />;
      default: return <Bug className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case LogCategory.AUTH: return 'bg-purple-100 text-purple-700';
      case LogCategory.GEMINI: return 'bg-indigo-100 text-indigo-700';
      case LogCategory.NAVIGATION: return 'bg-green-100 text-green-700';
      case LogCategory.AI: return 'bg-blue-100 text-blue-700';
      case LogCategory.ERROR: return 'bg-red-100 text-red-700';
      case LogCategory.ACTION: return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return date.toLocaleString();
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-neutral-100 bg-neutral-50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-indigo-600" />
            Activity Logs
            <span className="text-xs font-normal text-neutral-500">
              (Cloud - All Users)
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCcw className={`w-4 h-4 text-neutral-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              title="Export JSON"
            >
              <Download className="w-4 h-4 text-neutral-600" />
            </button>
            <button
              onClick={handleClearLogs}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              title="Clear all logs"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-5 gap-3 mb-3">
            <div className="bg-white rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-neutral-800">{stats.total}</p>
              <p className="text-xs text-neutral-500">Total Logs</p>
            </div>
            <div className="bg-white rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-indigo-600">{stats.geminiCalls.total}</p>
              <p className="text-xs text-neutral-500">Gemini Calls</p>
            </div>
            <div className="bg-white rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-purple-600">{stats.byCategory?.auth || 0}</p>
              <p className="text-xs text-neutral-500">Auth Events</p>
            </div>
            <div className="bg-white rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-red-600">{stats.byLevel?.error || 0}</p>
              <p className="text-xs text-neutral-500">Errors</p>
            </div>
            <div className="bg-white rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-green-600">{uniqueEmails.length}</p>
              <p className="text-xs text-neutral-500">Users</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Email filter - primary filter for admin */}
          <select
            value={selectedEmail}
            onChange={(e) => setSelectedEmail(e.target.value)}
            className="px-3 py-2 border border-indigo-300 rounded-lg text-sm bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 font-medium"
          >
            <option value="all">All Users ({uniqueEmails.length})</option>
            {uniqueEmails.map(email => (
              <option key={email} value={email}>{email}</option>
            ))}
          </select>
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="all">All Categories</option>
            <option value="auth">Auth</option>
            <option value="gemini">Gemini</option>
            <option value="navigation">Navigation</option>
            <option value="action">Actions</option>
            <option value="error">Errors</option>
          </select>
        </div>
      </div>

      {/* Logs List */}
      <div className="max-h-[500px] overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>No logs found</p>
            <p className="text-sm text-neutral-400">Activity will appear here as you use the app</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredLogs.slice(0, 100).map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-neutral-50 transition-colors"
              >
                <button
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  className="w-full p-3 text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getLevelIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getCategoryColor(log.category)}`}>
                          {log.category}
                        </span>
                        {log.userEmail && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {log.userEmail}
                          </span>
                        )}
                        <span className="text-sm font-medium text-neutral-700 truncate">
                          {log.message}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                        <span>{formatTimestamp(log.timestamp)}</span>
                        <span>–</span>
                        <span className="truncate">{log.url}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {expandedLog === log.id ? (
                        <ChevronUp className="w-4 h-4 text-neutral-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-400" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                <AnimatePresence>
                  {expandedLog === log.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-1">
                        {/* Device Info Summary */}
                        {log.data?.device && (
                          <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-blue-50 rounded px-2 py-1">
                              <span className="text-blue-600 font-medium">Browser:</span> {log.data.device.browser}
                            </div>
                            <div className="bg-green-50 rounded px-2 py-1">
                              <span className="text-green-600 font-medium">Device:</span> {log.data.device.isMobile ? 'Mobile' : 'Desktop'}
                            </div>
                            <div className="bg-purple-50 rounded px-2 py-1">
                              <span className="text-purple-600 font-medium">Viewport:</span> {log.data.device.viewport}
                            </div>
                            <div className="bg-amber-50 rounded px-2 py-1">
                              <span className="text-amber-600 font-medium">Timezone:</span> {log.data.device.timezone}
                            </div>
                          </div>
                        )}
                        <div className="bg-neutral-50 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                          <pre className="whitespace-pre-wrap text-neutral-600">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
                          <span>Session: {log.sessionId?.slice(-8)}</span>
                          <span>User ID: {log.userId?.slice(0, 8)}</span>
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredLogs.length > 100 && (
        <div className="p-3 border-t border-neutral-100 text-center text-sm text-neutral-500">
          Showing 100 of {filteredLogs.length} logs. Download full logs for complete history.
        </div>
      )}
    </div>
  );
}
