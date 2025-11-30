import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Users, UserCheck, UserX, Save, Search } from "lucide-react";

function useLocalDraft(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  const save = (next) => {
    setState(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  };
  return [state, save];
}

export default function AttendanceEditor({ classId, date, students, initialPresent = {}, onSave }) {
  const key = `attend:${classId}:${date}`;
  const init = useMemo(() => initialPresent, [classId, date]);
  const [present, setPresent] = useLocalDraft(key, init);
  const [searchQuery, setSearchQuery] = useState('');

  const toggle = (id) => setPresent(prev => ({ ...prev, [id]: !prev[id] }));
  const markAll = (value) => {
    setPresent(() => {
      const next = {};
      students.forEach((s) => (next[s.studentId] = value));
      return next;
    });
  };

  const handleSave = () => {
    onSave?.(present);
    try { localStorage.removeItem(key); } catch {}
  };

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s => s.name.toLowerCase().includes(q));
  }, [students, searchQuery]);

  // Stats
  const presentCount = Object.values(present).filter(Boolean).length;
  const absentCount = students.length - presentCount;

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-black-50 rounded-xl p-3 text-center">
          <Users className="w-5 h-5 mx-auto mb-1 text-black-500" />
          <p className="text-xl font-bold text-black-800">{students.length}</p>
          <p className="text-xs text-black-500">Total</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <UserCheck className="w-5 h-5 mx-auto mb-1 text-green-600" />
          <p className="text-xl font-bold text-green-700">{presentCount}</p>
          <p className="text-xs text-black-500">Present</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <UserX className="w-5 h-5 mx-auto mb-1 text-red-600" />
          <p className="text-xl font-bold text-red-700">{absentCount}</p>
          <p className="text-xs text-black-500">Absent</p>
        </div>
      </div>

      {/* Quick Actions & Search */}
      <div className="flex flex-wrap items-center gap-3">
        <button 
          onClick={() => markAll(true)} 
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
        >
          <UserCheck className="w-4 h-4" />
          All Present
        </button>
        <button 
          onClick={() => markAll(false)} 
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
        >
          <UserX className="w-4 h-4" />
          All Absent
        </button>
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black-50 border border-black-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      {/* Student List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {filteredStudents.map((s, i) => {
          const isPresent = !!present[s.studentId];
          return (
            <motion.div
              key={s.studentId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => toggle(s.studentId)}
              className={`
                flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                ${isPresent 
                  ? 'bg-green-50 border-green-200 hover:border-green-300' 
                  : 'bg-red-50 border-red-200 hover:border-red-300'
                }
              `}
            >
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                ${isPresent ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}
              `}>
                {s.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-black-800">{s.name}</p>
                <p className="text-xs text-black-500">Roll #{i + 1}</p>
              </div>
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center transition-all
                ${isPresent 
                  ? 'bg-green-500 text-white' 
                  : 'bg-red-500 text-white'
                }
              `}>
                {isPresent ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-2 border-t border-black-100">
        <p className="text-sm text-black-500">
          <span className="font-medium text-green-600">{presentCount}</span> present, 
          <span className="font-medium text-red-600 ml-1">{absentCount}</span> absent
        </p>
        <button 
          onClick={handleSave} 
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-lg shadow-indigo-200"
        >
          <Save className="w-4 h-4" />
          Save Attendance
        </button>
      </div>
    </div>
  );
}
