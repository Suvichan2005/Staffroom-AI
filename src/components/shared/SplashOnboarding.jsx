import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Building2, Upload, FileText, BookOpen, 
  ChevronRight, ChevronLeft, Check, Loader2, 
  GraduationCap, Calendar, Sparkles, X, Plus,
  Clock, Trash2, Eye, AlertCircle, Users
} from 'lucide-react';
import { loadUserState, saveUserState } from '../../utils/userScopedStorage';
import { useTeacher } from '../../context/TeacherContext';
import {
  processScheduleDocument,
  processStudentDocument,
  processTeacherMappingDocument,
  processSyllabusDocument,
  processOnboardingDocument,
} from '../../services/onboardingAgent';

const ONBOARDING_COMPLETE_KEY = 'splash-onboarding:completed';

// Progress stage labels
const STAGE_LABELS = {
  reading: 'Reading file\u2026',
  analyzing: 'AI is analysing\u2026',
  extracting: 'Extracting data\u2026',
  finalizing: 'Almost done\u2026',
};

/**
 * SplashOnboarding - Full-screen purple splash onboarding flow
 * 
 * Flow:
 * 1. Welcome splash with choice: Individual or School/Institute
 * 2. For Individual:
 *    - Upload schedule (PDF/PNG/XLSX)
 *    - AI agent extracts classes + schedules automatically
 *    - Clarify / edit extracted sections
 *    - Upload syllabus per subject
 * 3. For School: Admin uploads mappings, student lists, etc.
 */
export default function SplashOnboarding({ forceShow = false, onComplete }) {
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [onboardingType, setOnboardingType] = useState(null);
  
  // Form state
  const [scheduleFile, setScheduleFile] = useState(null);
  const [extractedSections, setExtractedSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [parseError, setParseError] = useState('');

  // School flow state
  const [schoolFiles, setSchoolFiles] = useState({
    teacherMapping: null,
    studentList: null,
    syllabus: null,
  });
  const [schoolResults, setSchoolResults] = useState({
    teacherMapping: null,
    studentList: null,
    syllabus: null,
  });
  const [schoolProcessing, setSchoolProcessing] = useState({});
  const [schoolErrors, setSchoolErrors] = useState({});

  // Finalize state
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState('');

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

  const handleComplete = useCallback(async () => {
    // Actually create courses / sections from extracted data
    if (extractedSections.length > 0 && teacherCtx) {
      setIsFinalizing(true);
      setFinalizeError('');
      try {
        // Group sections by subject to create courses
        const bySubject = {};
        for (const sec of extractedSections) {
          const key = sec.subject || 'General';
          if (!bySubject[key]) bySubject[key] = [];
          bySubject[key].push(sec);
        }

        for (const [subject, sections] of Object.entries(bySubject)) {
          const grade = sections[0]?.grade || '';
          const course = teacherCtx.createCourse({
            title: `${subject}${grade ? ` Grade ${grade}` : ''}`,
            subject,
            grade,
          });
          if (course) {
            for (const sec of sections) {
              const scheduleStrings = (sec.schedules || []).map(
                (s) => `${s.day} ${s.startTime}\u2013${s.endTime}`,
              );
              teacherCtx.createSection(course.id, {
                id: sec.name || sec.id,
                schedules: scheduleStrings,
              });
            }
          }
        }
      } catch (err) {
        console.error('Finalize error:', err);
        setFinalizeError(err.message);
        setIsFinalizing(false);
        return;
      }
      setIsFinalizing(false);
    }

    saveUserState(ONBOARDING_COMPLETE_KEY, true);
    setIsVisible(false);
    onComplete?.();
  }, [onComplete, extractedSections, teacherCtx]);

  const handleClose = () => {
    saveUserState(ONBOARDING_COMPLETE_KEY, true);
    setIsVisible(false);
    onComplete?.();
  };

  const handleExploreUI = () => {
    saveUserState(ONBOARDING_COMPLETE_KEY, true);
    setIsVisible(false);
    onComplete?.();
  };

  // ---- INDIVIDUAL FLOW: AI agent schedule parsing ----
  const processScheduleFile = async (file) => {
    setIsProcessing(true);
    setParseError('');
    setProcessingStage('reading');

    try {
      const result = await processScheduleDocument(file, (stage) =>
        setProcessingStage(stage),
      );

      if (!result.success) {
        setParseError(
          result.error ||
            result.data?.suggestion ||
            'Could not extract schedule data from this file. Try a different format.',
        );
        setIsProcessing(false);
        return;
      }

      // Convert agent output into editable section objects
      const classes = result.data?.classes || [];
      if (classes.length === 0) {
        setParseError(
          'The AI found no classes in this document. Try a clearer timetable image or file.',
        );
        setIsProcessing(false);
        return;
      }

      const sections = classes.map((cls, i) => ({
        id: String(i + 1),
        name: cls.className || '',
        grade: cls.grade || '',
        subject: cls.subject || '',
        schedules: (cls.schedules || []).map((s) => ({
          day: s.day,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
        syllabus: null,
      }));

      setExtractedSections(sections);
      setIsProcessing(false);
      setStep(3);
    } catch (err) {
      console.error('Schedule processing error:', err);
      setParseError(err.message || 'An unexpected error occurred.');
      setIsProcessing(false);
    }
  };

  // ---- SCHOOL FLOW: AI agent for each doc type ----
  const processSchoolFile = async (type, file) => {
    setSchoolFiles((p) => ({ ...p, [type]: file }));
    setSchoolProcessing((p) => ({ ...p, [type]: true }));
    setSchoolErrors((p) => ({ ...p, [type]: '' }));

    try {
      let result;
      switch (type) {
        case 'teacherMapping':
          result = await processTeacherMappingDocument(file);
          break;
        case 'studentList':
          result = await processStudentDocument(file);
          break;
        case 'syllabus':
          result = await processSyllabusDocument(file);
          break;
        default:
          result = await processOnboardingDocument(file);
      }

      if (!result.success) {
        setSchoolErrors((p) => ({
          ...p,
          [type]:
            result.error ||
            result.data?.suggestion ||
            'Could not extract data from this file.',
        }));
      } else {
        setSchoolResults((p) => ({ ...p, [type]: result }));
      }
    } catch (err) {
      setSchoolErrors((p) => ({ ...p, [type]: err.message }));
    } finally {
      setSchoolProcessing((p) => ({ ...p, [type]: false }));
    }
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
      { id: String(Date.now()), name: '', grade: '', subject: '', schedules: [], syllabus: null }
    ]);
  };

  const removeSection = (index) => {
    setExtractedSections(prev => prev.filter((_, i) => i !== index));
  };

  if (!isVisible) return null;

  // ================================================================
  // STEP COMPONENTS
  // ================================================================
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
              Upload your weekly timetable and our AI will extract your classes automatically
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
                  <p className="text-sm text-white mt-2">PDF, PNG, JPEG, Excel, or CSV</p>
                </div>
              )}
              <input
                id="schedule-upload"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setScheduleFile(e.target.files[0]);
                    setParseError('');
                  }
                }}
              />
            </label>
          </div>

          {/* Error display */}
          {parseError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-400/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{parseError}</p>
            </div>
          )}

          {/* Manual option */}
          <div className="text-center mb-8">
            <p className="text-white text-sm mb-3">or</p>
            <button
              onClick={() => {
                setExtractedSections([
                  { id: '1', name: '', grade: '', subject: '', schedules: [], syllabus: null }
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
                  {STAGE_LABELS[processingStage] || 'Processing\u2026'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Extract with AI
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
              Upload your institution's files \u2014 AI will read and extract everything
            </p>
          </div>

          <div className="space-y-4 mb-8">
            {/* Teacher-Class Mapping */}
            <SchoolFileUpload
              icon={User}
              title="Teacher \u2194 Class Mapping"
              subtitle="Which teacher teaches which class"
              file={schoolFiles.teacherMapping}
              processing={schoolProcessing.teacherMapping}
              error={schoolErrors.teacherMapping}
              result={schoolResults.teacherMapping}
              resultLabel={
                schoolResults.teacherMapping
                  ? `${schoolResults.teacherMapping.data?.mappings?.length || 0} teacher mappings found`
                  : null
              }
              onUpload={(file) => processSchoolFile('teacherMapping', file)}
            />

            {/* Student List */}
            <SchoolFileUpload
              icon={GraduationCap}
              title="Student Lists"
              subtitle="Class-wise student enrolment"
              file={schoolFiles.studentList}
              processing={schoolProcessing.studentList}
              error={schoolErrors.studentList}
              result={schoolResults.studentList}
              resultLabel={
                schoolResults.studentList
                  ? `${schoolResults.studentList.data?.students?.length || 0} students found`
                  : null
              }
              onUpload={(file) => processSchoolFile('studentList', file)}
            />

            {/* Syllabus */}
            <SchoolFileUpload
              icon={BookOpen}
              title="Course Syllabus"
              subtitle="Subject-wise syllabus documents"
              file={schoolFiles.syllabus}
              processing={schoolProcessing.syllabus}
              error={schoolErrors.syllabus}
              result={schoolResults.syllabus}
              resultLabel={
                schoolResults.syllabus
                  ? `${schoolResults.syllabus.data?.chapters?.length || 0} chapters found`
                  : null
              }
              onUpload={(file) => processSchoolFile('syllabus', file)}
            />
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
              Review what the AI extracted \u2014 edit anything that looks off
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
                    {section.schedules?.length > 0 && (
                      <span className="ml-2 text-green-300 normal-case">
                        ({section.schedules.length} period{section.schedules.length > 1 ? 's' : ''} found)
                      </span>
                    )}
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
                    className="px-4 py-3.5 rounded-xl bg-white/10 border border-white/25 text-white placeholder-white/50 focus:outline-none focus:border-white focus:bg-white/15 transition-all"
                  />
                  <select
                    value={section.grade}
                    onChange={(e) => updateSection(index, 'grade', e.target.value)}
                    className="px-4 py-3.5 rounded-xl bg-white/10 border border-white/25 text-white focus:outline-none focus:border-white appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-purple-900 text-white">Select Grade</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i+1} value={String(i+1)} className="bg-purple-900 text-white">
                        Grade {i+1}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Subject"
                    value={section.subject}
                    onChange={(e) => updateSection(index, 'subject', e.target.value)}
                    className="px-4 py-3.5 rounded-xl bg-white/10 border border-white/25 text-white placeholder-white/50 focus:outline-none focus:border-white focus:bg-white/15 transition-all"
                  />
                </div>

                {/* Schedule preview */}
                {section.schedules?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {section.schedules.map((s, si) => (
                      <span key={si} className="text-xs px-2 py-1 rounded-lg bg-white/10 text-white/80 border border-white/15">
                        <Clock className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                        {s.day} {s.startTime}\u2013{s.endTime}
                      </span>
                    ))}
                  </div>
                )}
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
              Upload lesson plans or syllabus sheets \u2014 AI will extract chapters and topics
            </p>
          </div>

          {/* Syllabus per subject */}
          <div className="space-y-4 mb-8 max-h-[50vh] overflow-y-auto pr-2">
            {[...new Set(extractedSections.map(s => s.subject))].filter(Boolean).map((subject, index) => (
              <SyllabusUploadCard
                key={subject}
                subject={subject}
                sections={extractedSections.filter(s => s.subject === subject)}
                index={index}
              />
            ))}
          </div>

          {/* Info */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white/10 border border-white/20 mb-8 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-sm text-white">
              <strong className="text-white">Pro tip:</strong> Upload your book's index page or course handout. 
              AI will automatically extract chapters, topics, and page numbers.
            </p>
          </div>

          {/* Finalize error */}
          {finalizeError && (
            <div className="mb-4 p-4 rounded-xl bg-red-500/20 border border-red-400/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{finalizeError}</p>
            </div>
          )}

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
              disabled={isFinalizing}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white text-purple-700 hover:bg-purple-50 font-medium transition-all shadow-lg"
            >
              {isFinalizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Complete Setup
                  <Check className="w-4 h-4" />
                </>
              )}
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
                i + 1 <= step
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

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * School file upload card
 */
function SchoolFileUpload({ icon: Icon, title, subtitle, file, processing, error, result, resultLabel, onUpload }) {
  const inputRef = useRef(null);

  return (
    <div className="p-5 rounded-xl bg-white/10 border border-white/25 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/25 to-white/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-sm text-white/70">{subtitle}</p>
        </div>
        {result && (
          <div className="flex items-center gap-1 text-green-300 text-sm">
            <Check className="w-4 h-4" />
            Done
          </div>
        )}
      </div>

      {resultLabel && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-green-500/15 border border-green-400/20 text-sm text-green-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {resultLabel}
        </div>
      )}

      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/15 border border-red-400/20 text-sm text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <label className="flex items-center justify-center w-full py-4 border border-dashed border-white/50 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 text-white mr-2 animate-spin" />
            <span className="text-white font-medium">AI is reading\u2026</span>
          </>
        ) : file ? (
          <>
            <FileText className="w-5 h-5 text-white mr-2" />
            <span className="text-white font-medium">{file.name}</span>
            <span className="text-white/50 text-sm ml-2">(click to re-upload)</span>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 text-white mr-2" />
            <span className="text-white font-medium">Upload file</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.webp,.txt"
          disabled={processing}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
          }}
        />
      </label>
    </div>
  );
}

/**
 * Syllabus upload card per subject
 */
function SyllabusUploadCard({ subject, sections, index }) {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleUpload = async (f) => {
    setFile(f);
    setProcessing(true);
    setError('');

    try {
      const res = await processSyllabusDocument(f);
      if (res.success) {
        setResult(res);
      } else {
        setError(res.error || 'Could not extract syllabus data.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-5 rounded-xl bg-white/10 border border-white/25 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/25 to-white/10 flex items-center justify-center">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white text-lg">{subject}</h3>
          <p className="text-sm text-white/70">
            Taught in: {sections.map(s => s.name).join(', ')}
          </p>
        </div>
        {result && (
          <span className="text-green-300 text-sm flex items-center gap-1">
            <Check className="w-4 h-4" />
            {result.data?.chapters?.length || 0} chapters
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/15 border border-red-400/20 text-sm text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <label className="flex items-center justify-center w-full py-5 border border-dashed border-white/50 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 text-white mr-2 animate-spin" />
            <span className="text-white font-medium">AI extracting chapters\u2026</span>
          </>
        ) : file ? (
          <>
            <FileText className="w-5 h-5 text-white mr-2" />
            <span className="text-white font-medium">{file.name}</span>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 text-white mr-2" />
            <span className="text-white font-medium">Upload syllabus PDF or image of book index</span>
          </>
        )}
        <input
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.webp,.txt"
          disabled={processing}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
        />
      </label>
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
