import React from "react";

export default function AttendanceTable({ grouped }) {
  const dates = Object.keys(grouped).sort((a,b)=> a<b?1:-1);
  if (!dates.length) return <div className="sc-card"><p className="sc-subtle">No attendance yet.</p></div>;
  return (
    <div className="sc-card">
      <h3 className="sc-heading text-base mb-3">Attendance</h3>
      <div className="space-y-4 max-h-64 overflow-auto pr-1">
        {dates.map(date => (
          <div key={date} className="border rounded-lg p-3 bg-slate-50">
            <p className="text-sm font-medium mb-1">{date}</p>
            <div className="flex flex-wrap gap-2">
              {grouped[date].map(rec => (
                <span key={rec.studentId} className={`px-2 py-1 rounded-full text-xs font-medium ${rec.status==='present' ? 'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>{rec.studentId.split('_').pop()} {rec.status==='present'? '✓':'✗'}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
