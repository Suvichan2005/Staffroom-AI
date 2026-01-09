import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Send, ChevronRight } from "lucide-react";

// Simple markdown renderer for inline formatting
const renderSimpleMarkdown = (text) => {
  if (!text) return text;
  
  // Ensure text is a string
  const textStr = typeof text === 'string' ? text : String(text);
  
  // Bold: **text**
  let result = textStr.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Code: `text`
  result = result.replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-neutral-100 rounded text-xs">$1</code>');
  return result;
};

const cannedResponses = {
  "show me today": "You have **Geography 6A** at 09:00 and **History 8B** at 10:00. Attendance is *pending* for 8B.",
  "which class needs attention": "Section **8A** is at *42% syllabus completion* and has two absentees this week.",
  "prepare revision": "Recommended: Revise **Chapter 3 - Climate and Weather** with a 10 minute recap quiz.",
};

const suggestions = [
  "What does my day look like?",
  "Which class needs attention?",
  "Prepare revision tips",
];

const getResponse = (message) => {
  const key = Object.keys(cannedResponses).find((phrase) =>
    message.toLowerCase().includes(phrase)
  );
  if (key) return cannedResponses[key];
  return "Here's a quick summary: overall syllabus at **62%**, attendance steady at *94%*. Let me know if you'd like a drill-down.";
};

export default function GlobalAssistant({ placeholder = "Ask anything about your classes", onSubmit }) {
  const inputRef = useRef(null);
  const [messages, setMessages] = useState([
    { id: "welcome", role: "assistant", text: "Hi! I'm your **AI assistant**. Try asking for today's classes or areas that need attention." },
  ]);

  const handleSubmit = (value) => {
    const text = value ?? inputRef.current?.value ?? "";
    if (!text.trim()) return;
    onSubmit?.(text);
    const response = getResponse(text);
    setMessages((prev) => [
      ...prev,
      { id: `user-${prev.length}`, role: "user", text },
      { id: `assistant-${prev.length}`, role: "assistant", text: response },
    ]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleSuggestion = (suggestion) => {
    handleSubmit(suggestion);
  };

  const latestMessages = useMemo(() => messages.slice(-6), [messages]);

  return (
    <div className="sc-card space-y-3" role="search" aria-label="Ask assistant">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <p className="text-sm font-semibold text-neutral-700">AI Companion</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => handleSuggestion(suggestion)}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors flex items-center gap-1"
          >
            <ChevronRight className="w-3 h-3" />
            {suggestion}
          </button>
        ))}
      </div>
      <div className="bg-gradient-to-b from-neutral-50 to-white border border-neutral-200 rounded-2xl max-h-52 overflow-y-auto p-3 space-y-2 text-sm">
        {latestMessages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`max-w-[85%] px-3 py-2 rounded-2xl ${
              message.role === "assistant"
                ? "bg-white text-neutral-700 border border-neutral-100 shadow-sm rounded-bl-sm"
                : "ml-auto bg-indigo-600 text-white rounded-br-sm"
            }`}
          >
            {message.role === "assistant" ? (
              <span dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(message.text) }} />
            ) : (
              message.text
            )}
          </motion.div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 placeholder-neutral-400 text-neutral-800 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          placeholder={placeholder}
          aria-label={placeholder}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSubmit();
          }}
        />
        <button
          type="button"
          className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transition-all hover:shadow-lg hover:shadow-indigo-200"
          onClick={() => handleSubmit()}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
