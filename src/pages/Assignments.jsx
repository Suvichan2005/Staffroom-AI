import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Plus, Filter, Search, Clock, Users, CheckCircle2, 
  AlertTriangle, Calendar, ChevronRight, MoreVertical, Edit, 
  Trash2, Eye, Download, Send, GraduationCap
} from "lucide-react";
import { PageShell } from "../components/layout";
import { teacherData, students, assignments as dummyAssignments, getAssignmentStats } from "../data/dummyData";
import { useTeacher } from "../context/TeacherContext";

export default function Assignments() {
  const teacherCtx = useTeacher();
  const teacher = teacherCtx?.teacher || teacherData;
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Use actual assignments from dummyData
  const assignments = useMemo(() => {
    return dummyAssignments.map(assignment => {
      // Find the course that this assignment's class belongs to
      const course = teacher.courses?.find(c => 
        c.sections?.some(s => s.id === assignment.classId)
      );
      const stats = getAssignmentStats(assignment);
      const totalStudents = students.filter(s => s.classId === assignment.classId).length;
      const isPastDue = new Date(assignment.dueDate) < new Date();
      const gradedCount = assignment.submissions.filter(s => s.grade !== undefined).length;
      
      return {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        course: course?.title || 'Unknown Course',
        section: assignment.classId,
        type: assignment.type,
        dueDate: assignment.dueDate,
        maxPoints: assignment.maxPoints,
        totalStudents,
        submitted: stats.submissionCount,
        graded: gradedCount,
        status: isPastDue && stats.submissionCount === totalStudents ? 'completed' : 'active',
        priority: isPastDue && stats.submissionCount < totalStudents ? 'high' : 'normal',
        averageGrade: stats.averageGrade,
        chapterRef: assignment.chapterRef,
      };
    });
  }, [teacher]);

  // Filter assignments
  const filteredAssignments = useMemo(() => {
    let filtered = assignments;
    
    if (activeFilter !== 'all') {
      filtered = filtered.filter(a => {
        if (activeFilter === 'pending') return a.submitted < a.totalStudents;
        if (activeFilter === 'grading') return a.submitted > a.graded;
        if (activeFilter === 'completed') return a.status === 'completed';
        return true;
      });
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(q) || 
        a.course.toLowerCase().includes(q) ||
        a.section.toLowerCase().includes(q)
      );
    }
    
    return filtered;
  }, [assignments, activeFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: assignments.length,
    active: assignments.filter(a => a.status === 'active').length,
    needsGrading: assignments.filter(a => a.submitted > a.graded).length,
    overdue: assignments.filter(a => new Date(a.dueDate) < new Date() && a.status === 'active').length,
  }), [assignments]);

  const filters = [
    { id: 'all', label: 'All', count: assignments.length },
    { id: 'pending', label: 'Pending', count: assignments.filter(a => a.submitted < a.totalStudents).length },
    { id: 'grading', label: 'Needs Grading', count: stats.needsGrading },
    { id: 'completed', label: 'Completed', count: assignments.filter(a => a.status === 'completed').length },
  ];

  const getTypeColor = (type) => {
    switch (type) {
      case 'quiz': return 'bg-purple-100 text-purple-700';
      case 'project': return 'bg-green-100 text-green-700';
      case 'homework': return 'bg-blue-100 text-blue-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getPriorityBadge = (priority) => {
    if (priority === 'high') {
      return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Urgent</span>;
    }
    return null;
  };

  return (
    <PageShell width="6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Assignments</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage and track student assignments</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-lg shadow-indigo-200"
        >
          <Plus className="w-5 h-5" />
          <span>Create Assignment</span>
        </motion.button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Assignments', value: stats.total, icon: FileText, color: 'indigo' },
          { label: 'Active', value: stats.active, icon: Clock, color: 'green' },
          { label: 'Needs Grading', value: stats.needsGrading, icon: Edit, color: 'yellow' },
          { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'red' },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm`}
          >
            <div className={`inline-flex p-2 rounded-xl bg-${stat.color}-100 mb-3`}>
              <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
            </div>
            <p className="text-2xl font-bold text-neutral-800">{stat.value}</p>
            <p className="text-sm text-neutral-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                ${activeFilter === filter.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
                }
              `}
            >
              {filter.label}
              <span className={`
                px-1.5 py-0.5 rounded-full text-xs
                ${activeFilter === filter.id ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'}
              `}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
          />
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredAssignments.map((assignment, idx) => (
            <motion.div
              key={assignment.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl border border-neutral-200 p-4 hover:shadow-md hover:border-indigo-200 transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Left: Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getTypeColor(assignment.type)}`}>
                      {assignment.type}
                    </span>
                    {getPriorityBadge(assignment.priority)}
                    {assignment.status === 'completed' && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-neutral-800 truncate group-hover:text-indigo-600 transition-colors">
                    {assignment.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-neutral-500">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-4 h-4" />
                      {assignment.course} - {assignment.section}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Middle: Progress */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-sm text-neutral-500">Submitted</p>
                    <p className="text-lg font-bold text-neutral-800">
                      {assignment.submitted}/{assignment.totalStudents}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-neutral-500">Graded</p>
                    <p className="text-lg font-bold text-green-600">
                      {assignment.graded}/{assignment.submitted}
                    </p>
                  </div>
                  <div className="w-20 h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${(assignment.submitted / assignment.totalStudents) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                  <button className="p-2 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Eye className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Edit className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredAssignments.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200">
            <div className="w-16 h-16 mx-auto bg-neutral-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-neutral-400" />
            </div>
            <p className="text-neutral-600 font-medium">No assignments found</p>
            <p className="text-sm text-neutral-500 mt-1">Try adjusting your filters or create a new assignment</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
