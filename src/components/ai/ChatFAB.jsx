import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Sparkles } from 'lucide-react';

/**
 * ChatFAB - Floating Action Button to open chat
 */
export default function ChatFAB({ onClick, hasUnread }) {
  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-24 right-4 z-40 lg:bottom-6 lg:right-6 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
    >
      <Sparkles className="w-6 h-6" />
      
      {hasUnread && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white" />
      )}
      
      {/* Pulse animation */}
      <span className="absolute inset-0 rounded-full bg-indigo-600 animate-ping opacity-25" />
    </motion.button>
  );
}
