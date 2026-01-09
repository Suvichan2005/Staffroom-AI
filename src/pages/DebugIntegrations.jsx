import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, Code, CheckCircle, AlertTriangle, XCircle,
  BarChart2, PieChart, Mic, MessageSquare, Users,
  Calendar, FileText, Layers, Grid, ChevronDown, ChevronUp
} from 'lucide-react';

// Import all unused components to wire them in
import { AttendanceTable, AttendanceAIInsights } from '../components/attendance';
import { ChatBox, MicInput } from '../components/ai';
import { StudentSummary } from '../components/teacher';

// Import dashboard components
import { WeeklySchedule, UpcomingClassesNew } from '../components/dashboard';

// Import AI components
import { AIChatBox, ChatFAB } from '../components/ai';

// Import teacher components
import { AssignmentCard, StudentCard } from '../components/teacher';

// Import design system components
import {
  Button, IconButton,
  Card, CardHeader, CardContent, CardFooter, StatCard, FeatureCard,
  Dropdown, Select,
  EmptyState, ErrorState, OfflineState, LoadingState,
  Input, Textarea,
  Modal, ConfirmModal,
  Sheet, ActionSheet,
  Toast, ToastContainer, useToasts, toast
} from '../components/design-system';

// Dummy data for demos
import { syllabusList, students, attendanceLogs } from '../data/dummyData';

// Dev components
import IntegrationSmokeCheck from '../components/dev/IntegrationSmokeCheck';

/**
 * Debug Integrations Page
 * Showcases all unused components to ensure they are wired correctly
 */
export default function DebugIntegrations() {
  const [activeSection, setActiveSection] = useState('all');
  const [expandedSections, setExpandedSections] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showChatFAB, setShowChatFAB] = useState(false);
  const { toasts, addToast, removeToast } = useToasts();

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Dummy attendance data  
  const attendanceRecords = attendanceLogs || [
    { date: '2024-01-15', students: [{ name: 'Riya Sharma', status: 'present' }, { name: 'Amit Kumar', status: 'absent' }] },
    { date: '2024-01-16', students: [{ name: 'Riya Sharma', status: 'present' }, { name: 'Amit Kumar', status: 'present' }] },
  ];

  // Dummy schedule data
  const scheduleData = [
    { day: 'Monday', slots: [{ time: '9:00 AM', subject: 'Math 6A', room: '201' }, { time: '11:00 AM', subject: 'Math 7B', room: '105' }] },
    { day: 'Tuesday', slots: [{ time: '10:00 AM', subject: 'Math 6B', room: '201' }] },
    { day: 'Wednesday', slots: [{ time: '9:00 AM', subject: 'Math 8A', room: '301' }] },
  ];

  // Dummy assignment data
  const assignmentData = {
    id: '1',
    title: 'Chapter 3 Problem Set',
    subject: 'Mathematics',
    dueDate: '2024-01-20',
    status: 'active',
    submissions: { total: 30, submitted: 22, graded: 15 },
    maxScore: 100,
  };

  // Dummy student data for card
  const studentCardData = {
    id: '1',
    name: 'Riya Sharma',
    avatar: null,
    grade: '6A',
    rollNo: '12',
    attendance: 92,
    currentGrade: 'A-',
    isAtRisk: false,
    alerts: [],
  };

  const sections = [
    {
      id: 'attendance',
      title: 'Attendance Components',
      icon: Users,
      color: 'from-green-500 to-green-500',
      components: ['AttendanceTable', 'AttendanceAIInsights', 'StudentSummary'],
    },
    {
      id: 'ai',
      title: 'AI Components',
      icon: MessageSquare,
      color: 'from-purple-500 to-pink-500',
      components: ['ChatBox', 'MicInput', 'AIChatBox', 'ChatFAB'],
    },
    {
      id: 'dashboard',
      title: 'Dashboard Components',
      icon: Calendar,
      color: 'from-orange-500 to-yellow-500',
      components: ['WeeklySchedule', 'UpcomingClassesNew'],
    },
    {
      id: 'teacher',
      title: 'Teacher Components',
      icon: FileText,
      color: 'from-teal-500 to-cyan-500',
      components: ['AssignmentCard', 'StudentCard'],
    },
    {
      id: 'design-system',
      title: 'Design System',
      icon: Layers,
      color: 'from-red-500 to-red-500',
      components: ['Button', 'Card', 'Input', 'Modal', 'Sheet', 'Toast', 'Dropdown', 'EmptyState'],
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
                <Code className="w-6 h-6 text-indigo-600" />
                Debug Integrations
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                Showcase of all wired components – {sections.reduce((acc, s) => acc + s.components.length, 0)} total
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => addToast({ type: 'success', message: 'Components loaded successfully!' })}
              >
                Test Toast
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowChatFAB(!showChatFAB)}
              >
                {showChatFAB ? 'Hide' : 'Show'} Chat FAB
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Integration Smoke Check */}
        <IntegrationSmokeCheck />

        {/* Section Navigation */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSection('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSection === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            All Sections
          </button>
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeSection === section.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {section.title}
              </button>
            );
          })}
        </div>

        {/* Sections */}
        {sections.map(section => {
          if (activeSection !== 'all' && activeSection !== section.id) return null;
          const Icon = section.icon;
          const isExpanded = expandedSections[section.id] !== false;

          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden"
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${section.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-semibold text-neutral-800">{section.title}</h2>
                    <p className="text-sm text-neutral-500">{section.components.length} components</p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-neutral-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-neutral-400" />
                )}
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="p-4 pt-0 space-y-6">
                  {/* Attendance Section */}
                  {section.id === 'attendance' && (
                    <div className="space-y-6">
                      <div className="bg-neutral-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-neutral-700 mb-3">AttendanceTable</h3>
                        <AttendanceTable records={attendanceRecords} />
                      </div>
                      <div className="bg-neutral-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-neutral-700 mb-3">StudentSummary</h3>
                        <StudentSummary students={students?.slice(0, 5) || []} />
                      </div>
                      <div className="bg-neutral-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-neutral-700 mb-3">AttendanceAIInsights</h3>
                        <AttendanceAIInsights
                          courseId="geography-6"
                          sectionId="6A"
                          attendanceData={attendanceRecords}
                        />
                      </div>
                    </div>
                  )}

                  {/* AI Section */}
                  {section.id === 'ai' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-neutral-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-neutral-700 mb-3">ChatBox</h3>
                        <div className="h-64">
                          <ChatBox
                            messages={[
                              { role: 'assistant', content: 'Hello! How can I help you today?' },
                              { role: 'user', content: 'Show me today\'s schedule' },
                              { role: 'assistant', content: 'You have 3 classes scheduled today:\n\n– 9:00 AM - Math 6A\n– 11:00 AM - Math 7B\n– 2:00 PM - Math 8A' },
                            ]}
                          />
                        </div>
                      </div>
                      <div className="bg-neutral-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-neutral-700 mb-3">MicInput</h3>
                        <MicInput
                          onCommand={(cmd) => addToast({ type: 'info', message: `Voice command: ${cmd}` })}
                          placeholder="Say a command or type here..."
                        />
                      </div>
                      <div className="bg-neutral-50 rounded-xl p-4 lg:col-span-2">
                        <h3 className="text-sm font-semibold text-neutral-700 mb-3">AIChatBox (Floating)</h3>
                        <p className="text-sm text-neutral-500 mb-4">
                          The AIChatBox is a full floating chat interface. Click below to open it.
                        </p>
                        <AIChatBox />
                      </div>
                    </div>
                  )}

                  {/* Dashboard Section */}
                  {section.id === 'dashboard' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-neutral-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-neutral-700 mb-3">WeeklySchedule</h3>
                        <WeeklySchedule schedule={scheduleData} />
                      </div>
                      <div className="bg-neutral-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-neutral-700 mb-3">UpcomingClassesNew</h3>
                        <UpcomingClassesNew />
                      </div>
                    </div>
                  )}

                  {/* Teacher Section */}
                  {section.id === 'teacher' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-neutral-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-neutral-700 mb-3">AssignmentCard</h3>
                        <AssignmentCard assignment={assignmentData} />
                      </div>
                      <div className="bg-neutral-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-neutral-700 mb-3">StudentCard</h3>
                        <StudentCard student={studentCardData} />
                      </div>
                    </div>
                  )}

                  {/* Design System Section */}
                  {section.id === 'design-system' && (
                    <div className="space-y-6">
                      {/* Buttons */}
                      <div className="bg-neutral-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-neutral-700 mb-3">Buttons</h3>
                        <div className="flex flex-wrap gap-3">
                          <Button variant="primary">Primary</Button>
                          <Button variant="secondary">Secondary</Button>
                          <Button variant="outline">Outline</Button>
                          <Button variant="ghost">Ghost</Button>
                          <Button variant="danger">Danger</Button>
                          <Button variant="primary" size="sm">Small</Button>
                          <Button variant="primary" size="lg">Large</Button>
                          <Button variant="primary" loading>Loading</Button>
                          <IconButton icon={Eye} variant="primary" />
                        </div>
                      </div>

                      {/* Cards */}
                      <div className="bg-neutral-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-neutral-700 mb-3">Cards</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card>
                            <CardHeader>
                              <h4 className="font-semibold">Basic Card</h4>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-neutral-500">Card content goes here</p>
                            </CardContent>
                            <CardFooter>
                              <Button variant="outline" size="sm">Action</Button>
                            </CardFooter>
                          </Card>
                          <StatCard
                            title="Total Students"
                            value="248"
                            change="+12%"
                            trend="up"
                            icon={Users}
                          />
                          <FeatureCard
                            title="AI Assistant"
                            description="Get help with lesson planning"
                            icon={MessageSquare}
                            color="indigo"
                          />
                        </div>
                      </div>

                      {/* Inputs */}
                      <div className="bg-neutral-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-neutral-700 mb-3">Inputs</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input label="Email" placeholder="Enter email" />
                          <Input label="With Icon" placeholder="Search..." icon={Eye} />
                          <Textarea label="Description" placeholder="Enter description" rows={3} />
                          <Select
                            label="Select Option"
                            options={[
                              { value: '1', label: 'Option 1' },
                              { value: '2', label: 'Option 2' },
                              { value: '3', label: 'Option 3' },
                            ]}
                          />
                        </div>
                      </div>

                      {/* Modals & Sheets */}
                      <div className="bg-neutral-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-neutral-700 mb-3">Modals & Sheets</h3>
                        <div className="flex flex-wrap gap-3">
                          <Button variant="outline" onClick={() => setShowModal(true)}>
                            Open Modal
                          </Button>
                          <Button variant="outline" onClick={() => setShowConfirmModal(true)}>
                            Open Confirm Modal
                          </Button>
                          <Button variant="outline" onClick={() => setShowSheet(true)}>
                            Open Sheet
                          </Button>
                          <Button variant="outline" onClick={() => setShowActionSheet(true)}>
                            Open Action Sheet
                          </Button>
                        </div>
                      </div>

                      {/* Empty States */}
                      <div className="bg-neutral-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-neutral-700 mb-3">Empty States</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <EmptyState title="No Data" description="Nothing to show yet" />
                          <ErrorState message="Something went wrong" onRetry={() => {}} />
                          <OfflineState onRetry={() => {}} />
                          <LoadingState message="Loading data..." />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Floating Components */}
      {showChatFAB && (
        <ChatFAB onClick={() => addToast({ type: 'info', message: 'Chat FAB clicked!' })} />
      )}

      {/* Modals */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Sample Modal">
        <p className="text-neutral-600">This is a sample modal from the design system.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => setShowModal(false)}>Confirm</Button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => {
          addToast({ type: 'success', message: 'Action confirmed!' });
          setShowConfirmModal(false);
        }}
        title="Confirm Action"
        message="Are you sure you want to proceed with this action?"
        confirmText="Yes, proceed"
        cancelText="Cancel"
      />

      <Sheet isOpen={showSheet} onClose={() => setShowSheet(false)} title="Sheet Panel">
        <div className="p-4">
          <p className="text-neutral-600">This is a sheet panel that slides in from the side.</p>
        </div>
      </Sheet>

      <ActionSheet
        isOpen={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        actions={[
          { label: 'Edit', onClick: () => addToast({ type: 'info', message: 'Edit clicked' }) },
          { label: 'Share', onClick: () => addToast({ type: 'info', message: 'Share clicked' }) },
          { label: 'Delete', onClick: () => addToast({ type: 'error', message: 'Delete clicked' }), destructive: true },
        ]}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
