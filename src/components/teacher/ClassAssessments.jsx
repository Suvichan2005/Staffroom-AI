import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Plus, Search, CheckCircle2, AlertTriangle, Calendar, 
  Edit, Eye, Award, X, Save, BookOpen, ClipboardList
} from "lucide-react";
import { 
  students, 
  getAssessmentsForClass, 
  getAssignmentStats 
} from "../../data/dummyData";
import { toast } from "react-hot-toast";

export default function ClassAssessments({ classId }) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [grades, setGrades] = useState({});

  // Get assessments for this class using the unified data source
  const assessments = useMemo(() => {
    return getAssessmentsForClass(classId).map(assessment => {
      const stats = getAssignmentStats(assessment);
      const totalStudents = students.filter(s => s.classId === classId).length;
      const isPastDue = new Date(assessment.dueDate) < new Date();
      const gradedCount = assessment.submissions.filter(s => s.grade !== undefined).length;
      
      // Determine category (assignment vs test)
      const isTest = ['quiz', 'unit-test', 'mid-term', 'final'].includes(assessment.type);
      
      return {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        type: assessment.type,
        category: isTest ? 'test' : 'assignment',
        dueDate: assessment.dueDate,
        maxPoints: assessment.maxPoints,
        totalStudents,
        submitted: stats.submissionCount,
        graded: gradedCount,
        status: isPastDue && stats.submissionCount === totalStudents ? 'completed' : 
                isPastDue && stats.submissionCount < totalStudents ? 'overdue' : 'active',
        averageGrade: stats.averageGrade,
        submissions: assessment.submissions,
      };
    });
  }, [classId]);

  // Filter assessments
  const filteredAssessments = useMemo(() => {
    let filtered = assessments;
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(a => a.category === typeFilter);
    }
    
    return filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [assessments, typeFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: assessments.length,
    assignments: assessments.filter(a => a.category === 'assignment').length,
    tests: assessments.filter(a => a.category === 'test').length,
    needsGrading: assessments.filter(a => a.submitted > a.graded).length,
  }), [assessments]);

  const getTypeColor = (type) => {
    switch (type) {
      case 'quiz': return 'bg-purple-100 text-purple-700';
      case 'unit-test': return 'bg-amber-100 text-amber-700';
      case 'mid-term': return 'bg-rose-100 text-rose-700';
      case 'final': return 'bg-red-100 text-red-700';
      case 'project': return 'bg-emerald-100 text-emerald-700';
      case 'homework': return 'bg-sky-100 text-sky-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'quiz': return 'Quiz';
      case 'unit-test': return 'Unit Test';
      case 'mid-term': return 'Mid Term';
      case 'final': return 'Final';
      case 'project': return 'Project';
      case 'homework': return 'Homework';
      default: return type;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Complete
        </span>;
      case 'overdue':
        return <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-medium rounded-full flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Overdue
        </span>;
      default:
        return null;
    }
  };

  const openGradingModal = (assessment) => {
    setSelectedAssessment(assessment);
    const existingGrades = {};
    assessment.submissions?.forEach(sub => {
      existingGrades[sub.studentId] = sub.grade;
    });
    setGrades(existingGrades);
    setShowGradingModal(true);
  };

  const handleSaveGrades = () => {
    toast.success(`Grades saved for ${selectedAssessment.title}`);
    setShowGradingModal(false);
    setSelectedAssessment(null);
    setGrades({});
  };

  const classStudents = useMemo(() => {
    return students.filter(s => s.classId === classId);
  }, [classId]);

  const gradingStudents = useMemo(() => {
    if (!selectedAssessment) return [];
    return classStudents;
  }, [selectedAssessment, classStudents]);

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: ClipboardList, bg: 'bg-slate-50' },
          { label: 'Assignments', value: stats.assignments, icon: FileText, bg: 'bg-sky-50' },
          { label: 'Tests', value: stats.tests, icon: BookOpen, bg: 'bg-purple-50' },
          { label: 'To Grade', value: stats.needsGrading, icon: Edit, bg: 'bg-amber-50' },
        ].map((stat, idx) => (
          <div key={idx} className={`${stat.bg} rounded-xl p-3 text-center`}>
            <stat.icon className="w-4 h-4 mx-auto mb-1 text-slate-500" />
            <p className="text-xl font-bold text-slate-800">{stat.value}</p>
            <p className="text-[10px] text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'assignment', label: 'Assignments' },
          { id: 'test', label: 'Tests' },
        ].map((filter) => (
          <button
            key={filter.id}
            onClick={() => setTypeFilter(filter.id)}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${typeFilter === filter.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }
            `}
          >
            {filter.label}
          </button>
        ))}
        <button className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Assessments List */}
      <div className="space-y-2">
        {filteredAssessments.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl">
            <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No assessments for this class</p>
          </div>
        ) : (
          filteredAssessments.map((assessment, idx) => (
            <motion.div
              key={assessment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${getTypeColor(assessment.type)}`}>
                      {getTypeLabel(assessment.type)}
                    </span>
                    {getStatusBadge(assessment.status)}
                  </div>
                  <h4 className="font-medium text-slate-800">{assessment.title}</h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(assessment.dueDate).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {assessment.maxPoints} pts
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-800">
                      {assessment.submitted}<span className="text-xs text-slate-400">/{assessment.totalStudents}</span>
                    </p>
                    <p className="text-[10px] text-slate-500">Submitted</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-emerald-600">
                      {assessment.graded}<span className="text-xs text-slate-400">/{assessment.submitted}</span>
                    </p>
                    <p className="text-[10px] text-slate-500">Graded</p>
                  </div>
                  <button 
                    onClick={() => openGradingModal(assessment)}
                    className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                  style={{ width: `${assessment.totalStudents ? (assessment.submitted / assessment.totalStudents) * 100 : 0}%` }}
                />
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Grading Modal */}
      <AnimatePresence>
        {showGradingModal && selectedAssessment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex-shrink-0">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Grade Assessment</h3>
                  <p className="text-sm text-slate-500">{selectedAssessment.title} • Max {selectedAssessment.maxPoints} pts</p>
                </div>
                <button
                  onClick={() => setShowGradingModal(false)}
                  className="p-2 hover:bg-white/50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              {/* Quick Stats */}
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-slate-500">
                    <span className="font-semibold text-slate-800">{classId}</span> • {gradingStudents.length} students
                  </span>
                  <span className="text-slate-500">
                    Submitted: <span className="font-semibold text-emerald-600">{selectedAssessment.submitted}</span>
                  </span>
                  <span className="text-slate-500">
                    Graded: <span className="font-semibold text-indigo-600">{selectedAssessment.graded}</span>
                  </span>
                </div>
              </div>

              {/* Student List */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-2">
                  {gradingStudents.map((student, idx) => {
                    const submission = selectedAssessment.submissions?.find(s => s.studentId === student.studentId);
                    const hasSubmitted = !!submission;
                    const currentGrade = grades[student.studentId] ?? submission?.grade ?? '';
                    
                    return (
                      <motion.div
                        key={student.studentId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                          hasSubmitted 
                            ? 'bg-white border-slate-200 hover:border-indigo-200' 
                            : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                          hasSubmitted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800">{student.name}</p>
                          <p className="text-xs text-slate-500">
                            {hasSubmitted 
                              ? `Submitted ${new Date(submission.submittedDate).toLocaleDateString()}`
                              : 'Not submitted'
                            }
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={selectedAssessment.maxPoints}
                            value={currentGrade}
                            onChange={(e) => setGrades(g => ({
                              ...g,
                              [student.studentId]: e.target.value === '' ? '' : Number(e.target.value)
                            }))}
                            disabled={!hasSubmitted}
                            placeholder="-"
                            className={`w-20 px-3 py-2 text-center border rounded-xl text-sm font-medium transition-all ${
                              hasSubmitted 
                                ? 'border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300' 
                                : 'border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          />
                          <span className="text-sm text-slate-400">/ {selectedAssessment.maxPoints}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                <div className="text-sm text-slate-500">
                  {Object.keys(grades).filter(k => grades[k] !== '').length} grades entered
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowGradingModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveGrades}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                  >
                    <Save className="w-4 h-4" />
                    Save Grades
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
