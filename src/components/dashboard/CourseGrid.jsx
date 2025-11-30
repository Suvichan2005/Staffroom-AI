import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { ProgressBar } from '../charts';
import { normalizeSectionProgress, loadStoredProgress, calculateTopicProgressPercent } from '../../data/dummyData';

/**
 * CourseGrid - Grid display of course cards
 * Uses real data from dummyData.js via props
 */
export default function CourseGrid({ courses = [], syllabusMap = {}, onCourseClick, onSectionClick }) {
  const navigate = useNavigate();

  const handleCourseClick = (courseId) => {
    if (onCourseClick) {
      onCourseClick(courseId);
    } else {
      navigate(`/course/${courseId}`);
    }
  };

  const handleSectionClick = (courseId, sectionId, e) => {
    e.stopPropagation();
    if (onSectionClick) {
      onSectionClick(courseId, sectionId);
    } else {
      navigate(`/course/${courseId}/class/${sectionId}`);
    }
  };

  if (!courses.length) {
    return (
      <div className="bg-white rounded-3xl border border-black-200 p-6 text-center">
        <p className="text-black-500">No courses assigned.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {courses.map((course, index) => {
        const syllabus = syllabusMap[course.syllabusRef];
        
        return (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-3xl border border-black-200 overflow-hidden hover:shadow-lg transition-shadow group h-full min-h-[160px]"
          >
            {/* Course Header/Image */}
            <button
              onClick={() => handleCourseClick(course.id)}
              className="relative w-full h-32 overflow-hidden rounded-t-3xl"
            >
              <img
                src={course.imageUrl}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="text-white font-semibold text-sm truncate drop-shadow-lg" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{course.title}</h3>
                <p className="text-white text-xs mt-0.5 drop-shadow-md" style={{ textShadow: '0 1px 3px rgba(0,0,0,1)' }}>
                  {course.sections?.length || 0} sections
                </p>
              </div>
              <ChevronRight className="absolute top-3 right-3 w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
            </button>

            {/* Sections */}
            <div className="p-4 space-y-2">
              {course.sections?.slice(0, 3).map((section) => {
                const baseProgress = normalizeSectionProgress(syllabus, section.progress);
                const effective = normalizeSectionProgress(syllabus, loadStoredProgress(section.id, baseProgress));
                const pct = calculateTopicProgressPercent(syllabus, effective);

                return (
                  <button
                    key={section.id}
                    onClick={(e) => handleSectionClick(course.id, section.id, e)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl bg-black-50 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all text-left"
                  >
                    <span className="text-xs font-semibold text-black-700 w-10">
                      {section.id}
                    </span>
                    <div className="flex-1">
                      <ProgressBar value={pct} />
                    </div>
                    <span className="text-xs font-medium text-black-500">
                      {pct}%
                    </span>
                  </button>
                );
              })}

              {course.sections?.length > 3 && (
                <button
                  onClick={() => handleCourseClick(course.id)}
                  className="w-full text-xs text-indigo-600 font-medium py-1 hover:underline"
                >
                  +{course.sections.length - 3} more sections
                </button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
