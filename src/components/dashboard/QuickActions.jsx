import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClipboardCheck,
  GraduationCap,
  FileEdit,
  Folder,
  Sparkles,
  CalendarDays,
} from 'lucide-react';
import { useTeacher } from '../../context/TeacherContext';
import { teacherData } from '../../data/dummyData';

/**
 * QuickActions - Grid of quick action buttons
 * Navigation callbacks use real routes
 */
export default function QuickActions() {
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const teacher = teacherCtx?.teacher || teacherData;

  // Find first active class for Take Attendance
  const getFirstActiveClass = () => {
    const now = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = dayNames[now.getDay()];
    const currentTime = now.getHours() * 60 + now.getMinutes();

    for (const course of teacher?.courses || []) {
      for (const section of course.sections || []) {
        const schedules = section.schedules || (section.schedule ? [section.schedule] : []);
        for (const schedule of schedules) {
          if (schedule.startsWith(today)) {
            const timeMatch = schedule.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
              const scheduleTime = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
              const diff = Math.abs(currentTime - scheduleTime);
              if (diff <= 15) {
                return { courseId: course.id, classId: section.id };
              }
            }
          }
        }
      }
    }
    // If no active class, return first class of the day
    for (const course of teacher?.courses || []) {
      for (const section of course.sections || []) {
        const schedules = section.schedules || (section.schedule ? [section.schedule] : []);
        if (schedules.some(s => s.startsWith(today))) {
          return { courseId: course.id, classId: section.id };
        }
      }
    }
    return null;
  };

  const handleTakeAttendance = () => {
    const activeClass = getFirstActiveClass();
    if (activeClass) {
      navigate(`/course/${activeClass.courseId}/class/${activeClass.classId}?take=1`);
    } else {
      navigate('/classes');
    }
  };

  const actions = [
    {
      label: 'Take Attendance',
      icon: ClipboardCheck,
      color: 'from-indigo-500 to-indigo-600',
      onClick: handleTakeAttendance,
    },
    {
      label: 'View Courses',
      icon: GraduationCap,
      color: 'from-purple-500 to-purple-600',
      onClick: () => navigate('/classes'),
    },
    {
      label: 'Assignments',
      icon: FileEdit,
      color: 'from-indigo-500 to-indigo-600',
      onClick: () => navigate('/assignments'),
    },
    {
      label: 'Resources',
      icon: Folder,
      color: 'from-purple-500 to-purple-600',
      onClick: () => navigate('/resources'),
    },
    {
      label: 'AI Assistant',
      icon: Sparkles,
      color: 'from-indigo-500 to-indigo-600',
      onClick: () => navigate('/chat'),
    },
    {
      label: 'Schedule',
      icon: CalendarDays,
      color: 'from-purple-500 to-purple-600',
      onClick: () => navigate('/schedule'),
    },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={action.onClick}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-3xl border border-black-200 hover:shadow-md hover:border-black-300 transition-all group h-full"
          >
            <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-black-600 text-center leading-tight">
              {action.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
