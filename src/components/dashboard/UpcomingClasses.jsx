import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Clock, CalendarDays, LayoutGrid } from "lucide-react";
import { getUpcomingSessions, teacherData } from "../../data/dummyData";
import { useTeacher } from "../../context/TeacherContext";

export default function UpcomingClasses({ daysAhead = 7, className = "", compact = false, showDateSelector = false, showDayNav = false }) {
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const teacher = teacherCtx?.teacher || teacherData;
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'
  const [dayOffset, setDayOffset] = useState(0); // 0 = today, 1 = tomorrow, -1 = yesterday
  
  // Calculate the current viewing date based on dayOffset
  const currentViewDate = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + dayOffset);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [dayOffset]);

  // Initialize with today's date using a stable format
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Get week dates for weekly view
  const weekDates = useMemo(() => {
    const dates = [];
    const base = new Date();
    base.setDate(base.getDate() + dayOffset);
    // Find Monday of current week
    const day = base.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(base);
    monday.setDate(base.getDate() + diff);
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push({
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: d.toDateString() === new Date().toDateString()
      });
    }
    return dates;
  }, [dayOffset]);
  
  // Get sessions for the selected date or upcoming sessions
  const sessions = useMemo(() => {
    if (showDayNav && viewMode === 'day') {
      // Filter sessions for specific date based on dayOffset
      return getUpcomingSessions(teacher, 30).filter(
        sess => sess.date === currentViewDate
      ).slice(0, 12);
    }
    if (showDayNav && viewMode === 'week') {
      // Get all sessions for the week
      const weekDateStrs = weekDates.map(d => d.date);
      return getUpcomingSessions(teacher, 30).filter(
        sess => weekDateStrs.includes(sess.date)
      ).slice(0, 20);
    }
    if (showDateSelector) {
      // Filter sessions for specific date
      return getUpcomingSessions(teacher, 30).filter(
        sess => sess.date === selectedDate
      ).slice(0, 12);
    }
    return getUpcomingSessions(teacher, daysAhead).slice(0, 12);
  }, [teacher, daysAhead, refreshKey, selectedDate, showDateSelector, showDayNav, viewMode, currentViewDate, weekDates]);
  
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

  const formatCurrentViewDate = () => {
    if (dayOffset === 0) return 'Today';
    if (dayOffset === 1) return 'Tomorrow';
    if (dayOffset === -1) return 'Yesterday';
    const [year, month, day] = currentViewDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const isActiveNow = (sess) => {
    const now = new Date();
    // Use local date format to avoid UTC timezone issues
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isToday = sess.date === todayLocal;
    if (!isToday) return false;
    const [sh, sm] = sess.startTime.split(':').map(Number);
    const [eh, em] = sess.endTime.split(':').map(Number);
    const start = new Date(now); start.setHours(sh, sm, 0, 0);
    const end = new Date(now); end.setHours(eh, em, 0, 0);
    const before = new Date(start.getTime() - 15 * 60000);
    const after = new Date(end.getTime() + 15 * 60000);
    return now >= before && now <= after;
  };

  // Determine the title based on props
  const title = useMemo(() => {
    if (showDayNav && viewMode === 'week') return "This Week's Classes";
    if (showDayNav) return `${formatCurrentViewDate()}'s Classes`;
    if (showDateSelector) return formatSelectedDate() + "'s Classes";
    if (daysAhead === 0) return "Today's Schedule";
    return "Upcoming Classes";
  }, [showDateSelector, daysAhead, showDayNav, viewMode, dayOffset, currentViewDate]);

  // Group sessions by date for weekly view
  const sessionsByDate = useMemo(() => {
    if (viewMode !== 'week') return {};
    const grouped = {};
    weekDates.forEach(d => {
      grouped[d.date] = sessions.filter(s => s.date === d.date);
    });
    return grouped;
  }, [sessions, viewMode, weekDates]);

  return (
    <div className={`sc-card ${className}`.trim()} aria-label="Upcoming classes">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {!compact && (
            <div className="p-1.5 bg-indigo-100 rounded-lg">
              <Clock className="w-4 h-4 text-indigo-600" />
            </div>
          )}
          <h3 className="sc-heading text-base mb-0">{title}</h3>
        </div>
        
        {/* Day Navigation with Week Toggle */}
        {showDayNav && (
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-black-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('day')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'day' ? 'bg-white shadow-sm' : 'hover:bg-black-200'}`}
                title="Day view"
              >
                <CalendarDays className="w-4 h-4 text-black-600" />
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'week' ? 'bg-white shadow-sm' : 'hover:bg-black-200'}`}
                title="Week view"
              >
                <LayoutGrid className="w-4 h-4 text-black-600" />
              </button>
            </div>
            
            {/* Day Navigation Arrows (only in day view) */}
            {viewMode === 'day' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setDayOffset(o => o - 1)}
                  className="p-1.5 rounded-lg hover:bg-black-100 active:bg-black-200 transition-colors"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="w-5 h-5 text-black-600" />
                </button>
                <button
                  onClick={() => setDayOffset(0)}
                  className="px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => setDayOffset(o => o + 1)}
                  className="p-1.5 rounded-lg hover:bg-black-100 active:bg-black-200 transition-colors"
                  aria-label="Next day"
                >
                  <ChevronRight className="w-5 h-5 text-black-600" />
                </button>
              </div>
            )}
            
            {/* Week Navigation (only in week view) */}
            {viewMode === 'week' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setDayOffset(o => o - 7)}
                  className="p-1.5 rounded-lg hover:bg-black-100 active:bg-black-200 transition-colors"
                  aria-label="Previous week"
                >
                  <ChevronLeft className="w-5 h-5 text-black-600" />
                </button>
                <button
                  onClick={() => setDayOffset(0)}
                  className="px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  This Week
                </button>
                <button
                  onClick={() => setDayOffset(o => o + 7)}
                  className="p-1.5 rounded-lg hover:bg-black-100 active:bg-black-200 transition-colors"
                  aria-label="Next week"
                >
                  <ChevronRight className="w-5 h-5 text-black-600" />
                </button>
              </div>
            )}
          </div>
        )}
        
        {showDateSelector && (
          <div className="flex items-center gap-1 relative z-10">
            <button 
              type="button"
              onClick={goToPreviousDay}
              className="p-2 rounded-lg hover:bg-black-100 active:bg-black-200 transition-colors cursor-pointer select-none"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-5 h-5 text-black-600" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                const val = e.target.value;
                if (val) setSelectedDate(val);
              }}
              className="text-xs bg-white border border-black-200 rounded-lg px-2 py-1.5 text-black-600 w-[120px] cursor-pointer"
            />
            <button 
              type="button"
              onClick={goToNextDay}
              className="p-2 rounded-lg hover:bg-black-100 active:bg-black-200 transition-colors cursor-pointer select-none"
              aria-label="Next day"
            >
              <ChevronRight className="w-5 h-5 text-black-600" />
            </button>
          </div>
        )}
      </div>
      
      {/* Weekly View Grid */}
      {showDayNav && viewMode === 'week' ? (
        <div className="grid grid-cols-7 gap-1 overflow-auto max-h-96">
          {weekDates.map((day) => (
            <div key={day.date} className="flex flex-col">
              <div className={`text-center py-2 rounded-t-lg ${day.isToday ? 'bg-indigo-600 text-white' : 'bg-black-100'}`}>
                <p className="text-[10px] font-medium">{day.dayName}</p>
                <p className="text-sm font-bold">{day.dayNum}</p>
              </div>
              <div className="flex-1 bg-black-50 rounded-b-lg p-1 min-h-[120px] space-y-1">
                {sessionsByDate[day.date]?.length > 0 ? (
                  sessionsByDate[day.date].map((session, idx) => (
                    <button
                      key={idx}
                      onClick={() => navigate(`/course/${session.courseId}/class/${session.classId}`)}
                      className="w-full text-left p-1.5 rounded-lg bg-white border border-black-200 hover:border-indigo-300 hover:shadow-sm transition-all"
                    >
                      <p className="text-[10px] font-medium text-black-800 truncate">{session.subject}</p>
                      <p className="text-[9px] text-black-500">{session.startTime}</p>
                    </button>
                  ))
                ) : (
                  <p className="text-[10px] text-black-400 text-center py-4">-</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Day View List */
        <div className={`overflow-auto pr-1 space-y-2 ${compact ? 'max-h-60' : 'max-h-80'}`} role="list">
          {sessions.length ? (
            sessions.map((session, index) => {
              const active = isActiveNow(session);
              return (
                <div 
                  key={`${session.courseId}-${session.classId}-${session.date}-${index}`} 
                  className={`rounded-xl bg-black-50 border border-black-200 flex flex-col gap-1 ${compact ? 'p-2' : 'p-3'}`}
                  role="listitem"
                >
                  <div className="flex items-center justify-between">
                    <p className={`font-medium truncate ${compact ? 'text-sm' : ''}`} title={session.subject}>
                      {session.subject} – {session.classId}
                    </p>
                    {!showDateSelector && !showDayNav && (
                      <span className="text-xs text-black-500">{session.date}</span>
                    )}
                  </div>
                  <p className={`text-black-600 ${compact ? 'text-[11px]' : 'text-xs'}`}>
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
                          : "bg-black-200 text-black-500 cursor-not-allowed"
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
            <div className="border border-dashed border-black-300 rounded-xl bg-black-50 p-4 text-sm text-black-500 text-center">
              {showDayNav ? 'No classes scheduled for this day.' : 'No classes scheduled.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
