import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Users, UserCheck, UserX, Save, Search, Mic, AlertCircle, CheckCircle2 } from "lucide-react";
import VoiceAttendanceLogger from "../ai/VoiceAttendanceLogger";

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

/**
 * AttendanceConfirmationModal - Shows summary before final save
 */
function AttendanceConfirmationModal({ 
  students, 
  present, 
  date, 
  onConfirm, 
  onCancel 
}) {
  const presentStudents = students.filter(s => present[s.studentId]);
  const absentStudents = students.filter(s => !present[s.studentId]);
  const attendancePercent = Math.round((presentStudents.length / students.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-100">
          <h3 className="text-lg font-bold text-neutral-800">Confirm Attendance</h3>
          <p className="text-sm text-neutral-500 mt-1">Review before submitting for {date}</p>
        </div>

        {/* Summary Stats */}
        <div className="p-5 bg-neutral-50">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white rounded-xl p-3">
              <p className="text-2xl font-bold text-neutral-800">{students.length}</p>
              <p className="text-xs text-neutral-500">Total</p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-2xl font-bold text-green-600">{presentStudents.length}</p>
              <p className="text-xs text-neutral-500">Present</p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-2xl font-bold text-red-600">{absentStudents.length}</p>
              <p className="text-xs text-neutral-500">Absent</p>
            </div>
          </div>
          
          {/* Attendance percentage bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-neutral-600">Attendance Rate</span>
              <span className="font-semibold text-neutral-800">{attendancePercent}%</span>
            </div>
            <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  attendancePercent >= 75 ? 'bg-green-500' : 
                  attendancePercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${attendancePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Absent Students List (if any) */}
        {absentStudents.length > 0 && (
          <div className="p-5 border-t border-neutral-100">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-medium text-neutral-700">
                {absentStudents.length} student{absentStudents.length > 1 ? 's' : ''} marked absent:
              </p>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {absentStudents.map((s, i) => (
                <div key={s.studentId} className="flex items-center gap-2 text-sm text-neutral-600 py-1">
                  <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-medium">
                    {i + 1}
                  </div>
                  <span>{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All present message */}
        {absentStudents.length === 0 && (
          <div className="p-5 border-t border-neutral-100">
            <div className="flex items-center gap-3 text-green-700 bg-green-50 rounded-xl p-3">
              <CheckCircle2 className="w-5 h-5" />
              <p className="text-sm font-medium">All students are present!</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-5 border-t border-neutral-100 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirm & Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AttendanceEditor({ classId, date, students, initialPresent = {}, onSave }) {
  const key = `attend:${classId}:${date}`;
  const init = useMemo(() => initialPresent, [classId, date]);
  const [present, setPresent] = useLocalDraft(key, init);
  const [searchQuery, setSearchQuery] = useState('');
  const [showVoice, setShowVoice] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const toggle = (id) => setPresent(prev => ({ ...prev, [id]: !prev[id] }));
  const markAll = (value) => {
    setPresent(() => {
      const next = {};
      students.forEach((s) => (next[s.studentId] = value));
      return next;
    });
  };

  const handleSaveClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    onSave?.(present);
    try { localStorage.removeItem(key); } catch {}
    setShowConfirmation(false);
  };

  const handleVoiceUpdate = (updates) => {
    setPresent(prev => ({ ...prev, ...updates }));
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
        <div className="bg-neutral-50 rounded-xl p-3 text-center">
          <Users className="w-5 h-5 mx-auto mb-1 text-neutral-500" />
          <p className="text-xl font-bold text-neutral-800">{students.length}</p>
          <p className="text-xs text-neutral-500">Total</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <UserCheck className="w-5 h-5 mx-auto mb-1 text-green-600" />
          <p className="text-xl font-bold text-green-700">{presentCount}</p>
          <p className="text-xs text-neutral-500">Present</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <UserX className="w-5 h-5 mx-auto mb-1 text-red-600" />
          <p className="text-xl font-bold text-red-700">{absentCount}</p>
          <p className="text-xs text-neutral-500">Absent</p>
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

        <button
          onClick={() => setShowVoice(!showVoice)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
            showVoice
              ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-200'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          <Mic className="w-4 h-4" />
          {showVoice ? 'Hide Voice' : 'Voice Mode'}
        </button>

        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      {/* Voice Logger Panel */}
      <AnimatePresence>
        {showVoice && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <VoiceAttendanceLogger
              classId={classId}
              students={students}
              onUpdate={handleVoiceUpdate}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student List - Scrollable */}
      <div className="space-y-2">
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
                <p className="font-medium text-neutral-800">{s.name}</p>
                <p className="text-xs text-neutral-500">Roll #{i + 1}</p>
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
      <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
        <p className="text-sm text-neutral-500">
          <span className="font-medium text-green-600">{presentCount}</span> present, 
          <span className="font-medium text-red-600 ml-1">{absentCount}</span> absent
        </p>
        <button 
          onClick={handleSaveClick} 
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-lg shadow-indigo-200"
        >
          <Save className="w-4 h-4" />
          Save Attendance
        </button>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <AttendanceConfirmationModal
            students={students}
            present={present}
            date={date}
            onConfirm={handleConfirm}
            onCancel={() => setShowConfirmation(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
