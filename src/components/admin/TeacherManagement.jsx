import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, Mail, Search, MoreVertical, Edit2, Trash2, 
  CheckCircle2, Clock, XCircle, Send, X, User, BookOpen,
  Filter, Download, Upload
} from 'lucide-react';
import { loadUserState, saveUserState } from '../../utils/userScopedStorage';
import { toast } from 'react-hot-toast';

/**
 * TeacherManagement - Admin component for managing teachers
 * 
 * Features:
 * - View all teachers (invited and active)
 * - Send invitations via email
 * - Assign subjects and classes
 * - Resend invitations
 * - Remove teachers
 */

// Initial demo teachers
const DEMO_TEACHERS = [
  { 
    id: 't1', 
    name: 'Priya Sharma', 
    email: 'priya.sharma@school.edu', 
    subject: 'Geography',
    classes: ['6A', '6B', '7A'],
    status: 'active',
    joinedAt: '2025-08-15'
  },
  { 
    id: 't2', 
    name: 'Rajesh Kumar', 
    email: 'rajesh.kumar@school.edu', 
    subject: 'History',
    classes: ['8A', '8B'],
    status: 'active',
    joinedAt: '2025-08-20'
  },
];

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState(() => 
    loadUserState('admin:teachers', DEMO_TEACHERS)
  );
  const [pendingInvites, setPendingInvites] = useState(() =>
    loadUserState('admin:pendingInvites', [])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    subject: '',
    classes: [],
  });

  // Combine active teachers and pending invites
  const allTeachers = useMemo(() => {
    const pending = pendingInvites.map(inv => ({
      ...inv,
      status: 'pending',
    }));
    return [...teachers, ...pending];
  }, [teachers, pendingInvites]);

  // Filter teachers
  const filteredTeachers = useMemo(() => {
    return allTeachers.filter(t => {
      const matchesSearch = 
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allTeachers, searchQuery, statusFilter]);

  // Save to storage
  const persistTeachers = (newTeachers) => {
    setTeachers(newTeachers);
    saveUserState('admin:teachers', newTeachers);
  };

  const persistInvites = (newInvites) => {
    setPendingInvites(newInvites);
    saveUserState('admin:pendingInvites', newInvites);
  };

  // Send invitation
  const handleSendInvite = () => {
    if (!inviteForm.email || !inviteForm.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Check for duplicates
    const exists = allTeachers.some(t => 
      t.email.toLowerCase() === inviteForm.email.toLowerCase()
    );
    if (exists) {
      toast.error('This email has already been invited');
      return;
    }

    const newInvite = {
      id: `inv_${Date.now()}`,
      email: inviteForm.email.toLowerCase().trim(),
      name: inviteForm.name || inviteForm.email.split('@')[0],
      subject: inviteForm.subject || 'Not assigned',
      classes: inviteForm.classes,
      invitedAt: new Date().toISOString(),
      status: 'pending',
    };

    persistInvites([...pendingInvites, newInvite]);
    
    // In production, this would send an actual email
    console.log('[TeacherManagement] Invitation sent:', newInvite);
    toast.success(`Invitation sent to ${inviteForm.email}`);
    
    setShowInviteModal(false);
    setInviteForm({ email: '', name: '', subject: '', classes: [] });
  };

  // Resend invitation
  const handleResendInvite = (invite) => {
    console.log('[TeacherManagement] Resending invitation:', invite.email);
    toast.success(`Invitation resent to ${invite.email}`);
  };

  // Cancel invitation
  const handleCancelInvite = (inviteId) => {
    const updated = pendingInvites.filter(inv => inv.id !== inviteId);
    persistInvites(updated);
    toast.success('Invitation cancelled');
  };

  // Remove teacher
  const handleRemoveTeacher = (teacherId) => {
    if (!confirm('Are you sure you want to remove this teacher?')) return;
    
    const updated = teachers.filter(t => t.id !== teacherId);
    persistTeachers(updated);
    toast.success('Teacher removed');
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3" /> Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <XCircle className="w-3 h-3" /> Inactive
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-800">Teacher Management</h2>
          <p className="text-sm text-neutral-500">
            {teachers.length} active, {pendingInvites.length} pending invitations
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
        >
          <UserPlus className="w-4 h-4" />
          Invite Teacher
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Teachers List */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        {filteredTeachers.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p className="text-neutral-600 font-medium">No teachers found</p>
            <p className="text-sm text-neutral-500">
              {searchQuery ? 'Try a different search' : 'Invite teachers to get started'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredTeachers.map((teacher, idx) => (
              <motion.div
                key={teacher.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="p-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-semibold text-indigo-600">
                      {teacher.name?.split(' ').map(n => n[0]).join('') || '?'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-neutral-800 truncate">
                        {teacher.name}
                      </h3>
                      {getStatusBadge(teacher.status)}
                    </div>
                    <p className="text-sm text-neutral-500 truncate">{teacher.email}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {teacher.subject}
                      </span>
                      {teacher.classes?.length > 0 && (
                        <span>
                          {teacher.classes.slice(0, 3).join(', ')}
                          {teacher.classes.length > 3 && ` +${teacher.classes.length - 3}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {teacher.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleResendInvite(teacher)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Resend invitation"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCancelInvite(teacher.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Cancel invitation"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors"
                          title="Edit teacher"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveTeacher(teacher.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove teacher"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-neutral-800">Invite Teacher</h3>
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-neutral-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      placeholder="teacher@school.edu"
                      className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    placeholder="Priya Sharma"
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Subject
                  </label>
                  <select
                    value={inviteForm.subject}
                    onChange={(e) => setInviteForm({ ...inviteForm, subject: e.target.value })}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                  >
                    <option value="">Select subject...</option>
                    <option value="Geography">Geography</option>
                    <option value="History">History</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-neutral-500">
                    An invitation email will be sent to the teacher. They can set up their account once they accept.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-neutral-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendInvite}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                >
                  <Send className="w-4 h-4" />
                  Send Invitation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
