import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Sparkles, CheckCircle, Mic, FileText, Image as ImageIcon, ChevronRight, Brain } from 'lucide-react';

/**
 * Render simple markdown: bold, italic, code, and line breaks
 */
function renderMarkdown(text) {
  if (!text) return '';
  
  // Ensure text is a string
  const textStr = typeof text === 'string' ? text : String(text);
  
  return textStr
    // Code blocks (triple backticks)
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-xs overflow-x-auto my-2"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-neutral-100 dark:bg-neutral-700 px-1 py-0.5 rounded text-xs">$1</code>')
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
 * Collapsible thinking/reasoning block
 * Shows model's inner reasoning as expandable italics (low visual weight)
 */
function ThinkingBlock({ text }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!text || !text.trim()) return null;

  return (
    <div className="mb-1.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-neutral-500 transition-colors"
      >
        <ChevronRight className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        <Brain className="w-3 h-3" />
        <span>Thinking{isOpen ? '' : '...'}</span>
      </button>
      {isOpen && (
        <div className="mt-1 ml-4 pl-2 border-l-2 border-neutral-200">
          <p className="text-[11px] text-neutral-400 italic whitespace-pre-wrap leading-relaxed">
            {text}
          </p>
        </div>
      )}
    </div>
  );
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
          : 'bg-white text-neutral-700 border border-neutral-200 rounded-tl-sm shadow-sm'
        }
      `}>
        {isUser ? (
          <>
            {/* Attachment previews for user messages */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {message.attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-indigo-500/30 rounded-lg px-2 py-1 text-xs text-indigo-100">
                    {att.previewUrl || att.type?.startsWith('image/') ? (
                      att.previewUrl ? (
                        <img src={att.previewUrl} alt={att.name} className="w-12 h-12 rounded object-cover" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5" />
                      )
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    <span className="truncate max-w-[80px]">{att.name}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </>
        ) : (
          <>
            {/* Expandable thinking block for voice agent inner monologue */}
            {message.thinking && <ThinkingBlock text={message.thinking} />}
            
            {/* Main response content */}
            {message.content ? (
              <div 
                className="text-sm pred pred-sm pred-black max-w-none
                  [&_strong]:font-semibold [&_em]:italic
                  [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs
                  [&_pre]:bg-neutral-100 [&_pre]:p-2 [&_pre]:rounded [&_pre]:text-xs [&_pre]:overflow-x-auto
                  [&_li]:ml-4"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
              />
            ) : message.isStreaming && message.thinking ? (
              // While streaming, if we only have thinking so far, show a loading indicator
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-neutral-400">Responding...</span>
              </div>
            ) : null}
          </>
        )}
        <p className={`text-[10px] mt-1 ${isUser ? 'text-indigo-200' : 'text-neutral-400'}`}>
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
