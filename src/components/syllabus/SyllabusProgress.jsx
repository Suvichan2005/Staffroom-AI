import React, { useState, useMemo, useEffect } from "react";
import { ProgressBar } from '../charts';

const STATUS_FLOW = ["not-started", "ongoing", "done"];
const STATUS_META = {
  "not-started": { label: "Not Started", class: "bg-black-200 text-black-700" },
  "ongoing": { label: "Ongoing", class: "bg-indigo-100 text-indigo-700" },
  "done": { label: "Done", class: "bg-green-100 text-green-700" },
};

const DEFAULT_STATUS = STATUS_FLOW[0];

const buildNormalizedProgress = (syllabus, rawProgress = {}) => {
  const normalized = {};
  (syllabus?.chapters || []).forEach((chapter) => {
    const chapterTopics = {};
    (chapter.subTopics || []).forEach((topic) => {
      const status = rawProgress?.[chapter.index]?.topics?.[topic.index] || DEFAULT_STATUS;
      chapterTopics[topic.index] = STATUS_FLOW.includes(status) ? status : DEFAULT_STATUS;
    });
    normalized[chapter.index] = { topics: chapterTopics };
  });
  return normalized;
};

const getTopicStatus = (map, chapterIndex, subIndex) =>
  map?.[chapterIndex]?.topics?.[subIndex] || DEFAULT_STATUS;

export default function SyllabusProgress({
  syllabus,
  progressMap = {},
  onChange,
  onSave,
  editable = false,
  statusMessage = "",
}) {
  const [localProgress, setLocalProgress] = useState(() => buildNormalizedProgress(syllabus, progressMap));
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!editable || !isDirty) {
      setLocalProgress(buildNormalizedProgress(syllabus, progressMap));
    }
  }, [syllabus, progressMap, editable, isDirty]);

  const chapterStats = useMemo(() => {
    return (syllabus?.chapters || []).map((chapter) => {
      const subTopics = chapter?.subTopics || [];
      const pages = subTopics.reduce(
        (sum, topic) => sum + Math.max(0, (topic.pageTo ?? 0) - (topic.pageFrom ?? 0) + 1),
        0
      );
      const completedPages = subTopics.reduce((sum, topic) => {
        const status = getTopicStatus(localProgress, chapter.index, topic.index);
        const topicPages = Math.max(0, (topic.pageTo ?? 0) - (topic.pageFrom ?? 0) + 1);
        return sum + (status === "done" ? topicPages : 0);
      }, 0);
      return {
        chapter,
        totalPages: pages,
        completedPages,
      };
    });
  }, [syllabus, localProgress]);

  const totalPages = chapterStats.reduce((sum, entry) => sum + entry.totalPages, 0);
  const donePages = chapterStats.reduce((sum, entry) => sum + entry.completedPages, 0);
  const overallPercent = totalPages ? Math.round((donePages / totalPages) * 100) : 0;

  const handleTopicCycle = (chapterIndex, subIndex) => {
    if (!editable) return;
    setLocalProgress((prev) => {
      const currentStatus = getTopicStatus(prev, chapterIndex, subIndex);
      const nextStatus = STATUS_FLOW[(STATUS_FLOW.indexOf(currentStatus) + 1) % STATUS_FLOW.length];
      const nextChapter = {
        ...(prev?.[chapterIndex] || {}),
        topics: {
          ...(prev?.[chapterIndex]?.topics || {}),
          [subIndex]: nextStatus,
        },
      };
      const next = {
        ...prev,
        [chapterIndex]: nextChapter,
      };
      // Schedule onChange call for after render completes
      setTimeout(() => onChange?.(buildNormalizedProgress(syllabus, next)), 0);
      setIsDirty(true);
      return next;
    });
  };

  const handleSave = () => {
    if (!editable || !onSave || !isDirty) return;
    const normalized = buildNormalizedProgress(syllabus, localProgress);
    onSave(normalized);
    setIsDirty(false);
  };

  if (!syllabus) return null;

  return (
    <div className="sc-card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="sc-heading text-base">Syllabus Progress</h3>
        <div className="flex items-center gap-2">
          {editable ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isDirty
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-black-200 text-black-500 cursor-not-allowed"
              }`}
            >
              Save Progress
            </button>
          ) : null}
          <span className="sc-badge">{overallPercent}%</span>
        </div>
      </div>
      {statusMessage && !isDirty ? (
        <p className="text-[11px] text-green-600 text-right mb-1">{statusMessage}</p>
      ) : null}
      <ProgressBar value={overallPercent} className="mb-3" />
      <ul className="space-y-2 max-h-64 overflow-auto pr-1">
        {chapterStats.map(({ chapter, totalPages, completedPages }) => (
          <li key={chapter.index} className="border rounded-lg p-2 bg-white/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">
                {chapter.index}. {chapter.title}
              </span>
              <span className="text-xs text-black-600">
                Pages {completedPages}/{totalPages}
              </span>
            </div>
            <ul className="space-y-1">
              {(chapter.subTopics || []).map((topic) => {
                const status = getTopicStatus(localProgress, chapter.index, topic.index);
                const meta = STATUS_META[status];
                const action = editable
                  ? () => handleTopicCycle(chapter.index, topic.index)
                  : undefined;
                return (
                  <li
                    key={topic.index}
                    onClick={action}
                    className={`flex justify-between items-center text-xs border rounded px-2 py-1.5 bg-black-50 transition-colors ${
                      editable ? "cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 active:bg-indigo-100" : ""
                    }`}
                    title={editable ? "Click to cycle status" : undefined}
                  >
                    <span className="truncate" title={topic.title}>
                      {topic.title} <span className="text-[10px] text-black-500">(p.{topic.pageFrom}-{topic.pageTo})</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium ${meta.class}`}
                    >
                      {meta.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
