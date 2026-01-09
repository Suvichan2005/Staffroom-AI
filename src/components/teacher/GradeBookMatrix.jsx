import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  User, ChevronDown, ChevronUp, Download, Filter, 
  CheckCircle2, AlertCircle, Clock, Minus
} from 'lucide-react';
import { students, getAllAssessments } from '../../data/dummyData';
import { getAllAssessmentsWithStored } from '../../utils/assessmentStorage';

/**
 * GradeBookMatrix - Matrix view of all students and their grades
 * 
 * Features:
 * - Students as rows, assessments as columns
 * - Color-coded grades (green > 80%, yellow > 60%, red < 60%)
 * - Sort by student name or grade
 * - Filter by assessment type
 * - Averages per student and per assessment
 */
export default function GradeBookMatrix({ classId, courseId }) {
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'average'
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  // Get students for this class
  const classStudents = useMemo(() => {
    return students
      .filter(s => s.classId === classId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [classId]);

  // Get assessments for this class
  const assessments = useMemo(() => {
    const dummyAssessments = getAllAssessments();
    const allAssessments = getAllAssessmentsWithStored(dummyAssessments);
    
    let filtered = allAssessments.filter(a => a.classId === classId);
    
    if (typeFilter !== 'all') {
      const isTest = typeFilter === 'test';
      filtered = filtered.filter(a => {
        const assessmentIsTest = ['quiz', 'unit-test', 'mid-term', 'final'].includes(a.type);
        return isTest ? assessmentIsTest : !assessmentIsTest;
      });
    }
    
    return filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [classId, typeFilter]);

  // Build grade matrix
  const gradeMatrix = useMemo(() => {
    return classStudents.map(student => {
      const studentGrades = assessments.map(assessment => {
        const submission = assessment.submissions?.find(s => s.studentId === student.studentId);
        return {
          assessmentId: assessment.id,
          grade: submission?.grade,
          submitted: !!submission,
          maxPoints: assessment.maxPoints,
          percent: submission?.grade !== undefined 
            ? Math.round((submission.grade / assessment.maxPoints) * 100)
            : null,
        };
      });

      // Calculate average
      const gradedSubmissions = studentGrades.filter(g => g.grade !== undefined);
      const average = gradedSubmissions.length > 0
        ? Math.round(
            gradedSubmissions.reduce((sum, g) => sum + g.percent, 0) / gradedSubmissions.length
          )
        : null;

      return {
        student,
        grades: studentGrades,
        average,
        submissionCount: studentGrades.filter(g => g.submitted).length,
      };
    });
  }, [classStudents, assessments]);

  // Calculate assessment averages
  const assessmentAverages = useMemo(() => {
    return assessments.map(assessment => {
      const grades = gradeMatrix
        .map(row => row.grades.find(g => g.assessmentId === assessment.id))
        .filter(g => g?.grade !== undefined);
      
      if (grades.length === 0) return null;
      
      return Math.round(
        grades.reduce((sum, g) => sum + g.percent, 0) / grades.length
      );
    });
  }, [assessments, gradeMatrix]);

  // Sort students
  const sortedMatrix = useMemo(() => {
    return [...gradeMatrix].sort((a, b) => {
      if (sortBy === 'name') {
        const cmp = a.student.name.localeCompare(b.student.name);
        return sortDir === 'asc' ? cmp : -cmp;
      } else {
        // Sort by average, nulls last
        const avgA = a.average ?? -1;
        const avgB = b.average ?? -1;
        const cmp = avgA - avgB;
        return sortDir === 'asc' ? cmp : -cmp;
      }
    });
  }, [gradeMatrix, sortBy, sortDir]);

  // Get grade color
  const getGradeColor = (percent) => {
    if (percent === null || percent === undefined) return 'bg-neutral-100 text-neutral-400';
    if (percent >= 80) return 'bg-green-100 text-green-700';
    if (percent >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortDir === 'asc' 
      ? <ChevronUp className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3" />;
  };

  if (classStudents.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500">
        <User className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
        <p>No students in this class</p>
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
        <p>No assessments found for this class</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-neutral-800">Grade Book</h3>
          <p className="text-xs text-neutral-500">
            {classStudents.length} students – {assessments.length} assessments
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-sm bg-white border border-neutral-200 rounded-lg focus:ring-2 focus:ring-indigo-200"
          >
            <option value="all">All Types</option>
            <option value="assignment">Assignments</option>
            <option value="test">Tests</option>
          </select>

          {/* Export button (placeholder) */}
          <button className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50">
              {/* Student column header */}
              <th 
                className="sticky left-0 z-10 bg-neutral-50 px-4 py-3 text-left font-semibold text-neutral-700 border-r border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                onClick={() => toggleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Student
                  <SortIcon field="name" />
                </div>
              </th>
              
              {/* Assessment columns */}
              {assessments.map((assessment) => (
                <th 
                  key={assessment.id}
                  className="px-3 py-3 text-center font-medium text-neutral-600 min-w-[80px]"
                  title={assessment.title}
                >
                  <div className="truncate max-w-[100px]">
                    {assessment.title.length > 12 
                      ? assessment.title.slice(0, 12) + '...'
                      : assessment.title
                    }
                  </div>
                  <div className="text-[10px] text-neutral-400 font-normal mt-0.5">
                    /{assessment.maxPoints}
                  </div>
                </th>
              ))}
              
              {/* Average column */}
              <th 
                className="sticky right-0 z-10 bg-neutral-50 px-4 py-3 text-center font-semibold text-neutral-700 border-l border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                onClick={() => toggleSort('average')}
              >
                <div className="flex items-center justify-center gap-1">
                  Avg
                  <SortIcon field="average" />
                </div>
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-neutral-100">
            {sortedMatrix.map((row, idx) => (
              <tr 
                key={row.student.studentId}
                className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}
              >
                {/* Student name */}
                <td className="sticky left-0 z-10 px-4 py-2.5 border-r border-neutral-200 bg-inherit">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-700">
                      {row.student.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="font-medium text-neutral-700 truncate max-w-[120px]">
                      {row.student.name}
                    </span>
                  </div>
                </td>
                
                {/* Grade cells */}
                {row.grades.map((grade, gIdx) => (
                  <td key={gIdx} className="px-3 py-2.5 text-center">
                    {grade.grade !== undefined ? (
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getGradeColor(grade.percent)}`}>
                        {grade.percent}%
                      </span>
                    ) : grade.submitted ? (
                      <span className="text-neutral-400 flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5" title="Pending grade" />
                      </span>
                    ) : (
                      <span className="text-neutral-300">
                        <Minus className="w-3.5 h-3.5 mx-auto" />
                      </span>
                    )}
                  </td>
                ))}
                
                {/* Student average */}
                <td className="sticky right-0 z-10 px-4 py-2.5 text-center border-l border-neutral-200 bg-inherit">
                  {row.average !== null ? (
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${getGradeColor(row.average)}`}>
                      {row.average}%
                    </span>
                  ) : (
                    <span className="text-neutral-400 text-xs">─</span>
                  )}
                </td>
              </tr>
            ))}
            
            {/* Assessment averages row */}
            <tr className="bg-indigo-50 font-medium">
              <td className="sticky left-0 z-10 px-4 py-2.5 border-r border-neutral-200 bg-indigo-50 text-indigo-700">
                Class Average
              </td>
              {assessmentAverages.map((avg, idx) => (
                <td key={idx} className="px-3 py-2.5 text-center">
                  {avg !== null ? (
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getGradeColor(avg)}`}>
                      {avg}%
                    </span>
                  ) : (
                    <span className="text-neutral-400 text-xs">─</span>
                  )}
                </td>
              ))}
              <td className="sticky right-0 z-10 px-4 py-2.5 text-center border-l border-neutral-200 bg-indigo-50">
                {/* Overall class average */}
                {(() => {
                  const allAvgs = sortedMatrix.filter(r => r.average !== null).map(r => r.average);
                  if (allAvgs.length === 0) return <span className="text-neutral-400">─</span>;
                  const overall = Math.round(allAvgs.reduce((s, a) => s + a, 0) / allAvgs.length);
                  return (
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${getGradeColor(overall)}`}>
                      {overall}%
                    </span>
                  );
                })()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-neutral-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-100" /> 80%+
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-yellow-100" /> 60-79%
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-100" /> &lt;60%
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-neutral-400" /> Pending
        </div>
        <div className="flex items-center gap-1.5">
          <Minus className="w-3 h-3 text-neutral-300" /> Not submitted
        </div>
      </div>
    </div>
  );
}
