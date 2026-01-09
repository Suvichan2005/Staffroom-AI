import React, { useState, useEffect } from 'react';
import { AlertTriangle, TrendingDown, Info, Loader2 } from 'lucide-react';
import { detectAttendanceRisks, analyzeStudentPerformance } from '../../services/aiService';
import { attendanceLogs, students, getStudentAttendanceSummary } from '../../data/dummyData';

/**
 * Attendance AI Insights Component
 * 
 * Detects attendance patterns and at-risk students using AI
 */
export default function AttendanceAIInsights({ classId }) {
  const [insights, setInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentAnalysis, setStudentAnalysis] = useState(null);

  useEffect(() => {
    if (classId) {
      analyzeAttendance();
    }
  }, [classId]);

  const analyzeAttendance = async () => {
    setIsLoading(true);

    try {
      // Get students in this class
      const classStudents = students.filter(s => s.classId === classId);

      // Calculate attendance for each
      const studentData = classStudents.map(student => {
        const summary = getStudentAttendanceSummary(student.studentId);
        const recentLogs = attendanceLogs
          .filter(log => log.studentId === student.studentId)
          .slice(-7); // Last 7 days

        const recentAbsences = recentLogs.filter(log => log.status === 'absent').length;

        return {
          name: student.name,
          studentId: student.studentId,
          attendance: parseFloat(summary.attendancePercent),
          absences: recentAbsences,
          totalClasses: summary.totalClasses
        };
      });

      // Calculate class average
      const classAverage = studentData.reduce((sum, s) => sum + s.attendance, 0) / studentData.length;

      // Send to AI for analysis
      const risks = await detectAttendanceRisks({
        students: studentData,
        classAverage,
        recentTrend: 'stable'
      });

      setInsights(risks);
    } catch (error) {
      console.error('Attendance analysis error:', error);
      // Show some default insights
      setInsights([
        {
          studentName: 'Demo Student',
          attendancePercent: 68,
          riskLevel: 'high',
          insight: 'Below 75% threshold - requires attention',
          action: 'Schedule parent-teacher meeting'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentClick = async (studentName) => {
    const student = students.find(s => s.name === studentName);
    if (!student) return;

    setSelectedStudent(student);
    setStudentAnalysis(null);

    try {
      const summary = getStudentAttendanceSummary(student.studentId);
      
      const analysis = await analyzeStudentPerformance({
        name: student.name,
        attendance: parseFloat(summary.attendancePercent),
        assignments: { avgGrade: 85 }, // Mock data
        grades: [88, 92, 78, 85]
      });

      setStudentAnalysis(analysis);
    } catch (error) {
      console.error('Student analysis error:', error);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'high':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default:
        return 'bg-blue-100 border-blue-300 text-blue-800';
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-5 h-5" />;
      case 'medium':
        return <TrendingDown className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900">AI Attendance Insights</h3>
        <button
          onClick={analyzeAttendance}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {isLoading ? 'Analyzing...' : 'Refresh Analysis'}
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          <span className="ml-2 text-sm text-neutral-600">AI is analyzing attendance patterns...</span>
        </div>
      )}

      {/* Insights List */}
      {!isLoading && insights.length === 0 && (
        <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
          <Info className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm text-green-800 font-medium">No attendance concerns detected</p>
          <p className="text-xs text-green-700 mt-1">All students are maintaining good attendance</p>
        </div>
      )}

      {!isLoading && insights.length > 0 && (
        <div className="space-y-3">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${getRiskColor(
                insight.riskLevel
              )}`}
              onClick={() => handleStudentClick(insight.studentName)}
            >
              <div className="flex items-start gap-3">
                {getRiskIcon(insight.riskLevel)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold">{insight.studentName}</h4>
                    <span className="text-xs font-mono">{insight.attendancePercent}%</span>
                  </div>
                  <p className="text-sm mb-2">{insight.insight}</p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-white rounded text-xs font-medium">
                      {insight.riskLevel.toUpperCase()}
                    </span>
                    <span className="text-xs">→ {insight.action}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Student Analysis Modal */}
      {selectedStudent && studentAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-neutral-900">{selectedStudent.name}</h3>
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentAnalysis(null);
                  }}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  ✕
                </button>
              </div>

              {/* Summary */}
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">{studentAnalysis.summary}</p>
              </div>

              {/* Risk Level */}
              <div className="mb-4">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    studentAnalysis.riskLevel === 'high'
                      ? 'bg-red-100 text-red-800'
                      : studentAnalysis.riskLevel === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  Risk Level: {studentAnalysis.riskLevel.toUpperCase()}
                </span>
              </div>

              {/* Strengths */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-neutral-900 mb-2">✅ Strengths</h4>
                <ul className="space-y-1">
                  {studentAnalysis.strengths.map((strength, idx) => (
                    <li key={idx} className="text-sm text-neutral-700 flex items-start gap-2">
                      <span className="text-green-600">–</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-neutral-900 mb-2">⚠️ Areas for Improvement</h4>
                <ul className="space-y-1">
                  {studentAnalysis.weaknesses.map((weakness, idx) => (
                    <li key={idx} className="text-sm text-neutral-700 flex items-start gap-2">
                      <span className="text-orange-600">–</span>
                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Learning Style */}
              <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-900">
                  <strong>Learning Style:</strong> {studentAnalysis.learningStyle}
                </p>
              </div>

              {/* Recommendations */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-neutral-900 mb-2">💡 Recommendations</h4>
                <ul className="space-y-2">
                  {studentAnalysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-neutral-700 p-2 bg-neutral-50 rounded">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
