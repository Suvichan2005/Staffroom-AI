import React, { useState } from "react";
import { motion, useCycle } from "framer-motion";

export default function MicInput({ onSubmit }) {
  const [value, setValue] = useState("");
  const [isListening, cycleListening] = useCycle(false, true);

  const handleSend = () => {
    if (!value) return;
    onSubmit?.(value);
    setValue("");
  };

  return (
    <div className="flex flex-col gap-3 mt-4">
      <div className="flex gap-2 items-center">
        <button
          type="button"
          className={`relative h-11 w-11 rounded-full text-white shadow-inner transition ${
            isListening ? "bg-rose-500" : "bg-indigo-600"
          }`}
          title="Record (simulated)"
          onClick={() => cycleListening()}
        >
          <motion.span
            animate={isListening ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={isListening ? { repeat: Infinity, duration: 1.4 } : {}}
            className="absolute inset-0 rounded-full bg-indigo-500/40"
            aria-hidden="true"
          />
          <span className="relative z-10 text-lg">�️</span>
        </button>
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Speak or type a command..."
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm"
        />
        <button
          className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-300"
          onClick={handleSend}
        >
          Send
        </button>
      </div>
      <p className="text-xs text-slate-400">
        Voice capture is simulated. Tap the mic to toggle the animated listening state.
      </p>
    </div>
  );
}
