import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    BookOpen, Calendar, Clock, Plus, X, Check, Image
} from 'lucide-react';
import { useTeacher } from '../../context/TeacherContext';
import { Modal } from '../design-system/Modal';
import { Button } from '../design-system/Button';
import toast from 'react-hot-toast';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SUBJECT_SUGGESTIONS = [
    'Mathematics', 'Science', 'English', 'History', 'Geography',
    'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Art',
    'Music', 'Physical Education', 'Economics', 'Social Studies'
];

/**
 * CreateClassModal - Create new courses or classes/sections
 * 
 * @param {boolean} isOpen - Modal visibility
 * @param {Function} onClose - Close handler
 * @param {'course' | 'class'} mode - Create course or class
 * @param {string} courseId - Parent course ID (for class mode)
 */
export default function CreateClassModal({
    isOpen,
    onClose,
    mode = 'course',
    courseId = null
}) {
    const { createCourse, createSection, getAllCourses } = useTeacher();
    const courses = getAllCourses();

    // Course form state
    const [courseForm, setCourseForm] = useState({
        subject: '',
        grade: '',
        title: '',
    });

    // Class form state
    const [classForm, setClassForm] = useState({
        courseId: courseId || '',
        sectionId: '',
        schedules: [{ day: 'Mon', startTime: '09:00', endTime: '09:45' }],
    });

    const [loading, setLoading] = useState(false);

    // Reset form when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setCourseForm({ subject: '', grade: '', title: '' });
            setClassForm({
                courseId: courseId || '',
                sectionId: '',
                schedules: [{ day: 'Mon', startTime: '09:00', endTime: '09:45' }],
            });
        }
    }, [isOpen, courseId]);

    // Add schedule slot
    const addSchedule = () => {
        setClassForm(prev => ({
            ...prev,
            schedules: [...prev.schedules, { day: 'Tue', startTime: '10:00', endTime: '10:45' }]
        }));
    };

    // Remove schedule slot
    const removeSchedule = (index) => {
        setClassForm(prev => ({
            ...prev,
            schedules: prev.schedules.filter((_, i) => i !== index)
        }));
    };

    // Update schedule slot
    const updateSchedule = (index, field, value) => {
        setClassForm(prev => ({
            ...prev,
            schedules: prev.schedules.map((s, i) =>
                i === index ? { ...s, [field]: value } : s
            )
        }));
    };

    // Handle course creation
    const handleCreateCourse = async () => {
        if (!courseForm.subject.trim()) {
            toast.error('Please enter a subject');
            return;
        }
        if (!courseForm.grade) {
            toast.error('Please enter a grade');
            return;
        }

        setLoading(true);
        try {
            const newCourse = createCourse({
                subject: courseForm.subject.trim(),
                grade: parseInt(courseForm.grade),
                title: courseForm.title.trim() || `Grade ${courseForm.grade} ${courseForm.subject}`,
            });

            toast.success(`Course "${newCourse.title}" created!`);
            onClose();
        } catch (error) {
            toast.error('Failed to create course');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Handle class creation
    const handleCreateClass = async () => {
        const targetCourseId = classForm.courseId || courseId;

        if (!targetCourseId) {
            toast.error('Please select a course');
            return;
        }
        if (!classForm.sectionId.trim()) {
            toast.error('Please enter a section/class name');
            return;
        }

        setLoading(true);
        try {
            // Build schedule strings
            const schedules = classForm.schedules
                .filter(s => s.startTime && s.endTime)
                .map(s => `${s.day} ${s.startTime}-${s.endTime}`);

            const newSection = createSection(targetCourseId, {
                id: classForm.sectionId.trim().toUpperCase(),
                schedules,
            });

            toast.success(`Class "${newSection.id}" created!`);
            onClose();
        } catch (error) {
            toast.error('Failed to create class');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = () => {
        if (mode === 'course') {
            handleCreateCourse();
        } else {
            handleCreateClass();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'course' ? 'Create New Course' : 'Create New Class'}
            description={mode === 'course'
                ? 'Set up a new subject/course to add classes to'
                : 'Add a new class/section to your course'}
            size="md"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        loading={loading}
                        className="gap-2"
                    >
                        <Check className="w-4 h-4" />
                        {mode === 'course' ? 'Create Course' : 'Create Class'}
                    </Button>
                </>
            }
        >
            <div className="space-y-5">
                {mode === 'course' ? (
                    // Course Form
                    <>
                        {/* Subject */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                                Subject
                            </label>
                            <input
                                type="text"
                                value={courseForm.subject}
                                onChange={(e) => setCourseForm({ ...courseForm, subject: e.target.value })}
                                placeholder="e.g., Mathematics"
                                className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                                list="subject-suggestions"
                            />
                            <datalist id="subject-suggestions">
                                {SUBJECT_SUGGESTIONS.map(s => (
                                    <option key={s} value={s} />
                                ))}
                            </datalist>
                        </div>

                        {/* Grade */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                                Grade / Year
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="12"
                                value={courseForm.grade}
                                onChange={(e) => setCourseForm({ ...courseForm, grade: e.target.value })}
                                placeholder="e.g., 6"
                                className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                            />
                        </div>

                        {/* Custom Title (optional) */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                                Custom Title <span className="text-neutral-400">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={courseForm.title}
                                onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                                placeholder={courseForm.grade && courseForm.subject
                                    ? `Grade ${courseForm.grade} ${courseForm.subject}`
                                    : 'Auto-generated from subject and grade'}
                                className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                            />
                        </div>
                    </>
                ) : (
                    // Class Form
                    <>
                        {/* Course Selection (if not pre-selected) */}
                        {!courseId && (
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                                    Course
                                </label>
                                <select
                                    value={classForm.courseId}
                                    onChange={(e) => setClassForm({ ...classForm, courseId: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                                >
                                    <option value="">Select a course...</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Section/Class Name */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                                Section / Class Name
                            </label>
                            <input
                                type="text"
                                value={classForm.sectionId}
                                onChange={(e) => setClassForm({ ...classForm, sectionId: e.target.value })}
                                placeholder="e.g., 6A, 8B, Section 1"
                                className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                            />
                            <p className="text-xs text-neutral-500 mt-1">
                                This will be the identifier for this class (e.g., "6A")
                            </p>
                        </div>

                        {/* Schedule Builder */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                                Schedule ({classForm.schedules.length} slot{classForm.schedules.length !== 1 ? 's' : ''})
                            </label>
                            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-300">
                                {classForm.schedules.map((schedule, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2"
                                    >
                                        <select
                                            value={schedule.day}
                                            onChange={(e) => updateSchedule(index, 'day', e.target.value)}
                                            className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                        >
                                            {DAYS.map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="time"
                                            value={schedule.startTime}
                                            onChange={(e) => updateSchedule(index, 'startTime', e.target.value)}
                                            className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                        />
                                        <span className="text-neutral-400">-</span>
                                        <input
                                            type="time"
                                            value={schedule.endTime}
                                            onChange={(e) => updateSchedule(index, 'endTime', e.target.value)}
                                            className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                        />
                                        {classForm.schedules.length > 1 && (
                                            <button
                                                onClick={() => removeSchedule(index)}
                                                className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                            <button
                                onClick={addSchedule}
                                className="mt-2 flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                            >
                                <Plus className="w-4 h-4" />
                                Add another time slot
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
