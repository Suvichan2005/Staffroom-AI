import React from "react";
import { notices } from "../../data/dummyData";

export default function NoticesPanel({ className = "" }) {
  return (
    <div className={`sc-card ${className}`.trim()} aria-label="Notices">
      <h3 className="sc-heading text-base mb-2">Notices</h3>
      <div className="space-y-3">
        {notices.map((n) => (
          <div key={n.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <p className="font-medium text-sm">{n.title}</p>
            <p className="text-xs text-slate-600 mt-1">{n.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
