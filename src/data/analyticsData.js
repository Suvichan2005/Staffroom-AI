import {
  teacherData as defaultTeacher,
  getHeatmapData,
  getTeacherAnalyticsSnapshot,
  schoolStats,
  getSyllabusByRef,
  normalizeSectionProgress,
  loadStoredProgress,
  calculateTopicProgressPercent,
} from "./dummyData";

const personaAttendanceTrend = {
  teacher: [
    { day: "Mon", percent: 94 },
    { day: "Tue", percent: 92 },
    { day: "Wed", percent: 95 },
    { day: "Thu", percent: 90 },
    { day: "Fri", percent: 96 },
    { day: "Sat", percent: 92 },
  ],
  hod: [
    { day: "Mon", percent: 88 },
    { day: "Tue", percent: 90 },
    { day: "Wed", percent: 93 },
    { day: "Thu", percent: 89 },
    { day: "Fri", percent: 91 },
    { day: "Sat", percent: 87 },
  ],
  admin: schoolStats.attendanceTrend.map((percent, index) => ({
    day: `W${index + 1}`,
    percent,
  })),
};

const personaCompletionSlices = {
  teacher: [
    { name: "Completed", value: 58 },
    { name: "On Track", value: 32 },
    { name: "Pending", value: 10 },
  ],
  hod: [
    { name: "Ahead", value: 40 },
    { name: "Within Buffer", value: 38 },
    { name: "Lagging", value: 22 },
  ],
  admin: [
    { name: "Ready", value: 46 },
    { name: "Catch Up", value: 29 },
    { name: "Escalate", value: 25 },
  ],
};

const statusToPercent = (status) => {
  if (!status) return 0;
  const map = {
    done: 100,
    "in-review": 75,
    ongoing: 60,
    "needs-support": 35,
    "not-started": 0,
  };
  return map[status] ?? (status.includes("done") ? 100 : 0);
};

const buildSectionProgressSnapshot = (course, teacher = defaultTeacher) => {
  const syllabus = getSyllabusByRef(course?.syllabusRef);
  if (!course || !syllabus) return [];
  return (course.sections || []).map((section) => {
    const base = normalizeSectionProgress(syllabus, section.progress);
    const effective = normalizeSectionProgress(syllabus, loadStoredProgress(section.id, base));
    const percent = calculateTopicProgressPercent(syllabus, effective);
    return {
      sectionId: section.id,
      progressPercent: percent,
      effective,
      syllabus,
    };
  });
};

export const getTeacherAnalyticsCharts = (teacher, persona = "teacher") => {
  const snapshot = getTeacherAnalyticsSnapshot(teacher);
  const personaKey = personaAttendanceTrend[persona] ? persona : "teacher";
  return {
    attendanceTrend: personaAttendanceTrend[personaKey],
    syllabusCoverage: (snapshot.courses || []).map((course) => ({
      section: course.courseTitle,
      percent: course.averageProgress,
    })),
    completionSlices: personaCompletionSlices[persona] || personaCompletionSlices.teacher,
  };
};

export const getHeatmapMatrix = (courseId, teacher) => {
  const records = getHeatmapData(courseId, teacher);
  const sections = Array.from(new Set(records.map((row) => row.sectionId)));
  const chapters = Array.from(new Set(records.map((row) => row.chapterIndex))).sort((a, b) => a - b);
  return {
    sections,
    chapters,
    records,
  };
};

export const getSubtopicStackedBarData = (courseId, teacher = defaultTeacher) => {
  const course = (teacher?.courses || defaultTeacher.courses || []).find((c) => c.id === courseId);
  if (!course) return [];
  const syllabus = getSyllabusByRef(course.syllabusRef);
  if (!syllabus) return [];

  const sectionSnapshots = buildSectionProgressSnapshot(course, teacher);

  const rows = [];
  (syllabus.chapters || []).forEach((chapter) => {
    (chapter.subTopics || []).forEach((subTopic) => {
      const label = `${chapter.index}.${subTopic.index} ${subTopic.title}`;
      const row = {
        topicKey: `${chapter.index}-${subTopic.index}`,
        topic: label,
        chapterTitle: chapter.title,
        pages: Math.max(0, (subTopic.pageTo ?? 0) - (subTopic.pageFrom ?? 0) + 1),
      };
      sectionSnapshots.forEach(({ sectionId, effective }) => {
        const status = effective?.[chapter.index]?.topics?.[subTopic.index];
        row[sectionId] = statusToPercent(status);
      });
      rows.push(row);
    });
  });
  return rows;
};

export const getProgressComparisonData = (courseId, teacher = defaultTeacher) => {
  const course = (teacher?.courses || defaultTeacher.courses || []).find((c) => c.id === courseId);
  if (!course) return [];
  const syllabus = getSyllabusByRef(course.syllabusRef);
  const sections = buildSectionProgressSnapshot(course, teacher);
  return sections.map(({ sectionId, progressPercent }) => ({
    sectionId,
    completed: progressPercent,
    target: 75,
    variance: progressPercent - 75,
    syllabusLength: (syllabus?.chapters || []).length,
  }));
};

export const getExamReadinessSnapshot = (courseId, teacher = defaultTeacher) => {
  const course = (teacher?.courses || defaultTeacher.courses || []).find((c) => c.id === courseId);
  if (!course) return [];
  const syllabus = getSyllabusByRef(course.syllabusRef);
  const readiness = [];
  (course.sections || []).forEach((section) => {
    const base = normalizeSectionProgress(syllabus, section.progress);
    const effective = normalizeSectionProgress(syllabus, loadStoredProgress(section.id, base));
    const percent = calculateTopicProgressPercent(syllabus, effective);
    const upcoming = [...(section.exams || [])].sort((a, b) => a.date.localeCompare(b.date))[0];
    const gaps = [];
    (syllabus.chapters || []).forEach((chapter) => {
      (chapter.subTopics || []).forEach((subTopic) => {
        const status = effective?.[chapter.index]?.topics?.[subTopic.index];
        if (status !== "done") {
          gaps.push(`${chapter.index}.${subTopic.index} ${subTopic.title}`);
        }
      });
    });
    readiness.push({
      sectionId: section.id,
      readinessPercent: percent,
      upcomingExam: upcoming,
      focusTopics: gaps.slice(0, 3),
    });
  });
  return readiness;
};

export const getEngagementBreakdown = (persona = "teacher") => {
  const options = {
    teacher: [
      { name: "Class Participation", value: 48 },
      { name: "Assignments Submitted", value: 32 },
      { name: "Parent Feedback", value: 20 },
    ],
    hod: [
      { name: "Lesson Observations", value: 28 },
      { name: "Peer Support", value: 36 },
      { name: "Escalations", value: 12 },
      { name: "Student Clubs", value: 24 },
    ],
    admin: [
      { name: "Portal Logins", value: 310 },
      { name: "Resource Uploads", value: 184 },
      { name: "Support Tickets", value: 18 },
    ],
  };
  return options[persona] || options.teacher;
};

export const getSchoolOverviewCharts = () => ({
  totalStats: [
    { label: "Teachers", value: schoolStats.totalTeachers },
    { label: "Students", value: schoolStats.totalStudents },
    { label: "Classes", value: schoolStats.totalClasses },
    { label: "Devices Healthy", value: `${schoolStats.deviceHealthPercent}%` },
  ],
  attendanceTrend: schoolStats.attendanceTrend.map((percent, index) => ({
    day: `W${index + 1}`,
    percent,
  })),
  syllabusCoverage: Object.entries(schoolStats.syllabusCoverage).map(([key, value]) => ({
    section: key.toUpperCase(),
    percent: value,
  })),
});
