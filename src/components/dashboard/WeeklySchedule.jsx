import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, ChevronRight, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUpcomingSessions, teacherData } from '../../data/dummyData';
import { useTeacher } from '../../context/TeacherContext';

/**
 * WeeklySchedule - Shows the teacher's schedule for the week
 * Displays classes organized by day with time slots
 */
export default function WeeklySchedule({ compact = false }) {
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const teacher = teacherCtx?.teacher || teacherData;

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const currentDayIndex = today.getDay();

  // Get upcoming sessions for the week
  const sessions = useMemo(() => getUpcomingSessions(teacher, 7), [teacher]);

  // Group sessions by day
  const sessionsByDay = useMemo(() => {
    const grouped = {};
    weekDays.forEach(day => { grouped[day] = []; });
    
    sessions.forEach(session => {
      const sessionDate = new Date(session.date);
      const dayName = weekDays[sessionDate.getDay()];
      grouped[dayName].push(session);
    });
    
    return grouped;
  }, [sessions]);

  // Get next 5 days starting from today
  const displayDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < (compact ? 5 : 7); i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        name: weekDays[date.getDay()],
        date: date.getDate(),
        fullDate: date.toISOString().slice(0, 10),
        isToday: i === 0,
      });
    }
    return days;
  }, []);

  const handleClassClick = (session) => {
    navigate(`/course/${session.courseId}/class/${session.classId}`);
  };

  const getSubjectColor = (subject) => {
    const lower = subject.toLowerCase();
    if (lower.includes('geo')) return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' };
    if (lower.includes('hist')) return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' };
    return { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' };
  };

  if (compact) {
    // Compact horizontal view for dashboard
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-xl">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-bold text-slate-800">This Week</h3>
          </div>
          <button className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-1">
            Full Schedule <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {displayDays.map((day, idx) => {
            const daySessions = sessions.filter(s => s.date === day.fullDate);
            const hasClasses = daySessions.length > 0;
            
            return (
              <motion.div
                key={day.fullDate}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`
                  flex-shrink-0 w-24 p-3 rounded-xl border text-center
                  ${day.isToday 
                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                    : hasClasses 
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-white border-slate-100 opacity-60'
                  }
                `}
              >
                <p className={`text-xs font-medium ${day.isToday ? 'text-indigo-200' : 'text-slate-500'}`}>
                  {day.name}
                </p>
                <p className={`text-lg font-bold ${day.isToday ? 'text-white' : 'text-slate-800'}`}>
                  {day.date}
                </p>
                <p className={`text-xs mt-1 ${day.isToday ? 'text-indigo-200' : 'text-slate-500'}`}>
                  {daySessions.length} {daySessions.length === 1 ? 'class' : 'classes'}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Today's Classes Quick View */}
        {sessions.filter(s => s.date === today.toISOString().slice(0, 10)).length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Today's Classes</p>
            <div className="space-y-2">
              {sessions
                .filter(s => s.date === today.toISOString().slice(0, 10))
                .slice(0, 3)
                .map((session, idx) => {
                  const colors = getSubjectColor(session.subject);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleClassClick(session)}
                      className={`
                        w-full flex items-center gap-3 p-2.5 rounded-xl border
                        ${colors.bg} ${colors.border} hover:shadow-sm transition-all text-left
                      `}
                    >
                      <div className={`px-2 py-1 rounded-lg bg-white/60 ${colors.text} text-xs font-bold`}>
                        {session.startTime}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${colors.text} truncate`}>
                          {session.subject}
                        </p>
                        <p className="text-xs text-slate-500">Section {session.classId}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full weekly view
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 rounded-xl">
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Weekly Schedule</h3>
            <p className="text-xs text-slate-500">Your teaching schedule for this week</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, idx) => {
          const isToday = idx === currentDayIndex;
          const daySessions = sessionsByDay[day] || [];
          
          return (
            <div
              key={day}
              className={`
                min-h-[140px] rounded-xl p-2 border
                ${isToday 
                  ? 'bg-indigo-50 border-indigo-200' 
                  : 'bg-slate-50/50 border-slate-100'
                }
              `}
            >
              <div className={`
                text-center pb-2 mb-2 border-b
                ${isToday ? 'border-indigo-200' : 'border-slate-200'}
              `}>
                <p className={`text-xs font-medium ${isToday ? 'text-indigo-600' : 'text-slate-500'}`}>
                  {day}
                </p>
                {isToday && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full">
                    TODAY
                  </span>
                )}
              </div>
              
              <div className="space-y-1.5">
                {daySessions.slice(0, 3).map((session, sIdx) => {
                  const colors = getSubjectColor(session.subject);
                  return (
                    <button
                      key={sIdx}
                      onClick={() => handleClassClick(session)}
                      className={`
                        w-full p-1.5 rounded-lg text-left
                        ${colors.bg} hover:opacity-80 transition-opacity
                      `}
                    >
                      <p className={`text-[10px] font-bold ${colors.text}`}>
                        {session.startTime}
                      </p>
                      <p className={`text-[10px] ${colors.text} truncate`}>
                        {session.classId}
                      </p>
                    </button>
                  );
                })}
                {daySessions.length > 3 && (
                  <p className="text-[10px] text-slate-400 text-center">
                    +{daySessions.length - 3} more
                  </p>
                )}
                {daySessions.length === 0 && (
                  <p className="text-[10px] text-slate-400 text-center py-4">
                    No classes
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
