import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useTeacher } from "../context/TeacherContext";
import { LogoHeader, PageShell } from "../components/layout";
import { GlobalAssistant, AISummaryCard } from "../components/ai";
import SmartAISuggestions from "../components/ai/SmartAISuggestions";
import { CourseCard } from "../components/teacher";
import { UpcomingClasses, NoticesPanel } from "../components/dashboard";
import { getSyllabusByRef, getTeacherTodayActions, getTeacherAnalyticsSnapshot, teacherData } from "../data/dummyData";
import { getTeacherAnalyticsCharts } from "../data/analyticsData";
import { generateDashboardInsights } from "../services/aiService";

export default function Dashboard() {
  const navigate = useNavigate();
  const teacherCtx = useTeacher();
  const teacher = teacherCtx?.teacher || teacherData;
  const courses = teacher?.courses || [];
  const shouldScrollCourses = courses.length > 2;
  const courseGridClasses = [
    "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2",
    shouldScrollCourses ? "max-h-[20rem] overflow-y-auto pr-1" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const todayActions = useMemo(() => getTeacherTodayActions(teacher), [teacher]);
  const analyticsSnapshot = useMemo(() => getTeacherAnalyticsSnapshot(teacher), [teacher]);
  const charts = useMemo(() => getTeacherAnalyticsCharts(teacher), [teacher]);

  return (
    <PageShell width="6xl">
      <LogoHeader title={`Welcome, ${teacher?.name}`} />

      <div className="mt-4">
        <GlobalAssistant onSubmit={(q) => console.log("assistant:", q)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-8 xl:col-span-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sc-card">
              <p className="text-xs uppercase tracking-wide text-black-500">Attendance Pending</p>
              <p className="text-2xl font-semibold text-black-800">{todayActions.pendingAttendance}</p>
              <p className="text-xs text-black-500 mt-1">Classes awaiting submission today</p>
            </div>
            <div className="sc-card">
              <p className="text-xs uppercase tracking-wide text-black-500">Chapters Remaining</p>
              <p className="text-2xl font-semibold text-black-800">{todayActions.chaptersLeft}</p>
              <p className="text-xs text-black-500 mt-1">Aggregated gap across sections</p>
            </div>
            <div className="sc-card">
              <p className="text-xs uppercase tracking-wide text-black-500">Assignments Due</p>
              <p className="text-2xl font-semibold text-black-800">{todayActions.assignmentsDue}</p>
              <p className="text-xs text-black-500 mt-1">Due {todayActions.date}</p>
            </div>
          </div>
          <div className={courseGridClasses}>
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                syllabus={getSyllabusByRef(course.syllabusRef)}
                onSelectCourse={(cid) => navigate(`/course/${cid}`)}
                onSelectSection={(secId) => navigate(`/course/${course.id}/class/${secId}`)}
              />
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 xl:col-span-4">
          <UpcomingClasses className={shouldScrollCourses ? "h-full" : ""} />
          <div className="sc-card mt-6">
            <SmartAISuggestions
              contextKey="dashboard"
              generateSuggestions={generateDashboardInsights}
              title="AI Suggestions"
            />
          </div>
        </div>

        <div className="lg:col-span-12 grid gap-6 md:grid-cols-2 items-stretch">
          <div className="sc-card">
            <h3 className="sc-heading text-base mb-3">Performance Pulse</h3>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={charts.completionSlices}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={70}
                    >
                      {charts.completionSlices.map((slice, index) => (
                        <Cell key={slice.name} fill={["#4f46e5", "#f97316", "#94a3b8"][index % 3]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-xs text-black-500 text-center mt-1">Overall completion blend</p>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.attendanceTrend}>
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                      <YAxis unit="%" stroke="#94a3b8" fontSize={11} domain={[85, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="percent" stroke="#0ea5e9" strokeWidth={3} dot />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.syllabusCoverage}>
                      <XAxis dataKey="section" stroke="#94a3b8" fontSize={11} />
                      <YAxis unit="%" stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="percent" radius={[8, 8, 0, 0]} fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
          <AISummaryCard className="h-full" />
        </div>

        <div className="lg:col-span-12 grid gap-6 md:grid-cols-2 items-stretch">
          <NoticesPanel className="h-full" />
          <div className="sc-card">
            <h3 className="sc-heading text-base mb-2">At a Glance</h3>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-xl bg-black-50 border border-black-200 p-3">
                <p className="text-xs uppercase text-black-500">Overall Progress</p>
                <p className="text-2xl font-semibold text-black-800">{analyticsSnapshot.overallProgress}%</p>
                <p className="text-xs text-black-500 mt-1">Average across courses</p>
              </div>
              <div className="rounded-xl bg-black-50 border border-black-200 p-3">
                <p className="text-xs uppercase text-black-500">Attendance</p>
                <p className="text-2xl font-semibold text-black-800">{analyticsSnapshot.attendancePercent}%</p>
                <p className="text-xs text-black-500 mt-1">Across sections 6A, 6C, 8A, 8B</p>
              </div>
              <div className="rounded-xl bg-black-50 border border-black-200 p-3">
                <p className="text-xs uppercase text-black-500">Average Grade</p>
                <p className="text-2xl font-semibold text-black-800">{analyticsSnapshot.averageGrade}</p>
                <p className="text-xs text-black-500 mt-1">Derived from recent assignments</p>
              </div>
              <div className="rounded-xl bg-black-50 border border-black-200 p-3">
                <p className="text-xs uppercase text-black-500">Courses</p>
                <p className="text-2xl font-semibold text-black-800">{analyticsSnapshot.courses.length}</p>
                <p className="text-xs text-black-500 mt-1">Active this term</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
