import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, MapPin, ChevronRight } from 'lucide-react';

/**
 * UpcomingClassesNew - Shows upcoming classes from teacher schedule
 * Receives classes data from parent (derived from dummyData)
 */
export default function UpcomingClassesNew({ classes = [], onClassClick }) {
  const navigate = useNavigate();

  const handleClassClick = (cls) => {
    if (onClassClick) {
      onClassClick(cls);
    } else if (cls.courseId && cls.sectionId) {
      navigate(`/course/${cls.courseId}/class/${cls.sectionId}`);
    }
  };

  if (!classes.length) {
    return (
      <div className="bg-white rounded-3xl border border-black-200 p-4">
        <h3 className="text-sm font-semibold text-black-800 mb-3">Today's Classes</h3>
        <p className="text-sm text-black-500">No classes scheduled for today.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-black-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-black-800">Today's Classes</h3>
        <span className="text-xs text-black-500">{classes.length} classes</span>
      </div>

      <div className="space-y-2">
        {classes.slice(0, 4).map((cls, index) => (
          <motion.button
            key={cls.id || index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleClassClick(cls)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-black-50 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all group text-left"
          >
            {/* Time indicator */}
            <div className={`
              w-1 h-10 rounded-full
              ${cls.isNow ? 'bg-green-500' : cls.isPast ? 'bg-black-300' : 'bg-indigo-500'}
            `} />

            {/* Class info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-black-800 truncate">
                {cls.title || cls.courseName}
              </p>
              <div className="flex items-center gap-2 text-xs text-black-500 mt-0.5">
                <Clock className="w-3 h-3" />
                <span>{cls.time || cls.schedule}</span>
                {cls.room && (
                  <>
                    <MapPin className="w-3 h-3 ml-1" />
                    <span>{cls.room}</span>
                  </>
                )}
              </div>
            </div>

            {/* Section badge */}
            <span className="px-2 py-1 text-xs font-medium bg-white rounded-lg border border-black-200 text-black-600">
              {cls.section || cls.sectionId}
            </span>

            <ChevronRight className="w-4 h-4 text-black-400 group-hover:text-indigo-600 transition-colors" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
