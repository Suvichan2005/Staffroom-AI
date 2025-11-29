/**
 * Data Service - Abstraction layer for data fetching
 * 
 * This service provides a unified interface for accessing data,
 * whether from local dummy data or from the backend API.
 * 
 * To switch between mock and real API:
 * - Set VITE_USE_MOCK_DATA=true in .env for mock data (default)
 * - Set VITE_USE_MOCK_DATA=false to use real API
 */

import * as dummyData from '../data/dummyData';
import * as api from './api';

// Configuration - default to mock data
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

/**
 * Mock service implementations using dummyData.js
 */
const mockService = {
  // Teacher
  async getTeacher(teacherId) {
    // In mock mode, return the default teacher
    return { success: true, data: dummyData.teacherData };
  },

  async getTeacherByEmail(email) {
    const teacher = dummyData.teacherDirectory.find(t => t.contact === email);
    if (teacher?.id === 'T001') {
      return { success: true, data: dummyData.teacherData };
    }
    return { success: false, message: 'Teacher not found' };
  },

  async getTeacherDirectory() {
    return { success: true, data: dummyData.teacherDirectory };
  },

  // Courses
  async getCourses(teacherId) {
    return { success: true, data: dummyData.teacherData.courses };
  },

  async getCourseById(courseId) {
    const course = dummyData.getCourseById(dummyData.teacherData, courseId);
    return course 
      ? { success: true, data: course } 
      : { success: false, message: 'Course not found' };
  },

  // Syllabus
  async getSyllabusList() {
    return { success: true, data: dummyData.syllabusList };
  },

  async getSyllabusById(syllabusId) {
    const syllabus = dummyData.getSyllabusByRef(syllabusId);
    return syllabus 
      ? { success: true, data: syllabus } 
      : { success: false, message: 'Syllabus not found' };
  },

  // Students
  async getStudents(classId) {
    const students = classId 
      ? dummyData.students.filter(s => s.classId === classId)
      : dummyData.students;
    return { success: true, data: students };
  },

  async getStudentById(studentId) {
    const student = dummyData.students.find(s => s.studentId === studentId);
    return student 
      ? { success: true, data: student } 
      : { success: false, message: 'Student not found' };
  },

  // Attendance
  async getAttendanceLogs(classId, date) {
    let logs = dummyData.attendanceLogs;
    if (classId) logs = logs.filter(l => l.classId === classId);
    if (date) logs = logs.filter(l => l.date === date);
    return { success: true, data: logs };
  },

  async getAttendanceForClass(courseId, classId) {
    const records = dummyData.getAttendanceForClass(courseId, classId);
    return { success: true, data: records };
  },

  async markAttendance(classId, date, records) {
    // In mock mode, this would update localStorage
    console.log('Mock: Attendance marked', { classId, date, records });
    return { success: true, message: 'Attendance recorded' };
  },

  // Sections/Classes
  async getSections(teacherId) {
    const sections = [];
    dummyData.teacherData.courses.forEach(course => {
      course.sections?.forEach(section => {
        sections.push({
          ...section,
          courseId: course.id,
          courseName: course.title,
          subject: course.syllabusRef?.includes('geo') ? 'Geography' : 'History',
        });
      });
    });
    return { success: true, data: sections };
  },

  async getSectionProgress(courseId, sectionId) {
    const progress = dummyData.getSectionProgress(dummyData.teacherData, courseId, sectionId);
    return { success: true, data: progress };
  },

  // Schedules
  async getUpcomingSessions(daysAhead = 7) {
    const sessions = dummyData.getUpcomingSessions(dummyData.teacherData, daysAhead);
    return { success: true, data: sessions };
  },

  async getClassSessions(classId) {
    const sessions = classId 
      ? dummyData.classSessions.filter(s => s.classId === classId)
      : dummyData.classSessions;
    return { success: true, data: sessions };
  },

  // Analytics
  async getTeacherAnalytics(teacherId) {
    const snapshot = dummyData.getTeacherAnalyticsSnapshot(dummyData.teacherData);
    return { success: true, data: snapshot };
  },

  async getTodayActions(teacherId) {
    const actions = dummyData.getTeacherTodayActions(dummyData.teacherData);
    return { success: true, data: actions };
  },

  // School Stats (HOD/Admin)
  async getSchoolStats() {
    return { success: true, data: dummyData.schoolStats };
  },

  async getDepartments() {
    return { success: true, data: dummyData.departments };
  },

  async getSyllabusHeatmap() {
    return { success: true, data: dummyData.syllabusHeatmap };
  },

  // Exams
  async getExamsForClass(courseId, classId) {
    const exams = dummyData.getExamsForClass(courseId, classId, dummyData.teacherData);
    return { success: true, data: exams };
  },
};

/**
 * API service implementations using backend API
 */
const apiService = {
  // Teacher
  async getTeacher(teacherId) {
    try {
      const response = await api.teacherApi.getById(teacherId);
      return response;
    } catch (error) {
      console.error('API Error:', error);
      return { success: false, message: error.message };
    }
  },

  async getTeacherByEmail(email) {
    try {
      const response = await api.teacherApi.getByEmail(email);
      return response;
    } catch (error) {
      console.error('API Error:', error);
      return { success: false, message: error.message };
    }
  },

  async getTeacherDirectory() {
    try {
      const response = await api.teacherApi.getAll();
      return response;
    } catch (error) {
      console.error('API Error:', error);
      return { success: false, message: error.message };
    }
  },

  // Courses - would need backend endpoints
  async getCourses(teacherId) {
    // Fallback to mock for now as courses API doesn't exist
    return mockService.getCourses(teacherId);
  },

  async getCourseById(courseId) {
    return mockService.getCourseById(courseId);
  },

  // Syllabus
  async getSyllabusList() {
    try {
      const response = await api.subjectApi.getAll();
      return response;
    } catch (error) {
      return mockService.getSyllabusList();
    }
  },

  async getSyllabusById(syllabusId) {
    try {
      const response = await api.subjectApi.getSyllabus(syllabusId);
      return response;
    } catch (error) {
      return mockService.getSyllabusById(syllabusId);
    }
  },

  // Students
  async getStudents(classId) {
    try {
      const params = classId ? { classId } : {};
      const response = await api.studentApi.getAll(params);
      return response;
    } catch (error) {
      return mockService.getStudents(classId);
    }
  },

  async getStudentById(studentId) {
    try {
      const response = await api.studentApi.getById(studentId);
      return response;
    } catch (error) {
      return mockService.getStudentById(studentId);
    }
  },

  // Attendance
  async getAttendanceLogs(classId, date) {
    try {
      const params = {};
      if (classId) params.sectionId = classId;
      if (date) params.date = date;
      const response = await api.attendanceApi.getRecords(params);
      return response;
    } catch (error) {
      return mockService.getAttendanceLogs(classId, date);
    }
  },

  async getAttendanceForClass(courseId, classId) {
    return mockService.getAttendanceForClass(courseId, classId);
  },

  async markAttendance(classId, date, records) {
    try {
      const response = await api.attendanceApi.mark({ sectionId: classId, date, records });
      return response;
    } catch (error) {
      return mockService.markAttendance(classId, date, records);
    }
  },

  // Sections
  async getSections(teacherId) {
    try {
      const response = await api.teacherApi.getSections(teacherId);
      return response;
    } catch (error) {
      return mockService.getSections(teacherId);
    }
  },

  async getSectionProgress(courseId, sectionId) {
    try {
      const response = await api.syllabusProgressApi.getProgress(sectionId, courseId);
      return response;
    } catch (error) {
      return mockService.getSectionProgress(courseId, sectionId);
    }
  },

  // Schedules
  async getUpcomingSessions(daysAhead = 7) {
    try {
      const response = await api.scheduleApi.getAll({ daysAhead });
      return response;
    } catch (error) {
      return mockService.getUpcomingSessions(daysAhead);
    }
  },

  async getClassSessions(classId) {
    return mockService.getClassSessions(classId);
  },

  // Analytics - fallback to mock
  async getTeacherAnalytics(teacherId) {
    return mockService.getTeacherAnalytics(teacherId);
  },

  async getTodayActions(teacherId) {
    return mockService.getTodayActions(teacherId);
  },

  // School Stats
  async getSchoolStats() {
    return mockService.getSchoolStats();
  },

  async getDepartments() {
    return mockService.getDepartments();
  },

  async getSyllabusHeatmap() {
    return mockService.getSyllabusHeatmap();
  },

  // Exams
  async getExamsForClass(courseId, classId) {
    return mockService.getExamsForClass(courseId, classId);
  },
};

/**
 * Export the appropriate service based on configuration
 */
export const dataService = USE_MOCK ? mockService : apiService;

/**
 * Direct exports for convenience
 */
export const {
  getTeacher,
  getTeacherByEmail,
  getTeacherDirectory,
  getCourses,
  getCourseById,
  getSyllabusList,
  getSyllabusById,
  getStudents,
  getStudentById,
  getAttendanceLogs,
  getAttendanceForClass,
  markAttendance,
  getSections,
  getSectionProgress,
  getUpcomingSessions,
  getClassSessions,
  getTeacherAnalytics,
  getTodayActions,
  getSchoolStats,
  getDepartments,
  getSyllabusHeatmap,
  getExamsForClass,
} = dataService;

/**
 * Hook-friendly async data fetcher
 * Matches the response format from both mock and API
 */
export async function fetchData(fetchFn, fallbackData = null) {
  try {
    const response = await fetchFn();
    return response.success ? response.data : fallbackData;
  } catch (error) {
    console.error('Data fetch error:', error);
    return fallbackData;
  }
}

export default dataService;
