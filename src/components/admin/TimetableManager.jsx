import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Upload, Download, Plus, Trash2, Edit2, Save, X, 
  Clock, BookOpen, User, AlertCircle, CheckCircle, Grid3X3,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { loadUserState, saveUserState } from '../../utils/userScopedStorage';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = [
  '08:00 - 08:45',
  '08:45 - 09:30',
  '09:30 - 10:15',
  '10:15 - 10:30', // Break
  '10:30 - 11:15',
  '11:15 - 12:00',
  '12:00 - 12:45',
  '12:45 - 01:30', // Lunch
  '01:30 - 02:15',
  '02:15 - 03:00',
];

const SUBJECTS = [
  'Mathematics', 'English', 'Science', 'Social Studies', 'Hindi',
  'Computer Science', 'Physical Education', 'Art', 'Music', 'Library'
];

const CLASS_OPTIONS = [
  '6A', '6B', '6C', '7A', '7B', '7C', '8A', '8B', '8C',
  '9A', '9B', '9C', '10A', '10B', '10C'
];

export default function TimetableManager() {
  const [timetables, setTimetables] = useState({});
  const [selectedClass, setSelectedClass] = useState('6A');
  const [editMode, setEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Load timetables from storage
    const savedTimetables = loadUserState('admin:timetables', {});
    setTimetables(savedTimetables);
    
    // Load teachers for assignment
    const savedTeachers = loadUserState('admin:teachers', []);
    setTeachers(savedTeachers);
  }, []);

  const saveTimetables = (newTimetables) => {
    setTimetables(newTimetables);
    saveUserState('admin:timetables', newTimetables);
  };

  const getCurrentTimetable = () => {
    return timetables[selectedClass] || {};
  };

  const getCell = (day, timeSlot) => {
    const tt = getCurrentTimetable();
    return tt[`${day}-${timeSlot}`] || null;
  };

  const updateCell = (day, timeSlot, data) => {
    const newTimetables = { ...timetables };
    if (!newTimetables[selectedClass]) {
      newTimetables[selectedClass] = {};
    }
    newTimetables[selectedClass][`${day}-${timeSlot}`] = data;
    saveTimetables(newTimetables);
    setEditingCell(null);
  };

  const clearCell = (day, timeSlot) => {
    const newTimetables = { ...timetables };
    if (newTimetables[selectedClass]) {
      delete newTimetables[selectedClass][`${day}-${timeSlot}`];
      saveTimetables(newTimetables);
    }
  };

  const isBreak = (timeSlot) => {
    return timeSlot.includes('10:15 - 10:30') || timeSlot.includes('12:45 - 01:30');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Expected CSV format: Class,Day,TimeSlot,Subject,Teacher
        const newTimetables = { ...timetables };
        let importCount = 0;
        let errors = [];

        lines.slice(1).forEach((line, index) => {
          const [className, day, timeSlot, subject, teacher] = line.split(',').map(s => s.trim());
          
          if (!className || !day || !timeSlot || !subject) {
            errors.push(`Row ${index + 2}: Missing required fields`);
            return;
          }

          if (!CLASS_OPTIONS.includes(className)) {
            errors.push(`Row ${index + 2}: Invalid class "${className}"`);
            return;
          }

          if (!DAYS.includes(day)) {
            errors.push(`Row ${index + 2}: Invalid day "${day}"`);
            return;
          }

          if (!newTimetables[className]) {
            newTimetables[className] = {};
          }

          newTimetables[className][`${day}-${timeSlot}`] = {
            subject,
            teacher: teacher || 'TBA'
          };
          importCount++;
        });

        saveTimetables(newTimetables);
        setUploadStatus({
          success: true,
          message: `Imported ${importCount} periods successfully`,
          errors: errors.length > 0 ? errors.slice(0, 5) : null
        });

        setTimeout(() => {
          setShowUploadModal(false);
          setUploadStatus(null);
        }, 3000);

      } catch (err) {
        setUploadStatus({
          success: false,
          message: 'Failed to parse CSV file. Please check the format.'
        });
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const headers = 'Class,Day,TimeSlot,Subject,Teacher\n';
    const sampleData = `6A,Monday,08:00 - 08:45,Mathematics,Mr. Sharma
6A,Monday,08:45 - 09:30,English,Mrs. Gupta
6A,Tuesday,08:00 - 08:45,Science,Dr. Patel`;
    
    const blob = new Blob([headers + sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timetable_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportTimetable = () => {
    const headers = 'Class,Day,TimeSlot,Subject,Teacher\n';
    let csvContent = headers;

    Object.entries(timetables).forEach(([className, schedule]) => {
      Object.entries(schedule).forEach(([key, data]) => {
        const [day, ...timeSlotParts] = key.split('-');
        const timeSlot = timeSlotParts.join('-');
        csvContent += `${className},${day},${timeSlot},${data.subject},${data.teacher || 'TBA'}\n`;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetable_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearTimetable = () => {
    if (confirm(`Are you sure you want to clear the timetable for ${selectedClass}?`)) {
      const newTimetables = { ...timetables };
      delete newTimetables[selectedClass];
      saveTimetables(newTimetables);
    }
  };

  const getPeriodCount = () => {
    const tt = getCurrentTimetable();
    return Object.keys(tt).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Timetable Manager
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and manage class timetables
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={exportTimetable}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Class Selector & Stats */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Class:
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {CLASS_OPTIONS.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Periods Set</div>
            <div className="text-2xl font-bold text-blue-600">{getPeriodCount()}</div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                editMode 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {editMode ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
              {editMode ? 'Done' : 'Edit'}
            </button>
            
            {editMode && (
              <button
                onClick={clearTimetable}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="p-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 min-w-[100px]">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Time
                </th>
                {DAYS.map(day => (
                  <th 
                    key={day} 
                    className="p-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 min-w-[120px]"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((timeSlot, idx) => (
                <tr 
                  key={timeSlot}
                  className={isBreak(timeSlot) ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}
                >
                  <td className="p-3 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 whitespace-nowrap">
                    {timeSlot}
                    {isBreak(timeSlot) && (
                      <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">
                        {timeSlot.includes('10:15') ? '(Break)' : '(Lunch)'}
                      </span>
                    )}
                  </td>
                  {DAYS.map(day => {
                    const cell = getCell(day, timeSlot);
                    const isEditing = editingCell === `${day}-${timeSlot}`;
                    
                    if (isBreak(timeSlot)) {
                      return (
                        <td 
                          key={day} 
                          className="p-3 text-center text-sm text-yellow-600 dark:text-yellow-400 border-b border-gray-200 dark:border-gray-600"
                        >
                          —
                        </td>
                      );
                    }

                    return (
                      <td 
                        key={day}
                        className="p-2 border-b border-gray-200 dark:border-gray-600 relative"
                      >
                        {isEditing ? (
                          <CellEditor
                            day={day}
                            timeSlot={timeSlot}
                            initialData={cell}
                            teachers={teachers}
                            onSave={(data) => updateCell(day, timeSlot, data)}
                            onCancel={() => setEditingCell(null)}
                          />
                        ) : cell ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`p-2 rounded-lg ${getSubjectColor(cell.subject)} cursor-pointer group relative`}
                            onClick={() => editMode && setEditingCell(`${day}-${timeSlot}`)}
                          >
                            <div className="font-medium text-sm">{cell.subject}</div>
                            <div className="text-xs opacity-75 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {cell.teacher || 'TBA'}
                            </div>
                            {editMode && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearCell(day, timeSlot);
                                }}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </motion.div>
                        ) : (
                          editMode && (
                            <button
                              onClick={() => setEditingCell(`${day}-${timeSlot}`)}
                              className="w-full h-full min-h-[60px] border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          )
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Subject Colors</h3>
        <div className="flex flex-wrap gap-3">
          {SUBJECTS.slice(0, 8).map(subject => (
            <div 
              key={subject}
              className={`px-3 py-1 rounded-full text-xs font-medium ${getSubjectColor(subject)}`}
            >
              {subject}
            </div>
          ))}
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Import Timetable
                </h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload a CSV file with your timetable data. 
                  Download the template to see the required format.
                </p>

                <button
                  onClick={downloadTemplate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download Template
                </button>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors cursor-pointer"
                >
                  <Upload className="w-8 h-8" />
                  <span>Click to upload CSV</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {uploadStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg ${
                      uploadStatus.success 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {uploadStatus.success ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <AlertCircle className="w-5 h-5" />
                      )}
                      {uploadStatus.message}
                    </div>
                    {uploadStatus.errors && (
                      <ul className="mt-2 text-sm opacity-75">
                        {uploadStatus.errors.map((err, i) => (
                          <li key={i}>• {err}</li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Cell Editor Component
function CellEditor({ day, timeSlot, initialData, teachers, onSave, onCancel }) {
  const [subject, setSubject] = useState(initialData?.subject || '');
  const [teacher, setTeacher] = useState(initialData?.teacher || '');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute top-0 left-0 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-3 min-w-[180px]"
    >
      <div className="space-y-2">
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          autoFocus
        >
          <option value="">Select Subject</option>
          {SUBJECTS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        
        <input
          type="text"
          value={teacher}
          onChange={(e) => setTeacher(e.target.value)}
          placeholder="Teacher name"
          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          list="teacher-list"
        />
        <datalist id="teacher-list">
          {teachers.map(t => (
            <option key={t.id || t.email} value={t.name} />
          ))}
        </datalist>

        <div className="flex gap-2">
          <button
            onClick={() => subject && onSave({ subject, teacher: teacher || 'TBA' })}
            disabled={!subject}
            className="flex-1 px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-2 py-1 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Helper function for subject colors
function getSubjectColor(subject) {
  const colors = {
    'Mathematics': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'English': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    'Science': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'Social Studies': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Hindi': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    'Computer Science': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    'Physical Education': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'Art': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
    'Music': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    'Library': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };
  return colors[subject] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}
