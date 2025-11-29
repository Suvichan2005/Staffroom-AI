import React, { useState } from 'react';
import { Send, Mic, Paperclip } from 'lucide-react';

/**
 * ChatInput - Input field for chat messages
 */
export default function ChatInput({ value, onChange, onSend, isLoading }) {
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSend(value);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-100">
      <div className={`
        flex items-center gap-2 p-2 rounded-xl border transition-all
        ${isFocused ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'}
      `}>
        <button
          type="button"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          disabled={isLoading}
          className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400 disabled:opacity-50"
        />

        <button
          type="button"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Mic className="w-4 h-4" />
        </button>

        <button
          type="submit"
          disabled={!value.trim() || isLoading}
          className={`
            p-2 rounded-lg transition-all
            ${value.trim() && !isLoading
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[10px] text-slate-400 text-center mt-2">
        Press Enter to send • Shift+Enter for new line
      </p>
    </form>
  );
}
