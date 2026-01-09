import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Clock, Plus, X, Check, Trash2, Save
} from 'lucide-react';
import { useTeacher } from '../../context/TeacherContext';
import { Modal, ConfirmModal } from '../design-system/Modal';
import { Button, IconButton } from '../design-system/Button';
import toast from 'react-hot-toast';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * EditClassModal - Edit an existing class/section
 * 
 * @param {boolean} isOpen - Modal visibility
 * @param {Function} onClose - Close handler
 * @param {string} courseId - Parent course ID
 * @param {Object} section - Section object to edit
 */
export default function EditClassModal({
    isOpen,
    onClose,
    courseId,
    section
}) {
    const { updateSection, deleteSection } = useTeacher();

    const [formData, setFormData] = useState({
        id: '',
        schedules: [],
    });
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Initialize form when section changes
    useEffect(() => {
        if (section && isOpen) {
            // Parse schedule strings to structured format
            const parsedSchedules = (section.schedules || []).map(scheduleStr => {
                const match = scheduleStr.match(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(\d{1,2}:\d{2})[--](\d{1,2}:\d{2})$/);
                if (match) {
                    return { day: match[1], startTime: match[2], endTime: match[3] };
                }
                return { day: 'Mon', startTime: '09:00', endTime: '09:45' };
            });

            setFormData({
                id: section.id || '',
                schedules: parsedSchedules.length > 0
                    ? parsedSchedules
                    : [{ day: 'Mon', startTime: '09:00', endTime: '09:45' }],
            });
        }
    }, [section, isOpen]);

    // Add schedule slot
    const addSchedule = () => {
        setFormData(prev => ({
            ...prev,
            schedules: [...prev.schedules, { day: 'Tue', startTime: '10:00', endTime: '10:45' }]
        }));
    };

    // Remove schedule slot
    const removeSchedule = (index) => {
        setFormData(prev => ({
            ...prev,
            schedules: prev.schedules.filter((_, i) => i !== index)
        }));
    };

    // Update schedule slot
    const updateScheduleSlot = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            schedules: prev.schedules.map((s, i) =>
                i === index ? { ...s, [field]: value } : s
            )
        }));
    };

    // Handle save
    const handleSave = async () => {
        if (!formData.id.trim()) {
            toast.error('Section name cannot be empty');
            return;
        }

        setLoading(true);
        try {
            // Build schedule strings
            const schedules = formData.schedules
                .filter(s => s.startTime && s.endTime)
                .map(s => `${s.day} ${s.startTime}-${s.endTime}`);

            const updated = updateSection(courseId, section.id, {
                id: formData.id.trim().toUpperCase(),
                schedules,
            });

            if (updated) {
                toast.success('Class updated successfully');
                onClose();
            } else {
                toast.error('Failed to update class');
            }
        } catch (error) {
            toast.error('Failed to update class');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Handle delete
    const handleDelete = () => {
        const success = deleteSection(courseId, section.id);
        if (success) {
            toast.success('Class deleted');
            setShowDeleteConfirm(false);
            onClose();
        } else {
            toast.error('Failed to delete class');
        }
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={`Edit Class: ${section?.id || ''}`}
                description="Update class schedule and settings"
                size="lg"
                footer={
                    <div className="flex items-center justify-between w-full">
                        <Button
                            variant="ghost"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Class
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={onClose} disabled={loading}>
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSave}
                                loading={loading}
                                className="gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Save Changes
                            </Button>
                        </div>
                    </div>
                }
            >
                <div className="space-y-5">
                    {/* Section Name */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                            Section / Class Name
                        </label>
                        <input
                            type="text"
                            value={formData.id}
                            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                            placeholder="e.g., 6A"
                            className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                        />
                    </div>

                    {/* Schedule Builder */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                            <Clock className="inline w-4 h-4 mr-1" />
                            Schedule ({formData.schedules.length} time slots)
                        </label>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {formData.schedules.map((schedule, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2"
                                >
                                    <select
                                        value={schedule.day}
                                        onChange={(e) => updateScheduleSlot(index, 'day', e.target.value)}
                                        className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm"
                                    >
                                        {DAYS.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="time"
                                        value={schedule.startTime}
                                        onChange={(e) => updateScheduleSlot(index, 'startTime', e.target.value)}
                                        className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm"
                                    />
                                    <span className="text-neutral-400">-</span>
                                    <input
                                        type="time"
                                        value={schedule.endTime}
                                        onChange={(e) => updateScheduleSlot(index, 'endTime', e.target.value)}
                                        className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm"
                                    />
                                    {formData.schedules.length > 1 && (
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
                            Add time slot
                        </button>
                    </div>

                    {/* Info */}
                    <div className="bg-neutral-50 rounded-xl p-4 text-sm text-neutral-600">
                        <p className="font-medium mb-1">Tips:</p>
                        <ul className="list-disc list-inside space-y-1 text-neutral-500">
                            <li>Schedules automatically sync across the app</li>
                            <li>Students assigned to this class will be preserved</li>
                            <li>Progress data will be maintained</li>
                        </ul>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Delete Class"
                message={`Are you sure you want to delete "${section?.id}"? This will remove all associated student data and progress. This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
            />
        </>
    );
}
