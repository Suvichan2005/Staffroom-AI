import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, FileSpreadsheet, Users, Check, X, AlertCircle,
    Loader2, FileText, Image as ImageIcon, Table
} from 'lucide-react';
import { Modal } from '../design-system/Modal';
import { Button } from '../design-system/Button';
import {
    parseTimetableDocument,
    parseStudentListDocument,
    validateScheduleData,
    validateStudentData,
    getAcceptString
} from '../../services/documentParserService';
import toast from 'react-hot-toast';

/**
 * DocumentUploadModal - Upload and parse timetables or student lists
 * 
 * @param {boolean} isOpen - Modal visibility
 * @param {Function} onClose - Close handler
 * @param {'timetable' | 'studentList'} mode - Parse mode
 * @param {string} targetClassId - Target class for student list
 * @param {Function} onSuccess - Callback with parsed data
 */
export default function DocumentUploadModal({
    isOpen,
    onClose,
    mode = 'timetable',
    targetClassId = null,
    onSuccess
}) {
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [parsedData, setParsedData] = useState(null);
    const [errors, setErrors] = useState([]);

    // Reset state when modal closes
    React.useEffect(() => {
        if (!isOpen) {
            setFile(null);
            setParsedData(null);
            setErrors([]);
            setParsing(false);
        }
    }, [isOpen]);

    // Handle file drop
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragActive(false);

        const droppedFile = e.dataTransfer?.files?.[0];
        if (droppedFile) {
            handleFileSelect(droppedFile);
        }
    }, []);

    // Handle file selection
    const handleFileSelect = async (selectedFile) => {
        setFile(selectedFile);
        setErrors([]);
        setParsedData(null);
        setParsing(true);

        try {
            let result;
            if (mode === 'timetable') {
                result = await parseTimetableDocument(selectedFile);
                if (result.success && result.schedules?.length > 0) {
                    const validSchedules = validateScheduleData(result.schedules);
                    setParsedData({ schedules: validSchedules });
                    if (result.errors?.length > 0) {
                        setErrors(result.errors);
                    }
                } else {
                    setErrors(result.errors || ['Failed to parse timetable']);
                }
            } else {
                result = await parseStudentListDocument(selectedFile, targetClassId);
                if (result.success && result.students?.length > 0) {
                    const validStudents = validateStudentData(result.students);
                    setParsedData({
                        students: validStudents,
                        classId: result.classId || targetClassId
                    });
                    if (result.errors?.length > 0) {
                        setErrors(result.errors);
                    }
                } else {
                    setErrors(result.errors || ['Failed to parse student list']);
                }
            }
        } catch (error) {
            console.error('Parsing error:', error);
            setErrors([error.message || 'Failed to parse file']);
        } finally {
            setParsing(false);
        }
    };

    // Handle confirm
    const handleConfirm = () => {
        if (parsedData) {
            onSuccess?.(parsedData);
            onClose();
        }
    };

    // Get file icon based on type
    const getFileIcon = () => {
        if (!file) return FileSpreadsheet;
        const type = file.type.toLowerCase();
        if (type.startsWith('image/')) return ImageIcon;
        if (type.includes('pdf')) return FileText;
        return Table;
    };

    const FileIcon = getFileIcon();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'timetable' ? 'Upload Timetable' : 'Upload Student List'}
            description={mode === 'timetable'
                ? 'Upload a timetable file (CSV, Excel, PDF, or image) to automatically update class schedules'
                : `Upload a student list to add students to ${targetClassId || 'the class'}`}
            size="lg"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleConfirm}
                        disabled={!parsedData || errors.length > 0}
                        className="gap-2"
                    >
                        <Check className="w-4 h-4" />
                        {mode === 'timetable' ? 'Apply Schedule' : 'Add Students'}
                    </Button>
                </>
            }
        >
            <div className="space-y-5">
                {/* Drop Zone */}
                <div
                    onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className={`
            border-2 border-dashed rounded-2xl p-8 text-center transition-all
            ${dragActive
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-neutral-200 hover:border-neutral-300'}
            ${file ? 'bg-neutral-50' : ''}
          `}
                >
                    {parsing ? (
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                            <p className="text-neutral-600 font-medium">Parsing with AI...</p>
                            <p className="text-sm text-neutral-500">
                                Extracting {mode === 'timetable' ? 'schedule' : 'student'} data from your file
                            </p>
                        </div>
                    ) : file ? (
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center">
                                <FileIcon className="w-7 h-7 text-indigo-600" />
                            </div>
                            <div>
                                <p className="font-medium text-neutral-800">{file.name}</p>
                                <p className="text-sm text-neutral-500">
                                    {(file.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setFile(null);
                                    setParsedData(null);
                                    setErrors([]);
                                }}
                            >
                                Choose different file
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-14 h-14 bg-neutral-100 rounded-xl flex items-center justify-center">
                                <Upload className="w-7 h-7 text-neutral-400" />
                            </div>
                            <div>
                                <p className="font-medium text-neutral-800">
                                    Drop your file here, or{' '}
                                    <label className="text-indigo-600 cursor-pointer hover:text-indigo-700">
                                        browse
                                        <input
                                            type="file"
                                            accept={getAcceptString(mode)}
                                            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                            className="hidden"
                                        />
                                    </label>
                                </p>
                                <p className="text-sm text-neutral-500 mt-1">
                                    Supports CSV, Excel, PDF, and images
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Errors */}
                <AnimatePresence>
                    {errors.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-red-50 border border-red-200 rounded-xl p-4"
                        >
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-red-800">Parsing Issues</p>
                                    <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                                        {errors.map((error, i) => (
                                            <li key={i}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Preview */}
                <AnimatePresence>
                    {parsedData && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                        >
                            <h3 className="font-medium text-neutral-700 mb-3 flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-500" />
                                Preview
                            </h3>

                            {mode === 'timetable' && parsedData.schedules && (
                                <div className="bg-green-50 border border-green-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-green-100">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-medium text-green-800">Class</th>
                                                <th className="px-4 py-2 text-left font-medium text-green-800">Day</th>
                                                <th className="px-4 py-2 text-left font-medium text-green-800">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-green-200">
                                            {parsedData.schedules.slice(0, 5).map((schedule, i) => (
                                                <tr key={i}>
                                                    <td className="px-4 py-2 text-neutral-700">{schedule.classId}</td>
                                                    <td className="px-4 py-2 text-neutral-700">{schedule.day}</td>
                                                    <td className="px-4 py-2 text-neutral-700">
                                                        {schedule.startTime}-{schedule.endTime}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {parsedData.schedules.length > 5 && (
                                        <p className="px-4 py-2 text-sm text-green-600 bg-green-100">
                                            +{parsedData.schedules.length - 5} more entries
                                        </p>
                                    )}
                                </div>
                            )}

                            {mode === 'studentList' && parsedData.students && (
                                <div className="bg-green-50 border border-green-200 rounded-xl overflow-hidden">
                                    <div className="px-4 py-2 bg-green-100 flex items-center justify-between">
                                        <span className="font-medium text-green-800">
                                            {parsedData.students.length} students found
                                        </span>
                                        {parsedData.classId && (
                                            <span className="text-sm text-green-600">
                                                Class: {parsedData.classId}
                                            </span>
                                        )}
                                    </div>
                                    <table className="w-full text-sm">
                                        <thead className="bg-green-100/50">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-medium text-green-800">Roll</th>
                                                <th className="px-4 py-2 text-left font-medium text-green-800">Name</th>
                                                <th className="px-4 py-2 text-left font-medium text-green-800">Email</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-green-200">
                                            {parsedData.students.slice(0, 5).map((student, i) => (
                                                <tr key={i}>
                                                    <td className="px-4 py-2 text-neutral-700">{student.rollNo || i + 1}</td>
                                                    <td className="px-4 py-2 text-neutral-700">{student.name}</td>
                                                    <td className="px-4 py-2 text-neutral-500">{student.email || '─'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {parsedData.students.length > 5 && (
                                        <p className="px-4 py-2 text-sm text-green-600 bg-green-100">
                                            +{parsedData.students.length - 5} more students
                                        </p>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Format Guide */}
                {!file && (
                    <div className="bg-neutral-50 rounded-xl p-4">
                        <p className="text-sm font-medium text-neutral-700 mb-2">Supported formats:</p>
                        <div className="grid grid-cols-2 gap-2 text-sm text-neutral-600">
                            <div className="flex items-center gap-2">
                                <Table className="w-4 h-4" />
                                <span>CSV, Excel (.xlsx)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                <span>PDF documents</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" />
                                <span>Images (PNG, JPG)</span>
                            </div>
                        </div>
                        <p className="text-xs text-neutral-500 mt-3">
                            AI will automatically extract {mode === 'timetable' ? 'schedule' : 'student'} data from your file
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
}
