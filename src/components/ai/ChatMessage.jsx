import React from 'react';
import { motion } from 'framer-motion';
import { User, Sparkles, CheckCircle, Mic } from 'lucide-react';

/**
 * Render simple markdown: bold, italic, code, and line breaks
 */
function renderMarkdown(text) {
  if (!text) return '';
  
  // Ensure text is a string
  const textStr = typeof text === 'string' ? text : String(text);
  
  return textStr
    // Code blocks (triple backticks)
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="bg-black-100 dark:bg-black-800 p-2 rounded text-xs overflow-x-auto my-2"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-black-100 dark:bg-black-700 px-1 py-0.5 rounded text-xs">$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
    // Bullet lists
    .replace(/^[\s]*[-•]\s+(.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Numbered lists
    .replace(/^[\s]*(\d+)\.\s+(.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    // Line breaks
    .replace(/\n/g, '<br />');
}

/**
 * ChatMessage - Individual chat message bubble
 * Supports: text messages, tool actions, live updates
 */
export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const isToolAction = message.type === 'tool-action';
  const isVoice = message.isVoice;

  // Tool action message (special formatting)
  if (isToolAction) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex gap-2 items-center px-2"
      >
        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
        <div className="text-xs text-green-700 bg-green-50 rounded px-3 py-1.5 flex-1">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
        ${isUser 
          ? isVoice 
            ? 'bg-red-500 text-white' 
            : 'bg-indigo-600 text-white' 
          : 'bg-gradient-to-br from-purple-500 to-indigo-500 text-white'
        }
      `}>
        {isUser ? (
          isVoice ? <Mic className="w-4 h-4" /> : <User className="w-4 h-4" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
      </div>

      {/* Message bubble */}
      <div className={`
        max-w-[75%] px-4 py-2.5 rounded-2xl
        ${isUser 
          ? 'bg-indigo-600 text-white rounded-tr-sm' 
          : 'bg-white text-black-700 border border-black-200 rounded-tl-sm shadow-sm'
        }
      `}>
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div 
            className="text-sm pred pred-sm pred-black max-w-none
              [&_strong]:font-semibold [&_em]:italic
              [&_code]:bg-black-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs
              [&_pre]:bg-black-100 [&_pre]:p-2 [&_pre]:rounded [&_pre]:text-xs [&_pre]:overflow-x-auto
              [&_li]:ml-4"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        )}
        <p className={`text-[10px] mt-1 ${isUser ? 'text-indigo-200' : 'text-black-400'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </motion.div>
  );
}

function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
