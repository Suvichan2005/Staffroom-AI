import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { FileText, Calendar, Users, Award, Plus, Edit3, ChevronRight, Clock } from "lucide-react";
import { getAssignmentsForClass, getAssignmentStats, students } from "../../data/dummyData";
import { loadUserState, saveUserState } from "../../utils/userScopedStorage";

export default function AssignmentSummary({ classId }) {
  const storageKey = `class:${classId}:assignments`;
  const seeded = useMemo(() => getAssignmentsForClass(classId), [classId]);
  const [assignments, setAssignments] = useState(() => loadUserState(storageKey, seeded));
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", maxPoints: 10, type: "homework" });

  // Get class students for submission tracking
  const classStudents = useMemo(() => students.filter(s => s.classId === classId), [classId]);

  useEffect(() => {
    saveUserState(storageKey, assignments);
  }, [assignments, storageKey]);

  const handleOpen = (assignment = null) => {
    if (assignment) {
      setEditingId(assignment.id);
      setForm({ 
        title: assignment.title, 
        description: assignment.description || "",
        dueDate: assignment.dueDate, 
        maxPoints: assignment.maxPoints,
        type: assignment.type || "homework"
      });
    } else {
      setEditingId(null);
      setForm({ title: "", description: "", dueDate: new Date().toISOString().slice(0, 10), maxPoints: 10, type: "homework" });
    }
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.title || !form.dueDate) {
      toast.error("Please complete the assignment details.");
      return;
    }
    if (editingId) {
      setAssignments((prev) =>
        prev.map((assignment) =>
          assignment.id === editingId
            ? { ...assignment, ...form, maxPoints: Number(form.maxPoints) || 10 }
            : assignment
        )
      );
      toast.success("Assignment updated.");
    } else {
      setAssignments((prev) => [
        ...prev,
        {
          id: `assn_${classId}_${Date.now()}`,
          classId,
          ...form,
          maxPoints: Number(form.maxPoints) || 10,
          submissions: [],
        },
      ]);
      toast.success("Assignment added.");
    }
    setShowModal(false);
  };

  const getStatusBadge = (assignment) => {
    const today = new Date().toISOString().slice(0, 10);
    const dueDate = assignment.dueDate;
    const stats = getAssignmentStats(assignment);
    const totalStudents = classStudents.length;
    
    if (dueDate < today && stats.submissionCount < totalStudents) {
      return { label: "Overdue", class: "bg-red-100 text-red-700" };
    }
    if (dueDate === today) {
      return { label: "Due Today", class: "bg-yellow-100 text-yellow-700" };
    }
    if (stats.submissionCount === totalStudents && totalStudents > 0) {
      return { label: "Complete", class: "bg-green-100 text-green-700" };
    }
    return { label: "Active", class: "bg-indigo-100 text-indigo-700" };
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'project': return { label: "Project", class: "bg-purple-100 text-purple-700" };
      case 'quiz': return { label: "Quiz", class: "bg-blue-100 text-blue-700" };
      default: return { label: "Homework", class: "bg-black-100 text-black-700" };
    }
  };

  const empty = assignments.length === 0;

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const total = assignments.length;
    const totalSubmissions = assignments.reduce((sum, a) => sum + a.submissions.length, 0);
    const avgGrade = assignments.reduce((sum, a) => {
      const stats = getAssignmentStats(a);
      return sum + (parseFloat(stats.averageGrade) || 0);
    }, 0) / (total || 1);
    
    return { total, totalSubmissions, avgGrade: avgGrade.toFixed(1) };
  }, [assignments]);

  return (
    <div className="bg-white rounded-2xl border border-black-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-black-800">Assignments</h3>
            <p className="text-xs text-black-500">{overallStats.total} total • {overallStats.totalSubmissions} submissions</p>
          </div>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          onClick={() => handleOpen()}
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>
      
      {empty ? (
        <div className="text-center py-8 bg-black-50 rounded-xl border border-dashed border-black-200">
          <FileText className="w-10 h-10 text-black-300 mx-auto mb-2" />
          <p className="text-sm text-black-500">No assignments yet</p>
          <p className="text-xs text-black-400 mt-1">Click "Add" to create your first assignment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => {
            const stats = getAssignmentStats(assignment);
            const status = getStatusBadge(assignment);
            const type = getTypeBadge(assignment.type);
            const totalStudents = classStudents.length;
            const submissionRate = totalStudents ? Math.round((stats.submissionCount / totalStudents) * 100) : 0;
            
            return (
              <div 
                key={assignment.id} 
                className="group p-4 bg-black-50 rounded-xl border border-black-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-black-800 truncate">{assignment.title}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${type.class}`}>
                        {type.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${status.class}`}>
                        {status.label}
                      </span>
                    </div>
                    {assignment.description && (
                      <p className="text-xs text-black-500 truncate mb-2">{assignment.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-black-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due: {assignment.dueDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {assignment.maxPoints} pts
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {stats.submissionCount}/{totalStudents} submitted
                      </span>
                    </div>
                  </div>
                  <button
                    className="p-2 rounded-lg text-black-400 hover:text-indigo-600 hover:bg-white transition-colors"
                    onClick={() => handleOpen(assignment)}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Progress bar */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-black-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${submissionRate}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-black-600">{submissionRate}%</span>
                  {stats.submissionCount > 0 && (
                    <span className="text-xs text-black-500">
                      Avg: <span className="font-medium text-indigo-600">{stats.averageGrade}/{assignment.maxPoints}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black-100">
              <h4 className="text-lg font-semibold text-black-800">
                {editingId ? "Edit Assignment" : "New Assignment"}
              </h4>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-black-400 hover:text-black-600 rounded-lg hover:bg-black-100 transition-colors"
                aria-label="Close assignment modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-black-700">Title</label>
                <input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full border border-black-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Chapter 3 Worksheet"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-black-700">Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="w-full border border-black-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={2}
                  placeholder="Brief description of the assignment..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-black-700">Type</label>
                  <select
                    value={form.type}
                    onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                    className="w-full border border-black-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="homework">Homework</option>
                    <option value="project">Project</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-black-700">Due Date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                    className="w-full border border-black-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-black-700">Max Points</label>
                  <input
                    type="number"
                    min={1}
                    value={form.maxPoints}
                    onChange={(event) => setForm((prev) => ({ ...prev, maxPoints: event.target.value }))}
                    className="w-full border border-black-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-black-200 text-sm font-medium text-black-600 hover:bg-black-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  {editingId ? "Update" : "Create Assignment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
