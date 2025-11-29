import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, Phone, Building, BookOpen, Calendar,
  Edit2, Camera, Shield, Bell, Award, Clock,
  CheckSquare, Target, Sparkles, Users, MoreHorizontal
} from 'lucide-react';
import { teacherData, teacherDirectory } from '../data/dummyData';
import { PageShell } from '../components/layout';

/**
 * Profile Page - Teacher profile and information
 */
export default function ProfilePage() {
  const teacher = teacherData;
  const teacherInfo = teacherDirectory.find(t => t.id === teacher.id) || {};

  const stats = [
    { label: 'Courses', value: teacher.courses?.length || 0, icon: BookOpen, color: 'indigo' },
    { label: 'Sections', value: teacher.courses?.reduce((sum, c) => sum + (c.sections?.length || 0), 0) || 0, icon: Building, color: 'emerald' },
    { label: 'Experience', value: '5 years', icon: Award, color: 'amber' },
    { label: 'This Month', value: '24 classes', icon: Calendar, color: 'purple' },
  ];

  // Recent activity data
  const recentActivity = useMemo(() => [
    { text: 'Marked 6A attendance', time: '2 hours ago', type: 'attendance', icon: CheckSquare },
    { text: 'Updated Ch. 3 progress', time: '4 hours ago', type: 'progress', icon: Target },
    { text: 'Added new assignment', time: 'Yesterday', type: 'assignment', icon: BookOpen },
    { text: 'Generated quiz for 8B', time: 'Yesterday', type: 'ai', icon: Sparkles },
    { text: '3 students submitted work', time: '2 days ago', type: 'submission', icon: Users },
  ], []);

  const colorMap = {
    indigo: 'bg-indigo-100 text-indigo-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <PageShell width="4xl">
      <div className="space-y-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
        >
          {/* Cover Image */}
          <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600 relative">
            <button className="absolute top-3 right-3 p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          
          {/* Profile Info */}
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-3xl font-bold text-white border-4 border-white shadow-lg">
                  {teacher.name?.split(' ').map(n => n[0]).join('') || 'MA'}
                </div>
                <button className="absolute -bottom-1 -right-1 p-1.5 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors">
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
              
              {/* Name & Role */}
              <div className="flex-1 sm:pb-2 sm:pt-16 z-10">
                <h1 className="text-2xl font-bold text-slate-800">{teacher.name}</h1>
                <p className="text-slate-500">{teacherInfo.role || 'Teacher'} • {teacherInfo.subject}</p>
              </div>
              
              {/* Edit Button */}
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors">
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className={`w-10 h-10 rounded-xl ${colorMap[stat.color]} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            );
          })}
        </motion.div>

        {/* Contact & Details */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-200 p-5"
          >
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Mail className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-sm font-medium text-slate-700">{teacherInfo.contact || 'teacher@school.edu'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Phone className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="text-sm font-medium text-slate-700">+91 98765 43210</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Building className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Department</p>
                  <p className="text-sm font-medium text-slate-700">{teacherInfo.subject} Department</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl border border-slate-200 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Recent Activity</h2>
              <button className="p-1 hover:bg-slate-100 rounded-lg">
                <MoreHorizontal className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + index * 0.05 }}
                    className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className={`
                      p-2 rounded-lg
                      ${activity.type === 'attendance' ? 'bg-emerald-100 text-emerald-600' : ''}
                      ${activity.type === 'progress' ? 'bg-indigo-100 text-indigo-600' : ''}
                      ${activity.type === 'assignment' ? 'bg-amber-100 text-amber-600' : ''}
                      ${activity.type === 'ai' ? 'bg-purple-100 text-purple-600' : ''}
                      ${activity.type === 'submission' ? 'bg-sky-100 text-sky-600' : ''}
                    `}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">{activity.text}</p>
                      <p className="text-xs text-slate-400">{activity.time}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Teaching Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 p-5"
        >
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Current Courses</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teacher.courses?.map((course, i) => (
              <div key={course.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden">
                    <img 
                      src={course.imageUrl} 
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{course.title}</p>
                    <p className="text-xs text-slate-500">{course.sections?.length || 0} sections</p>
                  </div>
                </div>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-200 p-5"
        >
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Account Settings</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: Shield, label: 'Security', desc: 'Password & 2FA' },
              { icon: Bell, label: 'Notifications', desc: 'Email & push alerts' },
              { icon: User, label: 'Privacy', desc: 'Data preferences' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <button 
                  key={i}
                  className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all text-left"
                >
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Icon className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </PageShell>
  );
}
