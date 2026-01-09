import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Plus, Trash2, Search, Edit2, Save, X, Upload,
    UserPlus, UserMinus, Mail, Hash, Check, AlertCircle
} from 'lucide-react';
import { useTeacher } from '../../context/TeacherContext';
import { Modal } from '../design-system/Modal';
import { Button, IconButton } from '../design-system/Button';
import { students as dummyStudents } from '../../data/dummyData';
import toast from 'react-hot-toast';

/**
 * StudentListEditor - View and edit students in a class
 * 
 * @param {boolean} isOpen - Modal visibility
 * @param {Function} onClose - Close handler
 * @param {string} classId - The class/section ID
 * @param {Function} onUpload - Callback to open upload modal
 */
export default function StudentListEditor({
    isOpen,
    onClose,
    classId,
    onUpload
}) {
    const { addStudentsToClass, removeStudentFromClass, updateStudent } = useTeacher();
    
    // Get students for this class
    const classStudents = useMemo(() => {
        return dummyStudents.filter(s => s.classId === classId);
    }, [classId]);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [editingStudent, setEditingStudent] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newStudent, setNewStudent] = useState({ name: '', email: '', rollNo: '' });
    const [selectedStudents, setSelectedStudents] = useState(new Set());
    
    // Filter students by search
    const filteredStudents = useMemo(() => {
        if (!searchQuery) return classStudents;
        const q = searchQuery.toLowerCase();
        return classStudents.filter(s => 
            s.name.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q) ||
            s.studentId?.toLowerCase().includes(q)
        );
    }, [classStudents, searchQuery]);
    
    // Handle adding a new student
    const handleAddStudent = () => {
        if (!newStudent.name.trim()) {
            toast.error('Please enter student name');
            return;
        }
        
        const studentData = {
            name: newStudent.name.trim(),
            email: newStudent.email.trim() || undefined,
            rollNo: newStudent.rollNo || classStudents.length + 1,
        };
        
        addStudentsToClass?.(classId, [studentData]);
        toast.success(`Added ${studentData.name} to class`);
        setNewStudent({ name: '', email: '', rollNo: '' });
        setShowAddForm(false);
    };
    
    // Handle removing a student
    const handleRemoveStudent = (studentId) => {
        removeStudentFromClass?.(classId, studentId);
        toast.success('Student removed');
        setSelectedStudents(prev => {
            const next = new Set(prev);
            next.delete(studentId);
            return next;
        });
    };
    
    // Handle bulk remove
    const handleBulkRemove = () => {
        if (selectedStudents.size === 0) return;
        
        selectedStudents.forEach(studentId => {
            removeStudentFromClass?.(classId, studentId);
        });
        toast.success(`Removed ${selectedStudents.size} students`);
        setSelectedStudents(new Set());
    };
    
    // Handle edit save
    const handleSaveEdit = () => {
        if (!editingStudent?.name?.trim()) {
            toast.error('Name cannot be empty');
            return;
        }
        
        updateStudent?.(editingStudent.studentId, {
            name: editingStudent.name.trim(),
            email: editingStudent.email?.trim(),
        });
        toast.success('Student updated');
        setEditingStudent(null);
    };
    
    // Toggle select all
    const toggleSelectAll = () => {
        if (selectedStudents.size === filteredStudents.length) {
            setSelectedStudents(new Set());
        } else {
            setSelectedStudents(new Set(filteredStudents.map(s => s.studentId)));
        }
    };
    
    // Toggle single selection
    const toggleSelect = (studentId) => {
        setSelectedStudents(prev => {
            const next = new Set(prev);
            if (next.has(studentId)) {
                next.delete(studentId);
            } else {
                next.add(studentId);
            }
            return next;
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Students - ${classId}`}
            description={`${classStudents.length} students enrolled`}
            size="lg"
            footer={
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        {selectedStudents.size > 0 && (
                            <Button
                                variant="ghost"
                                onClick={handleBulkRemove}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2"
                            >
                                <UserMinus className="w-4 h-4" />
                                Remove {selectedStudents.size}
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={onClose}>
                            Close
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onUpload}
                            className="gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Upload List
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => setShowAddForm(true)}
                            className="gap-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            Add Student
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Search and Actions */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search students..."
                            className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                    </div>
                </div>
                
                {/* Add Student Form */}
                <AnimatePresence>
                    {showAddForm && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-indigo-50 border border-indigo-200 rounded-xl p-4"
                        >
                            <h4 className="text-sm font-medium text-indigo-800 mb-3 flex items-center gap-2">
                                <UserPlus className="w-4 h-4" />
                                Add New Student
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <input
                                    type="text"
                                    value={newStudent.name}
                                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                                    placeholder="Student name *"
                                    className="px-3 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 text-sm"
                                />
                                <input
                                    type="email"
                                    value={newStudent.email}
                                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                                    placeholder="Email (optional)"
                                    className="px-3 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 text-sm"
                                />
                                <input
                                    type="text"
                                    value={newStudent.rollNo}
                                    onChange={(e) => setNewStudent({ ...newStudent, rollNo: e.target.value })}
                                    placeholder="Roll No. (auto)"
                                    className="px-3 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 text-sm"
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setNewStudent({ name: '', email: '', rollNo: '' });
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleAddStudent}
                                    className="gap-1"
                                >
                                    <Check className="w-3 h-3" />
                                    Add
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* Student List */}
                {filteredStudents.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                            <Users className="w-8 h-8 text-neutral-400" />
                        </div>
                        <p className="text-neutral-600 font-medium">
                            {searchQuery ? 'No matching students' : 'No students in this class'}
                        </p>
                        <p className="text-sm text-neutral-500 mt-1">
                            {searchQuery ? 'Try a different search' : 'Add students manually or upload a list'}
                        </p>
                    </div>
                ) : (
                    <div className="border border-neutral-200 rounded-xl overflow-hidden">
                        {/* Table Header */}
                        <div className="bg-neutral-50 px-4 py-3 flex items-center gap-4 border-b border-neutral-200">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-xs font-medium text-neutral-600">Select All</span>
                            </label>
                            <span className="text-xs text-neutral-500">
                                {filteredStudents.length} students
                            </span>
                        </div>
                        
                        {/* Student Rows */}
                        <div className="divide-y divide-neutral-100 max-h-[400px] overflow-y-auto">
                            {filteredStudents.map((student, idx) => (
                                <motion.div
                                    key={student.studentId}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.02 }}
                                    className={`px-4 py-3 flex items-center gap-4 hover:bg-neutral-50 transition-colors ${
                                        selectedStudents.has(student.studentId) ? 'bg-indigo-50' : ''
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedStudents.has(student.studentId)}
                                        onChange={() => toggleSelect(student.studentId)}
                                        className="w-4 h-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    
                                    {editingStudent?.studentId === student.studentId ? (
                                        // Edit Mode
                                        <div className="flex-1 flex items-center gap-3">
                                            <input
                                                type="text"
                                                value={editingStudent.name}
                                                onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                                                className="flex-1 px-2 py-1 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                                autoFocus
                                            />
                                            <input
                                                type="email"
                                                value={editingStudent.email || ''}
                                                onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                                                placeholder="Email"
                                                className="w-48 px-2 py-1 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                            />
                                            <div className="flex items-center gap-1">
                                                <IconButton
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleSaveEdit}
                                                    className="text-green-600 hover:bg-green-50"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </IconButton>
                                                <IconButton
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setEditingStudent(null)}
                                                    className="text-neutral-500 hover:bg-neutral-100"
                                                >
                                                    <X className="w-4 h-4" />
                                                </IconButton>
                                            </div>
                                        </div>
                                    ) : (
                                        // View Mode
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                <span className="text-sm font-medium text-indigo-700">
                                                    {student.name.split(' ').map(n => n[0]).join('')}
                                                </span>
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-neutral-800">{student.name}</p>
                                                <div className="flex items-center gap-3 text-xs text-neutral-500">
                                                    {student.email && (
                                                        <span className="flex items-center gap-1">
                                                            <Mail className="w-3 h-3" />
                                                            {student.email}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <Hash className="w-3 h-3" />
                                                        {student.studentId}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-1">
                                                <IconButton
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setEditingStudent({ ...student })}
                                                    title="Edit student"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </IconButton>
                                                <IconButton
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveStudent(student.studentId)}
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    title="Remove student"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </IconButton>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Help Text */}
                <div className="bg-neutral-50 rounded-xl p-4 text-sm text-neutral-600">
                    <p className="font-medium mb-1">Tips:</p>
                    <ul className="list-disc list-inside space-y-1 text-neutral-500 text-xs">
                        <li>Use "Upload List" to bulk import students from CSV/Excel</li>
                        <li>Select multiple students and use "Remove" for bulk operations</li>
                        <li>Click the edit icon to modify student details</li>
                    </ul>
                </div>
            </div>
        </Modal>
    );
}
