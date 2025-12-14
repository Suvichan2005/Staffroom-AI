import React, { useState } from 'react';
import { useAI } from '../../context/AIContext';
import { Clock, Trash2, Edit2, Check, X, ChevronDown, ChevronRight } from 'lucide-react';

/**
 * ChatHistory Component
 * Shows accordion of past chat sessions with ability to:
 * - Load old chats
 * - Delete chats
 * - Rename chats
 */
export default function ChatHistory() {
  const {
    chatHistory,
    currentSessionId,
    loadChatSession,
    deleteChatSessionById,
    renameChatSession,
    startNewChatSession,
  } = useAI();

  const [expandedSessions, setExpandedSessions] = useState(new Set());
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const toggleSession = (sessionId) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const startEdit = (sessionId, currentTitle) => {
    setEditingSessionId(sessionId);
    setEditTitle(currentTitle);
  };

  const saveEdit = (sessionId) => {
    if (editTitle.trim()) {
      renameChatSession(sessionId, editTitle.trim());
    }
    setEditingSessionId(null);
    setEditTitle('');
  };

  const cancelEdit = () => {
    setEditingSessionId(null);
    setEditTitle('');
  };

  const handleDelete = (sessionId) => {
    if (confirm('Delete this chat? This cannot be undone.')) {
      deleteChatSessionById(sessionId);
    }
  };

  const handleLoadSession = (sessionId) => {
    loadChatSession(sessionId);
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!chatHistory || chatHistory.length === 0) {
    return (
      <div className="chat-history-empty">
        <p className="text-gray-500 dark:text-gray-400">No chat history yet. Start a conversation!</p>
      </div>
    );
  }

  return (
    <div className="chat-history">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Chat History</h3>
        <button
          onClick={startNewChatSession}
          className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          New Chat
        </button>
      </div>

      <div className="space-y-2">
        {chatHistory.map((session) => {
          const isExpanded = expandedSessions.has(session.id);
          const isActive = session.id === currentSessionId;
          const isEditing = editingSessionId === session.id;

          return (
            <div
              key={session.id}
              className={`border rounded-lg overflow-hidden transition-colors ${
                isActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              {/* Session Header */}
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      onClick={() => toggleSession(session.id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>

                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(session.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                        <button
                          onClick={() => saveEdit(session.id)}
                          className="p-1 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleLoadSession(session.id)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="font-medium text-gray-800 dark:text-white truncate text-sm">
                          {session.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          <Clock size={12} />
                          <span>{formatDate(session.updatedAt)}</span>
                          <span>•</span>
                          <span>{session.messages.length} messages</span>
                        </div>
                      </button>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <button
                        onClick={() => startEdit(session.id, session.title)}
                        className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Rename"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(session.id)}
                        className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Context info */}
                {session.context && (session.context.courseId || session.context.sectionId) && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Context: {session.context.courseId && `Course ${session.context.courseId}`}
                    {session.context.sectionId && ` - Section ${session.context.sectionId}`}
                  </div>
                )}
              </div>

              {/* Expanded Message Preview */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/30">
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {session.messages.slice(0, 5).map((msg, idx) => (
                      <div key={idx} className="text-sm">
                        <span className={`font-medium ${
                          msg.role === 'user' 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {msg.role === 'user' ? 'You' : 'Assistant'}:
                        </span>
                        <span className="ml-2 text-gray-700 dark:text-gray-300">
                          {msg.content?.substring(0, 100)}
                          {msg.content?.length > 100 && '...'}
                        </span>
                      </div>
                    ))}
                    {session.messages.length > 5 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        + {session.messages.length - 5} more messages
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
