import React from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, CheckCircle, GraduationCap } from 'lucide-react';

/**
 * QuickStats - Dashboard stat cards showing key metrics
 * Uses data from dummyData.js via props
 */
export default function QuickStats({ stats }) {
  const {
    pendingAttendance = 0,
    chaptersLeft = 0,
    assignmentsDue = 0,
    totalStudents = 0,
  } = stats || {};

  const statCards = [
    {
      label: 'Attendance Pending',
      value: pendingAttendance,
      icon: Users,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      description: 'Classes awaiting submission',
    },
    {
      label: 'Chapters Remaining',
      value: chaptersLeft,
      icon: BookOpen,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      description: 'Across all sections',
    },
    {
      label: 'Assignments Due',
      value: assignmentsDue,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      description: 'Pending review',
    },
    {
      label: 'Total Students',
      value: totalStudents,
      icon: GraduationCap,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      description: 'Across sections',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-3xl border border-neutral-200 p-4 hover:shadow-md transition-shadow h-full min-h-[120px]"
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`p-2 rounded-xl ${stat.bg}`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-800">{stat.value}</p>
            <p className="text-xs font-medium text-neutral-500 mt-1">{stat.label}</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">{stat.description}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
