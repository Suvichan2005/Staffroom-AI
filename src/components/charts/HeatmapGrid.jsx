import { motion } from "framer-motion";

const CATEGORY_VISUALS = {
  ahead: { rgb: [16, 185, 129], label: "Ahead of Plan" },
  track: { rgb: [250, 204, 21], label: "On Track" },
  catchup: { rgb: [251, 146, 60], label: "Needs Catch Up" },
  risk: { rgb: [220, 76, 70], label: "Behind Schedule" },
};

const getCellVisuals = (value = 0) => {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  let bucket = "risk";
  if (safeValue >= 85) bucket = "ahead";
  else if (safeValue >= 60) bucket = "track";
  else if (safeValue >= 35) bucket = "catchup";
  const [r, g, b] = CATEGORY_VISUALS[bucket].rgb;
  const opacity = Math.min(0.95, Math.max(0.18, safeValue / 120 + 0.12));
  const backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(2)})`;
  const borderColor = `rgba(${r}, ${g}, ${b}, ${(opacity + 0.1).toFixed(2)})`;
  const textClass = safeValue >= 55 ? "text-white" : "text-black-900";
  return { bucket, backgroundColor, borderColor, textClass };
};

export default function HeatmapGrid({ matrix, onHover }) {
  const { sections = [], chapters = [], records = [] } = matrix || {};
  const lookup = new Map();
  records.forEach((record) => {
    lookup.set(`${record.sectionId}-${record.chapterIndex}`, record);
  });

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[640px] border-collapse">
        <thead>
          <tr>
            <th className="text-left text-xs uppercase text-black-500 tracking-wide pb-2 pr-4" />
            {chapters.map((chapter) => (
              <th key={chapter} className="text-xs text-black-500 font-semibold pb-2 pr-2">
                Chapter {chapter}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <tr key={section} className="h-14">
              <td className="text-sm font-medium text-black-700 pr-4">{section}</td>
              {chapters.map((chapter) => {
                const record = lookup.get(`${section}-${chapter}`) || {};
                const percent = Number(record.percent ?? record.completion ?? 0);
                const visual = getCellVisuals(percent);
                const pages = record.totalPages || 0;
                const pagesDone = Math.round((pages * Math.max(0, percent)) / 100);
                const tooltip = `Topic: ${record.chapterTitle || `Chapter ${chapter}`} – Section ${section}: ${percent}% — ${pagesDone} of ${pages} pages`;
                return (
                  <td key={chapter} className="pr-2 py-1">
                    <div
                      className="group relative outline-none"
                      tabIndex={0}
                      onMouseEnter={() => onHover?.(record)}
                      onFocus={() => onHover?.(record)}
                    >
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="relative h-12 w-20 rounded-xl shadow-sm ring-1 ring-inset transition-transform"
                        style={{
                          backgroundColor: visual.backgroundColor,
                          borderColor: visual.borderColor,
                        }}
                        aria-label={tooltip}
                      >
                        <span
                          className={`absolute inset-0 grid place-items-center text-xs font-semibold ${visual.textClass}`}
                        >
                          {percent}%
                        </span>
                      </motion.div>
                      <div className="pointer-events-none absolute left-1/2 top-full z-20 hidden w-64 -translate-x-1/2 translate-y-3 rounded-md bg-black-900/95 px-3 py-2 text-xs text-white shadow-xl group-focus-visible:block group-hover:block">
                        <p className="font-semibold">{record.chapterTitle || `Chapter ${chapter}`}</p>
                        <p className="mt-1 text-[11px] text-black-200">
                          Section {section} · {percent}% complete · {pagesDone} / {pages} pages
                        </p>
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-black-600">
        {Object.entries(CATEGORY_VISUALS).map(([key, meta]) => {
          const bg = getCellVisuals(key === "ahead" ? 95 : key === "track" ? 70 : key === "catchup" ? 45 : 20);
          return (
            <div key={key} className="flex items-center gap-2">
              <span
                className="inline-flex h-3 w-6 rounded-full border"
                style={{ backgroundColor: bg.backgroundColor, borderColor: bg.borderColor }}
                aria-hidden="true"
              />
              <span>{meta.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
