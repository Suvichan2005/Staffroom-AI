/**
 * Class Management Utilities
 * 
 * Provides CRUD operations for courses and classes (sections)
 * All data persists to localStorage via userScopedStorage
 */

import { loadUserState, saveUserState } from './userScopedStorage';
import { teacherData as defaultTeacher, syllabusList } from '../data/dummyData';

// Storage keys
const STORAGE_KEYS = {
  TEACHER_DATA: 'teacher:profile',
  CUSTOM_COURSES: 'custom:courses',
  CUSTOM_STUDENTS: 'custom:students',
  CUSTOM_SYLLABI: 'custom:syllabi',
};

// Generate unique IDs
const generateId = (prefix = '') => `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Get current teacher data (merged with custom data)
 */
export function getTeacherData() {
  const stored = loadUserState(STORAGE_KEYS.TEACHER_DATA, null);
  return stored || { ...defaultTeacher };
}

/**
 * Save teacher data
 */
export function saveTeacherData(teacherData) {
  saveUserState(STORAGE_KEYS.TEACHER_DATA, teacherData);
  return teacherData;
}

/**
 * Get custom students (not in dummyData)
 */
export function getCustomStudents() {
  return loadUserState(STORAGE_KEYS.CUSTOM_STUDENTS, []);
}

/**
 * Save custom students
 */
export function saveCustomStudents(students) {
  saveUserState(STORAGE_KEYS.CUSTOM_STUDENTS, students);
}

// ============================================================================
// COURSE MANAGEMENT
// ============================================================================

/**
 * Create a new course/subject
 * @param {Object} courseData - { title, subject, grade, imageUrl? }
 * @returns {Object} The created course
 */
export function createCourse(courseData) {
  const teacher = getTeacherData();
  const courseId = generateId('course_');
  const syllabusId = `syll_${courseId}`;
  
  // Create the new course
  const newCourse = {
    id: courseId,
    title: courseData.title || `${courseData.subject} Grade ${courseData.grade}`,
    subject: courseData.subject,
    grade: courseData.grade,
    imageUrl: courseData.imageUrl || generateDefaultCourseImage(courseData.subject),
    syllabusRef: syllabusId,
    sections: [],
    createdAt: new Date().toISOString(),
  };
  
  // Create empty syllabus for the course
  const newSyllabus = {
    id: syllabusId,
    subject: courseData.subject,
    grade: courseData.grade,
    chapters: [],
    createdAt: new Date().toISOString(),
  };
  
  // Save custom syllabus
  const customSyllabi = loadUserState(STORAGE_KEYS.CUSTOM_SYLLABI, []);
  customSyllabi.push(newSyllabus);
  saveUserState(STORAGE_KEYS.CUSTOM_SYLLABI, customSyllabi);
  
  // Add course to teacher
  teacher.courses = [...(teacher.courses || []), newCourse];
  saveTeacherData(teacher);
  
  return newCourse;
}

/**
 * Update an existing course
 * @param {string} courseId - Course ID to update
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated course or null if not found
 */
export function updateCourse(courseId, updates) {
  const teacher = getTeacherData();
  const courseIndex = teacher.courses.findIndex(c => c.id === courseId);
  
  if (courseIndex === -1) return null;
  
  teacher.courses[courseIndex] = {
    ...teacher.courses[courseIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  saveTeacherData(teacher);
  return teacher.courses[courseIndex];
}

/**
 * Delete a course and all its sections
 * @param {string} courseId - Course ID to delete
 * @returns {boolean} Success status
 */
export function deleteCourse(courseId) {
  const teacher = getTeacherData();
  const course = teacher.courses.find(c => c.id === courseId);
  
  if (!course) return false;
  
  // Remove associated syllabus if custom
  if (course.syllabusRef) {
    const customSyllabi = loadUserState(STORAGE_KEYS.CUSTOM_SYLLABI, []);
    const filteredSyllabi = customSyllabi.filter(s => s.id !== course.syllabusRef);
    saveUserState(STORAGE_KEYS.CUSTOM_SYLLABI, filteredSyllabi);
  }
  
  // Remove students for all sections in this course
  const customStudents = getCustomStudents();
  const sectionIds = course.sections.map(s => s.id);
  const filteredStudents = customStudents.filter(s => !sectionIds.includes(s.classId));
  saveCustomStudents(filteredStudents);
  
  // Remove course
  teacher.courses = teacher.courses.filter(c => c.id !== courseId);
  saveTeacherData(teacher);
  
  return true;
}

// ============================================================================
// SECTION/CLASS MANAGEMENT
// ============================================================================

/**
 * Create a new section/class within a course
 * @param {string} courseId - Parent course ID
 * @param {Object} sectionData - { id, schedules, studentCount? }
 * @returns {Object|null} Created section or null if course not found
 */
export function createSection(courseId, sectionData) {
  const teacher = getTeacherData();
  const courseIndex = teacher.courses.findIndex(c => c.id === courseId);
  
  if (courseIndex === -1) return null;
  
  const sectionId = sectionData.id || generateId('sec_');
  
  const newSection = {
    id: sectionId,
    schedules: sectionData.schedules || [],
    progress: {},
    exams: [],
    createdAt: new Date().toISOString(),
  };
  
  teacher.courses[courseIndex].sections = [
    ...(teacher.courses[courseIndex].sections || []),
    newSection,
  ];
  
  saveTeacherData(teacher);
  return newSection;
}

/**
 * Update a section's properties
 * @param {string} courseId - Parent course ID
 * @param {string} sectionId - Section ID to update
 * @param {Object} updates - Fields to update (schedules, name, etc.)
 * @returns {Object|null} Updated section or null
 */
export function updateSection(courseId, sectionId, updates) {
  const teacher = getTeacherData();
  const courseIndex = teacher.courses.findIndex(c => c.id === courseId);
  
  if (courseIndex === -1) return null;
  
  const sectionIndex = teacher.courses[courseIndex].sections?.findIndex(s => s.id === sectionId);
  if (sectionIndex === -1) return null;
  
  teacher.courses[courseIndex].sections[sectionIndex] = {
    ...teacher.courses[courseIndex].sections[sectionIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  saveTeacherData(teacher);
  return teacher.courses[courseIndex].sections[sectionIndex];
}

/**
 * Delete a section from a course
 * @param {string} courseId - Parent course ID
 * @param {string} sectionId - Section ID to delete
 * @returns {boolean} Success status
 */
export function deleteSection(courseId, sectionId) {
  const teacher = getTeacherData();
  const courseIndex = teacher.courses.findIndex(c => c.id === courseId);
  
  if (courseIndex === -1) return false;
  
  // Remove students for this section
  const customStudents = getCustomStudents();
  const filteredStudents = customStudents.filter(s => s.classId !== sectionId);
  saveCustomStudents(filteredStudents);
  
  // Remove section
  teacher.courses[courseIndex].sections = teacher.courses[courseIndex].sections?.filter(
    s => s.id !== sectionId
  );
  
  saveTeacherData(teacher);
  return true;
}

/**
 * Update schedules for a section
 * @param {string} courseId - Parent course ID
 * @param {string} sectionId - Section ID
 * @param {string[]} schedules - Array of schedule strings (e.g., "Mon 09:00–09:45")
 * @returns {Object|null} Updated section or null
 */
export function updateSectionSchedules(courseId, sectionId, schedules) {
  return updateSection(courseId, sectionId, { schedules });
}

// ============================================================================
// STUDENT MANAGEMENT
// ============================================================================

/**
 * Add students to a class/section
 * @param {string} classId - Section ID
 * @param {Object[]} students - Array of { name, rollNo, email? }
 * @returns {Object[]} Added students with generated IDs
 */
export function addStudentsToClass(classId, students) {
  const customStudents = getCustomStudents();
  
  const addedStudents = students.map((student, index) => ({
    studentId: generateId('stu_'),
    name: student.name,
    rollNo: student.rollNo || customStudents.filter(s => s.classId === classId).length + index + 1,
    email: student.email || '',
    classId,
    createdAt: new Date().toISOString(),
  }));
  
  saveCustomStudents([...customStudents, ...addedStudents]);
  return addedStudents;
}

/**
 * Get all students for a class (both from dummyData and custom)
 * @param {string} classId - Section ID
 * @returns {Object[]} All students for the class
 */
export function getStudentsForClass(classId) {
  // Import students from dummyData dynamically to avoid circular deps
  const { students: dummyStudents } = require('../data/dummyData');
  const customStudents = getCustomStudents();
  
  return [
    ...dummyStudents.filter(s => s.classId === classId),
    ...customStudents.filter(s => s.classId === classId),
  ].sort((a, b) => (a.rollNo || 0) - (b.rollNo || 0));
}

/**
 * Remove a student from a class
 * @param {string} studentId - Student ID to remove
 * @returns {boolean} Success status
 */
export function removeStudent(studentId) {
  const customStudents = getCustomStudents();
  const filtered = customStudents.filter(s => s.studentId !== studentId);
  
  if (filtered.length === customStudents.length) return false;
  
  saveCustomStudents(filtered);
  return true;
}

/**
 * Clear all custom students for a class
 * @param {string} classId - Class ID
 */
export function clearStudentsForClass(classId) {
  const customStudents = getCustomStudents();
  const filtered = customStudents.filter(s => s.classId !== classId);
  saveCustomStudents(filtered);
}

// ============================================================================
// SCHEDULE UTILITIES
// ============================================================================

/**
 * Parse a schedule string into components
 * @param {string} scheduleStr - e.g., "Mon 09:00–09:45"
 * @returns {Object|null} { day, dayIndex, startTime, endTime }
 */
export function parseScheduleString(scheduleStr) {
  if (!scheduleStr) return null;
  
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const match = scheduleStr.match(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(\d{1,2}:\d{2})[–-](\d{1,2}:\d{2})$/);
  
  if (!match) return null;
  
  return {
    day: match[1],
    dayIndex: dayMap[match[1]],
    startTime: match[2],
    endTime: match[3],
  };
}

/**
 * Build a schedule string from components
 * @param {string} day - Day abbreviation (Mon, Tue, etc.)
 * @param {string} startTime - Start time (09:00)
 * @param {string} endTime - End time (09:45)
 * @returns {string} Schedule string
 */
export function buildScheduleString(day, startTime, endTime) {
  return `${day} ${startTime}–${endTime}`;
}

/**
 * Apply parsed timetable data to sections
 * @param {Object[]} scheduleData - Array of { classId, day, startTime, endTime }
 * @returns {Object} Summary of applied changes
 */
export function applyTimetableData(scheduleData) {
  const teacher = getTeacherData();
  const applied = { updated: 0, notFound: [] };
  
  // Group schedules by classId
  const schedulesByClass = {};
  scheduleData.forEach(item => {
    if (!schedulesByClass[item.classId]) {
      schedulesByClass[item.classId] = [];
    }
    schedulesByClass[item.classId].push(buildScheduleString(item.day, item.startTime, item.endTime));
  });
  
  // Apply to each section
  Object.entries(schedulesByClass).forEach(([classId, schedules]) => {
    let found = false;
    teacher.courses.forEach(course => {
      const section = course.sections?.find(s => s.id === classId);
      if (section) {
        section.schedules = schedules;
        section.updatedAt = new Date().toISOString();
        found = true;
        applied.updated++;
      }
    });
    
    if (!found) {
      applied.notFound.push(classId);
    }
  });
  
  saveTeacherData(teacher);
  return applied;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a default course image URL based on subject
 */
function generateDefaultCourseImage(subject) {
  const subjectImages = {
    Geography: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=600&auto=format&fit=crop&q=60',
    History: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=600&auto=format&fit=crop&q=60',
    Mathematics: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=60',
    Science: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=60',
    English: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=60',
    Physics: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=600&auto=format&fit=crop&q=60',
    Chemistry: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&auto=format&fit=crop&q=60',
    Biology: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=600&auto=format&fit=crop&q=60',
  };
  
  return subjectImages[subject] || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&auto=format&fit=crop&q=60';
}

/**
 * Get all courses (for selection dropdowns)
 */
export function getAllCourses() {
  const teacher = getTeacherData();
  return teacher.courses || [];
}

/**
 * Find a course by ID
 */
export function findCourseById(courseId) {
  const teacher = getTeacherData();
  return teacher.courses?.find(c => c.id === courseId) || null;
}

/**
 * Find a section by ID across all courses
 */
export function findSectionById(sectionId) {
  const teacher = getTeacherData();
  for (const course of (teacher.courses || [])) {
    const section = course.sections?.find(s => s.id === sectionId);
    if (section) {
      return { course, section };
    }
  }
  return null;
}
