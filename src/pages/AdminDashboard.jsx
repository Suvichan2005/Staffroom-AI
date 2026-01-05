import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { 
  BookOpen, UploadCloud, Users, ClipboardList, ActivitySquare,
  TrendingUp, GraduationCap, Building2, Shield, Settings, Bell,
  CheckCircle2, AlertTriangle, Clock, FileText, ChevronRight, Sparkles,
  UserPlus, FileSpreadsheet
} from "lucide-react";
import { PageShell } from "../components/layout";
import { getAdminSummary, students, teacherData } from "../data/dummyData";
import { getSchoolOverviewCharts } from "../data/analyticsData";
import { loadUserState, saveUserState } from "../utils/userScopedStorage";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area } from "recharts";
import AdminOnboardingWizard from "../components/shared/AdminOnboardingWizard";
import TeacherManagement from "../components/admin/TeacherManagement";
import StudentRosterUpload from "../components/admin/StudentRosterUpload";

const SIDEBAR_ITEMS = [
  { id: "overview", label: "School Overview", icon: ActivitySquare },
  { id: "teachers", label: "Teacher Management", icon: UserPlus },
  { id: "students", label: "Student Roster", icon: FileSpreadsheet },
  { id: "timetable", label: "Timetable Upload", icon: UploadCloud },
  { id: "mapping", label: "Class Mapping", icon: ClipboardList },
  { id: "logs", label: "System Logs", icon: BookOpen },
];

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const summary = useMemo(() => getAdminSummary(), []);
  const charts = useMemo(() => getSchoolOverviewCharts(), []);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [showSchoolSetup, setShowSchoolSetup] = useState(false);
  const [schoolConfigured, setSchoolConfigured] = useState(() => 
    loadUserState('admin:schoolConfigured', false)
  );
  const initialMapping = useMemo(
    () =>
      loadUserState("admin:teacherMapping", summary.departments.map((department) => ({
        classId: department.classes[0],
        teacherId: department.teachers[0],
      }))),
    [summary.departments]
  );
  const [mapping, setMapping] = useState(initialMapping);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentClassFilter, setStudentClassFilter] = useState("all");

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesQuery = student.name.toLowerCase().includes(studentQuery.toLowerCase());
      const matchesClass = studentClassFilter === "all" || student.classId === studentClassFilter;
      return matchesQuery && matchesClass;
    });
  }, [studentQuery, studentClassFilter]);

  const persistMapping = (nextMapping) => {
    setMapping(nextMapping);
    saveUserState("admin:teacherMapping", nextMapping);
    toast.success("Teacher mapping saved.");
  };

  const handleSchoolSetupComplete = (schoolData) => {
    console.log('[AdminDashboard] School setup complete:', schoolData);
    saveUserState('admin:schoolConfigured', true);
    saveUserState('admin:schoolData', schoolData);
    setSchoolConfigured(true);
    setShowSchoolSetup(false);
    toast.success(`${schoolData.schoolName} is now set up!`);
  };

  // Show setup prompt if school not configured
  useEffect(() => {
    if (!schoolConfigured) {
      // Could auto-show wizard, but let's make it optional
    }
  }, [schoolConfigured]);



  const renderOverview = () => (
    <div className="space-y-6">
      {/* School Setup Prompt (if not configured) */}
      {!schoolConfigured && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm font-medium text-indigo-100">Getting Started</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Set Up Your School</h3>
              <p className="text-indigo-100 text-sm mb-4">
                Configure your school profile, class structure, and invite teachers to get started with Staffroom.
              </p>
              <button
                onClick={() => setShowSchoolSetup(true)}
                className="px-6 py-2.5 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
              >
                Start Setup Wizard
              </button>
            </div>
            <Building2 className="w-16 h-16 text-white/20" />
          </div>
        </motion.div>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Students', value: students.length, icon: Users, color: 'indigo', change: '+12%' },
          { label: 'Active Teachers', value: summary.teachers?.length || 5, icon: GraduationCap, color: 'green', change: '+2' },
          { label: 'Departments', value: summary.departments?.length || 3, icon: Building2, color: 'purple' },
          { label: 'Avg Attendance', value: '94%', icon: CheckCircle2, color: 'blue', change: '+3%' },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl border border-black-200 p-5"
            >
              <div className={`inline-flex p-2.5 rounded-xl bg-${stat.color}-100 mb-3`}>
                <Icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-black-800">{stat.value}</p>
                  <p className="text-sm text-black-500">{stat.label}</p>
                </div>
                {stat.change && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                    {stat.change}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-black-200 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-black-800">Attendance Trend</h3>
            <span className="text-xs text-black-500">Last 7 days</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.attendanceTrend}>
                <defs>
                  <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis unit="%" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[80, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  formatter={(value) => [`${value}%`, 'Attendance']}
                />
                <Area type="monotone" dataKey="percent" stroke="#6366f1" strokeWidth={2} fill="url(#attendanceGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-black-200 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-black-800">Syllabus Coverage</h3>
            <span className="text-xs text-black-500">By section</span>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={charts.syllabusCoverage} 
                  dataKey="percent" 
                  nameKey="section" 
                  innerRadius={65} 
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {charts.syllabusCoverage.map((entry, index) => (
                    <Cell key={entry.section} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'Coverage']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {charts.syllabusCoverage.map((entry, index) => (
              <div key={entry.section} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ background: COLORS[index % COLORS.length] }}
                />
                <span className="text-xs text-black-600">{entry.section}: {entry.percent}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-black-200 p-5"
        >
          <h3 className="font-semibold text-black-800 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {(summary.schoolStats?.systemLogs || []).slice(0, 5).map((log, idx) => (
              <div key={log.id || idx} className="flex items-start gap-3 p-3 bg-black-50 rounded-xl">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Clock className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-black-700">{log.detail}</p>
                  <p className="text-xs text-black-500 mt-0.5">{log.time}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5 text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Quick Actions</h3>
            <span className="px-2 py-0.5 bg-white/20 text-white/90 text-xs font-medium rounded-full">In Progress</span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Upload Timetable', onClick: () => setActiveTab('timetable'), inProgress: true },
              { label: 'Manage Teachers', onClick: () => setActiveTab('mapping'), inProgress: true },
              { label: 'View Students', onClick: () => setActiveTab('students'), inProgress: true },
              { label: 'Export Reports', onClick: () => toast.success('Reports exported (mock)'), inProgress: true },
            ].map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-sm"
              >
                <span className="flex items-center gap-2">
                  {action.label}
                  {action.inProgress && <span className="px-1.5 py-0.5 bg-amber-500/30 text-amber-200 text-[10px] rounded">WIP</span>}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );

  const renderTimetable = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-black-200 p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-indigo-100 rounded-xl">
          <UploadCloud className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-semibold text-black-800">Timetable Upload</h3>
          <p className="text-sm text-black-500">Upload CSV/XLSX to refresh the central timetable</p>
        </div>
      </div>
      
      <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-black-200 hover:border-indigo-400 rounded-2xl py-12 text-black-500 hover:bg-indigo-50/50 cursor-pointer transition-all">
        <div className="p-4 bg-indigo-100 rounded-full">
          <UploadCloud className="h-8 w-8 text-indigo-600" />
        </div>
        <div className="text-center">
          <p className="font-medium text-black-700">Drop your file here, or click to browse</p>
          <p className="text-xs text-black-400 mt-1">Supports CSV and XLSX files</p>
        </div>
        <input
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setSelectedFileName(file.name);
            toast.success("Timetable received. Validation mock triggered.");
          }}
        />
      </label>
      
      {selectedFileName && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800">File uploaded</p>
            <p className="text-sm text-green-600">{selectedFileName}</p>
          </div>
        </div>
      )}
    </motion.div>
  );

  const renderMapping = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-black-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-xl">
            <ClipboardList className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-black-800">Teacher – Class Mapping</h3>
            <p className="text-sm text-black-500">Assign teachers to their respective classes</p>
          </div>
        </div>
        <button
          onClick={() => persistMapping(mapping)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
        >
          Save Mapping
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[640px] text-sm">
          <thead className="text-xs uppercase text-black-500">
            <tr>
              <th className="text-left py-2">Class</th>
              <th className="text-left py-2">Assigned Teacher</th>
              <th className="text-left py-2">Subject</th>
            </tr>
          </thead>
          <tbody>
            {summary.departments.flatMap((department) =>
              department.classes.map((classId) => {
                const departmentTeachers = summary.teachers.filter((teacher) => department.teachers.includes(teacher.id));
                const currentEntry = mapping.find((row) => row.classId === classId) || {
                  classId,
                  teacherId: departmentTeachers[0]?.id,
                };
                return (
                  <tr key={classId} className="border-t border-black-100">
                    <td className="py-3 font-medium text-black-700">{classId}</td>
                    <td className="py-3">
                      <select
                        value={currentEntry.teacherId}
                        onChange={(event) => {
                          const next = mapping.map((row) =>
                            row.classId === classId ? { ...row, teacherId: event.target.value } : row
                          );
                          persistMapping(next);
                        }}
                        className="border border-black-200 rounded-lg px-2 py-1 text-sm"
                      >
                        {departmentTeachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 text-xs text-black-500">{department.name}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );

  const renderStudents = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-black-200 p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-xl">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-black-800">Student Management</h3>
            <p className="text-sm text-black-500">{filteredStudents.length} students found</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={studentQuery}
            onChange={(event) => setStudentQuery(event.target.value)}
            placeholder="Search by name..."
            className="border border-black-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
          />
          <select
            value={studentClassFilter}
            onChange={(event) => setStudentClassFilter(event.target.value)}
            className="border border-black-200 rounded-xl px-4 py-2.5 text-sm bg-white"
          >
            <option value="all">All Classes</option>
            {Array.from(new Set(students.map((student) => student.classId))).sort().map((classId) => (
              <option key={classId} value={classId}>
                {classId}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black-200">
              <th className="text-left py-3 px-4 font-semibold text-black-600">Student</th>
              <th className="text-left py-3 px-4 font-semibold text-black-600">Class</th>
              <th className="text-left py-3 px-4 font-semibold text-black-600">ID</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, idx) => (
              <tr key={student.studentId} className="border-b border-black-50 hover:bg-black-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                      {student.name.charAt(0)}
                    </div>
                    <span className="font-medium text-black-700">{student.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-black-100 rounded-lg text-xs font-medium text-black-600">
                    {student.classId}
                  </span>
                </td>
                <td className="py-3 px-4 text-black-500 font-mono text-xs">{student.studentId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredStudents.length === 0 && (
        <div className="text-center py-8">
          <Users className="w-12 h-12 mx-auto text-black-300 mb-3" />
          <p className="text-black-500">No students found</p>
        </div>
      )}
    </motion.div>
  );

  const renderLogs = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-black-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-yellow-100 rounded-xl">
            <FileText className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h3 className="font-semibold text-black-800">System Logs</h3>
            <p className="text-sm text-black-500">Recent system activity</p>
          </div>
        </div>
        <button
          onClick={() => toast.success("Logs exported (mock)")}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
        >
          Export Logs
        </button>
      </div>
      <div className="space-y-3">
        {summary.schoolStats.systemLogs.map((log, idx) => (
          <motion.div 
            key={log.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-start gap-4 p-4 bg-black-50 rounded-xl hover:bg-black-100 transition-colors"
          >
            <div className="p-2 bg-white rounded-lg border border-black-200">
              <Clock className="w-4 h-4 text-black-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-black-700">{log.detail}</p>
              <p className="text-xs text-black-400 mt-1">{log.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <PageShell width="7xl" className="pt-6">
      {/* School Setup Wizard Modal */}
      <AnimatePresence>
        {showSchoolSetup && (
          <AdminOnboardingWizard
            onComplete={handleSchoolSetupComplete}
            onClose={() => setShowSchoolSetup(false)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black-800">Admin Dashboard</h1>
        <p className="text-sm text-black-500 mt-1">Manage school operations and monitor system health</p>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-64 shrink-0">
          <div className="bg-white rounded-2xl border border-black-200 p-4 sticky top-24">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-black-100">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="font-semibold text-black-800">IT Admin Panel</h2>
                <p className="text-xs text-black-500">System Management</p>
              </div>
            </div>
            <nav className="space-y-1">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      active 
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
                        : "hover:bg-black-100 text-black-600"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>
        <section className="flex-1 space-y-6">
          {activeTab === "overview" && renderOverview()}
          {activeTab === "teachers" && <TeacherManagement />}
          {activeTab === "students" && <StudentRosterUpload />}
          {activeTab === "timetable" && renderTimetable()}
          {activeTab === "mapping" && renderMapping()}
          {activeTab === "logs" && renderLogs()}
        </section>
      </div>
    </PageShell>
  );
}
