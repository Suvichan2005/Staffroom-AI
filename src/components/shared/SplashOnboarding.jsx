import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Building2, Upload, FileText, BookOpen, 
  ChevronRight, ChevronLeft, Check, Loader2, 
  GraduationCap, Calendar, Sparkles, X, Plus,
  Clock, Trash2, Eye
} from 'lucide-react';
import { loadUserState, saveUserState } from '../../utils/userScopedStorage';
import { useTeacher } from '../../context/TeacherContext';

const ONBOARDING_COMPLETE_KEY = 'splash-onboarding:completed';

/**
 * SplashOnboarding - Full-screen purple splash onboarding flow
 * 
 * Flow:
 * 1. Welcome splash with choice: Individual or School/Institute
 * 2. For Individual:
 *    - Upload schedule (PDF/PNG/XLSX)
 *    - Extract and clarify sections
 *    - For each: grade, subject
 *    - Upload syllabus/lesson plan per subject
 * 3. For School: Admin uploads mappings
 */
export default function SplashOnboarding({ forceShow = false, onComplete }) {
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [onboardingType, setOnboardingType] = useState(null); // 'individual' | 'school'
  
  // Form state
  const [scheduleFile, setScheduleFile] = useState(null);
  const [extractedSections, setExtractedSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setIsVisible(true);
      setStep(0);
      setOnboardingType(null);
      return;
    }
    const completed = loadUserState(ONBOARDING_COMPLETE_KEY, false);
    if (!completed) {
      setIsVisible(true);
    }
  }, [forceShow]);

  const handleComplete = useCallback(() => {
    saveUserState(ONBOARDING_COMPLETE_KEY, true);
    setIsVisible(false);
    onComplete?.();
  }, [onComplete]);

  const handleClose = () => {
    // Mark as complete so it doesn't reopen
    saveUserState(ONBOARDING_COMPLETE_KEY, true);
    setIsVisible(false);
    onComplete?.();
  };

  const handleExploreUI = () => {
    // Mark as complete so it doesn't reopen
    saveUserState(ONBOARDING_COMPLETE_KEY, true);
    setIsVisible(false);
    onComplete?.();
  };

  // Simulate file processing and section extraction
  const processScheduleFile = async (file) => {
    setIsProcessing(true);
    // Simulate AI processing delay
    await new Promise(r => setTimeout(r, 2000));
    
    // Mock extracted sections - in production, this would call AI service
    const mockSections = [
      { id: '1', name: '8A', grade: '', subject: '', syllabus: null },
      { id: '2', name: '8B', grade: '', subject: '', syllabus: null },
      { id: '3', name: '9A', grade: '', subject: '', syllabus: null },
      { id: '4', name: '10C', grade: '', subject: '', syllabus: null },
    ];
    
    setExtractedSections(mockSections);
    setIsProcessing(false);
    setStep(3); // Move to section clarification
  };

  const updateSection = (index, field, value) => {
    setExtractedSections(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addSection = () => {
    setExtractedSections(prev => [
      ...prev,
      { id: String(Date.now()), name: '', grade: '', subject: '', syllabus: null }
    ]);
  };

  const removeSection = (index) => {
    setExtractedSections(prev => prev.filter((_, i) => i !== index));
  };

  if (!isVisible) return null;

  // Step components
  const steps = {
    // Step 0: Welcome splash
    welcome: (
      <motion.div
        key="welcome"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex flex-col items-center justify-center min-h-screen p-8 text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="w-24 h-24 mx-auto rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 shadow-2xl shadow-purple-500/20 border border-white/30">
            <span className="text-5xl font-bold text-white">S</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">Staffroom AI</h1>
          <p className="text-xl text-white">Your intelligent teaching companion</p>
        </motion.div>

        {/* Welcome message */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="max-w-md mb-12"
        >
          <h2 className="text-2xl font-semibold text-white mb-4">
            Welcome! Let's set you up
          </h2>
          <p className="text-white text-lg">
            We'll help you configure your classes and schedule in just a few steps.
          </p>
        </motion.div>

        {/* Options */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 w-full max-w-lg"
        >
          <button
            onClick={() => {
              setOnboardingType('individual');
              setStep(1);
            }}
            className="flex-1 group relative overflow-hidden rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md p-6 text-left transition-all border border-white/30 hover:border-white hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/20"
          >
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center mb-4 shadow-lg">
                <User className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Individual Teacher</h3>
              <p className="text-sm text-white">
                Set up your personal schedule and classes
              </p>
            </div>
            <ChevronRight className="absolute top-1/2 right-4 -translate-y-1/2 w-5 h-5 text-white group-hover:text-white group-hover:translate-x-1 transition-all" />
          </button>

          <button
            onClick={() => {
              setOnboardingType('school');
              setStep(1);
            }}
            className="flex-1 group relative overflow-hidden rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md p-6 text-left transition-all border border-white/30 hover:border-white hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/20"
          >
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center mb-4 shadow-lg">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">School / Institute</h3>
              <p className="text-sm text-white">
                Admin setup for entire institution
              </p>
            </div>
            <ChevronRight className="absolute top-1/2 right-4 -translate-y-1/2 w-5 h-5 text-white group-hover:text-white group-hover:translate-x-1 transition-all" />
          </button>
        </motion.div>

        {/* Explore UI link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 flex flex-col items-center gap-3"
        >
          <button
            onClick={handleExploreUI}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white hover:text-white text-sm font-medium transition-all"
          >
            <Eye className="w-4 h-4" />
            Just explore the UI first
          </button>
          <p className="text-xs text-white">You can complete setup anytime</p>
        </motion.div>
      </motion.div>
    ),

    // Step 1: Upload Schedule (Individual)
    uploadSchedule: (
      <motion.div
        key="upload-schedule"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        className="flex flex-col items-center justify-center min-h-screen p-8"
      >
        <div className="w-full max-w-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center mb-5 shadow-xl border border-white/30">
              <Calendar className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Upload Your Schedule</h2>
            <p className="text-white text-lg">
              Upload your weekly timetable and we'll extract your classes automatically
            </p>
          </div>

          {/* Upload area */}
          <div className="mb-8">
            <label 
              htmlFor="schedule-upload"
              className={`
                flex flex-col items-center justify-center w-full h-52 
                border-2 border-dashed rounded-2xl cursor-pointer 
                transition-all backdrop-blur-sm
                ${scheduleFile 
                  ? 'border-green-400 bg-green-500/15' 
                  : 'border-white hover:border-white bg-white/10 hover:bg-white/15'
                }
              `}
            >
              {scheduleFile ? (
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                    <Check className="w-7 h-7 text-green-400" />
                  </div>
                  <p className="text-white font-medium text-lg">{scheduleFile.name}</p>
                  <p className="text-sm text-white mt-2">Click to change file</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-white/10 flex items-center justify-center mb-3">
                    <Upload className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-white font-medium text-lg">Drop your schedule here</p>
                  <p className="text-sm text-white mt-2">PDF, PNG, or Excel file</p>
                </div>
              )}
              <input
                id="schedule-upload"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setScheduleFile(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>

          {/* Manual option */}
          <div className="text-center mb-8">
            <p className="text-white text-sm mb-3">or</p>
            <button
              onClick={() => {
                setExtractedSections([
                  { id: '1', name: '', grade: '', subject: '', syllabus: null }
                ]);
                setStep(3);
              }}
              className="text-white hover:text-white underline text-sm font-medium transition-colors"
            >
              Enter classes manually
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => setStep(0)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium transition-all border border-white/20"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => scheduleFile && processScheduleFile(scheduleFile)}
              disabled={!scheduleFile || isProcessing}
              className={`
                flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-medium transition-all
                ${scheduleFile && !isProcessing
                  ? 'bg-white text-purple-700 hover:bg-purple-50 shadow-lg'
                  : 'bg-white/20 text-white cursor-not-allowed'
                }
              `}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Extract Classes
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Skip this step */}
          <button
            onClick={handleExploreUI}
            className="w-full mt-6 flex items-center justify-center gap-2 text-sm text-white hover:text-white transition-colors"
          >
            <Eye className="w-4 h-4" />
            Skip and explore UI
          </button>
        </div>
      </motion.div>
    ),

    // Step 2: School Admin Upload
    schoolUpload: (
      <motion.div
        key="school-upload"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        className="flex flex-col items-center justify-center min-h-screen p-8"
      >
        <div className="w-full max-w-xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center mb-5 shadow-xl border border-white/30">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">School Setup</h2>
            <p className="text-white text-lg">
              Upload your institution's data files
            </p>
          </div>

          <div className="space-y-4 mb-8">
            {/* Teacher-Class Mapping */}
            <div className="p-5 rounded-xl bg-white/10 border border-white/25 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/25 to-white/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Teacher ↔ Class Mapping</h3>
                  <p className="text-sm text-white">Which teacher teaches which class</p>
                </div>
              </div>
              <label className="flex items-center justify-center w-full py-4 border border-dashed border-white rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <Upload className="w-5 h-5 text-white mr-2" />
                <span className="text-white font-medium">Upload Excel/CSV</span>
                <input type="file" className="hidden" accept=".xlsx,.xls,.csv" />
              </label>
            </div>

            {/* Student List */}
            <div className="p-5 rounded-xl bg-white/10 border border-white/25 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/25 to-white/10 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Student Lists</h3>
                  <p className="text-sm text-white">Class-wise student enrollment</p>
                </div>
              </div>
              <label className="flex items-center justify-center w-full py-4 border border-dashed border-white rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <Upload className="w-5 h-5 text-white mr-2" />
                <span className="text-white font-medium">Upload Excel/CSV</span>
                <input type="file" className="hidden" accept=".xlsx,.xls,.csv" />
              </label>
            </div>

            {/* Syllabus */}
            <div className="p-5 rounded-xl bg-white/10 border border-white/25 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/25 to-white/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Course Syllabus</h3>
                  <p className="text-sm text-white">Subject-wise syllabus documents</p>
                </div>
              </div>
              <label className="flex items-center justify-center w-full py-4 border border-dashed border-white rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <Upload className="w-5 h-5 text-white mr-2" />
                <span className="text-white font-medium">Upload PDFs</span>
                <input type="file" className="hidden" accept=".pdf" multiple />
              </label>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(0)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium transition-all border border-white/20"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleComplete}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white text-purple-700 hover:bg-purple-50 font-medium transition-all shadow-lg"
            >
              Complete Setup
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Skip this step */}
          <button
            onClick={handleExploreUI}
            className="w-full mt-6 flex items-center justify-center gap-2 text-sm text-white hover:text-white transition-colors"
          >
            <Eye className="w-4 h-4" />
            Skip and explore UI
          </button>
        </div>
      </motion.div>
    ),

    // Step 3: Clarify Sections
    clarifySections: (
      <motion.div
        key="clarify-sections"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        className="flex flex-col min-h-screen p-8"
      >
        <div className="flex-1 w-full max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center mb-5 shadow-xl border border-white/30">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Clarify Your Classes</h2>
            <p className="text-white text-lg">
              Tell us more about each class you teach
            </p>
          </div>

          {/* Sections list */}
          <div className="space-y-4 mb-8 max-h-[50vh] overflow-y-auto pr-2">
            {extractedSections.map((section, index) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-5 rounded-xl bg-white/10 border border-white/25 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">
                    Class {index + 1}
                  </span>
                  {extractedSections.length > 1 && (
                    <button
                      onClick={() => removeSection(index)}
                      className="p-1.5 rounded-lg text-white hover:text-red-400 hover:bg-white/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Section (e.g., 8A)"
                    value={section.name}
                    onChange={(e) => updateSection(index, 'name', e.target.value)}
                    className="px-4 py-3.5 rounded-xl bg-white/10 border border-white/25 text-black placeholder-black focus:outline-none focus:border-white focus:bg-white/15 transition-all"
                  />
                  <select
                    value={section.grade}
                    onChange={(e) => updateSection(index, 'grade', e.target.value)}
                    className="px-4 py-3.5 rounded-xl bg-white/10 border border-white/25 text-black focus:outline-none focus:border-white appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-purple-900">Select Grade</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i+1} value={String(i+1)} className="bg-purple-900">
                        Grade {i+1}
                      </option>
                    ))}
                    <option value="11" className="bg-purple-900">11th / 1st Year</option>
                    <option value="12" className="bg-purple-900">12th / 2nd Year</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Subject"
                    value={section.subject}
                    onChange={(e) => updateSection(index, 'subject', e.target.value)}
                    className="px-4 py-3.5 rounded-xl bg-white/10 border border-white/25 text-black placeholder-black focus:outline-none focus:border-white focus:bg-white/15 transition-all"
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Add more */}
          <button
            onClick={addSection}
            className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-white rounded-xl text-white hover:text-white hover:border-white hover:bg-white/5 transition-all mb-8 font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Another Class
          </button>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium transition-all border border-white/20"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={extractedSections.some(s => !s.name || !s.grade || !s.subject)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-medium transition-all
                ${extractedSections.every(s => s.name && s.grade && s.subject)
                  ? 'bg-white text-purple-700 hover:bg-purple-50 shadow-lg'
                  : 'bg-white/20 text-white cursor-not-allowed'
                }
              `}
            >
              Upload Syllabus
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Skip this step */}
          <button
            onClick={handleExploreUI}
            className="w-full mt-6 flex items-center justify-center gap-2 text-sm text-white hover:text-white transition-colors"
          >
            <Eye className="w-4 h-4" />
            Skip and explore UI
          </button>
        </div>
      </motion.div>
    ),

    // Step 4: Syllabus Upload
    syllabusUpload: (
      <motion.div
        key="syllabus-upload"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        className="flex flex-col min-h-screen p-8"
      >
        <div className="flex-1 w-full max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center mb-5 shadow-xl border border-white/30">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Upload Syllabus</h2>
            <p className="text-white text-lg">
              Upload lesson plans or syllabus sheets for each subject
            </p>
          </div>

          {/* Syllabus per subject */}
          <div className="space-y-4 mb-8 max-h-[50vh] overflow-y-auto pr-2">
            {/* Group by unique subjects */}
            {[...new Set(extractedSections.map(s => s.subject))].filter(Boolean).map((subject, index) => (
              <motion.div
                key={subject}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-5 rounded-xl bg-white/10 border border-white/25 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/25 to-white/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg">{subject}</h3>
                    <p className="text-sm text-white">
                      Taught in: {extractedSections.filter(s => s.subject === subject).map(s => s.name).join(', ')}
                    </p>
                  </div>
                </div>
                
                <label className="flex items-center justify-center w-full py-5 border border-dashed border-white rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                  <Upload className="w-5 h-5 text-white mr-2" />
                  <span className="text-white font-medium">Upload syllabus PDF or image of book index</span>
                  <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" />
                </label>
              </motion.div>
            ))}
          </div>

          {/* Info */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white/10 border border-white/20 mb-8 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-sm text-white">
              <strong className="text-white">Pro tip:</strong> Upload your book's index page or course handout. 
              We'll automatically extract chapters, topics, and page numbers.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => setStep(3)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium transition-all border border-white/20"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleComplete}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white text-purple-700 hover:bg-purple-50 font-medium transition-all shadow-lg"
            >
              Complete Setup
              <Check className="w-4 h-4" />
            </button>
          </div>

          {/* Skip */}
          <button
            onClick={handleExploreUI}
            className="w-full mt-6 flex items-center justify-center gap-2 text-sm text-white hover:text-white transition-colors"
          >
            <Eye className="w-4 h-4" />
            Skip and explore UI
          </button>
        </div>
      </motion.div>
    ),
  };

  // Determine which step to show
  const getStepContent = () => {
    if (step === 0) return steps.welcome;
    if (onboardingType === 'school' && step === 1) return steps.schoolUpload;
    if (onboardingType === 'individual') {
      if (step === 1) return steps.uploadSchedule;
      if (step === 3) return steps.clarifySections;
      if (step === 4) return steps.syllabusUpload;
    }
    return steps.welcome;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] isolate bg-gradient-to-br from-purple-700 via-indigo-700 to-purple-800 overflow-auto"
      style={{ zIndex: 9999 }}
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-[500px] h-[500px] bg-pink-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-[100px]" />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* Progress indicator */}
      {step > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10"
        >
          {[1, 2, 3, 4].slice(0, onboardingType === 'school' ? 2 : 4).map((s, i) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                i + 1 <= (onboardingType === 'school' ? step : step)
                  ? 'w-10 bg-white shadow-lg shadow-white/30'
                  : 'w-5 bg-white/30'
              }`}
            />
          ))}
        </motion.div>
      )}

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-6 right-6 p-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white hover:text-white transition-all z-10 border border-white/20 hover:border-white group"
        title="Close onboarding"
      >
        <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
      </button>

      {/* Content */}
      <AnimatePresence mode="wait">
        {getStepContent()}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Hook to control splash onboarding
 */
export function useSplashOnboarding() {
  const [isComplete, setIsComplete] = useState(() => 
    loadUserState(ONBOARDING_COMPLETE_KEY, false)
  );

  const reset = () => {
    saveUserState(ONBOARDING_COMPLETE_KEY, false);
    setIsComplete(false);
  };

  const markComplete = () => {
    saveUserState(ONBOARDING_COMPLETE_KEY, true);
    setIsComplete(true);
  };

  return { isComplete, reset, markComplete };
}
