import { useMemo, useState } from "react";

export const defaultResources = [
  {
    id: "res1",
    courseId: "geo6",
    title: "Chapter 1 Slides",
    topic: "Solar System",
    uploadedBy: "Ms. Rao",
    uploadedOn: "2025-11-05",
    fileType: "pptx",
    description: "Visual slides for introducing the solar system.",
    avatarUrl: "https://i.pravatar.cc/64?img=33"
  },
  {
    id: "res2",
    courseId: "geo6",
    title: "Landforms Worksheet",
    topic: "Landforms",
    uploadedBy: "Mr. Das",
    uploadedOn: "2025-11-04",
    fileType: "pdf",
    description: "Practice questions on landforms with answer key.",
    avatarUrl: "https://i.pravatar.cc/64?img=45"
  },
  {
    id: "res3",
    courseId: "geo6",
    title: "Climate Change Article",
    topic: "Climate",
    uploadedBy: "Ms. Kaur",
    uploadedOn: "2025-11-02",
    fileType: "docx",
    description: "Supplementary reading on climate change impacts.",
    avatarUrl: "https://i.pravatar.cc/64?img=56"
  },
  {
    id: "res4",
    courseId: "hist8",
    title: "Colonialism Timeline",
    topic: "Colonialism",
    uploadedBy: "Mr. Sharma",
    uploadedOn: "2025-11-03",
    fileType: "pdf",
    description: "Timeline infographic covering key events of colonial rule.",
    avatarUrl: "https://i.pravatar.cc/64?img=24"
  }
];

const rootClass = "space-y-4";

export default function ResourceGallery({
  resources = defaultResources,
  courseId,
  title = "Shared Resources",
  allowUpload = true,
  className
}) {
  const scopedResources = useMemo(() => {
    if (!courseId) return resources;
    return resources.filter((res) => res.courseId === courseId);
  }, [resources, courseId]);

  const [topicFilter, setTopicFilter] = useState("all");

  const topics = useMemo(() => {
    const set = new Set(scopedResources.map((res) => res.topic));
    return Array.from(set).sort();
  }, [scopedResources]);

  const filtered = useMemo(() => {
    if (topicFilter === "all") return scopedResources;
    return scopedResources.filter((res) => res.topic === topicFilter);
  }, [scopedResources, topicFilter]);

  const containerClass = className ? `${className}` : "bg-white border rounded-2xl shadow p-4";

  return (
    <div className={`${rootClass} ${containerClass}`.trim()}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-black-800">{title}</h2>
          {courseId ? (
            <p className="text-sm text-black-500">Resources tailored for this course.</p>
          ) : (
            <p className="text-sm text-black-500">Browse shared materials across the department.</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Topics</option>
            {topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
          {allowUpload ? (
            <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
              Upload Resource
            </button>
          ) : null}
        </div>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((res) => (
            <div key={res.id} className="sc-card flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={res.avatarUrl || "https://i.pravatar.cc/64?img=12"}
                  alt={res.uploadedBy}
                  className="h-10 w-10 rounded-full object-cover border border-white shadow"
                />
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-black-800">{res.title}</h3>
                  <p className="text-xs text-black-500">Topic: {res.topic}</p>
                </div>
                <span className="text-xs uppercase tracking-wide px-2 py-1 rounded-full border border-indigo-200 text-indigo-600">
                  {res.fileType}
                </span>
              </div>
              <p className="text-sm text-black-600 flex-1">{res.description}</p>
              <div className="flex items-center justify-between text-xs text-black-500">
                <span>
                  Uploaded by <span className="font-medium text-black-600">{res.uploadedBy}</span> on {res.uploadedOn}
                </span>
                <span className="text-indigo-500 font-medium cursor-pointer">Share</span>
              </div>
              <div className="flex justify-end gap-2">
                <button className="px-3 py-1.5 rounded-lg bg-black-100 hover:bg-black-200 text-sm">
                  Preview
                </button>
                <button className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-black-300 bg-black-50 p-6 text-center text-sm text-black-500">
          No resources shared for this course yet. Use the upload button to add one.
        </div>
      )}
    </div>
  );
}
