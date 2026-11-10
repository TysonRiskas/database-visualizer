import React, { useState } from 'react';
import { DatabaseState } from '../types/database';
import {
  Database,
  Zap,
  PlusCircle,
  UserPlus,
  Terminal,
  BookOpen,
  Key,
  Users,
  Sparkles,
  X,
  Code2,
  Link,
  Home,
  Layers,
  Bot,
  Table,
} from 'lucide-react';

interface TopControlsBarProps {
  databaseState: DatabaseState;
  onBookSession: (data: any) => void;
  onFireConcurrent: () => void;
  onRunSql: (sql: string) => void;
  onOpenHelp: () => void;
  isSimulating: boolean;
  viewMode?: 'welcome' | 'engine_room' | 'database_builder' | 'database_editor' | 'sql_playground';
  onViewModeChange?: (mode: 'welcome' | 'engine_room' | 'database_builder' | 'database_editor' | 'sql_playground') => void;
}

const SAMPLE_QUERIES = [
  {
    label: '1. 3-Table Multi-JOIN: Sessions + Tutors + Students (Full Schema Link)',
    sql: "SELECT Students.first_name, Students.major, Tutors.name, Sessions.session_date FROM Sessions JOIN Tutors ON Sessions.tutor_id = Tutors.tutor_id JOIN Students ON Sessions.student_id = Students.student_id WHERE Sessions.status = 'Confirmed'",
  },
  {
    label: '2. 2-Table JOIN: Sessions + Tutors (Key Token Unlocking Demo)',
    sql: "SELECT * FROM Sessions JOIN Tutors ON Sessions.tutor_id = Tutors.tutor_id WHERE status = 'Completed'",
  },
  {
    label: '3. Filter Students (major = "Computer Science")',
    sql: "SELECT * FROM Students WHERE major = 'Computer Science'",
  },
  {
    label: '4. Filter Sessions by Tutor #101 (Dr. Alan Turing)',
    sql: "SELECT * FROM Sessions WHERE tutor_id = 101",
  },
];

export const TopControlsBar: React.FC<TopControlsBarProps> = ({
  databaseState,
  onBookSession,
  onFireConcurrent,
  onRunSql,
  onOpenHelp,
  isSimulating,
  viewMode = 'welcome',
  onViewModeChange,
}) => {
  const [activeModal, setActiveModal] = useState<'booking' | 'sql' | null>(null);

  // Booking Form States
  const students = databaseState.Students?.rows || [];
  const tutors = databaseState.Tutors?.rows || [];
  const [bookingMode, setBookingMode] = useState<'new_student' | 'existing_student'>('new_student');

  // New Student fields
  const [newFirstName, setNewFirstName] = useState('Elena');
  const [newLastName, setNewLastName] = useState('Rostova');
  const [newMajor, setNewMajor] = useState('Software Engineering');

  // Existing student selection
  const [selectedStudentId, setSelectedStudentId] = useState<number>(students[0]?.student_id || 1);
  const [selectedTutorId, setSelectedTutorId] = useState<number>(tutors[0]?.tutor_id || 101);
  const [sessionDate, setSessionDate] = useState('2026-08-30 14:00');
  const [status, setStatus] = useState('Confirmed');

  // SQL States
  const [sqlText, setSqlText] = useState(SAMPLE_QUERIES[0].sql);

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingMode === 'new_student') {
      onBookSession({
        studentId: 0,
        tutorId: Number(selectedTutorId),
        sessionDate,
        status,
        newStudent: {
          firstName: newFirstName.trim() || 'Elena',
          lastName: newLastName.trim() || 'Rostova',
          major: newMajor.trim() || 'Software Engineering',
        },
      });
    } else {
      onBookSession({
        studentId: Number(selectedStudentId),
        tutorId: Number(selectedTutorId),
        sessionDate,
        status,
      });
    }
    setActiveModal(null);
  };

  const handleQuickJoinDemo = () => {
    onRunSql(SAMPLE_QUERIES[0].sql);
  };

  const handleSqlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sqlText.trim()) return;
    onRunSql(sqlText.trim());
    setActiveModal(null);
  };

  return (
    <>
      <header className="bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          {/* UVU Brand Logo & Identity (Clickable to Welcome Page) */}
          <div
            onClick={() => onViewModeChange && onViewModeChange('welcome')}
            className="flex items-center gap-3 cursor-pointer group"
            title="Return to Welcome Overview"
          >
            <div className="p-2 bg-gradient-to-tr from-[#275D38] to-[#327D4B] rounded-xl shadow-md text-white group-hover:scale-105 transition">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base text-[#275D38] tracking-tight flex items-center gap-1.5 group-hover:text-emerald-800 transition">
                  <span>UVU Glass Box</span>
                  <span className="text-slate-800 font-medium">Database Visualizer</span>
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-[#275D38] border border-emerald-200 font-mono font-bold">
                  Wolverine Lab
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Relational Engine • 2PL Concurrency • Visual Keys & DDL Schema Builder
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs: Only visible once inside Engine Room or Database Builder */}
          {onViewModeChange && viewMode !== 'welcome' && (
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
              <button
                onClick={() => onViewModeChange('welcome')}
                className="px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                title="Return to Welcome Overview"
              >
                <Home className="w-3.5 h-3.5" />
                <span>🏠 Overview</span>
              </button>
              <button
                onClick={() => onViewModeChange('engine_room')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                  viewMode === 'engine_room'
                    ? 'bg-[#275D38] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                <span>🔬 Engine Room</span>
              </button>
              <button
                onClick={() => onViewModeChange('database_editor')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                  viewMode === 'database_editor'
                    ? 'bg-[#275D38] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Table className="w-3.5 h-3.5 text-emerald-200" />
                <span>✏️ Edit Records</span>
              </button>
              <button
                onClick={() => onViewModeChange('database_builder')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                  viewMode === 'database_builder'
                    ? 'bg-[#275D38] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-emerald-200" />
                <span>🏗️ Build Database</span>
              </button>
              <button
                onClick={() => onViewModeChange('sql_playground')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                  viewMode === 'sql_playground'
                    ? 'bg-[#275D38] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-emerald-200" />
                <span>💻 SQL Playground</span>
              </button>
            </div>
          )}

          {/* Action Buttons: Different for Engine Room vs. Database Editor vs. Database Builder */}
          {viewMode === 'engine_room' && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Quick Multi-Table Sign-up + Book */}
              <button
                onClick={() => {
                  setBookingMode('new_student');
                  setActiveModal('booking');
                }}
                disabled={isSimulating}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#275D38] hover:bg-[#1b4327] text-white text-xs font-bold shadow-md shadow-emerald-900/10 transition disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Sign Up New Student & Book</span>
              </button>

              {/* Concurrency Simulator with Lock Queue */}
              <button
                onClick={onFireConcurrent}
                disabled={isSimulating}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600 fill-current" />
                <span>3 Concurrent Bookings (Wait Queue)</span>
              </button>

              {/* Quick Relational Key Unlocking Demo */}
              <button
                onClick={handleQuickJoinDemo}
                disabled={isSimulating}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#275D38] border border-emerald-300 text-xs font-bold shadow-sm transition disabled:opacity-50"
                title="Demonstrates Foreign Key grabbing and Primary Key row unlocking"
              >
                <Key className="w-3.5 h-3.5 text-[#275D38]" />
                <span>SQL JOIN (FK 🔑 PK Unlock)</span>
              </button>

              {/* Custom SQL Console */}
              <button
                onClick={() => setActiveModal('sql')}
                disabled={isSimulating}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                <span>Custom SQL</span>
              </button>

              {/* Theory Guide */}
              <button
                onClick={onOpenHelp}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-300 transition"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>Theory</span>
              </button>
            </div>
          )}

          {viewMode === 'database_editor' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-mono font-bold shadow-xs">
                <Table className="w-3.5 h-3.5 text-purple-600" />
                <span>Record Editor (DML Studio - Isolated)</span>
              </div>

              {/* Theory Guide */}
              <button
                onClick={onOpenHelp}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-300 transition"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>Theory</span>
              </button>
            </div>
          )}

          {viewMode === 'database_builder' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-mono font-bold shadow-xs">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Builder Studio (Isolated Canvas)</span>
              </div>

              {/* Theory Guide */}
              <button
                onClick={onOpenHelp}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-300 transition"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>Theory</span>
              </button>
            </div>
          )}

          {viewMode === 'sql_playground' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-sky-400 text-xs font-mono font-bold shadow-xs">
                <Code2 className="w-3.5 h-3.5 text-sky-400" />
                <span>VS Code SQL Studio (Views & Procedures)</span>
              </div>

              {/* Theory Guide */}
              <button
                onClick={onOpenHelp}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-300 transition"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>Theory</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Booking Modal (Sign Up New Student vs Existing Student) */}
      {activeModal === 'booking' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#275D38]" />
                <h3 className="font-bold text-sm text-slate-900">
                  {bookingMode === 'new_student'
                    ? 'Sign Up New Student & Book Session (Multi-Table Transaction)'
                    : 'Book a Tutoring Session (Existing Student)'}
                </h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setBookingMode('new_student')}
                className={`py-1.5 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                  bookingMode === 'new_student'
                    ? 'bg-[#275D38] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Sign Up New Student</span>
              </button>
              <button
                type="button"
                onClick={() => setBookingMode('existing_student')}
                className={`py-1.5 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                  bookingMode === 'existing_student'
                    ? 'bg-[#275D38] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Existing Student</span>
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-3.5 text-xs">
              {bookingMode === 'new_student' ? (
                <div className="space-y-2 p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                  <span className="text-[11px] font-bold text-[#275D38] uppercase tracking-wider block">
                    1. New Student Info (Will mint Primary Key in 'Students')
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-600 uppercase font-semibold">First Name</label>
                      <input
                        type="text"
                        value={newFirstName}
                        onChange={(e) => setNewFirstName(e.target.value)}
                        className="w-full mt-0.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600 uppercase font-semibold">Last Name</label>
                      <input
                        type="text"
                        value={newLastName}
                        onChange={(e) => setNewLastName(e.target.value)}
                        className="w-full mt-0.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-600 uppercase font-semibold">Major</label>
                      <input
                        type="text"
                        value={newMajor}
                        onChange={(e) => setNewMajor(e.target.value)}
                        className="w-full mt-0.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-slate-700 font-semibold mb-1 block">Select Student (FK: student_id)</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-slate-900"
                  >
                    {students.map((st) => (
                      <option key={st.student_id} value={st.student_id}>
                        #{st.student_id} — {st.first_name} {st.last_name} ({st.major})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  2. Session Details (Will insert into 'Sessions' with Foreign Key)
                </span>
                <div>
                  <label className="text-[10px] text-slate-600 uppercase font-semibold mb-1 block">
                    Select Tutor (FK: tutor_id)
                  </label>
                  <select
                    value={selectedTutorId}
                    onChange={(e) => setSelectedTutorId(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-900"
                  >
                    {tutors.map((tut) => (
                      <option key={tut.tutor_id} value={tut.tutor_id}>
                        #{tut.tutor_id} — {tut.name} [{tut.subject_specialty}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-600 uppercase font-semibold mb-1 block">Date & Time</label>
                    <input
                      type="text"
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 uppercase font-semibold mb-1 block">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-900"
                    >
                      <option value="Confirmed">Confirmed</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#275D38] hover:bg-[#1b4327] text-white font-bold shadow-md shadow-emerald-900/10"
                >
                  {bookingMode === 'new_student'
                    ? 'Execute Multi-Table Sign-up & Booking'
                    : 'Execute Single-Table Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SQL Runner Modal with Live Schema & Elements Explorer */}
      {activeModal === 'sql' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#275D38] text-white shadow-sm">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span>Custom SQL Runner & Interactive Schema Explorer</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-[#275D38] font-bold border border-emerald-300">
                      Live Elements Reference
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Write standard SQL or click table columns to build queries. Watch the robot scan records and project results.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2-Column Responsive Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 overflow-y-auto pr-1">
              {/* LEFT COLUMN: SQL Editor & Execution Controls (col-span-7) */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                {/* Pre-built Queries Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#275D38]" />
                      <span>Educational Query Presets:</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Click to load</span>
                  </label>
                  <select
                    onChange={(e) => setSqlText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#275D38]"
                  >
                    {SAMPLE_QUERIES.map((q, idx) => (
                      <option key={idx} value={q.sql}>
                        {q.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SQL Code Textarea */}
                <div className="flex-1 flex flex-col min-h-[160px]">
                  <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-t-xl text-[11px] font-mono text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>SQL Statement Editor</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold">
                      {sqlText.trim().split(' ')[0]?.toUpperCase() || 'SQL'}
                    </span>
                  </div>
                  <textarea
                    value={sqlText}
                    onChange={(e) => setSqlText(e.target.value)}
                    rows={5}
                    spellCheck={false}
                    className="w-full flex-1 bg-slate-950 border-x border-b border-slate-800 p-3 font-mono text-xs text-cyan-300 rounded-b-xl focus:outline-none resize-none leading-relaxed selection:bg-[#275D38] selection:text-white"
                    placeholder="e.g. SELECT * FROM Students WHERE major = 'Computer Science'"
                  />
                </div>

                {/* Quick Token Insertion Chips */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Quick Clause Inserts:
                  </span>
                  <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setSqlText("SELECT Students.first_name, Students.major, Tutors.name, Sessions.session_date FROM Sessions JOIN Tutors ON Sessions.tutor_id = Tutors.tutor_id JOIN Students ON Sessions.student_id = Students.student_id WHERE Sessions.status = 'Confirmed'")}
                      className="px-2 py-1 rounded-lg bg-emerald-50 text-[#275D38] border border-emerald-300 hover:bg-emerald-100 transition text-[10px] font-bold"
                    >
                      + 3-Table JOIN (Sessions + Tutors + Students)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlText("SELECT * FROM Sessions JOIN Tutors ON Sessions.tutor_id = Tutors.tutor_id WHERE status = 'Confirmed'")}
                      className="px-2 py-1 rounded-lg bg-emerald-50 text-[#275D38] border border-emerald-200 hover:bg-emerald-100 transition text-[10px] font-bold"
                    >
                      + JOIN Sessions & Tutors
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlText("SELECT student_id, first_name, last_name, major FROM Students WHERE major = 'Computer Science'")}
                      className="px-2 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition text-[10px] font-bold"
                    >
                      + Filter Students (CS)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlText("SELECT * FROM Tutors WHERE max_capacity >= 4")}
                      className="px-2 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition text-[10px] font-bold"
                    >
                      + Tutors (Capacity &gt;= 4)
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSqlSubmit}
                    disabled={!sqlText.trim()}
                    className="px-5 py-2 rounded-xl bg-[#275D38] hover:bg-[#1b4327] text-white font-bold text-xs shadow-md shadow-emerald-900/10 flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Run Query on Visualizer Stage</span>
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: Interactive Database Tables & Elements Explorer (col-span-5) */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-3 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Database className="w-4 h-4 text-[#275D38]" />
                    <span>Database Schema & Elements</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Click column to insert</span>
                </div>

                {/* 1. Students Table Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#275D38] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#275D38]" />
                      <span>Students</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      ({databaseState.Students?.rows.length || 0} rows)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setSqlText((prev) => `${prev} student_id`)}
                      className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 flex items-center gap-0.5 font-bold"
                      title="Click to insert student_id"
                    >
                      <Key className="w-2.5 h-2.5 text-amber-600" /> student_id [PK]
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlText((prev) => `${prev} first_name`)}
                      className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                      title="Click to insert first_name"
                    >
                      first_name
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlText((prev) => `${prev} last_name`)}
                      className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                      title="Click to insert last_name"
                    >
                      last_name
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlText((prev) => `${prev} major`)}
                      className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                      title="Click to insert major"
                    >
                      major
                    </button>
                  </div>
                </div>

                {/* 2. Tutors Table Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#275D38] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                      <span>Tutors</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      ({databaseState.Tutors?.rows.length || 0} rows)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setSqlText((prev) => `${prev} tutor_id`)}
                      className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 flex items-center gap-0.5 font-bold"
                      title="Click to insert tutor_id"
                    >
                      <Key className="w-2.5 h-2.5 text-amber-600" /> tutor_id [PK]
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlText((prev) => `${prev} name`)}
                      className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                      title="Click to insert name"
                    >
                      name
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlText((prev) => `${prev} subject_specialty`)}
                      className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                      title="Click to insert subject_specialty"
                    >
                      subject_specialty
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlText((prev) => `${prev} max_capacity`)}
                      className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                      title="Click to insert max_capacity"
                    >
                      max_capacity
                    </button>
                  </div>
                </div>

                {/* 3. Sessions Table Card (Relational Hub) */}
                <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#275D38] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <span>Sessions</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      ({databaseState.Sessions?.rows.length || 0} rows)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setSqlText((prev) => `${prev} session_id`)}
                      className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 flex items-center gap-0.5 font-bold"
                      title="Click to insert session_id"
                    >
                      <Key className="w-2.5 h-2.5 text-amber-600" /> session_id [PK]
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlText((prev) => `${prev} student_id`)}
                      className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 flex items-center gap-0.5 font-bold"
                      title="Click to insert student_id"
                    >
                      <Link className="w-2.5 h-2.5 text-blue-600" /> student_id [FK ➔ Students]
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlText((prev) => `${prev} tutor_id`)}
                      className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 flex items-center gap-0.5 font-bold"
                      title="Click to insert tutor_id"
                    >
                      <Link className="w-2.5 h-2.5 text-blue-600" /> tutor_id [FK ➔ Tutors]
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlText((prev) => `${prev} session_date`)}
                      className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                      title="Click to insert session_date"
                    >
                      session_date
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlText((prev) => `${prev} status`)}
                      className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                      title="Click to insert status"
                    >
                      status
                    </button>
                  </div>
                </div>

                {/* Schema Relational Key Legend */}
                <div className="p-2 rounded-xl bg-slate-100/80 border border-slate-200 text-[10px] font-mono text-slate-600 space-y-1">
                  <span className="font-bold uppercase tracking-wider block text-[9px] text-slate-500">
                    Relational Connections:
                  </span>
                  <div>• Sessions.student_id ➔ Students.student_id (PK)</div>
                  <div>• Sessions.tutor_id ➔ Tutors.tutor_id (PK)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
