import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Plus, Search, Clock, Users, CheckCircle2, 
  AlertTriangle, Calendar, Edit, Trash2, Eye, GraduationCap,
  ClipboardList, BookOpen, Award, X, Save, ChevronDown, Sparkles, RefreshCw,
  LayoutGrid, List, ChevronRight
} from "lucide-react";
import { PageShell } from "../components/layout";
import { 
  teacherData, 
  students, 
  getAllAssessments, 
  getAssignmentStats 
} from "../data/dummyData";
import { 
  createAssessment,
  updateAssessment,
  deleteAssessment,
  batchGradeSubmissions,
  getAllAssessmentsWithStored,
  getAssessmentStats as getStoredStats
} from "../utils/assessmentStorage";
import { useTeacher } from "../context/TeacherContext";
import { toast } from "react-hot-toast";
import { generateQuiz } from "../services/aiService";
import GradeBookMatrix from "../components/teacher/GradeBookMatrix";
import { ScrollContainer } from "../components/shared/ScrollableList";

export default function Assessments() {
  const teacherCtx = useTeacher();
  const teacher = teacherCtx?.teacher || teacherData;
  const [activeFilter, setActiveFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [grades, setGrades] = useState({});
  const [viewMode, setViewMode] = useState('list');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseId: '',
    classId: '',
    type: 'assignment',
    dueDate: '',
    maxPoints: 100,
    chapterRef: '',
  });
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [assessmentsList, setAssessmentsList] = useState([]);

  useEffect(() => {
    const dummyAssessments = getAllAssessments();
    const allAssessments = getAllAssessmentsWithStored(dummyAssessments);
    setAssessmentsList(allAssessments);
  }, []);

  const allClasses = useMemo(() => {
    const classes = [];
    teacher.courses?.forEach(course => {
      course.sections?.forEach(section => {
        classes.push({
          id: section.id,
          name: `${course.title.replace('Grade ', 'G').replace('Geography ', 'Geo ').replace('History ', 'Hist ')} - ${section.id}`
        });
      });
    });
    return classes;
  }, [teacher]);

  const assessments = useMemo(() => {
    return assessmentsList.map(assessment => {
      const course = teacher.courses?.find(c => 
        c.sections?.some(s => s.id === assessment.classId)
      );
      const stats = getAssignmentStats(assessment);
      const totalStudents = students.filter(s => s.classId === assessment.classId).length;
      const isPastDue = new Date(assessment.dueDate) < new Date();
      const gradedCount = assessment.submissions.filter(s => s.grade !== undefined).length;
      const isTest = ['quiz', 'unit-test', 'mid-term', 'final'].includes(assessment.type);
      
      return {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        course: course?.title || 'Unknown Course',
        courseId: course?.id,
        section: assessment.classId,
        type: assessment.type,
        category: isTest ? 'test' : 'assignment',
        dueDate: assessment.dueDate,
        maxPoints: assessment.maxPoints,
        totalStudents,
        submitted: stats.submissionCount,
        graded: gradedCount,
        status: isPastDue && stats.submissionCount === totalStudents ? 'completed' : 
                isPastDue && stats.submissionCount < totalStudents ? 'overdue' : 'active',
        priority: isPastDue && stats.submissionCount < totalStudents ? 'high' : 'normal',
        averageGrade: stats.averageGrade,
        chapterRef: assessment.chapterRef,
        submissions: assessment.submissions,
      };
    });
  }, [teacher, assessmentsList]);

  const filteredAssessments = useMemo(() => {
    let filtered = assessments;
    
    if (activeFilter !== 'all') {
      filtered = filtered.filter(a => {
        if (activeFilter === 'pending') return a.submitted < a.totalStudents && a.status !== 'overdue';
        if (activeFilter === 'grading') return a.submitted > a.graded;
        if (activeFilter === 'completed') return a.status === 'completed';
        if (activeFilter === 'overdue') return a.status === 'overdue';
        return true;
      });
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(a => a.category === typeFilter);
    }
    
    if (classFilter !== 'all') {
      filtered = filtered.filter(a => a.section === classFilter);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(q) || 
        a.course.toLowerCase().includes(q) ||
        a.section.toLowerCase().includes(q)
      );
    }
    
    return filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [assessments, activeFilter, typeFilter, classFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: assessments.length,
    assignments: assessments.filter(a => a.category === 'assignment').length,
    tests: assessments.filter(a => a.category === 'test').length,
    needsGrading: assessments.filter(a => a.submitted > a.graded).length,
    overdue: assessments.filter(a => a.status === 'overdue').length,
  }), [assessments]);

  const statusFilters = [
    { id: 'all', label: 'All', count: assessments.length },
    { id: 'pending', label: 'Pending', count: assessments.filter(a => a.submitted < a.totalStudents && a.status !== 'overdue').length },
    { id: 'grading', label: 'Needs Grading', count: stats.needsGrading },
    { id: 'completed', label: 'Completed', count: assessments.filter(a => a.status === 'completed').length },
  ];

  const getTypeColor = (type) => {
    const colors = {
      'quiz': 'bg-purple-100 text-purple-700',
      'unit-test': 'bg-yellow-100 text-yellow-700',
      'mid-term': 'bg-red-100 text-red-700',
      'final': 'bg-red-100 text-red-700',
      'project': 'bg-green-100 text-green-700',
      'homework': 'bg-blue-100 text-blue-700',
    };
    return colors[type] || 'bg-neutral-100 text-neutral-700';
  };

  const getTypeLabel = (type) => {
    const labels = {
      'quiz': 'Quiz',
      'unit-test': 'Unit Test',
      'mid-term': 'Mid Term',
      'final': 'Final',
      'project': 'Project',
      'homework': 'Homework',
    };
    return labels[type] || type;
  };

  const handleCreateAssessment = async () => {
    if (!formData.title || !formData.courseId || !formData.classId || !formData.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const newAssessment = createAssessment(formData);
      setAssessmentsList(prev => [...prev, newAssessment]);
      toast.success(`${formData.title} created successfully!`);
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create assessment');
    }
  };

  const handleGenerateQuiz = async () => {
    if (!formData.classId || !formData.chapterRef) {
      toast.error('Please select a class and chapter first');
      return;
    }

    setIsGeneratingQuiz(true);
    try {
      const course = teacher.courses?.find(c => 
        c.sections?.some(s => s.id === formData.classId)
      );
      
      const quizData = await generateQuiz({
        courseId: formData.courseId || course?.id,
        sectionId: formData.classId,
        chapterNumber: parseInt(formData.chapterRef) || 1,
        questionCount: 10,
      });

      setFormData(prev => ({
        ...prev,
        title: quizData.title || `Quiz - Chapter ${formData.chapterRef}`,
        description: quizData.description || '',
        type: 'quiz',
        maxPoints: quizData.questions?.length * 10 || 100,
      }));

      toast.success('Quiz generated!');
    } catch (error) {
      toast.error('Failed to generate quiz');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleDeleteAssessment = (assessmentId) => {
    if (!confirm('Delete this assessment?')) return;

    try {
      deleteAssessment(assessmentId);
      setAssessmentsList(prev => prev.filter(a => a.id !== assessmentId));
      toast.success('Assessment deleted');
    } catch {
      setAssessmentsList(prev => prev.filter(a => a.id !== assessmentId));
      toast.success('Assessment removed');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '', description: '', courseId: '', classId: '',
      type: 'assignment', dueDate: '', maxPoints: 100, chapterRef: '',
    });
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
    try {
      const gradesMap = {};
      Object.entries(grades).forEach(([studentId, grade]) => {
        if (grade !== '' && grade !== undefined) {
          gradesMap[studentId] = { grade: Number(grade), feedback: '' };
        }
      });

      batchGradeSubmissions(selectedAssessment.id, gradesMap);
      
      const updated = assessmentsList.map(a => {
        if (a.id === selectedAssessment.id) {
          const updatedSubmissions = a.submissions.map(sub => {
            if (gradesMap[sub.studentId]) {
              return { ...sub, ...gradesMap[sub.studentId], gradedDate: new Date().toISOString() };
            }
            return sub;
          });
          return { ...a, submissions: updatedSubmissions };
        }
        return a;
      });
      
      setAssessmentsList(updated);
      toast.success(`Grades saved!`);
      setShowGradingModal(false);
      setSelectedAssessment(null);
      setGrades({});
    } catch {
      toast.error('Failed to save grades');
    }
  };

  const classStudents = useMemo(() => {
    if (!selectedAssessment) return [];
    return students.filter(s => s.classId === selectedAssessment.section);
  }, [selectedAssessment]);

  return (
    <PageShell width="6xl">
      {/* Compact Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Assessments</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {stats.total} total – {stats.needsGrading} need grading
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-neutral-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setViewMode('gradebook');
                if (classFilter === 'all' && allClasses.length > 0) setClassFilter(allClasses[0].id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'gradebook' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </div>

      {/* Compact Filters */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filters - Compact Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {statusFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                  ${activeFilter === filter.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }
                `}
              >
                {filter.label}
                {filter.count > 0 && (
                  <span className={`ml-1.5 text-xs ${activeFilter === filter.id ? 'text-indigo-200' : 'text-neutral-400'}`}>
                    {filter.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-neutral-200 hidden sm:block" />

          {/* Dropdowns */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="all">All Types</option>
            <option value="assignment">Assignments</option>
            <option value="test">Tests</option>
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="all">All Classes</option>
            {allClasses.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <ScrollContainer maxHeight="calc(100vh - 320px)" className="pr-1">
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredAssessments.map((assessment, idx) => (
                <motion.div
                  key={assessment.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-xl border border-neutral-200 p-4 hover:border-indigo-200 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    {/* Type Badge */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      assessment.category === 'test' ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      {assessment.category === 'test' 
                        ? <BookOpen className="w-5 h-5 text-purple-600" />
                        : <FileText className="w-5 h-5 text-blue-600" />
                      }
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-neutral-800 truncate group-hover:text-indigo-600 transition-colors">
                          {assessment.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(assessment.type)}`}>
                          {getTypeLabel(assessment.type)}
                        </span>
                        {assessment.status === 'overdue' && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-500">
                        {assessment.course} – Due {new Date(assessment.dueDate).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-6 text-center">
                      <div>
                        <p className="text-lg font-semibold text-neutral-800">{assessment.submitted}/{assessment.totalStudents}</p>
                        <p className="text-xs text-neutral-400">Submitted</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-green-600">{assessment.graded}/{assessment.submitted}</p>
                        <p className="text-xs text-neutral-400">Graded</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => openGradingModal(assessment)}
                        className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        title="Grade"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteAssessment(assessment.id)}
                        className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredAssessments.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-neutral-200">
                <ClipboardList className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
                <p className="text-neutral-500">No assessments found</p>
              </div>
            )}
          </div>
        </ScrollContainer>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 p-4">
          {classFilter !== 'all' ? (
            <GradeBookMatrix
              classId={classFilter}
              assessments={filteredAssessments.filter(a => a.section === classFilter)}
              students={students.filter(s => s.classId === classFilter)}
            />
          ) : (
            <div className="text-center py-12">
              <LayoutGrid className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
              <p className="text-neutral-500">Select a class to view grade book</p>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-800">Create Assessment</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-neutral-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Assessment title"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">Course *</label>
                    <select
                      value={formData.courseId}
                      onChange={(e) => setFormData({...formData, courseId: e.target.value, classId: ''})}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">Select</option>
                      {teacher.courses?.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">Section *</label>
                    <select
                      value={formData.classId}
                      onChange={(e) => setFormData({...formData, classId: e.target.value})}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      disabled={!formData.courseId}
                    >
                      <option value="">Select</option>
                      {teacher.courses?.find(c => c.id === formData.courseId)?.sections?.map(s => (
                        <option key={s.id} value={s.id}>{s.id}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="assignment">Assignment</option>
                      <option value="homework">Homework</option>
                      <option value="project">Project</option>
                      <option value="quiz">Quiz</option>
                      <option value="unit-test">Unit Test</option>
                      <option value="mid-term">Mid Term</option>
                      <option value="final">Final</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">Max Points</label>
                    <input
                      type="number"
                      value={formData.maxPoints}
                      onChange={(e) => setFormData({...formData, maxPoints: parseInt(e.target.value) || 100})}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Due Date *</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                    placeholder="Optional description"
                  />
                </div>

                {/* AI Generate Option */}
                {formData.classId && ['quiz', 'unit-test'].includes(formData.type) && (
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-indigo-800 text-sm">AI Quiz Generator</p>
                        <p className="text-xs text-indigo-600">Generate questions from syllabus</p>
                      </div>
                      <button
                        onClick={handleGenerateQuiz}
                        disabled={isGeneratingQuiz}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {isGeneratingQuiz ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        Generate
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-neutral-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAssessment}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grading Modal */}
      <AnimatePresence>
        {showGradingModal && selectedAssessment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowGradingModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-neutral-100">
                <h2 className="text-lg font-semibold text-neutral-800">Grade: {selectedAssessment.title}</h2>
                <p className="text-sm text-neutral-500">
                  {selectedAssessment.course} – Max {selectedAssessment.maxPoints} pts
                </p>
              </div>

              <ScrollContainer maxHeight="400px" className="p-5">
                <div className="space-y-2">
                  {classStudents.map((student) => {
                    const submission = selectedAssessment.submissions?.find(s => s.studentId === student.studentId);
                    return (
                      <div
                        key={student.studentId}
                        className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-sm font-medium">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-neutral-800 text-sm">{student.name}</p>
                            <p className="text-xs text-neutral-400">
                              {submission?.submittedAt 
                                ? `Submitted ${new Date(submission.submittedAt).toLocaleDateString()}`
                                : 'Not submitted'
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={selectedAssessment.maxPoints}
                            value={grades[student.studentId] ?? ''}
                            onChange={(e) => setGrades({...grades, [student.studentId]: e.target.value})}
                            className="w-16 px-2 py-1.5 border border-neutral-200 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            placeholder="—"
                          />
                          <span className="text-sm text-neutral-400">/{selectedAssessment.maxPoints}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollContainer>

              <div className="p-5 border-t border-neutral-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowGradingModal(false)}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGrades}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                >
                  <Save className="w-4 h-4" />
                  Save Grades
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
