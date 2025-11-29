import React from "react";

export default function ProgressBar({ value, className = "" }) {
  const pct = Math.min(100, Math.max(0, value || 0));
  return (
    <div className={`w-full h-4 rounded-full bg-slate-200 overflow-hidden ${className}`} aria-label={`Progress ${pct}%`}>
      <div
        className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 transition-all"
        style={{ width: pct + "%" }}
      />
    </div>
  );
}
