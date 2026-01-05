import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Plus, Search, Clock, Users, CheckCircle2, 
  AlertTriangle, Calendar, Edit, Trash2, Eye, GraduationCap,
  ClipboardList, BookOpen, Award, X, Save, ChevronDown, Sparkles, RefreshCw,
  LayoutGrid, List
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
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'gradebook'
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

  // Load assessments on mount and merge with dummy data
  useEffect(() => {
    const dummyAssessments = getAllAssessments();
    const allAssessments = getAllAssessmentsWithStored(dummyAssessments);
    setAssessmentsList(allAssessments);
  }, []);

  // Get all unique classes from teacher's courses
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

  // Transform assessments data
  const assessments = useMemo(() => {
    return assessmentsList.map(assessment => {
      const course = teacher.courses?.find(c => 
        c.sections?.some(s => s.id === assessment.classId)
      );
      const stats = getAssignmentStats(assessment);
      const totalStudents = students.filter(s => s.classId === assessment.classId).length;
      const isPastDue = new Date(assessment.dueDate) < new Date();
      const gradedCount = assessment.submissions.filter(s => s.grade !== undefined).length;
      
      // Determine category (assignment vs test)
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

  // Filter assessments
  const filteredAssessments = useMemo(() => {
    let filtered = assessments;
    
    // Status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(a => {
        if (activeFilter === 'pending') return a.submitted < a.totalStudents && a.status !== 'overdue';
        if (activeFilter === 'grading') return a.submitted > a.graded;
        if (activeFilter === 'completed') return a.status === 'completed';
        if (activeFilter === 'overdue') return a.status === 'overdue';
        return true;
      });
    }
    
    // Type filter (assignment vs test)
    if (typeFilter !== 'all') {
      filtered = filtered.filter(a => a.category === typeFilter);
    }
    
    // Class filter
    if (classFilter !== 'all') {
      filtered = filtered.filter(a => a.section === classFilter);
    }
    
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(q) || 
        a.course.toLowerCase().includes(q) ||
        a.section.toLowerCase().includes(q)
      );
    }
    
    // Sort by due date
    return filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [assessments, activeFilter, typeFilter, classFilter, searchQuery]);

  // Stats
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
    { id: 'overdue', label: 'Overdue', count: stats.overdue },
    { id: 'completed', label: 'Completed', count: assessments.filter(a => a.status === 'completed').length },
  ];

  const getTypeColor = (type) => {
    switch (type) {
      case 'quiz': return 'bg-purple-100 text-purple-700';
      case 'unit-test': return 'bg-yellow-100 text-yellow-700';
      case 'mid-term': return 'bg-red-100 text-red-700';
      case 'final': return 'bg-red-100 text-red-700';
      case 'project': return 'bg-green-100 text-green-700';
      case 'homework': return 'bg-blue-100 text-blue-700';
      default: return 'bg-black-100 text-black-700';
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
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Complete
        </span>;
      case 'overdue':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Overdue
        </span>;
      default:
        return null;
    }
  };

  // Create Assessment Handler
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
      console.error('Error creating assessment:', error);
      toast.error('Failed to create assessment');
    }
  };

  // Generate Quiz with AI
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

      // Auto-fill form with generated quiz
      setFormData(prev => ({
        ...prev,
        title: quizData.title || `Quiz - Chapter ${formData.chapterRef}`,
        description: quizData.description || '',
        type: 'quiz',
        maxPoints: quizData.questions?.length * 10 || 100,
      }));

      toast.success('Quiz generated! Review and create when ready.');
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast.error('Failed to generate quiz');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Delete Assessment
  const handleDeleteAssessment = (assessmentId) => {
    if (!confirm('Are you sure you want to delete this assessment?')) return;

    try {
      deleteAssessment(assessmentId);
      setAssessmentsList(prev => prev.filter(a => a.id !== assessmentId));
      toast.success('Assessment deleted');
    } catch (error) {
      // If not in storage, just remove from list (dummy data)
      setAssessmentsList(prev => prev.filter(a => a.id !== assessmentId));
      toast.success('Assessment removed');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      courseId: '',
      classId: '',
      type: 'assignment',
      dueDate: '',
      maxPoints: 100,
      chapterRef: '',
    });
  };

  const openGradingModal = (assessment) => {
    setSelectedAssessment(assessment);
    // Initialize grades from existing submissions
    const existingGrades = {};
    assessment.submissions?.forEach(sub => {
      existingGrades[sub.studentId] = sub.grade;
    });
    setGrades(existingGrades);
    setShowGradingModal(true);
  };

  const handleSaveGrades = () => {
    try {
      // Prepare grades map
      const gradesMap = {};
      Object.entries(grades).forEach(([studentId, grade]) => {
        if (grade !== '' && grade !== undefined) {
          gradesMap[studentId] = { grade: Number(grade), feedback: '' };
        }
      });

      // Save grades
      batchGradeSubmissions(selectedAssessment.id, gradesMap);
      
      // Update local state
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
      toast.success(`Grades saved for ${selectedAssessment.title}`);
      setShowGradingModal(false);
      setSelectedAssessment(null);
      setGrades({});
    } catch (error) {
      console.error('Error saving grades:', error);
      toast.error('Failed to save grades');
    }
  };

  const classStudents = useMemo(() => {
    if (!selectedAssessment) return [];
    return students.filter(s => s.classId === selectedAssessment.section);
  }, [selectedAssessment]);

  return (
    <PageShell width="6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-black-800">Assessments</h1>
          <p className="text-sm text-black-500 mt-1">Manage assignments, tests, and quizzes across all classes</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-black-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'list' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-black-500 hover:text-black-700'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => {
                setViewMode('gradebook');
                // Auto-select first class if none selected
                if (classFilter === 'all' && allClasses.length > 0) {
                  setClassFilter(allClasses[0].id);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'gradebook' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-black-500 hover:text-black-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grade Book</span>
            </button>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-lg shadow-indigo-200"
          >
            <Plus className="w-5 h-5" />
            <span>Create Assessment</span>
          </motion.button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: ClipboardList, color: 'indigo', bg: 'bg-indigo-50' },
          { label: 'Assignments', value: stats.assignments, icon: FileText, color: 'blue', bg: 'bg-blue-50' },
          { label: 'Tests', value: stats.tests, icon: BookOpen, color: 'purple', bg: 'bg-purple-50' },
          { label: 'Needs Grading', value: stats.needsGrading, icon: Edit, color: 'yellow', bg: 'bg-yellow-50' },
          { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'red', bg: 'bg-red-50' },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`${stat.bg} rounded-2xl p-4`}
          >
            <stat.icon className={`w-5 h-5 text-${stat.color}-600 mb-2`} />
            <p className="text-2xl font-bold text-black-800">{stat.value}</p>
            <p className="text-xs text-black-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-black-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Status Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 flex-shrink-0">
            {statusFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                  ${activeFilter === filter.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-black-100 text-black-600 hover:bg-black-200'
                  }
                `}
              >
                {filter.label}
                <span className={`
                  px-1.5 py-0.5 rounded-full text-xs
                  ${activeFilter === filter.id ? 'bg-white/20' : 'bg-white text-black-500'}
                `}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>

          {/* Type & Class Filters */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-black-50 border border-black-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">All Types</option>
              <option value="assignment">Assignments</option>
              <option value="test">Tests & Quizzes</option>
            </select>

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2 bg-black-50 border border-black-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">All Classes</option>
              {allClasses.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black-400" />
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black-50 border border-black-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Assessments List or Grade Book */}
      {viewMode === 'list' ? (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredAssessments.map((assessment, idx) => (
            <motion.div
              key={assessment.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.03 }}
              className="bg-white rounded-2xl border border-black-200 p-4 hover:shadow-lg hover:border-indigo-200 transition-all group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Left: Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${getTypeColor(assessment.type)}`}>
                      {getTypeLabel(assessment.type)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      assessment.category === 'test' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {assessment.category === 'test' ? 'Test' : 'Assignment'}
                    </span>
                    {getStatusBadge(assessment.status)}
                  </div>
                  <h3 className="font-semibold text-black-800 text-lg group-hover:text-indigo-600 transition-colors">
                    {assessment.title}
                  </h3>
                  {assessment.description && (
                    <p className="text-sm text-black-500 mt-1 line-clamp-1">{assessment.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-black-500">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-4 h-4" />
                      {assessment.course} - {assessment.section}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Due: {new Date(assessment.dueDate).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      {assessment.maxPoints} pts
                    </span>
                  </div>
                </div>

                {/* Middle: Progress */}
                <div className="flex items-center gap-4 lg:gap-6">
                  <div className="text-center min-w-[60px]">
                    <p className="text-xs text-black-500 mb-1">Submitted</p>
                    <p className="text-xl font-bold text-black-800">
                      {assessment.submitted}<span className="text-sm text-black-400">/{assessment.totalStudents}</span>
                    </p>
                  </div>
                  <div className="text-center min-w-[60px]">
                    <p className="text-xs text-black-500 mb-1">Graded</p>
                    <p className="text-xl font-bold text-green-600">
                      {assessment.graded}<span className="text-sm text-black-400">/{assessment.submitted}</span>
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs text-black-500 mb-1">Avg Score</p>
                    <p className="text-xl font-bold text-indigo-600">
                      {assessment.averageGrade || '-'}
                    </p>
                  </div>
                  <div className="w-24 hidden md:block">
                    <div className="h-2 bg-black-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                        style={{ width: `${assessment.totalStudents ? (assessment.submitted / assessment.totalStudents) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-black-400 mt-1 text-center">
                      {assessment.totalStudents ? Math.round((assessment.submitted / assessment.totalStudents) * 100) : 0}%
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => openGradingModal(assessment)}
                    className="flex items-center gap-2 px-3 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors text-sm font-medium"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline">Grade</span>
                  </button>
                  <button className="p-2 text-black-400 hover:text-black-600 hover:bg-black-100 rounded-lg transition-colors">
                    <Eye className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteAssessment(assessment.id)}
                    className="p-2 text-black-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredAssessments.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-black-200">
            <div className="w-16 h-16 mx-auto bg-black-100 rounded-full flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-black-400" />
            </div>
            <p className="text-black-600 font-medium">No assessments found</p>
            <p className="text-sm text-black-500 mt-1">Try adjusting your filters or create a new assessment</p>
          </div>
        )}
      </div>
      ) : (
        /* Grade Book Matrix View */
        <div className="bg-white rounded-2xl border border-black-200 p-6">
          {classFilter === 'all' ? (
            <div className="text-center py-12">
              <LayoutGrid className="w-12 h-12 mx-auto mb-3 text-black-300" />
              <p className="text-black-600 font-medium">Select a class to view grades</p>
              <p className="text-sm text-black-500 mt-1">Choose a specific class from the filter above</p>
            </div>
          ) : (
            <GradeBookMatrix 
              classId={classFilter} 
              courseId={allClasses.find(c => c.id === classFilter)?.courseId}
            />
          )}
        </div>
      )}

      {/* Create Assessment Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-black-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div>
                  <h3 className="text-lg font-semibold text-black-800">Create Assessment</h3>
                  <p className="text-sm text-black-500">Add a new assignment or test</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-white/50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-black-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Type Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, type: 'assignment' }))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.type === 'assignment'
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                        : 'border-black-200 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    <FileText className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-medium">Assignment</p>
                    <p className="text-xs text-black-500">Homework, Project</p>
                  </button>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, type: 'quiz' }))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.type === 'quiz'
                        ? 'border-purple-400 bg-purple-50 text-purple-700'
                        : 'border-black-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    <BookOpen className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-medium">Test/Quiz</p>
                    <p className="text-xs text-black-500">Quiz, Unit Test</p>
                  </button>
                </div>

                {/* Form Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-black-700 mb-1">Title *</label>
                    <input
                      type="text"
                      placeholder="e.g., Chapter 3 Quiz"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-black-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black-700 mb-1">Description</label>
                    <textarea
                      placeholder="Optional description or instructions"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full px-4 py-2.5 border border-black-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-black-700 mb-1">Class *</label>
                      <select
                        value={formData.classId}
                        onChange={(e) => {
                          const classId = e.target.value;
                          const course = teacher.courses?.find(c =>
                            c.sections?.some(s => s.id === classId)
                          );
                          setFormData(prev => ({
                            ...prev,
                            classId,
                            courseId: course?.id || '',
                          }));
                        }}
                        className="w-full px-4 py-2.5 border border-black-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="">Select class</option>
                        {allClasses.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black-700 mb-1">Due Date *</label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-black-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-black-700 mb-1">Max Points</label>
                      <input
                        type="number"
                        placeholder="100"
                        value={formData.maxPoints}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxPoints: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 border border-black-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black-700 mb-1">Chapter</label>
                      <input
                        type="text"
                        placeholder="e.g., 3"
                        value={formData.chapterRef}
                        onChange={(e) => setFormData(prev => ({ ...prev, chapterRef: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-black-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                  </div>

                  {/* AI Quiz Generation */}
                  {formData.type === 'quiz' && formData.classId && formData.chapterRef && (
                    <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                      <button
                        onClick={handleGenerateQuiz}
                        disabled={isGeneratingQuiz}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {isGeneratingQuiz ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Generating Quiz...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Generate Quiz with AI
                          </>
                        )}
                      </button>
                      <p className="text-xs text-indigo-600 text-center mt-2">
                        AI will create questions based on Chapter {formData.chapterRef}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-black-100 bg-black-50">
                <p className="text-xs text-black-500">* Required fields</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-black-600 hover:bg-black-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateAssessment}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                  >
                    Create Assessment
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grading Modal */}
      <AnimatePresence>
        {showGradingModal && selectedAssessment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-black-100 bg-gradient-to-r from-green-50 to-teal-50 flex-shrink-0">
                <div>
                  <h3 className="text-lg font-semibold text-black-800">Grade Assessment</h3>
                  <p className="text-sm text-black-500">{selectedAssessment.title} • Max {selectedAssessment.maxPoints} pts</p>
                </div>
                <button
                  onClick={() => setShowGradingModal(false)}
                  className="p-2 hover:bg-white/50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-black-500" />
                </button>
              </div>
              
              {/* Quick Stats */}
              <div className="px-6 py-3 bg-black-50 border-b border-black-100 flex-shrink-0">
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-black-500">
                    <span className="font-semibold text-black-800">{selectedAssessment.section}</span> • {classStudents.length} students
                  </span>
                  <span className="text-black-500">
                    Submitted: <span className="font-semibold text-green-600">{selectedAssessment.submitted}</span>
                  </span>
                  <span className="text-black-500">
                    Graded: <span className="font-semibold text-indigo-600">{selectedAssessment.graded}</span>
                  </span>
                </div>
              </div>

              {/* Student List */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-2">
                  {classStudents.map((student, idx) => {
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
                            ? 'bg-white border-black-200 hover:border-indigo-200' 
                            : 'bg-black-50 border-black-100'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                          hasSubmitted ? 'bg-green-100 text-green-700' : 'bg-black-200 text-black-500'
                        }`}>
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-black-800">{student.name}</p>
                          <p className="text-xs text-black-500">
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
                                ? 'border-black-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300' 
                                : 'border-black-100 bg-black-100 text-black-400 cursor-not-allowed'
                            }`}
                          />
                          <span className="text-sm text-black-400">/ {selectedAssessment.maxPoints}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-black-100 bg-black-50 flex-shrink-0">
                <div className="text-sm text-black-500">
                  {Object.keys(grades).filter(k => grades[k] !== '').length} grades entered
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowGradingModal(false)}
                    className="px-4 py-2 text-black-600 hover:bg-black-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveGrades}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
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
    </PageShell>
  );
}
