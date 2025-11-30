import React, { useMemo, useState, useEffect } from "react";
import { students as allStudents, getAssignmentsForClass } from "../../data/dummyData";

const MODAL_BACKDROP = "fixed inset-0 z-50 flex items-center justify-center bg-black-900/50 backdrop-blur-sm p-4";

export default function AssessmentManager({ classId, type = "assignment" }) {
  const typeLabel = type === "assignment" ? "Assignment" : "Test";
  const pluralLabel = `${typeLabel}s`;
  const classStudents = useMemo(() => allStudents.filter((s) => s.classId === classId), [classId]);
  const storageKeyList = `${type}:list:${classId}`;

  const seed =
    type === "assignment"
      ? getAssignmentsForClass(classId).map((a) => ({
        id: a.id,
        title: a.title,
        date: a.dueDate,
        maxPoints: a.maxPoints,
      }))
      : [];

  const today = new Date().toISOString().slice(0, 10);

  const [assessments, setAssessments] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKeyList);
      if (raw) return JSON.parse(raw);
    } catch { }
    return seed;
  });
  const [activeId, setActiveId] = useState(() => assessments[0]?.id || "");
  const [createForm, setCreateForm] = useState({ title: "", date: today, maxPoints: 10 });
  const [grades, setGrades] = useState(() => ({}));
  const [statusMessage, setStatusMessage] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGradesModal, setShowGradesModal] = useState(false);

  const persistList = (list) => {
    setAssessments(list);
    try {
      localStorage.setItem(storageKeyList, JSON.stringify(list));
    } catch { }
  };

  const storageKeyGrades = (id) => `${type}:grades:${classId}:${id}`;

  const loadGrades = (id) => {
    try {
      const raw = localStorage.getItem(storageKeyGrades(id));
      if (raw) setGrades(JSON.parse(raw));
      else setGrades({});
    } catch {
      setGrades({});
    }
  };

  const saveGrades = () => {
    if (!activeId) return;
    try {
      localStorage.setItem(storageKeyGrades(activeId), JSON.stringify(grades));
      setStatusMessage(`${typeLabel} grades saved locally.`);
    } catch {
      setStatusMessage("Unable to save grades in this browser.");
    }
  };

  const addAssessment = () => {
    const id = `${type}_${classId}_${Date.now()}`;
    const fallbackTitle = type === "assignment" ? "New Assignment" : "New Test";
    const item = {
      id,
      title: createForm.title.trim() || fallbackTitle,
      date: createForm.date || today,
      maxPoints: Number(createForm.maxPoints) || 10,
    };
    const next = [...assessments, item];
    persistList(next);
    setActiveId(id);
    setCreateForm({ title: "", date: today, maxPoints: 10 });
    setGrades({});
    setShowCreateModal(false);
    setStatusMessage(`${typeLabel} created. Ready to add grades.`);
  };

  useEffect(() => {
    if (activeId) loadGrades(activeId);
  }, [activeId]);

  const activeAssessment = assessments.find((a) => a.id === activeId);

  return (
    <div className="sc-card h-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="sc-heading text-base">Manage {pluralLabel}</h3>
        <button
          type="button"
          onClick={() => {
            setCreateForm({ title: "", date: today, maxPoints: 10 });
            setStatusMessage("");
            setShowCreateModal(true);
          }}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          Create New {typeLabel}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <select
          value={activeId}
          onChange={(e) => {
            setActiveId(e.target.value);
            setStatusMessage("");
          }}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">Select {typeLabel.toLowerCase()}</option>
          {assessments.map((a) => (
            <option value={a.id} key={a.id}>
              {a.title} • {a.date}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            if (activeId) {
              setStatusMessage("");
              setShowGradesModal(true);
            }
          }}
          disabled={!activeId}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${activeId
              ? "border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
              : "border-black-200 text-black-400 bg-black-100 cursor-not-allowed"
            }`}
        >
          Open Grading
        </button>
      </div>

      {activeAssessment ? (
        <p className="text-xs text-black-500">
          Editing: <span className="font-medium text-black-600">{activeAssessment.title}</span> (Due {activeAssessment.date})
        </p>
      ) : (
        <p className="text-xs text-black-500">Select a {typeLabel.toLowerCase()} to view or update grades.</p>
      )}

      {statusMessage ? (
        <p className="mt-3 text-xs text-green-600">{statusMessage}</p>
      ) : null}

      {showCreateModal && (
        <div className={MODAL_BACKDROP} role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h4 className="text-sm font-semibold text-black-800">Create {typeLabel}</h4>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-black-500 hover:text-black-700 text-lg"
                aria-label="Close create modal"
              >
                ×
              </button>
            </div>
            <form
              className="p-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                addAssessment();
              }}
            >
              <div className="space-y-1">
                <label className="block text-xs font-medium text-black-600">Title</label>
                <input
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder={`${typeLabel} title`}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-black-600">Due date</label>
                  <input
                    type="date"
                    value={createForm.date}
                    onChange={(e) => setCreateForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-black-600">Max points</label>
                  <input
                    type="number"
                    value={createForm.maxPoints}
                    min={1}
                    onChange={(e) => setCreateForm((f) => ({ ...f, maxPoints: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 text-sm rounded-lg border border-black-200 text-black-600 hover:bg-black-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Save {typeLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGradesModal && activeAssessment && (
        <div className={MODAL_BACKDROP} role="dialog" aria-modal="true">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <h4 className="text-sm font-semibold text-black-800">Grade {typeLabel}</h4>
                <p className="text-xs text-black-500">
                  {activeAssessment.title} • Due {activeAssessment.date}
                </p>
              </div>
              <button
                onClick={() => setShowGradesModal(false)}
                className="text-black-500 hover:text-black-700 text-lg"
                aria-label="Close grading modal"
              >
                ×
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-black-500">
                    <th className="py-2">Student</th>
                    <th className="py-2">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((st) => (
                    <tr key={st.studentId} className="border-t">
                      <td className="py-2 pr-3">{st.name}</td>
                      <td className="py-2">
                        <input
                          type="number"
                          className="border rounded px-3 py-1 w-28"
                          value={grades[st.studentId] ?? ""}
                          onChange={(e) =>
                            setGrades((g) => ({
                              ...g,
                              [st.studentId]: e.target.value === "" ? "" : Number(e.target.value),
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t">
              <button
                type="button"
                onClick={() => setShowGradesModal(false)}
                className="px-3 py-2 text-sm rounded-lg border border-black-200 text-black-600 hover:bg-black-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={saveGrades}
                className="px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Save Grades
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
