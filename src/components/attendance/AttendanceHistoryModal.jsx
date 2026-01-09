import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Search, 
  Users, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Minus,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  User,
  ArrowLeft,
  Filter
} from "lucide-react";
import { students as allStudents, attendanceLogs } from "../../data/dummyData";

export default function AttendanceHistoryModal({ classId, onClose, mergeTodayOverride }) {
  const [view, setView] = useState("students"); // 'students' | 'calendar' | 'profile'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name"); // 'name' | 'attendance' | 'streak'
  const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'at-risk' | 'excellent'

  const classStudents = useMemo(() => allStudents.filter(s => s.classId === classId), [classId]);

  // Merge override (local save) BEFORE grouping so aggregates reflect it.
  const effectiveLogs = useMemo(() => {
    let logs = attendanceLogs.filter(l => l.classId === classId);
    if (mergeTodayOverride?.date && mergeTodayOverride?.presentMap) {
      const date = mergeTodayOverride.date;
      logs = logs.filter(l => l.date !== date);
      const overrideRecords = Object.entries(mergeTodayOverride.presentMap).map(([studentId, present]) => ({
        studentId,
        classId,
        date,
        status: present ? 'present' : 'absent',
        method: 'manual'
      }));
      logs = logs.concat(overrideRecords);
    }
    return logs;
  }, [classId, mergeTodayOverride]);

  // Calculate student profiles with detailed stats
  const studentProfiles = useMemo(() => {
    const allDates = [...new Set(effectiveLogs.map(l => l.date))].sort();
    
    return classStudents.map(student => {
      const studentLogs = effectiveLogs.filter(l => l.studentId === student.studentId);
      const presentCount = studentLogs.filter(l => l.status === 'present').length;
      const absentCount = studentLogs.filter(l => l.status === 'absent').length;
      const totalSessions = studentLogs.length;
      const attendanceRate = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;
      
      // Calculate streak
      const sortedLogs = studentLogs.sort((a, b) => b.date.localeCompare(a.date));
      let currentStreak = 0;
      for (const log of sortedLogs) {
        if (log.status === 'present') currentStreak++;
        else break;
      }
      
      // Calculate trend (compare last 5 sessions to previous 5)
      const recentLogs = sortedLogs.slice(0, 5);
      const previousLogs = sortedLogs.slice(5, 10);
      const recentRate = recentLogs.length > 0 
        ? (recentLogs.filter(l => l.status === 'present').length / recentLogs.length) * 100 
        : 0;
      const previousRate = previousLogs.length > 0 
        ? (previousLogs.filter(l => l.status === 'present').length / previousLogs.length) * 100 
        : recentRate;
      const trend = recentRate - previousRate;
      
      // Get recent attendance pattern (last 7 sessions)
      const pattern = sortedLogs.slice(0, 7).map(l => l.status === 'present');
      
      // Determine status
      let status = 'good';
      if (attendanceRate < 75) status = 'at-risk';
      else if (attendanceRate >= 90) status = 'excellent';
      
      return {
        ...student,
        presentCount,
        absentCount,
        totalSessions,
        attendanceRate: +attendanceRate.toFixed(1),
        currentStreak,
        trend: +trend.toFixed(1),
        pattern,
        status,
        logs: sortedLogs
      };
    });
  }, [classStudents, effectiveLogs]);

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let result = [...studentProfiles];
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.name?.toLowerCase().includes(query) ||
        s.studentId?.toLowerCase().includes(query)
      );
    }
    
    // Apply filter
    if (filterStatus === 'at-risk') {
      result = result.filter(s => s.status === 'at-risk');
    } else if (filterStatus === 'excellent') {
      result = result.filter(s => s.status === 'excellent');
    }
    
    // Apply sort
    if (sortBy === 'name') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'attendance') {
      result.sort((a, b) => b.attendanceRate - a.attendanceRate);
    } else if (sortBy === 'streak') {
      result.sort((a, b) => b.currentStreak - a.currentStreak);
    }
    
    return result;
  }, [studentProfiles, searchQuery, filterStatus, sortBy]);

  // Calendar view data
  const calendarData = useMemo(() => {
    const groups = {};
    effectiveLogs.forEach(l => {
      if (!groups[l.date]) groups[l.date] = { present: 0, absent: 0, total: 0 };
      groups[l.date].total++;
      if (l.status === 'present') groups[l.date].present++;
      else groups[l.date].absent++;
    });
    
    return Object.entries(groups)
      .map(([date, data]) => ({
        date,
        ...data,
        rate: data.total > 0 ? (data.present / data.total) * 100 : 0
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [effectiveLogs]);

  // Class stats
  const classStats = useMemo(() => {
    const totalStudents = studentProfiles.length;
    const avgAttendance = totalStudents > 0 
      ? studentProfiles.reduce((acc, s) => acc + s.attendanceRate, 0) / totalStudents 
      : 0;
    const atRisk = studentProfiles.filter(s => s.status === 'at-risk').length;
    const excellent = studentProfiles.filter(s => s.status === 'excellent').length;
    
    return {
      totalStudents,
      avgAttendance: +avgAttendance.toFixed(1),
      atRisk,
      excellent,
      totalSessions: calendarData.length
    };
  }, [studentProfiles, calendarData]);

  const openStudentProfile = (student) => {
    setSelectedStudent(student);
    setView('profile');
  };

  const goBack = () => {
    setSelectedStudent(null);
    setView('students');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'at-risk': return 'text-red-600 bg-red-50 border-red-200';
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'at-risk': return <AlertTriangle className="w-4 h-4" />;
      case 'excellent': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getTrendIcon = (trend) => {
    if (trend > 5) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < -5) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-neutral-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 md:p-6 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl my-4 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {view === 'profile' && (
                <button 
                  onClick={goBack}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h2 className="text-lg font-semibold">
                  {view === 'profile' && selectedStudent 
                    ? `${selectedStudent.name}'s Profile`
                    : 'Student Attendance Profiles'
                  }
                </h2>
                <p className="text-sm text-white/80">{classId} – {classStats.totalStudents} students</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        {view !== 'profile' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-neutral-50 border-b">
            <div className="bg-white rounded-xl p-3 border border-neutral-200">
              <div className="flex items-center gap-2 text-neutral-500 text-xs mb-1">
                <Users className="w-3.5 h-3.5" />
                <span>Avg Attendance</span>
              </div>
              <p className="text-xl font-bold text-neutral-800">{classStats.avgAttendance}%</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-neutral-200">
              <div className="flex items-center gap-2 text-neutral-500 text-xs mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Total Sessions</span>
              </div>
              <p className="text-xl font-bold text-neutral-800">{classStats.totalSessions}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-red-200 bg-red-50">
              <div className="flex items-center gap-2 text-red-600 text-xs mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>At Risk</span>
              </div>
              <p className="text-xl font-bold text-red-700">{classStats.atRisk}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-green-200 bg-green-50">
              <div className="flex items-center gap-2 text-green-600 text-xs mb-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Excellent</span>
              </div>
              <p className="text-xl font-bold text-green-700">{classStats.excellent}</p>
            </div>
          </div>
        )}

        {/* View Tabs (only when not in profile view) */}
        {view !== 'profile' && (
          <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
            <div className="flex gap-2">
              <button
                onClick={() => setView('students')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  view === 'students' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <User className="w-4 h-4" />
                Students
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  view === 'calendar' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <Calendar className="w-4 h-4" />
                By Date
              </button>
            </div>
            
            {view === 'students' && (
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-48"
                  />
                </div>
                
                {/* Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Students</option>
                  <option value="at-risk">At Risk</option>
                  <option value="excellent">Excellent</option>
                </select>
                
                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="name">Sort: Name</option>
                  <option value="attendance">Sort: Attendance</option>
                  <option value="streak">Sort: Streak</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* Students Grid View */}
            {view === 'students' && (
              <motion.div
                key="students"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
              >
                {filteredStudents.map((student) => (
                  <motion.div
                    key={student.studentId}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openStudentProfile(student)}
                    className="bg-white rounded-xl border border-neutral-200 p-4 cursor-pointer hover:shadow-lg hover:border-indigo-200 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {student.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <h3 className="font-medium text-neutral-800">{student.name}</h3>
                          <p className="text-xs text-neutral-500">{student.studentId}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-400" />
                    </div>
                    
                    {/* Attendance Rate Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-neutral-600">Attendance</span>
                        <span className={`font-semibold ${
                          student.attendanceRate >= 90 ? 'text-green-600' :
                          student.attendanceRate < 75 ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {student.attendanceRate}%
                        </span>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            student.attendanceRate >= 90 ? 'bg-green-500' :
                            student.attendanceRate < 75 ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${student.attendanceRate}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        {getTrendIcon(student.trend)}
                        <span className="text-neutral-500">Trend</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-neutral-500">Streak:</span>
                        <span className="font-medium text-neutral-700">{student.currentStreak}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(student.status)}`}>
                        {student.status === 'at-risk' ? 'At Risk' : 
                         student.status === 'excellent' ? 'Excellent' : 'Good'}
                      </span>
                    </div>
                    
                    {/* Recent Pattern */}
                    <div className="mt-3 flex items-center gap-1">
                      <span className="text-xs text-neutral-400 mr-1">Recent:</span>
                      {student.pattern.map((present, idx) => (
                        <div
                          key={idx}
                          className={`w-4 h-4 rounded-full flex items-center justify-center ${
                            present ? 'bg-green-100' : 'bg-red-100'
                          }`}
                        >
                          {present ? (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
                
                {filteredStudents.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Users className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-neutral-500">No students found</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Calendar View */}
            {view === 'calendar' && (
              <motion.div
                key="calendar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {calendarData.map((day) => (
                  <div
                    key={day.date}
                    className="bg-white rounded-xl border border-neutral-200 p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          day.rate >= 90 ? 'bg-green-100 text-green-600' :
                          day.rate < 75 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-neutral-800">
                            {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </h3>
                          <p className="text-xs text-neutral-500">{day.date}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-green-600">
                              <span className="font-semibold">{day.present}</span> present
                            </span>
                            <span className="text-red-600">
                              <span className="font-semibold">{day.absent}</span> absent
                            </span>
                          </div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg font-semibold text-sm ${
                          day.rate >= 90 ? 'bg-green-100 text-green-700' :
                          day.rate < 75 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {day.rate.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {calendarData.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-neutral-500">No attendance records</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Student Profile View */}
            {view === 'profile' && selectedStudent && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Profile Header */}
                <div className="bg-gradient-to-br from-neutral-50 to-white rounded-xl border border-neutral-200 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                      {selectedStudent.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-neutral-800">{selectedStudent.name}</h2>
                      <p className="text-neutral-500">{selectedStudent.studentId}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedStudent.status)}`}>
                          {getStatusIcon(selectedStudent.status)}
                          {selectedStudent.status === 'at-risk' ? 'At Risk' : 
                           selectedStudent.status === 'excellent' ? 'Excellent' : 'Good Standing'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {selectedStudent.attendanceRate}%
                      </p>
                      <p className="text-sm text-neutral-500">Overall Attendance</p>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl border border-neutral-200 p-4">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Present</span>
                    </div>
                    <p className="text-2xl font-bold text-neutral-800">{selectedStudent.presentCount}</p>
                    <p className="text-xs text-neutral-500">sessions</p>
                  </div>
                  <div className="bg-white rounded-xl border border-neutral-200 p-4">
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                      <XCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Absent</span>
                    </div>
                    <p className="text-2xl font-bold text-neutral-800">{selectedStudent.absentCount}</p>
                    <p className="text-xs text-neutral-500">sessions</p>
                  </div>
                  <div className="bg-white rounded-xl border border-neutral-200 p-4">
                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                      <BarChart3 className="w-5 h-5" />
                      <span className="text-sm font-medium">Streak</span>
                    </div>
                    <p className="text-2xl font-bold text-neutral-800">{selectedStudent.currentStreak}</p>
                    <p className="text-xs text-neutral-500">consecutive</p>
                  </div>
                  <div className="bg-white rounded-xl border border-neutral-200 p-4">
                    <div className="flex items-center gap-2 text-neutral-600 mb-2">
                      {getTrendIcon(selectedStudent.trend)}
                      <span className="text-sm font-medium">Trend</span>
                    </div>
                    <p className={`text-2xl font-bold ${
                      selectedStudent.trend > 0 ? 'text-green-600' : 
                      selectedStudent.trend < 0 ? 'text-red-600' : 'text-neutral-600'
                    }`}>
                      {selectedStudent.trend > 0 ? '+' : ''}{selectedStudent.trend}%
                    </p>
                    <p className="text-xs text-neutral-500">vs previous</p>
                  </div>
                </div>

                {/* Attendance History */}
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
                    <h3 className="font-semibold text-neutral-800">Attendance History</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {selectedStudent.logs.map((log, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between px-4 py-3 border-b border-neutral-50 last:border-0 hover:bg-neutral-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            log.status === 'present' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {log.status === 'present' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-neutral-800">
                              {new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </p>
                            <p className="text-xs text-neutral-500">{log.method || 'Manual'}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          log.status === 'present' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                    ))}
                    
                    {selectedStudent.logs.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-neutral-500">No attendance records</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
