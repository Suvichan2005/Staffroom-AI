import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { getUpcomingSessions, teacherData } from "../../data/dummyData";
import { useTeacher } from "../../context/TeacherContext";

export default function UpcomingClasses({ daysAhead = 7, className = "", compact = false, showDateSelector = false }) {
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const teacher = teacherCtx?.teacher || teacherData;
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Initialize with today's date using a stable format
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  // Get sessions for the selected date or upcoming sessions
  const sessions = useMemo(() => {
    if (showDateSelector) {
      // Filter sessions for specific date
      return getUpcomingSessions(teacher, 30).filter(
        sess => sess.date === selectedDate
      ).slice(0, 12);
    }
    return getUpcomingSessions(teacher, daysAhead).slice(0, 12);
  }, [teacher, daysAhead, refreshKey, selectedDate, showDateSelector]);
  
  useEffect(() => {
    const id = setInterval(() => setRefreshKey((value) => value + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // Stable date navigation function - create new date from components to avoid timezone issues
  const goToPreviousDay = useCallback(() => {
    setSelectedDate(prev => {
      const [year, month, day] = prev.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      date.setDate(date.getDate() - 1);
      const newYear = date.getFullYear();
      const newMonth = String(date.getMonth() + 1).padStart(2, '0');
      const newDay = String(date.getDate()).padStart(2, '0');
      return `${newYear}-${newMonth}-${newDay}`;
    });
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate(prev => {
      const [year, month, day] = prev.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      date.setDate(date.getDate() + 1);
      const newYear = date.getFullYear();
      const newMonth = String(date.getMonth() + 1).padStart(2, '0');
      const newDay = String(date.getDate()).padStart(2, '0');
      return `${newYear}-${newMonth}-${newDay}`;
    });
  }, []);

  const formatSelectedDate = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    
    if (selectedDate === todayStr) return 'Today';
    if (selectedDate === tomorrowStr) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const isActiveNow = (sess) => {
    const now = new Date();
    const isToday = sess.date === now.toISOString().slice(0,10);
    if (!isToday) return false;
    const [sh, sm] = sess.startTime.split(':').map(Number);
    const [eh, em] = sess.endTime.split(':').map(Number);
    const start = new Date(now); start.setHours(sh, sm, 0, 0);
    const end = new Date(now); end.setHours(eh, em, 0, 0);
    const before = new Date(start.getTime() - 15 * 60000);
    const after = new Date(end.getTime() + 15 * 60000);
    return now >= before && now <= after;
  };

  return (
    <div className={`sc-card ${className}`.trim()} aria-label="Upcoming classes">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {!compact && (
            <div className="p-1.5 bg-indigo-100 rounded-lg">
              <Clock className="w-4 h-4 text-indigo-600" />
            </div>
          )}
          <h3 className="sc-heading text-base mb-0">
            {showDateSelector ? formatSelectedDate() + "'s Classes" : "Upcoming Classes"}
          </h3>
        </div>
        
        {showDateSelector && (
          <div className="flex items-center gap-1 relative z-10">
            <button 
              type="button"
              onClick={goToPreviousDay}
              className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer select-none"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                const val = e.target.value;
                if (val) setSelectedDate(val);
              }}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 w-[120px] cursor-pointer"
            />
            <button 
              type="button"
              onClick={goToNextDay}
              className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer select-none"
              aria-label="Next day"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        )}
      </div>
      
      <div className={`overflow-auto pr-1 space-y-2 ${compact ? 'max-h-60' : 'max-h-80'}`} role="list">
        {sessions.length ? (
          sessions.map((session, index) => {
            const active = isActiveNow(session);
            return (
              <div 
                key={`${session.courseId}-${session.classId}-${session.date}-${index}`} 
                className={`rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1 ${compact ? 'p-2' : 'p-3'}`}
                role="listitem"
              >
                <div className="flex items-center justify-between">
                  <p className={`font-medium truncate ${compact ? 'text-sm' : ''}`} title={session.subject}>
                    {session.subject} – {session.classId}
                  </p>
                  {!showDateSelector && (
                    <span className="text-xs text-slate-500">{session.date}</span>
                  )}
                </div>
                <p className={`text-slate-600 ${compact ? 'text-[11px]' : 'text-xs'}`}>
                  {session.startTime} – {session.endTime}
                </p>
                <div className="mt-1 flex justify-end">
                  <button
                    disabled={!active}
                    onClick={() => navigate(`/course/${session.courseId}/class/${session.classId}?take=1`)}
                    className={`rounded-lg font-medium ${
                      compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'
                    } ${
                      active
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-slate-200 text-slate-500 cursor-not-allowed"
                    }`}
                    aria-label={active ? "Open attendance sheet" : "Attendance available near class time"}
                  >
                    {active ? "Take Attendance" : "Not Active"}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="border border-dashed border-slate-300 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 text-center">
            No classes scheduled for this day.
          </div>
        )}
      </div>
    </div>
  );
}
