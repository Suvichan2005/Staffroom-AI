import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import { teacherData as defaultTeacher, teacherDirectory } from "../data/dummyData";
import { loadUserState, saveUserState } from "../utils/userScopedStorage";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/client";
import { dataService } from "../services/dataService";
import * as classManagement from "../utils/classManagement";

const TeacherContext = createContext(null);

export const useTeacher = () => useContext(TeacherContext);

// Use user-scoped storage for teacher profile
const getInitialTeacher = () => loadUserState("teacher:profile", defaultTeacher) || defaultTeacher;
const getInitialPersona = () => loadUserState("persona:active", "teacher") || "teacher";

export function TeacherProvider({ children }) {
  const [teacher, setTeacherState] = useState(getInitialTeacher);
  const [persona, setPersonaState] = useState(getInitialPersona);
  const [attendanceVersion, setAttendanceVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setTeacher = (updater) => {
    setTeacherState((previous) => {
      const nextValue = typeof updater === "function" ? updater(previous) : updater;
      const normalized = nextValue || defaultTeacher;
      saveUserState("teacher:profile", normalized);
      return normalized;
    });
  };

  const setPersona = (nextPersona) => {
    setPersonaState(nextPersona);
    saveUserState("persona:active", nextPersona);
    setAttendanceVersion((value) => value + 1);
  };

  const bumpAttendanceVersion = () => setAttendanceVersion((value) => value + 1);

  // Helper: map a Firebase auth user (uid + user object) to a teacher profile and persist mapping
  const mapAuthUserToTeacher = (uid, user) => {
    try {
      const email = (user && user.email) ? user.email.toLowerCase() : null;
      const displayName = user?.displayName || null;
      const photoURL = user?.photoURL || null;

      // Try exact contact match in the directory
      let mapped = teacherDirectory.find((t) => (t.contact || "").toLowerCase() === email);
      // If not found, try a loose match by email local part (before @) matching name/id
      if (!mapped && email) {
        const local = email.split('@')[0];
        mapped = teacherDirectory.find((t) => (t.id || "").toLowerCase() === local || (t.name || "").toLowerCase().includes(local));
      }
      // If we found a directory entry, try to resolve a full profile
      let finalProfile = null;
      if (mapped) {
        // If the mapped id matches the default teacher id, use the rich `teacherData` profile
        if (mapped.id === defaultTeacher.id) {
          finalProfile = { ...defaultTeacher };
        } else {
          // Try to load a saved full profile for this teacher id from user-scoped storage
          finalProfile = loadUserState(`teacher:profile:${mapped.id}`, null);
        }
      }
      // Fallbacks: use stored profile, default teacher, or the minimal mapped entry
      if (!finalProfile) {
        // try to reuse any previously stored general profile (user-scoped)
        finalProfile = loadUserState("teacher:profile", null) || { ...defaultTeacher };
      }

      // Override with Google profile name and photo if available
      if (displayName) {
        finalProfile = { ...finalProfile, name: displayName };
      }
      if (photoURL) {
        finalProfile = { ...finalProfile, photoURL };
      }
      if (email) {
        finalProfile = { ...finalProfile, email };
      }

      // Persist mapping from auth uid -> teacher id (directory id if present, otherwise finalProfile.id)
      const mappedIdToSave = (mapped && mapped.id) || finalProfile.id;
      if (uid) saveUserState(`auth:uid:${uid}`, mappedIdToSave);
      // Apply mapping to current app state (ensure we pass a full profile with courses)
      setTeacher(finalProfile);
      return finalProfile;
    } catch (err) {
      return defaultTeacher;
    }
  };

  // Fetch teacher data from backend or mock service
  const fetchTeacherData = async (email) => {
    setLoading(true);
    setError(null);
    try {
      const response = await dataService.getTeacherByEmail(email);
      if (response.success && response.data) {
        // Transform backend data to frontend format if needed
        const teacherProfile = response.data.courses
          ? response.data  // Already in correct format (mock data)
          : {
            id: response.data._id || response.data.id,
            name: response.data.name || `${response.data.firstName} ${response.data.lastName}`,
            email: response.data.email,
            department: response.data.department,
            phone: response.data.phone,
            subjects: response.data.subjects || [],
            sections: response.data.sections || [],
            courses: response.data.courses || [],
          };
        setTeacher(teacherProfile);
        return teacherProfile;
      } else {
        // Fallback to default/local data
        setTeacher(defaultTeacher);
        return defaultTeacher;
      }
    } catch (err) {
      console.error('Failed to fetch teacher data:', err);
      setError(err.message);
      // Fallback to default/local data on error
      setTeacher(defaultTeacher);
      return defaultTeacher;
    } finally {
      setLoading(false);
    }
  };

  // Listen for Firebase auth state changes and apply mapping automatically
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        // Try to fetch teacher data from backend first
        try {
          const profile = await fetchTeacherData(user.email);
          // Override with Google profile name/photo if available
          if (user.displayName || user.photoURL) {
            const updatedProfile = {
              ...profile,
              ...(user.displayName && { name: user.displayName }),
              ...(user.photoURL && { photoURL: user.photoURL }),
              ...(user.email && { email: user.email }),
            };
            setTeacher(updatedProfile);
          }
        } catch (err) {
          // Fallback to local mapping if backend fails
          const mappedId = loadUserState(`auth:uid:${user.uid}`);
          if (mappedId) {
            const found = teacherDirectory.find((t) => t.id === mappedId);
            if (found) {
              // Still apply Google profile info
              const updatedFound = {
                ...found,
                ...(user.displayName && { name: user.displayName }),
                ...(user.photoURL && { photoURL: user.photoURL }),
                ...(user.email && { email: user.email }),
              };
              setTeacher(updatedFound);
              return;
            }
          }
          mapAuthUserToTeacher(user.uid, user);
        }
      } else {
        // Not signed in: revert to default teacher profile (keep demo data available)
        setTeacher(defaultTeacher);
      }
    });
    return () => unsub();
  }, []);

  // Class management methods - wrapped in useCallback for stable references
  const createCourse = useCallback((courseData) => {
    const newCourse = classManagement.createCourse(courseData);
    // Refresh teacher state
    setTeacher(classManagement.getTeacherData());
    return newCourse;
  }, []);

  const updateCourse = useCallback((courseId, updates) => {
    const updated = classManagement.updateCourse(courseId, updates);
    setTeacher(classManagement.getTeacherData());
    return updated;
  }, []);

  const deleteCourse = useCallback((courseId) => {
    const success = classManagement.deleteCourse(courseId);
    if (success) setTeacher(classManagement.getTeacherData());
    return success;
  }, []);

  const createSection = useCallback((courseId, sectionData) => {
    const newSection = classManagement.createSection(courseId, sectionData);
    setTeacher(classManagement.getTeacherData());
    return newSection;
  }, []);

  const updateSection = useCallback((courseId, sectionId, updates) => {
    const updated = classManagement.updateSection(courseId, sectionId, updates);
    setTeacher(classManagement.getTeacherData());
    return updated;
  }, []);

  const deleteSection = useCallback((courseId, sectionId) => {
    const success = classManagement.deleteSection(courseId, sectionId);
    if (success) setTeacher(classManagement.getTeacherData());
    return success;
  }, []);

  const addStudentsToClass = useCallback((classId, students) => {
    const added = classManagement.addStudentsToClass(classId, students);
    bumpAttendanceVersion(); // Trigger re-render for attendance components
    return added;
  }, []);

  const getStudentsForClass = useCallback((classId) => {
    return classManagement.getStudentsForClass(classId);
  }, []);

  const applyTimetableData = useCallback((scheduleData) => {
    const result = classManagement.applyTimetableData(scheduleData);
    setTeacher(classManagement.getTeacherData());
    return result;
  }, []);

  const value = useMemo(
    () => ({
      teacher,
      teacherId: teacher?.id || defaultTeacher.id,
      persona,
      loading,
      error,
      setTeacher,
      setPersona,
      mapAuthUserToTeacher,
      fetchTeacherData,
      attendanceVersion,
      bumpAttendanceVersion,
      getCourseById: (courseId) => teacher?.courses?.find((course) => course.id === courseId),
      getTeacherDirectory: () => teacherDirectory,
      // Class management methods
      createCourse,
      updateCourse,
      deleteCourse,
      createSection,
      updateSection,
      deleteSection,
      addStudentsToClass,
      getStudentsForClass,
      applyTimetableData,
      // Utilities
      getAllCourses: () => teacher?.courses || [],
      findSectionById: classManagement.findSectionById,
    }),
    [teacher, persona, attendanceVersion, loading, error, createCourse, updateCourse, deleteCourse, createSection, updateSection, deleteSection, addStudentsToClass, getStudentsForClass, applyTimetableData]
  );

  return <TeacherContext.Provider value={value}>{children}</TeacherContext.Provider>;
}
