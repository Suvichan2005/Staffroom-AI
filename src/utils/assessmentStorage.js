/**
 * Assessment Management Utilities
 * Create, update, delete assessments
 * Save to localStorage for persistence
 */

const ASSESSMENTS_STORAGE_KEY = 'staffroom_assessments';

/**
 * Get all stored assessments
 */
export function getStoredAssessments() {
  try {
    const stored = localStorage.getItem(ASSESSMENTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading assessments:', error);
    return [];
  }
}

/**
 * Save assessments to storage
 */
function saveAssessments(assessments) {
  try {
    localStorage.setItem(ASSESSMENTS_STORAGE_KEY, JSON.stringify(assessments));
    return true;
  } catch (error) {
    console.error('Error saving assessments:', error);
    return false;
  }
}

/**
 * Generate unique ID for assessment
 */
function generateAssessmentId() {
  return `asmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new assessment
 * @param {object} assessmentData - Assessment details
 * @returns {object} Created assessment
 */
export function createAssessment(assessmentData) {
  const {
    title,
    description,
    courseId,
    classId,
    type,
    dueDate,
    maxPoints,
    chapterRef,
    questions,
    instructions,
  } = assessmentData;

  const newAssessment = {
    id: generateAssessmentId(),
    title,
    description: description || '',
    courseId,
    classId,
    type, // 'assignment', 'quiz', 'unit-test', 'mid-term', 'final', 'project'
    dueDate,
    createdDate: new Date().toISOString(),
    maxPoints: maxPoints || 100,
    chapterRef: chapterRef || null,
    questions: questions || [],
    instructions: instructions || '',
    submissions: [],
    status: 'active', // 'active', 'graded', 'archived'
  };

  const assessments = getStoredAssessments();
  assessments.push(newAssessment);
  saveAssessments(assessments);

  return newAssessment;
}

/**
 * Update an existing assessment
 */
export function updateAssessment(assessmentId, updates) {
  const assessments = getStoredAssessments();
  const index = assessments.findIndex(a => a.id === assessmentId);

  if (index === -1) {
    throw new Error('Assessment not found');
  }

  assessments[index] = {
    ...assessments[index],
    ...updates,
    updatedDate: new Date().toISOString(),
  };

  saveAssessments(assessments);
  return assessments[index];
}

/**
 * Delete an assessment
 */
export function deleteAssessment(assessmentId) {
  const assessments = getStoredAssessments();
  const filtered = assessments.filter(a => a.id !== assessmentId);

  if (filtered.length === assessments.length) {
    throw new Error('Assessment not found');
  }

  saveAssessments(filtered);
  return true;
}

/**
 * Get assessment by ID
 */
export function getAssessmentById(assessmentId) {
  const assessments = getStoredAssessments();
  return assessments.find(a => a.id === assessmentId);
}

/**
 * Get assessments for a specific class
 */
export function getAssessmentsForClass(classId) {
  const assessments = getStoredAssessments();
  return assessments.filter(a => a.classId === classId);
}

/**
 * Get assessments for a specific course
 */
export function getAssessmentsForCourse(courseId) {
  const assessments = getStoredAssessments();
  return assessments.filter(a => a.courseId === courseId);
}

/**
 * Submit an assessment (student submission)
 */
export function submitAssessment(assessmentId, studentId, submissionData) {
  const assessments = getStoredAssessments();
  const index = assessments.findIndex(a => a.id === assessmentId);

  if (index === -1) {
    throw new Error('Assessment not found');
  }

  const submission = {
    studentId,
    submittedDate: new Date().toISOString(),
    answers: submissionData.answers || [],
    attachments: submissionData.attachments || [],
    grade: undefined, // Not graded yet
    feedback: '',
  };

  // Check if student already submitted
  const existingIndex = assessments[index].submissions.findIndex(
    s => s.studentId === studentId
  );

  if (existingIndex >= 0) {
    // Update existing submission
    assessments[index].submissions[existingIndex] = {
      ...assessments[index].submissions[existingIndex],
      ...submission,
      resubmittedDate: new Date().toISOString(),
    };
  } else {
    // Add new submission
    assessments[index].submissions.push(submission);
  }

  saveAssessments(assessments);
  return assessments[index];
}

/**
 * Grade a submission
 */
export function gradeSubmission(assessmentId, studentId, grade, feedback = '') {
  const assessments = getStoredAssessments();
  const index = assessments.findIndex(a => a.id === assessmentId);

  if (index === -1) {
    throw new Error('Assessment not found');
  }

  const submissionIndex = assessments[index].submissions.findIndex(
    s => s.studentId === studentId
  );

  if (submissionIndex === -1) {
    throw new Error('Submission not found');
  }

  assessments[index].submissions[submissionIndex].grade = grade;
  assessments[index].submissions[submissionIndex].feedback = feedback;
  assessments[index].submissions[submissionIndex].gradedDate = new Date().toISOString();

  saveAssessments(assessments);
  return assessments[index];
}

/**
 * Batch grade multiple submissions
 */
export function batchGradeSubmissions(assessmentId, gradesMap) {
  const assessments = getStoredAssessments();
  const index = assessments.findIndex(a => a.id === assessmentId);

  if (index === -1) {
    throw new Error('Assessment not found');
  }

  Object.entries(gradesMap).forEach(([studentId, gradeData]) => {
    const submissionIndex = assessments[index].submissions.findIndex(
      s => s.studentId === studentId
    );

    if (submissionIndex >= 0) {
      assessments[index].submissions[submissionIndex].grade = gradeData.grade;
      assessments[index].submissions[submissionIndex].feedback = gradeData.feedback || '';
      assessments[index].submissions[submissionIndex].gradedDate = new Date().toISOString();
    }
  });

  saveAssessments(assessments);
  return assessments[index];
}

/**
 * Get statistics for an assessment
 */
export function getAssessmentStats(assessment) {
  const totalSubmissions = assessment.submissions?.length || 0;
  const gradedSubmissions = assessment.submissions?.filter(s => s.grade !== undefined).length || 0;
  const grades = assessment.submissions?.filter(s => s.grade !== undefined).map(s => s.grade) || [];

  const averageGrade = grades.length > 0
    ? grades.reduce((sum, g) => sum + g, 0) / grades.length
    : 0;

  const highestGrade = grades.length > 0 ? Math.max(...grades) : 0;
  const lowestGrade = grades.length > 0 ? Math.min(...grades) : 0;

  return {
    submissionCount: totalSubmissions,
    gradedCount: gradedSubmissions,
    averageGrade: parseFloat(averageGrade.toFixed(2)),
    highestGrade,
    lowestGrade,
    submissionRate: 0, // Will be calculated by component based on total students
  };
}

/**
 * Merge dummy data with stored assessments
 * Dummy data from dummyData.js + user-created assessments
 */
export function getAllAssessmentsWithStored(dummyAssessments = []) {
  const stored = getStoredAssessments();
  return [...dummyAssessments, ...stored];
}

/**
 * Archive an assessment
 */
export function archiveAssessment(assessmentId) {
  return updateAssessment(assessmentId, { status: 'archived' });
}

/**
 * Clear all stored assessments (use with caution)
 */
export function clearAllAssessments() {
  try {
    localStorage.removeItem(ASSESSMENTS_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing assessments:', error);
    return false;
  }
}
