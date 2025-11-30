import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, ChevronLeft, ChevronRight, Clock, 
  Play, MapPin, Users, BookOpen, Sparkles
} from 'lucide-react';
import { PageShell } from '../components/layout';
import { useTeacher } from '../context/TeacherContext';
import { teacherData, getSyllabusByRef, normalizeSectionProgress, loadStoredProgress, calculateTopicProgressPercent } from '../data/dummyData';

/**
 * SchedulePage - Beautiful schedule view for both mobile and desktop
 */
export default function SchedulePage() {
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const teacher = teacherCtx?.teacher || teacherData;
  const courses = teacher?.courses || [];
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Get week dates for selected date
  const getWeekDates = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      weekDates.push(`${y}-${m}-${dd}`);
    }
    return weekDates;
  };

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  // Get all classes organized by day
  const scheduleByDay = useMemo(() => {
    const schedule = {};
    dayNames.forEach(day => {
      schedule[day] = [];
    });

    courses.forEach(course => {
      const syllabus = getSyllabusByRef(course.syllabusRef);
      
      course.sections?.forEach(section => {
        const schedules = section.schedules || (section.schedule ? [section.schedule] : []);
        
        // Calculate progress for this section
        let progressPercent = 0;
        if (syllabus) {
          const baseProgress = normalizeSectionProgress(syllabus, section.progress);
          const storedProgress = loadStoredProgress(section.id, baseProgress);
          progressPercent = calculateTopicProgressPercent(syllabus, storedProgress);
        }
        
        schedules.forEach(scheduleStr => {
          const dayMatch = scheduleStr.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/);
          const timeMatch = scheduleStr.match(/(\d{1,2}:\d{2})–(\d{1,2}:\d{2})/);
          
          if (dayMatch) {
            const day = dayMatch[1];
            const startTime = timeMatch ? timeMatch[1] : 'TBD';
            const endTime = timeMatch ? timeMatch[2] : 'TBD';
            
            // Color based on subject
            const subjectColors = {
              geo: { bg: 'bg-green-50', border: 'border-green-200', accent: 'bg-green-500', text: 'text-green-700', light: 'text-green-500' },
              hist: { bg: 'bg-yellow-50', border: 'border-yellow-200', accent: 'bg-yellow-500', text: 'text-yellow-700', light: 'text-yellow-500' },
              default: { bg: 'bg-indigo-50', border: 'border-indigo-200', accent: 'bg-indigo-500', text: 'text-indigo-700', light: 'text-indigo-500' },
            };
            
            const colorKey = course.id.includes('geo') ? 'geo' : course.id.includes('hist') ? 'hist' : 'default';
            const colors = subjectColors[colorKey];
            
            schedule[day].push({
              id: `${course.id}-${section.id}-${scheduleStr}`,
              courseId: course.id,
              sectionId: section.id,
              courseName: course.title,
              section: section.id,
              startTime,
              endTime,
              room: section.room || 'Room TBD',
              progress: progressPercent,
              ...colors,
            });
          }
        });
      });
    });

    // Sort each day by start time
    Object.keys(schedule).forEach(day => {
      schedule[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return schedule;
  }, [courses]);

  // Get classes for selected date
  const getClassesForDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayName = dayNames[date.getDay()];
    return scheduleByDay[dayName] || [];
  };

  // Navigation
  const changeWeek = (delta) => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + delta * 7);
    const newYear = d.getFullYear();
    const newMonth = String(d.getMonth() + 1).padStart(2, '0');
    const newDay = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${newYear}-${newMonth}-${newDay}`);
  };

  const goToToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const isToday = (dateStr) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dateStr === todayStr;
  };

  const formatWeekRange = () => {
    const [startYear, startMonth, startDay] = weekDates[0].split('-').map(Number);
    const [endYear, endMonth, endDay] = weekDates[6].split('-').map(Number);
    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);
    const startMonthName = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonthName = end.toLocaleDateString('en-US', { month: 'short' });
    
    if (startMonthName === endMonthName) {
      return `${start.getDate()} - ${end.getDate()} ${startMonthName}, ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${startMonthName} - ${end.getDate()} ${endMonthName}`;
  };

  const selectedClasses = getClassesForDate(selectedDate);
  const totalWeeklyClasses = Object.values(scheduleByDay).flat().length;

  return (
    <PageShell width="6xl">
      {/* Header - Simplified on mobile */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-black-800 mb-1">Schedule</h1>
          <p className="text-black-500 text-sm lg:text-base hidden lg:block">{totalWeeklyClasses} classes this week across {courses.length} courses</p>
        </div>
        
        {/* Week Navigation - Compact on mobile */}
        <div className="flex items-center gap-2 lg:gap-3">
          <button 
            onClick={() => changeWeek(-1)} 
            className="p-2 lg:p-2.5 rounded-xl bg-white border border-black-200 hover:bg-black-50 hover:border-black-300 transition-all shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5 text-black-600" />
          </button>
          <div className="px-3 lg:px-4 py-2 bg-white border border-black-200 rounded-xl shadow-sm min-w-[140px] lg:min-w-[180px] text-center">
            <span className="text-xs lg:text-sm font-semibold text-black-700">
              {formatWeekRange()}
            </span>
          </div>
          <button 
            onClick={() => changeWeek(1)} 
            className="p-2 lg:p-2.5 rounded-xl bg-white border border-black-200 hover:bg-black-50 hover:border-black-300 transition-all shadow-sm"
          >
            <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 text-black-600" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 lg:px-4 py-2 lg:py-2.5 text-xs lg:text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm"
          >
            Today
          </button>
        </div>
      </div>

      {/* Main Content - Two Column Layout on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Week Calendar - Left/Main Column */}
        <div className="lg:col-span-8 space-y-4 col-span-full lg:col-span-full">
          {/* Week Days Selector */}
          <div className="bg-white rounded-2xl border border-black-200 p-4 shadow-sm">
            <div className="grid grid-cols-7 gap-2">
              {weekDates.map((dateStr) => {
                const [year, month, day] = dateStr.split('-').map(Number);
                const date = new Date(year, month - 1, day);
                const isSelected = dateStr === selectedDate;
                const today = isToday(dateStr);
                const classes = getClassesForDate(dateStr);
                const dayIndex = date.getDay();
                
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`
                      flex flex-col items-center p-3 lg:p-4 rounded-2xl transition-all relative
                      ${isSelected 
                        ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200' 
                        : today 
                          ? 'bg-indigo-50 text-indigo-600 border-2 border-indigo-200 hover:border-indigo-300'
                          : 'bg-black-50 text-black-600 hover:bg-black-100 border border-transparent hover:border-black-200'
                      }
                    `}
                  >
                    <span className={`text-[10px] lg:text-xs font-semibold uppercase tracking-wide ${isSelected ? 'text-white/80' : ''}`}>
                      {dayNames[dayIndex]}
                    </span>
                    <span className="text-xl lg:text-2xl font-bold mt-1">{date.getDate()}</span>
                    {classes.length > 0 && (
                      <div className={`flex gap-0.5 mt-2 ${isSelected ? 'opacity-90' : ''}`}>
                        {classes.slice(0, 4).map((cls, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : cls.accent}`}
                          />
                        ))}
                        {classes.length > 4 && (
                          <span className={`text-[8px] ml-0.5 ${isSelected ? 'text-white/80' : 'text-black-400'}`}>+{classes.length - 4}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Classes */}
          <div className="bg-white rounded-2xl border border-black-200 p-5 shadow-sm">
            {/* Day Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-black-800">
                    {(() => {
                      const [year, month, day] = selectedDate.split('-').map(Number);
                      return new Date(year, month - 1, day).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      });
                    })()}
                  </h2>
                  <p className="text-sm text-black-500">
                    {selectedClasses.length} class{selectedClasses.length !== 1 ? 'es' : ''} scheduled
                  </p>
                </div>
              </div>
            </div>

            {/* Classes List */}
            {selectedClasses.length > 0 ? (
              <div className="space-y-2 lg:space-y-3">
                {selectedClasses.map((cls, index) => (
                  <motion.button
                    key={cls.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(`/course/${cls.courseId}/class/${cls.sectionId}`)}
                    className={`
                      w-full flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-xl lg:rounded-2xl 
                      ${cls.bg} border ${cls.border}
                      transition-all text-left group hover:shadow-lg active:scale-[0.99]
                    `}
                  >
                    {/* Time Column */}
                    <div className="flex flex-col items-center min-w-[50px] lg:min-w-[60px] text-center">
                      <span className={`text-base lg:text-lg font-bold ${cls.text}`}>{cls.startTime}</span>
                      <span className="text-[10px] text-black-400 my-0.5 hidden lg:block">to</span>
                      <span className="text-xs lg:text-sm text-black-500">{cls.endTime}</span>
                    </div>

                    {/* Accent bar */}
                    <div className={`w-1 self-stretch rounded-full ${cls.accent}`} />

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-black-800 text-base lg:text-lg truncate">
                        {cls.courseName?.replace('Grade ', '')}
                      </p>
                      <div className="flex items-center gap-2 lg:gap-3 mt-0.5 lg:mt-1 flex-wrap">
                        <span className="text-xs lg:text-sm text-black-500 flex items-center gap-1">
                          <Users className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                          {cls.section}
                        </span>
                        <span className="text-xs lg:text-sm text-black-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                          {cls.room}
                        </span>
                      </div>
                    </div>

                    {/* Arrow - Hidden on mobile for cleaner look */}
                    <div className={`hidden lg:block p-2 rounded-xl bg-white/80 group-hover:bg-white transition-colors`}>
                      <Play className={`w-5 h-5 ${cls.text}`} />
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="bg-black-50 border border-dashed border-black-200 rounded-2xl p-10 text-center">
                <div className="w-16 h-16 mx-auto bg-black-100 rounded-2xl flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-black-400" />
                </div>
                <p className="text-black-600 font-medium text-lg">No classes scheduled</p>
                <p className="text-sm text-black-400 mt-1">Enjoy your free day!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
