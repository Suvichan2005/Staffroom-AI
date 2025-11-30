import React from "react";
import { ProgressBar } from '../charts';
import { normalizeSectionProgress, loadStoredProgress, calculateTopicProgressPercent } from "../../data/dummyData";

export default function CourseCard({ course, syllabus, onSelectCourse, onSelectSection }) {
  return (
    <div className="sc-card hoverable p-3 flex flex-col gap-3" role="group" aria-label={course.title}>
      <button
        onClick={() => onSelectCourse?.(course.id)}
        className="relative overflow-hidden rounded-2xl w-full h-40 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        aria-label={`Open ${course.title}`}
      >
        <img
          src={course.imageUrl}
          alt={course.title + " image"}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <h3 className="text-white text-sm font-semibold tracking-wide drop-shadow-lg" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{course.title}</h3>
        </div>
      </button>
      <div className="grid grid-cols-2 gap-2 mt-auto">
        {course.sections.map((sec) => {
          const baseProgress = normalizeSectionProgress(syllabus, sec.progress);
          const effective = normalizeSectionProgress(syllabus, loadStoredProgress(sec.id, baseProgress));
          const pct = calculateTopicProgressPercent(syllabus, effective);
          return (
            <button
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              className="flex flex-col gap-1 items-center rounded-xl border border-black-200 bg-black-50 hover:bg-indigo-50 py-2 px-2 text-xs font-medium text-black-700"
            >
              <span>{sec.id}</span>
              <ProgressBar value={pct} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
