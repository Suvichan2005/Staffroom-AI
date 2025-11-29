import { useState, useEffect } from 'react';

/**
 * Custom hook for data fetching with loading and error states
 * @param {Function} fetchFn - Async function that fetches data
 * @param {Array} dependencies - Dependencies array for useEffect
 * @param {*} initialData - Initial data value
 * @returns {Object} { data, loading, error, refetch }
 */
export function useApiData(fetchFn, dependencies = [], initialData = null) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err.message || 'An error occurred');
      console.error('API fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, dependencies);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    setData,
  };
}

/**
 * Hook for fetching teacher's sections
 */
export function useTeacherSections(teacherId) {
  return useApiData(
    async () => {
      if (!teacherId) return [];
      const { teacherApi } = await import('../services/api');
      const response = await teacherApi.getSections(teacherId);
      return response.success ? response.data : [];
    },
    [teacherId],
    []
  );
}

/**
 * Hook for fetching section students
 */
export function useSectionStudents(sectionId) {
  return useApiData(
    async () => {
      if (!sectionId) return [];
      const { sectionApi } = await import('../services/api');
      const response = await sectionApi.getStudents(sectionId);
      return response.success ? response.data : [];
    },
    [sectionId],
    []
  );
}

/**
 * Hook for fetching attendance records
 */
export function useAttendanceRecords(filters = {}) {
  return useApiData(
    async () => {
      const { attendanceApi } = await import('../services/api');
      const response = await attendanceApi.getRecords(filters);
      return response.success ? response.data : [];
    },
    [JSON.stringify(filters)],
    []
  );
}

/**
 * Hook for fetching syllabus progress
 */
export function useSyllabusProgress(sectionId, subjectId) {
  return useApiData(
    async () => {
      if (!sectionId || !subjectId) return null;
      const { syllabusProgressApi } = await import('../services/api');
      const response = await syllabusProgressApi.getProgress(sectionId, subjectId);
      return response.success ? response.data : null;
    },
    [sectionId, subjectId],
    null
  );
}

/**
 * Hook for fetching assignments
 */
export function useAssignments(filters = {}) {
  return useApiData(
    async () => {
      const { assignmentApi } = await import('../services/api');
      const response = await assignmentApi.getAll(filters);
      return response.success ? response.data : [];
    },
    [JSON.stringify(filters)],
    []
  );
}

/**
 * Hook for fetching schedules
 */
export function useSchedules(filters = {}) {
  return useApiData(
    async () => {
      const { scheduleApi } = await import('../services/api');
      const response = await scheduleApi.getAll(filters);
      return response.success ? response.data : [];
    },
    [JSON.stringify(filters)],
    []
  );
}

/**
 * Hook for fetching resources
 */
export function useResources(filters = {}) {
  return useApiData(
    async () => {
      const { resourceApi } = await import('../services/api');
      const response = await resourceApi.getAll(filters);
      return response.success ? response.data : [];
    },
    [JSON.stringify(filters)],
    []
  );
}

/**
 * Hook for fetching subject details
 */
export function useSubject(subjectId) {
  return useApiData(
    async () => {
      if (!subjectId) return null;
      const { subjectApi } = await import('../services/api');
      const response = await subjectApi.getById(subjectId);
      return response.success ? response.data : null;
    },
    [subjectId],
    null
  );
}

/**
 * Hook for fetching syllabus
 */
export function useSyllabus(subjectId) {
  return useApiData(
    async () => {
      if (!subjectId) return null;
      const { subjectApi } = await import('../services/api');
      const response = await subjectApi.getSyllabus(subjectId);
      return response.success ? response.data : null;
    },
    [subjectId],
    null
  );
}

/**
 * Hook for fetching exams
 */
export function useExams(filters = {}) {
  return useApiData(
    async () => {
      const { examApi } = await import('../services/api');
      const response = await examApi.getAll(filters);
      return response.success ? response.data : [];
    },
    [JSON.stringify(filters)],
    []
  );
}
