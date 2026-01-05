import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, 
  Download, Users, Search, Trash2, Edit2, Save
} from 'lucide-react';
import { loadUserState, saveUserState } from '../../utils/userScopedStorage';
import { toast } from 'react-hot-toast';

/**
 * StudentRosterUpload - Admin component for bulk student management
 * 
 * Features:
 * - CSV file upload and parsing
 * - Preview before import
 * - Validation with error highlighting
 * - Download template
 * - Manual entry fallback
 */

// Required CSV columns
const REQUIRED_COLUMNS = ['name', 'rollNumber', 'class', 'section'];
const OPTIONAL_COLUMNS = ['email', 'phone', 'parentName', 'parentPhone'];

// Sample template data
const TEMPLATE_DATA = `name,rollNumber,class,section,email,parentName,parentPhone
Aarav Patel,1,6,A,aarav@example.com,Mr. Patel,9876543210
Ananya Singh,2,6,A,ananya@example.com,Mrs. Singh,9876543211
Arjun Kumar,3,6,B,arjun@example.com,Mr. Kumar,9876543212`;

export default function StudentRosterUpload() {
  const [uploadedStudents, setUploadedStudents] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [importedCount, setImportedCount] = useState(() => 
    loadUserState('admin:importedStudentCount', 0)
  );
  const [showPreview, setShowPreview] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Parse CSV content
  const parseCSV = (content) => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      return { students: [], errors: ['File must have at least a header row and one data row'] };
    }

    // Parse header
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    // Check required columns
    const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      return { 
        students: [], 
        errors: [`Missing required columns: ${missingColumns.join(', ')}`] 
      };
    }

    const students = [];
    const errors = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: Column count mismatch`);
        continue;
      }

      const student = {};
      headers.forEach((header, idx) => {
        student[header] = values[idx];
      });

      // Validate required fields
      const rowErrors = [];
      if (!student.name) rowErrors.push('name is empty');
      if (!student.rollnumber) rowErrors.push('rollNumber is empty');
      if (!student.class) rowErrors.push('class is empty');
      if (!student.section) rowErrors.push('section is empty');

      if (rowErrors.length > 0) {
        errors.push(`Row ${i + 1}: ${rowErrors.join(', ')}`);
      }

      // Normalize field names
      students.push({
        id: `stu_${Date.now()}_${i}`,
        name: student.name || '',
        rollNumber: student.rollnumber || '',
        classId: `${student.class}${student.section}`.toUpperCase(),
        grade: student.class,
        section: student.section?.toUpperCase(),
        email: student.email || '',
        parentName: student.parentname || '',
        parentPhone: student.parentphone || '',
        importedAt: new Date().toISOString(),
      });
    }

    return { students, errors };
  };

  // Handle file selection
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsUploading(true);
    setParseErrors([]);

    try {
      const content = await file.text();
      const { students, errors } = parseCSV(content);
      
      setUploadedStudents(students);
      setParseErrors(errors);
      setShowPreview(true);

      if (students.length > 0) {
        toast.success(`Parsed ${students.length} students from CSV`);
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error('Failed to parse CSV file');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle drag and drop
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      const input = document.getElementById('csv-upload');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      handleFileChange({ target: input });
    } else {
      toast.error('Please drop a CSV file');
    }
  }, []);

  // Import students
  const handleImport = () => {
    if (uploadedStudents.length === 0) {
      toast.error('No students to import');
      return;
    }

    // Load existing students
    const existingStudents = loadUserState('admin:students', []);
    
    // Merge (avoiding duplicates by rollNumber + classId)
    const existingKeys = new Set(existingStudents.map(s => `${s.rollNumber}-${s.classId}`));
    const newStudents = uploadedStudents.filter(s => 
      !existingKeys.has(`${s.rollNumber}-${s.classId}`)
    );
    const duplicates = uploadedStudents.length - newStudents.length;

    const mergedStudents = [...existingStudents, ...newStudents];
    saveUserState('admin:students', mergedStudents);
    
    const newCount = importedCount + newStudents.length;
    saveUserState('admin:importedStudentCount', newCount);
    setImportedCount(newCount);

    toast.success(
      `Imported ${newStudents.length} students` + 
      (duplicates > 0 ? ` (${duplicates} duplicates skipped)` : '')
    );

    setShowPreview(false);
    setUploadedStudents([]);
    setParseErrors([]);
  };

  // Download template
  const handleDownloadTemplate = () => {
    const blob = new Blob([TEMPLATE_DATA], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_roster_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  // Remove student from preview
  const removeFromPreview = (index) => {
    setUploadedStudents(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-black-800">Student Roster Upload</h2>
          <p className="text-sm text-black-500">
            {importedCount > 0 
              ? `${importedCount} students imported so far`
              : 'Bulk import students from CSV file'
            }
          </p>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-4 py-2 text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors font-medium"
        >
          <Download className="w-4 h-4" />
          Download Template
        </button>
      </div>

      {/* Upload Zone */}
      {!showPreview && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative p-8 border-2 border-dashed rounded-2xl text-center transition-all
            ${dragActive 
              ? 'border-indigo-500 bg-indigo-50' 
              : 'border-black-300 hover:border-indigo-400 hover:bg-indigo-50/50'
            }
          `}
        >
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <FileSpreadsheet className={`w-12 h-12 mx-auto mb-4 ${
            dragActive ? 'text-indigo-600' : 'text-black-400'
          }`} />
          
          <p className="font-medium text-black-700 mb-1">
            {dragActive ? 'Drop your CSV file here' : 'Drag & drop your CSV file here'}
          </p>
          <p className="text-sm text-black-500 mb-4">or click to browse</p>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl">
            <Upload className="w-4 h-4" />
            Select CSV File
          </div>
          
          <p className="text-xs text-black-400 mt-4">
            Required columns: Name, Roll Number, Class, Section
          </p>
        </div>
      )}

      {/* Preview Section */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Errors */}
            {parseErrors.length > 0 && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                  <AlertCircle className="w-4 h-4" />
                  {parseErrors.length} issue(s) found
                </div>
                <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-y-auto">
                  {parseErrors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview Stats */}
            <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                <span className="font-medium text-indigo-700">
                  {uploadedStudents.length} students ready to import
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setUploadedStudents([]);
                    setParseErrors([]);
                  }}
                  className="px-4 py-2 text-black-600 hover:bg-black-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                >
                  <Save className="w-4 h-4" />
                  Import All
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="bg-white rounded-xl border border-black-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-black-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-black-600">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-black-600">Roll #</th>
                      <th className="px-4 py-3 text-left font-medium text-black-600">Class</th>
                      <th className="px-4 py-3 text-left font-medium text-black-600">Email</th>
                      <th className="px-4 py-3 text-center font-medium text-black-600 w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black-100">
                    {uploadedStudents.slice(0, 10).map((student, idx) => (
                      <tr key={idx} className="hover:bg-black-50">
                        <td className="px-4 py-3 font-medium text-black-800">{student.name}</td>
                        <td className="px-4 py-3 text-black-600">{student.rollNumber}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                            {student.classId}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-black-500">{student.email || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => removeFromPreview(idx)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {uploadedStudents.length > 10 && (
                  <div className="px-4 py-3 bg-black-50 text-sm text-black-500 text-center">
                    ... and {uploadedStudents.length - 10} more students
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      {!showPreview && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: FileSpreadsheet, title: 'CSV Format', desc: 'Use comma-separated values with headers in first row' },
            { icon: Users, title: 'Required Fields', desc: 'Name, Roll Number, Class, and Section are mandatory' },
            { icon: CheckCircle2, title: 'Duplicates', desc: 'Students with same roll number in same class will be skipped' },
          ].map((tip, idx) => (
            <div key={idx} className="p-4 bg-black-50 rounded-xl">
              <tip.icon className="w-5 h-5 text-indigo-600 mb-2" />
              <h4 className="font-medium text-black-700 text-sm">{tip.title}</h4>
              <p className="text-xs text-black-500 mt-1">{tip.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
