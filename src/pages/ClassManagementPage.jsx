import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Pencil, Trash2, Upload, Users, Clock, BookOpen,
    ChevronRight, Search, FolderPlus, FileSpreadsheet, UserPlus,
    Calendar, MoreVertical, X, Check, AlertCircle
} from 'lucide-react';
import { useTeacher } from '../context/TeacherContext';
import { PageShell } from '../components/layout';
import { Button, IconButton } from '../components/design-system/Button';
import { Modal, ConfirmModal } from '../components/design-system/Modal';
import CreateClassModal from '../components/teacher/CreateClassModal';
import EditClassModal from '../components/teacher/EditClassModal';
import DocumentUploadModal from '../components/teacher/DocumentUploadModal';
import toast from 'react-hot-toast';

/**
 * ClassManagementPage - Manage courses, classes/sections, and upload documents
 */
export default function ClassManagementPage() {
    const navigate = useNavigate();
    const {
        teacher,
        deleteCourse,
        deleteSection,
        addStudentsToClass,
        applyTimetableData
    } = useTeacher();

    // Modal states
    const [showCreateCourse, setShowCreateCourse] = useState(false);
    const [showCreateClass, setShowCreateClass] = useState(false);
    const [editingClass, setEditingClass] = useState(null); // { courseId, section }
    const [uploadMode, setUploadMode] = useState(null); // 'timetable' | 'studentList' | null
    const [uploadTargetClass, setUploadTargetClass] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'course'|'class', courseId, sectionId? }

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCourses, setExpandedCourses] = useState(new Set());

    const courses = teacher?.courses || [];

    // Filter courses based on search
    const filteredCourses = useMemo(() => {
        if (!searchQuery) return courses;
        const query = searchQuery.toLowerCase();
        return courses.filter(course =>
            course.title.toLowerCase().includes(query) ||
            course.sections?.some(s => s.id.toLowerCase().includes(query))
        );
    }, [courses, searchQuery]);

    // Toggle course expansion
    const toggleCourse = (courseId) => {
        setExpandedCourses(prev => {
            const next = new Set(prev);
            if (next.has(courseId)) {
                next.delete(courseId);
            } else {
                next.add(courseId);
            }
            return next;
        });
    };

    // Handle delete confirmation
    const handleDelete = () => {
        if (!deleteConfirm) return;

        if (deleteConfirm.type === 'course') {
            const success = deleteCourse(deleteConfirm.courseId);
            if (success) {
                toast.success('Course deleted successfully');
            } else {
                toast.error('Failed to delete course');
            }
        } else {
            const success = deleteSection(deleteConfirm.courseId, deleteConfirm.sectionId);
            if (success) {
                toast.success('Class deleted successfully');
            } else {
                toast.error('Failed to delete class');
            }
        }
        setDeleteConfirm(null);
    };

    // Handle document upload success
    const handleUploadSuccess = (result, mode) => {
        if (mode === 'timetable') {
            const applied = applyTimetableData(result.schedules);
            toast.success(`Updated schedules for ${applied.updated} class(es)`);
            if (applied.notFound.length > 0) {
                toast.error(`Classes not found: ${applied.notFound.join(', ')}`);
            }
        } else if (mode === 'studentList') {
            if (uploadTargetClass && result.students?.length > 0) {
                addStudentsToClass(uploadTargetClass, result.students);
                toast.success(`Added ${result.students.length} students to ${uploadTargetClass}`);
            }
        }
        setUploadMode(null);
        setUploadTargetClass(null);
    };

    return (
        <PageShell width="6xl">
            <div className="space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                    <div>
                        <h1 className="text-2xl font-bold text-black-800">Class Management</h1>
                        <p className="text-black-500">
                            Create and manage your courses, classes, and student lists
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setUploadMode('timetable')}
                            className="gap-2"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            Upload Timetable
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => setShowCreateCourse(true)}
                            className="gap-2"
                        >
                            <FolderPlus className="w-4 h-4" />
                            New Course
                        </Button>
                    </div>
                </motion.div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search courses or classes..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-black-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                    />
                </div>

                {/* Courses List */}
                <div className="space-y-4">
                    <AnimatePresence>
                        {filteredCourses.map((course, courseIndex) => (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: courseIndex * 0.05 }}
                                className="bg-white rounded-2xl border border-black-200 overflow-hidden"
                            >
                                {/* Course Header */}
                                <div
                                    className="p-4 cursor-pointer hover:bg-black-50 transition-colors"
                                    onClick={() => toggleCourse(course.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Course Image */}
                                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                                            <img
                                                src={course.imageUrl || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200'}
                                                alt={course.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* Course Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-lg font-semibold text-black-800 truncate">
                                                    {course.title}
                                                </h2>
                                                {course.subject && (
                                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                                                        {course.subject}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-black-500">
                                                {course.sections?.length || 0} classes • Grade {course.grade || 'N/A'}
                                            </p>
                                        </div>

                                        {/* Course Actions */}
                                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                            <IconButton
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowCreateClass({ courseId: course.id })}
                                                title="Add class to this course"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </IconButton>
                                            <IconButton
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setDeleteConfirm({ type: 'course', courseId: course.id })}
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                title="Delete course"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </IconButton>
                                            <ChevronRight
                                                className={`w-5 h-5 text-black-400 transition-transform ${expandedCourses.has(course.id) ? 'rotate-90' : ''
                                                    }`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Sections/Classes */}
                                <AnimatePresence>
                                    {expandedCourses.has(course.id) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-black-100"
                                        >
                                            {course.sections?.length > 0 ? (
                                                <div className="divide-y divide-black-100">
                                                    {course.sections.map((section) => (
                                                        <div
                                                            key={section.id}
                                                            className="p-4 flex items-center justify-between hover:bg-black-50 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                                                    <span className="text-sm font-semibold text-indigo-700">
                                                                        {section.id}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-black-700">Section {section.id}</p>
                                                                    <div className="flex items-center gap-3 text-xs text-black-500">
                                                                        <span className="flex items-center gap-1">
                                                                            <Clock className="w-3 h-3" />
                                                                            {section.schedules?.[0] || 'No schedule'}
                                                                        </span>
                                                                        {section.schedules?.length > 1 && (
                                                                            <span>+{section.schedules.length - 1} more</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setUploadTargetClass(section.id);
                                                                        setUploadMode('studentList');
                                                                    }}
                                                                    className="gap-1 text-xs"
                                                                >
                                                                    <UserPlus className="w-3 h-3" />
                                                                    Students
                                                                </Button>
                                                                <IconButton
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setEditingClass({ courseId: course.id, section })}
                                                                    title="Edit class"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </IconButton>
                                                                <IconButton
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setDeleteConfirm({
                                                                        type: 'class',
                                                                        courseId: course.id,
                                                                        sectionId: section.id
                                                                    })}
                                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                    title="Delete class"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </IconButton>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-8 text-center">
                                                    <div className="w-12 h-12 mx-auto bg-black-100 rounded-full flex items-center justify-center mb-3">
                                                        <Users className="w-6 h-6 text-black-400" />
                                                    </div>
                                                    <p className="text-black-500 mb-3">No classes in this course yet</p>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setShowCreateClass({ courseId: course.id })}
                                                        className="gap-2"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        Add First Class
                                                    </Button>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Empty State */}
                    {filteredCourses.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-16"
                        >
                            <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                                <BookOpen className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-black-800 mb-2">
                                {searchQuery ? 'No matching courses' : 'No courses yet'}
                            </h3>
                            <p className="text-black-500 mb-6">
                                {searchQuery
                                    ? 'Try a different search term'
                                    : 'Create your first course to start managing classes'}
                            </p>
                            {!searchQuery && (
                                <Button
                                    variant="primary"
                                    onClick={() => setShowCreateCourse(true)}
                                    className="gap-2"
                                >
                                    <FolderPlus className="w-4 h-4" />
                                    Create Course
                                </Button>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Create Course Modal */}
            <CreateClassModal
                isOpen={showCreateCourse}
                onClose={() => setShowCreateCourse(false)}
                mode="course"
            />

            {/* Create Class Modal */}
            <CreateClassModal
                isOpen={!!showCreateClass}
                onClose={() => setShowCreateClass(false)}
                mode="class"
                courseId={showCreateClass?.courseId}
            />

            {/* Edit Class Modal */}
            <EditClassModal
                isOpen={!!editingClass}
                onClose={() => setEditingClass(null)}
                courseId={editingClass?.courseId}
                section={editingClass?.section}
            />

            {/* Document Upload Modal */}
            <DocumentUploadModal
                isOpen={!!uploadMode}
                onClose={() => {
                    setUploadMode(null);
                    setUploadTargetClass(null);
                }}
                mode={uploadMode}
                targetClassId={uploadTargetClass}
                onSuccess={(result) => handleUploadSuccess(result, uploadMode)}
            />

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={handleDelete}
                title={deleteConfirm?.type === 'course' ? 'Delete Course' : 'Delete Class'}
                message={
                    deleteConfirm?.type === 'course'
                        ? 'This will delete the course and all its classes. This action cannot be undone.'
                        : 'This will delete the class and all associated data. This action cannot be undone.'
                }
                confirmText="Delete"
                variant="danger"
            />
        </PageShell>
    );
}
