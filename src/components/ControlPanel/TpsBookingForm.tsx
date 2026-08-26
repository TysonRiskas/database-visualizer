import React, { useState } from 'react';
import { DatabaseState } from '../../types/database';
import { Calendar, UserPlus, Users, GraduationCap, Clock, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface TpsBookingFormProps {
  databaseState: DatabaseState;
  onBookSession: (data: {
    studentId: number;
    tutorId: number;
    sessionDate: string;
    status: string;
    newStudent?: { firstName: string; lastName: string; major: string };
  }) => void;
  isSimulating: boolean;
}

export const TpsBookingForm: React.FC<TpsBookingFormProps> = ({
  databaseState,
  onBookSession,
  isSimulating,
}) => {
  const students = databaseState.Students?.rows || [];
  const tutors = databaseState.Tutors?.rows || [];

  const [studentMode, setStudentMode] = useState<'existing' | 'new'>('existing');
  const [selectedStudentId, setSelectedStudentId] = useState<number>(students[0]?.student_id || 1);
  const [newFirstName, setNewFirstName] = useState('Elena');
  const [newLastName, setNewLastName] = useState('Rostova');
  const [newMajor, setNewMajor] = useState('Software Engineering');

  const [selectedTutorId, setSelectedTutorId] = useState<number>(tutors[0]?.tutor_id || 101);
  const [sessionDate, setSessionDate] = useState('2026-08-30 14:00');
  const [status, setStatus] = useState('Confirmed');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSimulating) return;

    if (studentMode === 'new') {
      onBookSession({
        studentId: 0,
        tutorId: Number(selectedTutorId),
        sessionDate,
        status,
        newStudent: {
          firstName: newFirstName.trim() || 'New',
          lastName: newLastName.trim() || 'Student',
          major: newMajor.trim() || 'General Studies',
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
  };

  const selectedTutor = tutors.find((t) => Number(t.tutor_id) === Number(selectedTutorId));

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-blue-200">ACID Transaction Lifecycle (TPS)</p>
          <p className="text-blue-300/80 mt-0.5">
            Submitting books an appointment by acquiring an <strong>Exclusive (X) Lock</strong>, logging to <strong>WAL</strong>, appending to <code className="bg-blue-900/50 px-1 rounded">Sessions</code>, and releasing locks on commit.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Student Selection Mode */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Student (Foreign Key: student_id)</span>
            </label>
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setStudentMode('existing')}
                className={`px-2 py-0.5 rounded-md font-medium transition ${
                  studentMode === 'existing'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Existing
              </button>
              <button
                type="button"
                onClick={() => setStudentMode('new')}
                className={`px-2 py-0.5 rounded-md font-medium transition ${
                  studentMode === 'new'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                + New Student
              </button>
            </div>
          </div>

          {studentMode === 'existing' ? (
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            >
              {students.map((st) => (
                <option key={st.student_id} value={st.student_id}>
                  ID #{st.student_id} — {st.first_name} {st.last_name} ({st.major})
                </option>
              ))}
            </select>
          ) : (
            <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-semibold">First Name</label>
                <input
                  type="text"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Last Name</label>
                <input
                  type="text"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Major</label>
                <input
                  type="text"
                  value={newMajor}
                  onChange={(e) => setNewMajor(e.target.value)}
                  className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                  required
                />
              </div>
            </div>
          )}
        </div>

        {/* Tutor Selection */}
        <div>
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tutor (Foreign Key: tutor_id)</span>
          </label>
          <select
            value={selectedTutorId}
            onChange={(e) => setSelectedTutorId(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          >
            {tutors.map((tut) => (
              <option key={tut.tutor_id} value={tut.tutor_id}>
                ID #{tut.tutor_id} — {tut.name} [{tut.subject_specialty}] (Max: {tut.max_capacity})
              </option>
            ))}
          </select>
          {selectedTutor && (
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Specialty: <span className="text-slate-300 font-medium">{selectedTutor.subject_specialty}</span>
            </p>
          )}
        </div>

        {/* Date and Status Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1 mb-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Session Date/Time</span>
            </label>
            <input
              type="text"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Status</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
            >
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSimulating}
          className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs tracking-wide shadow-lg flex items-center justify-center gap-2 transition duration-200 ${
            isSimulating
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-blue-500/20 active:scale-[0.99]'
          }`}
        >
          <span>{isSimulating ? 'Engine Busy Executing...' : 'Book Tutoring Session (Run Tx)'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
