/**
 * API Service Layer
 * Handles all backend API communications
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000/api/v1' : '');

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch(endpoint, options = {}) {
  if (!API_BASE_URL && !import.meta.env.DEV) {
    throw new Error(`Data API not configured. Falling back to local data.`);
  }
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

/**
 * Teacher API
 */
export const teacherApi = {
  // Get teacher profile by email
  getByEmail: (email) => apiFetch(`/teachers/email/${email}`),
  
  // Get teacher profile by ID
  getById: (id) => apiFetch(`/teachers/${id}`),
  
  // Get all teachers
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/teachers${queryString ? `?${queryString}` : ''}`);
  },
  
  // Get teacher's sections
  getSections: (teacherId) => apiFetch(`/teachers/${teacherId}/sections`),
  
  // Get teacher's subjects
  getSubjects: (teacherId) => apiFetch(`/teachers/${teacherId}/subjects`),
  
  // Update teacher profile
  update: (teacherId, data) => apiFetch(`/teachers/${teacherId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

/**
 * Section API
 */
export const sectionApi = {
  // Get section by ID
  getById: (id) => apiFetch(`/sections/${id}`),
  
  // Get all sections
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/sections${queryString ? `?${queryString}` : ''}`);
  },
  
  // Get students in a section
  getStudents: (sectionId) => apiFetch(`/sections/${sectionId}/students`),
};

/**
 * Student API
 */
export const studentApi = {
  // Get student by ID
  getById: (id) => apiFetch(`/students/${id}`),
  
  // Get all students
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/students${queryString ? `?${queryString}` : ''}`);
  },
  
  // Get student by enrollment number
  getByEnrollment: (enrollmentNo) => apiFetch(`/students/enrollment/${enrollmentNo}`),
};

/**
 * Subject API
 */
export const subjectApi = {
  // Get subject by ID
  getById: (id) => apiFetch(`/subjects/${id}`),
  
  // Get all subjects
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/subjects${queryString ? `?${queryString}` : ''}`);
  },
  
  // Get syllabus for subject
  getSyllabus: (subjectId) => apiFetch(`/subjects/${subjectId}/syllabus`),
};

/**
 * Attendance API
 */
export const attendanceApi = {
  // Get attendance records
  getRecords: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/attendance${queryString ? `?${queryString}` : ''}`);
  },
  
  // Mark attendance
  mark: (data) => apiFetch('/attendance/mark', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Get attendance by section and date
  getBySectionAndDate: (sectionId, date) => 
    apiFetch(`/attendance/section/${sectionId}?date=${date}`),
};

/**
 * Assignment API
 */
export const assignmentApi = {
  // Get all assignments
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/assignments${queryString ? `?${queryString}` : ''}`);
  },
  
  // Get assignment by ID
  getById: (id) => apiFetch(`/assignments/${id}`),
  
  // Create assignment
  create: (data) => apiFetch('/assignments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Get submissions for assignment
  getSubmissions: (assignmentId) => apiFetch(`/assignments/${assignmentId}/submissions`),
};

/**
 * Syllabus Progress API
 */
export const syllabusProgressApi = {
  // Get progress for section and subject
  getProgress: (sectionId, subjectId) => 
    apiFetch(`/syllabus-progress/section/${sectionId}/subject/${subjectId}`),
  
  // Update progress
  update: (data) => apiFetch('/syllabus-progress', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

/**
 * Schedule API
 */
export const scheduleApi = {
  // Get schedules
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/schedules${queryString ? `?${queryString}` : ''}`);
  },
  
  // Get schedule for teacher
  getByTeacher: (teacherId) => apiFetch(`/schedules/teacher/${teacherId}`),
  
  // Get schedule for section
  getBySection: (sectionId) => apiFetch(`/schedules/section/${sectionId}`),
};

/**
 * Resource API
 */
export const resourceApi = {
  // Get all resources
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/resources${queryString ? `?${queryString}` : ''}`);
  },
  
  // Get resource by ID
  getById: (id) => apiFetch(`/resources/${id}`),
  
  // Create resource
  create: (data) => apiFetch('/resources', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

/**
 * Exam API
 */
export const examApi = {
  // Get all exams
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/exams${queryString ? `?${queryString}` : ''}`);
  },
  
  // Get exam by ID
  getById: (id) => apiFetch(`/exams/${id}`),
  
  // Get results for exam
  getResults: (examId) => apiFetch(`/exams/${examId}/results`),
};

/**
 * Discussion API
 */
export const discussionApi = {
  // Get all discussions
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/discussions${queryString ? `?${queryString}` : ''}`);
  },
  
  // Get discussion by ID
  getById: (id) => apiFetch(`/discussions/${id}`),
  
  // Create discussion
  create: (data) => apiFetch('/discussions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Add post to discussion
  addPost: (discussionId, data) => apiFetch(`/discussions/${discussionId}/posts`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

export default {
  teacherApi,
  sectionApi,
  studentApi,
  subjectApi,
  attendanceApi,
  assignmentApi,
  syllabusProgressApi,
  scheduleApi,
  resourceApi,
  examApi,
  discussionApi,
};
