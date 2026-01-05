import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Users, Calendar, Upload, CheckCircle2, 
  ChevronRight, ChevronLeft, X, School, UserPlus,
  FileSpreadsheet, Clock, Sparkles
} from 'lucide-react';
import { useTeacher } from '../../context/TeacherContext';

/**
 * AdminOnboardingWizard - Multi-step wizard for school setup
 * 
 * Steps:
 * 1. School Profile (name, address, academic year)
 * 2. Class Structure (grades, sections)
 * 3. Invite Teachers (email invitations)
 * 4. Upload Students (CSV or manual)
 * 5. Review & Launch
 */
export default function AdminOnboardingWizard({ onComplete, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [schoolData, setSchoolData] = useState({
    // Step 1: School Profile
    schoolName: '',
    address: '',
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    principalName: '',
    contactEmail: '',
    
    // Step 2: Class Structure
    grades: [
      { grade: 6, sections: ['A', 'B'] },
      { grade: 7, sections: ['A', 'B'] },
      { grade: 8, sections: ['A', 'B'] },
    ],
    
    // Step 3: Teachers
    teacherInvites: [],
    
    // Step 4: Students (CSV data or manual entries)
    studentUploadMethod: 'csv', // 'csv' | 'manual'
    studentsCsvData: null,
    studentsManual: [],
  });

  const steps = [
    { id: 'school', title: 'School Profile', icon: Building2 },
    { id: 'classes', title: 'Class Structure', icon: School },
    { id: 'teachers', title: 'Invite Teachers', icon: UserPlus },
    { id: 'students', title: 'Add Students', icon: Users },
    { id: 'review', title: 'Review & Launch', icon: Sparkles },
  ];

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Save school data to context/storage
    console.log('[AdminOnboarding] School setup complete:', schoolData);
    onComplete?.(schoolData);
  };

  const updateSchoolData = (updates) => {
    setSchoolData(prev => ({ ...prev, ...updates }));
  };

  // Step 1: School Profile
  const SchoolProfileStep = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-black-700 mb-1">
          School Name *
        </label>
        <input
          type="text"
          value={schoolData.schoolName}
          onChange={(e) => updateSchoolData({ schoolName: e.target.value })}
          placeholder="e.g., Delhi Public School"
          className="w-full px-4 py-3 border border-black-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-black-700 mb-1">
          School Address
        </label>
        <textarea
          value={schoolData.address}
          onChange={(e) => updateSchoolData({ address: e.target.value })}
          placeholder="Full address"
          rows={2}
          className="w-full px-4 py-3 border border-black-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all resize-none"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-black-700 mb-1">
            Academic Year
          </label>
          <input
            type="text"
            value={schoolData.academicYear}
            onChange={(e) => updateSchoolData({ academicYear: e.target.value })}
            placeholder="2025-2026"
            className="w-full px-4 py-3 border border-black-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-black-700 mb-1">
            Principal Name
          </label>
          <input
            type="text"
            value={schoolData.principalName}
            onChange={(e) => updateSchoolData({ principalName: e.target.value })}
            placeholder="Dr. Sharma"
            className="w-full px-4 py-3 border border-black-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-black-700 mb-1">
          Contact Email
        </label>
        <input
          type="email"
          value={schoolData.contactEmail}
          onChange={(e) => updateSchoolData({ contactEmail: e.target.value })}
          placeholder="admin@school.edu"
          className="w-full px-4 py-3 border border-black-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
        />
      </div>
    </div>
  );

  // Step 2: Class Structure
  const ClassStructureStep = () => {
    const addGrade = () => {
      const lastGrade = schoolData.grades[schoolData.grades.length - 1]?.grade || 5;
      updateSchoolData({
        grades: [...schoolData.grades, { grade: lastGrade + 1, sections: ['A'] }]
      });
    };

    const removeGrade = (index) => {
      updateSchoolData({
        grades: schoolData.grades.filter((_, i) => i !== index)
      });
    };

    const updateGradeSections = (index, sections) => {
      const newGrades = [...schoolData.grades];
      newGrades[index].sections = sections;
      updateSchoolData({ grades: newGrades });
    };

    const addSection = (gradeIndex) => {
      const currentSections = schoolData.grades[gradeIndex].sections;
      const lastSection = currentSections[currentSections.length - 1] || '@';
      const nextSection = String.fromCharCode(lastSection.charCodeAt(0) + 1);
      if (nextSection <= 'Z') {
        updateGradeSections(gradeIndex, [...currentSections, nextSection]);
      }
    };

    const removeSection = (gradeIndex, sectionIndex) => {
      const newSections = schoolData.grades[gradeIndex].sections.filter((_, i) => i !== sectionIndex);
      if (newSections.length > 0) {
        updateGradeSections(gradeIndex, newSections);
      }
    };

    return (
      <div className="space-y-6">
        <p className="text-sm text-black-500">
          Define the grades and sections in your school. You can add or remove as needed.
        </p>
        
        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
          {schoolData.grades.map((gradeData, gradeIdx) => (
            <div 
              key={gradeIdx}
              className="p-4 bg-black-50 rounded-xl border border-black-200"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-black-700">Grade {gradeData.grade}</span>
                {schoolData.grades.length > 1 && (
                  <button
                    onClick={() => removeGrade(gradeIdx)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {gradeData.sections.map((section, secIdx) => (
                  <span 
                    key={secIdx}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium"
                  >
                    {gradeData.grade}{section}
                    {gradeData.sections.length > 1 && (
                      <button
                        onClick={() => removeSection(gradeIdx, secIdx)}
                        className="ml-1 text-indigo-500 hover:text-indigo-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
                <button
                  onClick={() => addSection(gradeIdx)}
                  className="px-3 py-1.5 border-2 border-dashed border-black-300 text-black-500 rounded-lg text-sm hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  + Section
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={addGrade}
          className="w-full py-3 border-2 border-dashed border-black-300 text-black-600 rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
        >
          <span>+ Add Grade</span>
        </button>
        
        <div className="p-4 bg-indigo-50 rounded-xl">
          <p className="text-sm text-indigo-700">
            <strong>Summary:</strong> {schoolData.grades.length} grades, {' '}
            {schoolData.grades.reduce((sum, g) => sum + g.sections.length, 0)} total sections
          </p>
        </div>
      </div>
    );
  };

  // Step 3: Invite Teachers
  const InviteTeachersStep = () => {
    const [newEmail, setNewEmail] = useState('');
    const [newSubject, setNewSubject] = useState('');

    const addTeacher = () => {
      if (newEmail && newEmail.includes('@')) {
        updateSchoolData({
          teacherInvites: [...schoolData.teacherInvites, { 
            email: newEmail.toLowerCase().trim(), 
            subject: newSubject || 'General',
            status: 'pending'
          }]
        });
        setNewEmail('');
        setNewSubject('');
      }
    };

    const removeTeacher = (index) => {
      updateSchoolData({
        teacherInvites: schoolData.teacherInvites.filter((_, i) => i !== index)
      });
    };

    return (
      <div className="space-y-6">
        <p className="text-sm text-black-500">
          Add teacher email addresses. They'll receive an invitation to join your school on Staffroom.
        </p>
        
        <div className="flex gap-3">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="teacher@school.edu"
            className="flex-1 px-4 py-3 border border-black-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
            onKeyDown={(e) => e.key === 'Enter' && addTeacher()}
          />
          <select
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            className="px-4 py-3 border border-black-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
          >
            <option value="">Subject</option>
            <option value="Geography">Geography</option>
            <option value="History">History</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Science">Science</option>
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Other">Other</option>
          </select>
          <button
            onClick={addTeacher}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
          >
            Add
          </button>
        </div>
        
        {schoolData.teacherInvites.length > 0 ? (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {schoolData.teacherInvites.map((teacher, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-3 bg-black-50 rounded-xl"
              >
                <div>
                  <p className="font-medium text-black-700">{teacher.email}</p>
                  <p className="text-xs text-black-500">{teacher.subject}</p>
                </div>
                <button
                  onClick={() => removeTeacher(idx)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-black-400">
            <UserPlus className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No teachers added yet</p>
          </div>
        )}
        
        <p className="text-xs text-black-400">
          💡 You can also skip this step and invite teachers later from Admin Dashboard.
        </p>
      </div>
    );
  };

  // Step 4: Add Students
  const AddStudentsStep = () => {
    const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        // In production, parse CSV here
        updateSchoolData({ studentsCsvData: file.name });
      }
    };

    return (
      <div className="space-y-6">
        <p className="text-sm text-black-500">
          Upload a CSV file with student data or add them manually later.
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => updateSchoolData({ studentUploadMethod: 'csv' })}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              schoolData.studentUploadMethod === 'csv'
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-black-200 hover:border-indigo-300'
            }`}
          >
            <FileSpreadsheet className={`w-8 h-8 mb-3 ${
              schoolData.studentUploadMethod === 'csv' ? 'text-indigo-600' : 'text-black-400'
            }`} />
            <p className="font-medium text-black-700">Upload CSV</p>
            <p className="text-xs text-black-500 mt-1">Bulk import from spreadsheet</p>
          </button>
          
          <button
            onClick={() => updateSchoolData({ studentUploadMethod: 'manual' })}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              schoolData.studentUploadMethod === 'manual'
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-black-200 hover:border-indigo-300'
            }`}
          >
            <Users className={`w-8 h-8 mb-3 ${
              schoolData.studentUploadMethod === 'manual' ? 'text-indigo-600' : 'text-black-400'
            }`} />
            <p className="font-medium text-black-700">Add Later</p>
            <p className="text-xs text-black-500 mt-1">Skip for now, add manually</p>
          </button>
        </div>
        
        {schoolData.studentUploadMethod === 'csv' && (
          <div className="p-6 border-2 border-dashed border-black-300 rounded-xl text-center">
            <Upload className="w-10 h-10 mx-auto mb-3 text-black-400" />
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="student-csv-upload"
            />
            <label
              htmlFor="student-csv-upload"
              className="cursor-pointer text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Click to upload CSV file
            </label>
            {schoolData.studentsCsvData && (
              <p className="text-sm text-green-600 mt-2 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                {schoolData.studentsCsvData}
              </p>
            )}
            <p className="text-xs text-black-400 mt-3">
              Required columns: Name, Roll Number, Class, Section
            </p>
          </div>
        )}
        
        {schoolData.studentUploadMethod === 'manual' && (
          <div className="p-6 bg-black-50 rounded-xl text-center">
            <Clock className="w-10 h-10 mx-auto mb-3 text-black-400" />
            <p className="text-black-600">You can add students from the Admin Dashboard after setup</p>
          </div>
        )}
      </div>
    );
  };

  // Step 5: Review & Launch
  const ReviewStep = () => (
    <div className="space-y-6">
      <div className="p-4 bg-green-50 rounded-xl border border-green-200">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          <p className="font-medium text-green-700">You're all set to launch!</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="p-4 bg-black-50 rounded-xl">
          <h4 className="font-medium text-black-700 mb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> School
          </h4>
          <p className="text-black-600">{schoolData.schoolName || 'Not set'}</p>
          <p className="text-sm text-black-500">{schoolData.academicYear}</p>
        </div>
        
        <div className="p-4 bg-black-50 rounded-xl">
          <h4 className="font-medium text-black-700 mb-2 flex items-center gap-2">
            <School className="w-4 h-4" /> Structure
          </h4>
          <p className="text-black-600">
            {schoolData.grades.length} grades, {' '}
            {schoolData.grades.reduce((sum, g) => sum + g.sections.length, 0)} sections
          </p>
          <p className="text-sm text-black-500">
            {schoolData.grades.map(g => `Grade ${g.grade}`).join(', ')}
          </p>
        </div>
        
        <div className="p-4 bg-black-50 rounded-xl">
          <h4 className="font-medium text-black-700 mb-2 flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Teachers
          </h4>
          <p className="text-black-600">
            {schoolData.teacherInvites.length} teachers to invite
          </p>
        </div>
        
        <div className="p-4 bg-black-50 rounded-xl">
          <h4 className="font-medium text-black-700 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4" /> Students
          </h4>
          <p className="text-black-600">
            {schoolData.studentUploadMethod === 'csv' 
              ? (schoolData.studentsCsvData ? 'CSV uploaded' : 'Upload pending')
              : 'Will add later'
            }
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0: return <SchoolProfileStep />;
      case 1: return <ClassStructureStep />;
      case 2: return <InviteTeachersStep />;
      case 3: return <AddStudentsStep />;
      case 4: return <ReviewStep />;
      default: return null;
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0: return schoolData.schoolName.trim().length > 0;
      case 1: return schoolData.grades.length > 0;
      case 2: return true; // Optional step
      case 3: return true; // Optional step  
      case 4: return true;
      default: return true;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black-900/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">School Setup Wizard</h2>
              <p className="text-indigo-100 text-sm">Step {currentStep + 1} of {steps.length}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-black-200">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <div 
                key={step.id}
                className={`flex items-center ${idx < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all
                  ${idx < currentStep 
                    ? 'bg-green-500 text-white' 
                    : idx === currentStep 
                      ? 'bg-indigo-600 text-white'
                      : 'bg-black-100 text-black-400'
                  }
                `}>
                  {idx < currentStep ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${
                    idx < currentStep ? 'bg-green-500' : 'bg-black-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-center">
            <p className="text-sm font-medium text-black-700">{steps[currentStep].title}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[350px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black-200 flex justify-between">
          <button
            onClick={goBack}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
              currentStep === 0
                ? 'text-black-300 cursor-not-allowed'
                : 'text-black-600 hover:bg-black-100'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          
          {currentStep === steps.length - 1 ? (
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
            >
              <Sparkles className="w-5 h-5" />
              Launch School
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!isStepValid()}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-colors ${
                isStepValid()
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-black-200 text-black-400 cursor-not-allowed'
              }`}
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
