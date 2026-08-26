import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  DatabaseState,
  LockEntry,
  RowData,
  SimulationStep,
  WorkerRobotState,
  WaitQueueLaneRobot,
} from '../../types/database';
import {
  Key,
  Link,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Clock,
  Sparkles,
  Table,
  Code2,
  ShieldAlert,
  Users,
  Cpu,
  Layers,
  Database,
} from 'lucide-react';

interface StageCanvasProps {
  databaseState: DatabaseState;
  activeLocks: LockEntry[];
  currentStep?: SimulationStep;
  workerRobots: WorkerRobotState[];
  extractedTrayRows?: RowData[];
}

interface AnchorPoint {
  x: number;
  y: number;
}

/**
 * Character-by-character typing animation component with human cadence (~115ms)
 */
const TypingCell: React.FC<{ text: string | number; isTyping?: boolean; prefix?: string }> = ({
  text,
  isTyping = false,
  prefix = '',
}) => {
  const str = String(text ?? '');
  const [displayedLength, setDisplayedLength] = useState(isTyping ? 0 : str.length);

  useEffect(() => {
    if (!isTyping) {
      setDisplayedLength(str.length);
      return;
    }

    setDisplayedLength(0);
    let currentIdx = 0;
    const interval = setInterval(() => {
      currentIdx++;
      setDisplayedLength(currentIdx);
      if (currentIdx >= str.length) {
        clearInterval(interval);
      }
    }, 115);

    return () => clearInterval(interval);
  }, [str, isTyping]);

  return (
    <span className="font-mono inline-flex items-center">
      {prefix}
      <span>{str.slice(0, displayedLength)}</span>
      {isTyping && displayedLength < str.length && (
        <span className="inline-block w-1.5 h-3.5 bg-[#275D38] ml-0.5 animate-pulse" />
      )}
    </span>
  );
};

export const StageCanvas: React.FC<StageCanvasProps> = ({
  databaseState,
  activeLocks,
  currentStep,
  workerRobots,
  extractedTrayRows = [],
}) => {
  const stageContainerRef = useRef<HTMLDivElement | null>(null);

  const hasStudents = !!databaseState.Students;
  const hasTutors = !!databaseState.Tutors;
  const hasSessions = !!databaseState.Sessions;
  const isCompletelyBlank = Object.keys(databaseState).length === 0;

  const studentsTable = databaseState.Students || {
    schema: { name: 'Students', columns: [], primaryKey: 'student_id' },
    rows: [],
  };
  const tutorsTable = databaseState.Tutors || {
    schema: { name: 'Tutors', columns: [], primaryKey: 'tutor_id' },
    rows: [],
  };
  const sessionsTable = databaseState.Sessions || {
    schema: { name: 'Sessions', columns: [], primaryKey: 'session_id' },
    rows: [],
  };

  const joinBeam = currentStep?.joinBeam;
  const keyToken = currentStep?.keyToken;
  const ghostSlot = currentStep?.ghostSlot;
  const waitQueueLaneRobots: WaitQueueLaneRobot[] = currentStep?.waitQueueLaneRobots || [];

  // Active SQL & Clause Highlight
  const activeSql = currentStep?.activeSqlString;
  const highlightClause = currentStep?.sqlClauseHighlight;

  // Auto-scroll refs
  const sessionsBottomRef = useRef<HTMLTableRowElement | null>(null);
  const studentsBottomRef = useRef<HTMLTableRowElement | null>(null);

  // Dynamic Anchor Points for PK ➔ FK Column Header Connectors
  const [anchorPkStudent, setAnchorPkStudent] = useState<AnchorPoint | null>(null);
  const [anchorPkTutor, setAnchorPkTutor] = useState<AnchorPoint | null>(null);
  const [anchorFkStudent, setAnchorFkStudent] = useState<AnchorPoint | null>(null);
  const [anchorFkTutor, setAnchorFkTutor] = useState<AnchorPoint | null>(null);

  const updateAnchorPositions = () => {
    if (!stageContainerRef.current) return;
    const stageRect = stageContainerRef.current.getBoundingClientRect();

    const getCenter = (id: string): AnchorPoint | null => {
      const el = document.getElementById(id);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - stageRect.left,
        y: rect.top + rect.height / 2 - stageRect.top,
      };
    };

    setAnchorPkStudent(getCenter('anchor-pk-student-header'));
    setAnchorPkTutor(getCenter('anchor-pk-tutor-header'));
    setAnchorFkStudent(getCenter('anchor-fk-student-header'));
    setAnchorFkTutor(getCenter('anchor-fk-tutor-header'));
  };

  useLayoutEffect(() => {
    updateAnchorPositions();
    const ro = new ResizeObserver(updateAnchorPositions);
    if (stageContainerRef.current) {
      ro.observe(stageContainerRef.current);
    }
    window.addEventListener('resize', updateAnchorPositions);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateAnchorPositions);
    };
  }, [databaseState, currentStep]);

  useEffect(() => {
    if (ghostSlot?.table === 'Sessions' || currentStep?.targetTable === 'Sessions') {
      sessionsBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (ghostSlot?.table === 'Students' || currentStep?.targetTable === 'Students') {
      studentsBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [ghostSlot, currentStep]);

  // Helper for row-level lock
  const getRowLock = (tableName: string, rowId: any): LockEntry | undefined => {
    return activeLocks.find(
      (l) => l.table === tableName && String(l.rowId) === String(rowId)
    );
  };

  const isTraversingStudentsToSessions =
    currentStep?.title?.includes('Transferred Foreign Key') ||
    currentStep?.actionSummary?.includes('Carried new PK') ||
    currentStep?.title?.includes('Students ➔ Sessions');

  const isTraversingSessionsToTutors =
    keyToken?.active || joinBeam?.active;

  const isColumnProjected = (tableName: string, colName: string): boolean => {
    if (!activeSql) return false;
    const cols = currentStep?.projectedColumns;
    if (cols && cols.length > 0) {
      if (cols.includes('*')) {
        const isDriving = activeSql.toLowerCase().includes(`from ${tableName.toLowerCase()}`);
        const isJoinTarget = activeSql.toLowerCase().includes(`join ${tableName.toLowerCase()}`);
        return isDriving || isJoinTarget;
      }
      const cleanCol = colName.toLowerCase();
      return cols.some((c) => {
        const colPart = c.split('.').pop()?.toLowerCase();
        const tablePart = c.includes('.') ? c.split('.')[0].toLowerCase() : null;
        if (tablePart && tablePart !== tableName.toLowerCase()) return false;
        return colPart === cleanCol || c.toLowerCase() === cleanCol;
      });
    }
    if (activeSql.includes('*')) {
      return activeSql.toLowerCase().includes(`from ${tableName.toLowerCase()}`) || activeSql.toLowerCase().includes(`join ${tableName.toLowerCase()}`);
    }
    return activeSql.toLowerCase().includes(colName.toLowerCase());
  };

  const isEntireRowProjected = (tableName: string): boolean => {
    if (!activeSql) return false;
    const cols = currentStep?.projectedColumns;
    if (cols && cols.length > 0) {
      return cols.includes('*');
    }
    return activeSql.includes('*');
  };

  return (
    <div
      ref={stageContainerRef}
      className="relative bg-white rounded-3xl border border-slate-200 p-5 shadow-xl flex flex-col gap-5 overflow-visible min-h-[740px]"
    >
      {/* 1. TOP STAGE HEADER: UVU Green Header with Live SQL Code Highlighter & Lock Wait Queue Lane */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#275D38] animate-pulse" />
            <h2 className="text-base font-bold text-[#275D38] font-sans tracking-tight">
              UVU Relational Database Internals Stage
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[10px] font-mono text-slate-700">
              <Users className="w-3 h-3 text-[#275D38]" />
              <span>Left-Hand Staging Bay Active</span>
            </div>
          </div>

          {/* ON-STAGE VISUAL LOCK WAIT QUEUE LANE */}
          <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-2 px-3.5 flex items-center gap-2.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Lock Wait Queue Lane:</span>
            </div>

            {waitQueueLaneRobots.length === 0 ? (
              <span className="text-[11px] font-mono text-slate-500 italic">
                (Empty — 0 blocked threads)
              </span>
            ) : (
              <div className="flex items-center gap-2">
                {waitQueueLaneRobots.map((wb) => (
                  <div
                    key={wb.id}
                    className="flex items-center gap-1.5 bg-amber-200/80 border border-amber-400 text-amber-950 px-2.5 py-0.5 rounded-xl text-xs font-mono font-bold animate-pulse shadow-sm"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                    <span>#{wb.queuePosition} In Queue:</span>
                    <span>{wb.name}</span>
                    <span className="text-[10px] text-amber-800 font-normal">
                      (Waiting on {wb.waitingOnResource})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* LIVE SQL CLAUSE HIGHLIGHTER BAR */}
        {activeSql && (
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-3 px-4 shadow-lg text-xs font-mono flex flex-col md:flex-row md:items-center justify-between gap-3 text-slate-100 animate-fadeIn">
            <div className="flex items-center gap-2 shrink-0">
              <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Code2 className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Active SQL Plan:
              </span>
            </div>

            <div className="flex-1 overflow-x-auto text-slate-200 flex items-center gap-2 flex-wrap text-[11px] leading-relaxed">
              {/* Parse & Highlight Clauses */}
              {activeSql.split('\n').map((line, lIdx) => (
                <span key={lIdx} className="whitespace-pre">
                  {line.includes('SELECT') ? (
                    <>
                      <span className={`px-2 py-0.5 rounded transition font-bold ${highlightClause === 'SELECT' ? 'bg-[#275D38] text-white ring-2 ring-emerald-400 shadow' : 'bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 shadow-xs'}`}>
                        SELECT * (Projection Active)
                      </span>{' '}
                      <span className={`px-1.5 py-0.5 rounded transition ${highlightClause === 'FROM' ? 'bg-[#275D38] text-white font-bold ring-2 ring-emerald-400 shadow' : 'text-blue-400'}`}>
                        FROM Sessions
                      </span>{' '}
                      {line.includes('JOIN') && (
                        <span className={`px-1.5 py-0.5 rounded transition ${highlightClause === 'JOIN' ? 'bg-[#D4AF37] text-slate-950 font-bold ring-2 ring-yellow-400 shadow' : 'text-amber-400'}`}>
                          JOIN Tutors ON Sessions.tutor_id = Tutors.tutor_id
                        </span>
                      )}{' '}
                      {line.includes('WHERE') && (
                        <span className={`px-1.5 py-0.5 rounded transition ${highlightClause === 'WHERE' ? 'bg-[#D4AF37] text-slate-950 font-bold ring-2 ring-yellow-400 shadow' : 'text-emerald-400'}`}>
                          WHERE {line.split('WHERE')[1]}
                        </span>
                      )}
                    </>
                  ) : line.includes('INSERT') ? (
                    <>
                      <span className={`px-1.5 py-0.5 rounded transition ${highlightClause === 'INSERT' ? 'bg-[#275D38] text-white font-bold ring-2 ring-emerald-400 shadow' : 'text-blue-400'}`}>
                        {line.split('VALUES')[0]}
                      </span>
                      {line.includes('VALUES') && (
                        <span className={`px-1.5 py-0.5 rounded transition ${highlightClause === 'VALUES' ? 'bg-[#D4AF37] text-slate-950 font-bold ring-2 ring-yellow-400 shadow' : 'text-emerald-400'}`}>
                          VALUES {line.split('VALUES')[1]}
                        </span>
                      )}
                    </>
                  ) : (
                    <span>{line}</span>
                  )}
                </span>
              ))}
            </div>

            {highlightClause && (
              <div className="shrink-0 bg-[#275D38] text-white font-bold px-2.5 py-1 rounded-xl text-[10px] tracking-wider uppercase flex items-center gap-1 shadow-sm animate-pulse">
                <Sparkles className="w-3 h-3 text-yellow-300" />
                <span>Executing: {highlightClause}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MAIN STAGE BODY: LEFT-HAND STAGING BAY + RIGHT-HAND DATABASE TABLES */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch relative">
        {/* DEDICATED LEFT-HAND WORKER ROBOT STAGING BAY */}
        <div className="w-full lg:w-44 xl:w-48 shrink-0 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-4 shadow-inner">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <Cpu className="w-4 h-4 text-[#275D38]" />
            <div>
              <h3 className="text-xs font-bold text-[#275D38] font-sans">
                Worker Staging Bay
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">Idle & Return Docks</p>
            </div>
          </div>

          {/* 3 VISUAL DOCKING PADS */}
          <div className="flex flex-row lg:flex-col justify-around lg:justify-between gap-3 flex-1 py-1">
            {/* Dock 1: Alpha / Primary */}
            <div className="flex-1 rounded-xl border-2 border-dashed border-[#275D38]/40 bg-white/80 p-2.5 flex flex-col items-center justify-center gap-1 relative shadow-xs">
              <div className="w-9 h-9 rounded-full border border-emerald-400 bg-emerald-50 flex items-center justify-center shadow-inner">
                <div className="w-4 h-4 rounded-full bg-[#275D38] animate-pulse" />
              </div>
              <span className="text-[10px] font-mono font-bold text-[#275D38]">
                Dock #1 (Alpha)
              </span>
              <span className="text-[9px] text-slate-500 font-sans">Main Agent</span>
            </div>

            {/* Dock 2: Beta */}
            <div className="flex-1 rounded-xl border-2 border-dashed border-[#D4AF37]/50 bg-white/80 p-2.5 flex flex-col items-center justify-center gap-1 relative shadow-xs">
              <div className="w-9 h-9 rounded-full border border-yellow-400 bg-amber-50 flex items-center justify-center shadow-inner">
                <div className="w-4 h-4 rounded-full bg-[#D4AF37]" />
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-800">
                Dock #2 (Beta)
              </span>
              <span className="text-[9px] text-slate-500 font-sans">Multi-Table</span>
            </div>

            {/* Dock 3: Gamma */}
            <div className="flex-1 rounded-xl border-2 border-dashed border-purple-300 bg-white/80 p-2.5 flex flex-col items-center justify-center gap-1 relative shadow-xs">
              <div className="w-9 h-9 rounded-full border border-purple-400 bg-purple-50 flex items-center justify-center shadow-inner">
                <div className="w-4 h-4 rounded-full bg-purple-600" />
              </div>
              <span className="text-[10px] font-mono font-bold text-purple-900">
                Dock #3 (Gamma)
              </span>
              <span className="text-[9px] text-slate-500 font-sans">Parallel Agent</span>
            </div>
          </div>
        </div>

        {/* RIGHT-HAND CONTAINER: TABLES & RESULTS TRAY */}
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          {/* EMPTY CONSTRUCTION CANVAS WHEN NO TABLES EXIST */}
          {isCompletelyBlank && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50/80 rounded-3xl border-2 border-dashed border-slate-300 min-h-[480px] text-center gap-4 relative overflow-hidden shadow-inner">
              <div className="p-4 rounded-3xl bg-emerald-50 text-[#275D38] border border-emerald-200 shadow-sm animate-pulse">
                <Database className="w-10 h-10" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="font-bold text-base text-slate-800 font-sans flex items-center justify-center gap-2">
                  <span>🏗️ Database Construction Stage Ready</span>
                </h3>
                <p className="text-xs text-slate-500 font-sans leading-relaxed">
                  No tables exist in the database yet. Follow the <strong>Tutorial Steps</strong> on the left to write your first <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-[#275D38]">CREATE TABLE</code> command and watch the Wolverine Architect Robot construct the table foundation!
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Wolverine Agent Ready in Staging Dock #1</span>
              </div>
            </div>
          )}

          {/* TOP ROW: Students & Tutors Tables (Rendered when present) */}
          {(hasStudents || hasTutors) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 relative z-10">
              {hasStudents && (
            <div
              className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-md flex flex-col ${
                highlightClause === 'FROM' && (currentStep?.targetTable === 'Students' || activeSql?.toLowerCase().includes('from students'))
                  ? 'border-[#275D38] ring-4 ring-emerald-500/40 shadow-2xl bg-emerald-50/20'
                  : activeSql?.toLowerCase().includes('students')
                  ? 'border-cyan-500 ring-2 ring-cyan-400/30 shadow-lg bg-cyan-50/10'
                  : 'border-slate-200'
              }`}
            >
              <div className="p-3 bg-[#275D38]/10 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#275D38]" />
                  <h3 className="font-mono font-bold text-xs text-[#275D38]">Students</h3>
                  <span className="text-[10px] text-slate-500 font-mono">({studentsTable.rows.length} rows)</span>
                  {highlightClause === 'FROM' && (currentStep?.targetTable === 'Students' || activeSql?.toLowerCase().includes('from students')) && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#275D38] text-white animate-pulse">
                      FROM Driving Table Focus
                    </span>
                  )}
                  {activeSql?.toLowerCase().includes('students') && highlightClause !== 'FROM' && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-700 text-white shadow-sm flex items-center gap-1 animate-pulse">
                      <Sparkles className="w-3 h-3 text-cyan-200" /> SELECT Target (Students)
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 font-semibold">
                  <Key className="w-3 h-3 text-amber-600" /> PK Table
                </span>
              </div>

              <div className="overflow-x-auto max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[11px] sticky top-0 bg-slate-100 z-10">
                      <th className="p-2 w-8 text-center text-slate-400">#</th>
                      <th className="p-2 w-12 text-center text-slate-400">Lock</th>
                      {/* DIRECT COLUMN HEADER ANCHOR: Students.student_id PK */}
                      <th
                        id="anchor-pk-student-header"
                        className={`p-2 font-bold border-b-2 ${
                          isColumnProjected('Students', 'student_id')
                            ? 'text-cyan-950 bg-cyan-100/80 border-cyan-500'
                            : 'text-amber-800 bg-amber-100/70 border-amber-400'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <Key className="w-3 h-3 text-amber-600" />
                          <span>student_id (PK)</span>
                        </div>
                      </th>
                      <th className={`p-2 ${isColumnProjected('Students', 'first_name') ? 'text-cyan-950 bg-cyan-100/80 border-b-2 border-cyan-500 font-bold' : ''}`}>first_name</th>
                      <th className={`p-2 ${isColumnProjected('Students', 'last_name') ? 'text-cyan-950 bg-cyan-100/80 border-b-2 border-cyan-500 font-bold' : ''}`}>last_name</th>
                      <th className={`p-2 ${isColumnProjected('Students', 'major') ? 'text-cyan-950 bg-cyan-100/80 border-b-2 border-cyan-500 font-bold' : ''}`}>major</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                    {studentsTable.rows.map((row, idx) => {
                      const lock = getRowLock('Students', row.student_id);
                      const isNewlyAdded =
                        currentStep?.targetTable === 'Students' &&
                        currentStep?.targetRowId === row.student_id;

                      const studentPersistentStatus = currentStep?.evaluatedRowStatuses?.find(
                        (es) => es.table === 'Students' && (String(es.rowId) === String(row.student_id) || es.rowIndex === idx)
                      )?.status;

                      const isScanningStudent = currentStep?.targetTable === 'Students' && currentStep?.targetRowIndex === idx;
                      const isStudentMatch = studentPersistentStatus === 'MATCH' || (isScanningStudent && currentStep?.predicateEvaluation?.passed === true);
                      const isStudentFailed = studentPersistentStatus === 'FILTERED' || (isScanningStudent && currentStep?.predicateEvaluation?.passed === false);

                      return (
                        <tr
                          key={row.student_id}
                          className={`relative transition-all duration-300 ${
                            isStudentMatch
                              ? 'bg-red-50/40 text-slate-900 font-bold'
                              : isStudentFailed
                              ? 'bg-rose-50/80 text-slate-400 opacity-60'
                              : lock
                              ? 'bg-rose-50 text-rose-900'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* 1. BOLD RED STRIKE-THROUGH LINE ON WHERE FAILURE */}
                          {isStudentFailed && (
                            <div className="absolute inset-y-1/2 left-2 right-2 h-1 bg-red-600 shadow-md rounded-full pointer-events-none z-30 animate-strike-through" />
                          )}

                          {/* 2. CLEAN BOLD RED CIRCLE ON WHERE MATCH (FULL ROW IF SELECT *) */}
                          {isStudentMatch && isEntireRowProjected('Students') && (
                            <div className="absolute -inset-1 rounded-2xl border-3 border-red-600 bg-red-500/10 pointer-events-none z-20 animate-red-circle shadow-lg" />
                          )}

                          <td className="p-2 text-center text-[10px] text-slate-400 bg-slate-50">{idx}</td>
                          <td className="p-2 text-center">
                            {isStudentMatch ? (
                              <span className="text-red-600 font-extrabold flex items-center justify-center gap-0.5 text-[10px] bg-red-100 border border-red-300 px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5" /> MATCH
                              </span>
                            ) : isStudentFailed ? (
                              <span className="text-rose-700 font-extrabold flex items-center justify-center gap-0.5 text-[10px] bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded-full">
                                <XCircle className="w-3.5 h-3.5" /> FILTER
                              </span>
                            ) : lock ? (
                              <div className="inline-flex items-center text-rose-600" title="Exclusive Lock">
                                <Lock className="w-3 h-3" />
                              </div>
                            ) : (
                              <Unlock className="w-3 h-3 text-emerald-600/40 inline" />
                            )}
                          </td>
                          <td className={`p-2 font-bold relative ${isStudentMatch && isColumnProjected('Students', 'student_id') ? 'text-red-950 bg-red-50/60' : 'text-amber-700 bg-amber-50/30'}`}>
                            {isStudentMatch && !isEntireRowProjected('Students') && isColumnProjected('Students', 'student_id') && (
                              <div className="absolute -inset-0.5 rounded-lg border-2 border-red-600 bg-red-500/15 pointer-events-none z-20 animate-red-circle shadow-sm" />
                            )}
                            <div className="flex items-center gap-1 relative z-10">
                              <Key className="w-3 h-3 text-amber-600" />
                              <span>#{row.student_id}</span>
                            </div>
                          </td>
                          <td className={`p-2 font-medium relative ${isStudentMatch && isColumnProjected('Students', 'first_name') ? 'text-red-950 font-bold bg-red-50/60' : ''}`}>
                            {isStudentMatch && !isEntireRowProjected('Students') && isColumnProjected('Students', 'first_name') && (
                              <div className="absolute -inset-0.5 rounded-lg border-2 border-red-600 bg-red-500/15 pointer-events-none z-20 animate-red-circle shadow-sm" />
                            )}
                            <span className="relative z-10">
                              <TypingCell text={row.first_name} isTyping={isNewlyAdded && (currentStep?.type === 'STEP_SNAP_PAYLOAD' || currentStep?.type === 'STEP_DISPATCH_FROM_QUEUE')} />
                            </span>
                          </td>
                          <td className={`p-2 font-medium relative ${isStudentMatch && isColumnProjected('Students', 'last_name') ? 'text-red-950 font-bold bg-red-50/60' : ''}`}>
                            {isStudentMatch && !isEntireRowProjected('Students') && isColumnProjected('Students', 'last_name') && (
                              <div className="absolute -inset-0.5 rounded-lg border-2 border-red-600 bg-red-500/15 pointer-events-none z-20 animate-red-circle shadow-sm" />
                            )}
                            <span className="relative z-10">
                              <TypingCell text={row.last_name} isTyping={isNewlyAdded && (currentStep?.type === 'STEP_SNAP_PAYLOAD' || currentStep?.type === 'STEP_DISPATCH_FROM_QUEUE')} />
                            </span>
                          </td>
                          <td className={`p-2 relative ${isStudentMatch && isColumnProjected('Students', 'major') ? 'text-red-950 font-bold bg-red-50/60' : 'text-slate-500'}`}>
                            {isStudentMatch && !isEntireRowProjected('Students') && isColumnProjected('Students', 'major') && (
                              <div className="absolute -inset-0.5 rounded-lg border-2 border-red-600 bg-red-500/15 pointer-events-none z-20 animate-red-circle shadow-sm" />
                            )}
                            <span className="relative z-10">
                              <TypingCell text={row.major} isTyping={isNewlyAdded && (currentStep?.type === 'STEP_SNAP_PAYLOAD' || currentStep?.type === 'STEP_DISPATCH_FROM_QUEUE')} />
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Ghost Slot for New Student Insertion with Typing Animation */}
                    {ghostSlot && ghostSlot.table === 'Students' && (
                      <tr
                        ref={studentsBottomRef}
                        className="bg-emerald-50 border-2 border-dashed border-[#275D38] animate-pulse text-[#275D38] font-bold"
                      >
                        <td className="p-2 text-center text-[10px] bg-slate-100 font-mono">
                          {studentsTable.rows.length}
                        </td>
                        <td className="p-2 text-center">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300 text-[9px]">
                            <Lock className="w-3 h-3" /> PADLOCK
                          </span>
                        </td>
                        <td className="p-2 text-amber-700 flex items-center gap-1 bg-amber-50/40">
                          <Key className="w-3 h-3 text-amber-600" />
                          <span>#{ghostSlot.rowId} (New PK)</span>
                        </td>
                        <td className="p-2">
                          <TypingCell text={ghostSlot.rowData.first_name} isTyping={true} />
                        </td>
                        <td className="p-2">
                          <TypingCell text={ghostSlot.rowData.last_name} isTyping={true} />
                        </td>
                        <td className="p-2">
                          <TypingCell text={ghostSlot.rowData.major} isTyping={true} />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TUTORS TABLE */}
          {hasTutors && (
            <div
              className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-md flex flex-col ${
                highlightClause === 'JOIN' && (currentStep?.targetTable === 'Tutors' || activeSql?.toLowerCase().includes('tutors'))
                  ? 'border-[#D4AF37] ring-4 ring-yellow-400/40 shadow-xl'
                  : activeSql?.toLowerCase().includes('tutors')
                  ? 'border-cyan-500 ring-2 ring-cyan-400/30 shadow-lg bg-cyan-50/10'
                  : 'border-slate-200'
              }`}
            >
              <div className="p-3 bg-[#275D38]/10 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#275D38]" />
                  <h3 className="font-mono font-bold text-xs text-[#275D38]">Tutors</h3>
                  <span className="text-[10px] text-slate-500 font-mono">({tutorsTable.rows.length} rows)</span>
                  {activeSql?.toLowerCase().includes('tutors') && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-700 text-white shadow-sm flex items-center gap-1 animate-pulse">
                      <Sparkles className="w-3 h-3 text-cyan-200" /> SELECT Target (Tutors)
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 font-semibold">
                  <Key className="w-3 h-3 text-amber-600" /> PK Table
                </span>
              </div>

              <div className="overflow-x-auto max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[11px] sticky top-0 bg-slate-100 z-10">
                      <th className="p-2 w-8 text-center text-slate-400">#</th>
                      <th className="p-2 w-16 text-center text-slate-400">Lock</th>
                      {/* DIRECT COLUMN HEADER ANCHOR: Tutors.tutor_id PK */}
                      <th
                        id="anchor-pk-tutor-header"
                        className={`p-2 font-bold border-b-2 ${
                          isColumnProjected('Tutors', 'tutor_id')
                            ? 'text-cyan-950 bg-cyan-100/80 border-cyan-500'
                            : 'text-amber-800 bg-amber-100/70 border-amber-400'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <Key className="w-3 h-3 text-amber-600" />
                          <span>tutor_id (PK)</span>
                        </div>
                      </th>
                      <th className={`p-2 ${isColumnProjected('Tutors', 'name') ? 'text-cyan-950 bg-cyan-100/80 border-b-2 border-cyan-500 font-bold' : ''}`}>name</th>
                      <th className={`p-2 ${isColumnProjected('Tutors', 'subject_specialty') || isColumnProjected('Tutors', 'specialty') ? 'text-cyan-950 bg-cyan-100/80 border-b-2 border-cyan-500 font-bold' : 'text-slate-500'}`}>specialty</th>
                      <th className={`p-2 ${isColumnProjected('Tutors', 'max_capacity') || isColumnProjected('Tutors', 'capacity') ? 'text-cyan-950 bg-cyan-100/80 border-b-2 border-cyan-500 font-bold' : ''}`}>capacity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                    {tutorsTable.rows.map((row, idx) => {
                      const lock = getRowLock('Tutors', row.tutor_id);
                      const isKeyUnlockingThisRow =
                        keyToken &&
                        keyToken.targetTable === 'Tutors' &&
                        String(row.tutor_id) === String(keyToken.targetPkValue);

                      const tutorPersistentStatus = currentStep?.evaluatedRowStatuses?.find(
                        (es) => es.table === 'Tutors' && (String(es.rowId) === String(row.tutor_id) || es.rowIndex === idx)
                      )?.status;

                      const isTutorMatch = tutorPersistentStatus === 'MATCH' || isKeyUnlockingThisRow;

                      return (
                        <tr
                          key={row.tutor_id}
                          className={`relative transition-all duration-300 ${
                            isTutorMatch
                              ? 'bg-red-50/40 text-slate-900 font-bold'
                              : lock
                              ? 'bg-rose-50 text-rose-900'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* CLEAN BOLD RED CIRCLE ON MATCHED PARENT TUTOR (FULL ROW IF SELECT *) */}
                          {isTutorMatch && isEntireRowProjected('Tutors') && (
                            <div className="absolute -inset-1 rounded-2xl border-3 border-red-600 bg-red-500/10 pointer-events-none z-20 animate-red-circle shadow-lg" />
                          )}

                          <td className="p-2 text-center text-[10px] text-slate-400 bg-slate-50">{idx}</td>
                          <td className="p-2 text-center">
                            {isKeyUnlockingThisRow ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-400 text-[9px] font-extrabold animate-bounce">
                                <Key className="w-3 h-3 text-amber-700" />
                                <span>UNLOCKED!</span>
                              </div>
                            ) : isTutorMatch ? (
                              <span className="text-red-600 font-extrabold flex items-center justify-center gap-0.5 text-[10px] bg-red-100 border border-red-300 px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5" /> MATCH
                              </span>
                            ) : lock ? (
                              <div
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300 text-[9px] font-bold animate-lock-pulse"
                                title={`Exclusive PADLOCK held by ${lock.holderThreadName}`}
                              >
                                <Lock className="w-3 h-3" />
                                <span>PADLOCK</span>
                              </div>
                            ) : (
                              <Unlock className="w-3 h-3 text-emerald-600/40 inline" />
                            )}
                          </td>
                          <td className={`p-2 font-bold relative ${isTutorMatch && isColumnProjected('Tutors', 'tutor_id') ? 'text-red-950 bg-red-50/60' : 'text-amber-700 bg-amber-50/30'}`}>
                            {isTutorMatch && !isEntireRowProjected('Tutors') && isColumnProjected('Tutors', 'tutor_id') && (
                              <div className="absolute -inset-0.5 rounded-lg border-2 border-red-600 bg-red-500/15 pointer-events-none z-20 animate-red-circle shadow-sm" />
                            )}
                            <div className="flex items-center gap-1 relative z-10">
                              <Key className="w-3 h-3 text-amber-600" />
                              <span>#{row.tutor_id}</span>
                            </div>
                          </td>
                          <td className={`p-2 font-medium relative ${isTutorMatch && isColumnProjected('Tutors', 'name') ? 'text-red-950 font-bold bg-red-50/60' : ''}`}>
                            {isTutorMatch && !isEntireRowProjected('Tutors') && isColumnProjected('Tutors', 'name') && (
                              <div className="absolute -inset-0.5 rounded-lg border-2 border-red-600 bg-red-500/15 pointer-events-none z-20 animate-red-circle shadow-sm" />
                            )}
                            <span className="relative z-10">{row.name}</span>
                          </td>
                          <td className={`p-2 relative ${isTutorMatch && (isColumnProjected('Tutors', 'subject_specialty') || isColumnProjected('Tutors', 'specialty')) ? 'text-red-950 font-bold bg-red-50/60' : 'text-slate-500'}`}>
                            {isTutorMatch && !isEntireRowProjected('Tutors') && (isColumnProjected('Tutors', 'subject_specialty') || isColumnProjected('Tutors', 'specialty')) && (
                              <div className="absolute -inset-0.5 rounded-lg border-2 border-red-600 bg-red-500/15 pointer-events-none z-20 animate-red-circle shadow-sm" />
                            )}
                            <span className="relative z-10">{row.subject_specialty}</span>
                          </td>
                          <td className={`p-2 relative ${isTutorMatch && (isColumnProjected('Tutors', 'max_capacity') || isColumnProjected('Tutors', 'capacity')) ? 'text-red-950 font-bold bg-red-50/60' : ''}`}>
                            {isTutorMatch && !isEntireRowProjected('Tutors') && (isColumnProjected('Tutors', 'max_capacity') || isColumnProjected('Tutors', 'capacity')) && (
                              <div className="absolute -inset-0.5 rounded-lg border-2 border-red-600 bg-red-500/15 pointer-events-none z-20 animate-red-circle shadow-sm" />
                            )}
                            <span className="relative z-10">{row.max_capacity}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </div>
          )}

          {/* BOTTOM ROW: Sessions Table (Central Relational Hub with Column Header Anchors) */}
          {hasSessions && (
            <div
              className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-md flex flex-col relative z-10 ${
              highlightClause === 'FROM'
                ? 'border-[#275D38] ring-4 ring-emerald-500/40 shadow-2xl bg-emerald-50/20'
                : activeSql?.includes('SELECT')
                ? 'border-cyan-500 ring-2 ring-cyan-400/30 shadow-lg bg-cyan-50/10'
                : 'border-slate-200'
            }`}
          >
            <div className="p-3 bg-[#275D38]/10 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#275D38]" />
                <h3 className="font-mono font-bold text-xs text-[#275D38]">Sessions</h3>
                <span className="text-[10px] text-slate-500 font-mono">({sessionsTable.rows.length} rows)</span>
                {highlightClause === 'FROM' && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#275D38] text-white animate-pulse">
                    FROM Driving Table Focus
                  </span>
                )}
                {activeSql?.includes('SELECT') && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-700 text-white shadow-sm flex items-center gap-1 animate-pulse">
                    <Sparkles className="w-3 h-3 text-cyan-200" /> SELECT * Target (Sessions)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[10px] font-mono">
                {/* M:M Junction Badge with Hover Tooltip */}
                <div className="group relative cursor-help">
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 font-bold flex items-center gap-1 shadow-xs transition hover:scale-105 hover:bg-purple-600 hover:text-white">
                    <Layers className="w-3 h-3 text-purple-600 group-hover:text-white" />
                    <span>M:M Junction</span>
                  </span>
                  <div className="absolute right-0 bottom-full mb-2 hidden group-hover:flex flex-col w-80 p-3.5 bg-slate-950/95 text-white rounded-2xl shadow-2xl z-50 text-xs font-sans border border-purple-500/40 pointer-events-none backdrop-blur animate-fadeIn">
                    <div className="font-bold text-purple-300 flex items-center justify-between pb-1.5 border-b border-slate-800">
                      <span className="flex items-center gap-1.5 font-bold">
                        <Layers className="w-3.5 h-3.5 text-purple-400" />
                        <span>M:M (Many-to-Many Junction Table)</span>
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-900/80 text-purple-200 border border-purple-700">
                        Associative Table
                      </span>
                    </div>
                    <p className="text-slate-200 mt-2 text-[11px] leading-relaxed">
                      <strong className="text-purple-400">Students</strong> and <strong className="text-purple-400">Tutors</strong> share a Many-to-Many relationship (many students can work with many tutors). In relational databases, this is resolved by using <code className="text-white bg-slate-800 px-1 py-0.5 rounded font-mono">Sessions</code> as an associative/junction table containing dual Foreign Keys (<code className="text-blue-300 font-mono">student_id</code> & <code className="text-blue-300 font-mono">tutor_id</code>).
                    </p>
                    <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
                      Bridges Students (M) ➔ Sessions ➔ Tutors (M)
                    </div>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 font-semibold">
                  <Key className="w-3 h-3 text-amber-600" /> PK: session_id
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1 font-semibold">
                  <Link className="w-3 h-3" /> FK: student_id, tutor_id
                </span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[11px] sticky top-0 bg-slate-100 z-10">
                    <th className="p-2 w-8 text-center text-slate-400">#</th>
                    <th className="p-2 w-16 text-center text-slate-400">Lock</th>
                    <th className={`p-2 ${isColumnProjected('Sessions', 'session_id') ? 'bg-cyan-100/80 text-cyan-950 font-bold border-b-2 border-cyan-500' : 'text-amber-700'}`}>session_id (PK)</th>
                    {/* DIRECT COLUMN HEADER ANCHOR: Sessions.student_id FK */}
                    <th
                      id="anchor-fk-student-header"
                      className={`p-2 font-bold border-b-2 ${
                        isColumnProjected('Sessions', 'student_id')
                          ? 'text-cyan-950 bg-cyan-100/80 border-cyan-500'
                          : 'text-blue-800 bg-blue-100/70 border-blue-400'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <Link className="w-3 h-3 text-blue-600" />
                        <span>student_id (FK 🔑)</span>
                      </div>
                    </th>
                    {/* DIRECT COLUMN HEADER ANCHOR: Sessions.tutor_id FK */}
                    <th
                      id="anchor-fk-tutor-header"
                      className={`p-2 font-bold border-b-2 ${
                        isColumnProjected('Sessions', 'tutor_id')
                          ? 'text-cyan-950 bg-cyan-100/80 border-cyan-500'
                          : 'text-blue-800 bg-blue-100/70 border-blue-400'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <Link className="w-3 h-3 text-blue-600" />
                        <span>tutor_id (FK 🔑)</span>
                      </div>
                    </th>
                    <th className={`p-2 ${isColumnProjected('Sessions', 'session_date') ? 'bg-cyan-100/80 text-cyan-950 font-bold border-b-2 border-cyan-500' : ''}`}>session_date</th>
                    <th className={`p-2 ${isColumnProjected('Sessions', 'status') ? 'bg-cyan-100/80 text-cyan-950 font-bold border-b-2 border-cyan-500' : ''}`}>status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                  {sessionsTable.rows.map((row, idx) => {
                    const lock = getRowLock('Sessions', row.session_id);
                    const isScanningThisRow =
                      currentStep?.targetTable === 'Sessions' &&
                      currentStep?.targetRowIndex === idx;
                    const predicatePass = currentStep?.predicateEvaluation?.passed;

                    const isGrabbingKeyFromThisRow =
                      keyToken &&
                      keyToken.sourceTable === 'Sessions' &&
                      currentStep?.targetRowIndex === idx;

                    const isNewlyAdded =
                      currentStep?.targetTable === 'Sessions' &&
                      currentStep?.targetRowId === row.session_id;

                    const persistentStatus = currentStep?.evaluatedRowStatuses?.find(
                      (es) => (es.table === undefined || es.table === 'Sessions') && (String(es.rowId) === String(row.session_id) || es.rowIndex === idx)
                    )?.status;

                    const isWhereMatch = persistentStatus === 'MATCH' || (isScanningThisRow && predicatePass === true);
                    const isWhereFailed = persistentStatus === 'FILTERED' || (isScanningThisRow && predicatePass === false);

                    return (
                      <tr
                        key={row.session_id}
                        className={`relative transition-all duration-300 ${
                          isWhereMatch || isGrabbingKeyFromThisRow
                            ? 'bg-red-50/40 text-slate-900 font-bold'
                            : isWhereFailed
                            ? 'bg-rose-50/80 text-slate-400 opacity-60'
                            : lock
                            ? 'bg-rose-50 text-rose-900'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* 1. BOLD RED STRIKE-THROUGH LINE ON WHERE FAILURE (PERSISTS UNTIL COMPLETION) */}
                        {isWhereFailed && (
                          <div className="absolute inset-y-1/2 left-2 right-2 h-1 bg-red-600 shadow-md rounded-full pointer-events-none z-30 animate-strike-through" />
                        )}

                        {/* 2. CLEAN BOLD RED CIRCLE / RING ON WHERE MATCH (FULL ROW IF SELECT *) */}
                        {(isWhereMatch || isGrabbingKeyFromThisRow) && isEntireRowProjected('Sessions') && (
                          <div className="absolute -inset-1 rounded-2xl border-3 border-red-600 bg-red-500/10 pointer-events-none z-20 animate-red-circle shadow-lg" />
                        )}

                        <td className="p-2 text-center text-[10px] text-slate-400 bg-slate-50">{idx}</td>
                        <td className="p-2 text-center">
                          {isGrabbingKeyFromThisRow ? (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-400 text-[9px] font-extrabold animate-pulse">
                              <Key className="w-3 h-3" />
                              <span>FK Key</span>
                            </div>
                          ) : isWhereMatch ? (
                            <span className="text-red-600 font-extrabold flex items-center justify-center gap-0.5 text-[10px] bg-red-100 border border-red-300 px-1.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5" /> MATCH
                            </span>
                          ) : isWhereFailed ? (
                            <span className="text-rose-700 font-extrabold flex items-center justify-center gap-0.5 text-[10px] bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded-full">
                              <XCircle className="w-3.5 h-3.5" /> FILTER
                            </span>
                          ) : lock ? (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300 text-[9px] font-bold animate-lock-pulse">
                              <Lock className="w-3 h-3" />
                              <span>PADLOCK</span>
                            </div>
                          ) : (
                            <Unlock className="w-3 h-3 text-emerald-600/40 inline" />
                          )}
                        </td>
                        <td className={`p-2 font-bold relative ${isWhereMatch && isColumnProjected('Sessions', 'session_id') ? 'text-red-950 bg-red-50/60' : 'text-amber-700'}`}>
                          {isWhereMatch && !isEntireRowProjected('Sessions') && isColumnProjected('Sessions', 'session_id') && (
                            <div className="absolute -inset-0.5 rounded-lg border-2 border-red-600 bg-red-500/15 pointer-events-none z-20 animate-red-circle shadow-sm" />
                          )}
                          <span className="relative z-10">
                            <TypingCell text={row.session_id} isTyping={isNewlyAdded && (currentStep?.type === 'STEP_SNAP_PAYLOAD' || currentStep?.type === 'STEP_DISPATCH_FROM_QUEUE')} prefix="#" />
                          </span>
                        </td>
                        <td className={`p-2 font-medium relative ${isWhereMatch && isColumnProjected('Sessions', 'student_id') ? 'text-red-950 bg-red-50/60' : 'text-blue-700 bg-blue-50/20'}`}>
                          {isWhereMatch && !isEntireRowProjected('Sessions') && isColumnProjected('Sessions', 'student_id') && (
                            <div className="absolute -inset-0.5 rounded-lg border-2 border-red-600 bg-red-500/15 pointer-events-none z-20 animate-red-circle shadow-sm" />
                          )}
                          <div className="flex items-center gap-1 relative z-10">
                            <Link className="w-3 h-3 text-blue-600" />
                            <TypingCell text={row.student_id} isTyping={isNewlyAdded && (currentStep?.type === 'STEP_SNAP_PAYLOAD' || currentStep?.type === 'STEP_DISPATCH_FROM_QUEUE')} prefix="#" />
                          </div>
                        </td>
                        <td className={`p-2 font-medium relative ${isWhereMatch && isColumnProjected('Sessions', 'tutor_id') ? 'text-red-950 bg-red-50/60' : 'text-blue-700 bg-blue-50/20'}`}>
                          {isWhereMatch && !isEntireRowProjected('Sessions') && isColumnProjected('Sessions', 'tutor_id') && (
                            <div className="absolute -inset-0.5 rounded-lg border-2 border-red-600 bg-red-500/15 pointer-events-none z-20 animate-red-circle shadow-sm" />
                          )}
                          <span className="flex items-center gap-1 relative z-10">
                            <Link className="w-3 h-3 text-blue-600" />
                            <TypingCell text={row.tutor_id} isTyping={isNewlyAdded && (currentStep?.type === 'STEP_SNAP_PAYLOAD' || currentStep?.type === 'STEP_DISPATCH_FROM_QUEUE')} prefix="#" />
                          </span>
                        </td>
                        <td className={`p-2 relative ${isWhereMatch && isColumnProjected('Sessions', 'session_date') ? 'text-red-950 font-bold bg-red-50/60' : 'text-slate-500'}`}>
                          {isWhereMatch && !isEntireRowProjected('Sessions') && isColumnProjected('Sessions', 'session_date') && (
                            <div className="absolute -inset-0.5 rounded-lg border-2 border-red-600 bg-red-500/15 pointer-events-none z-20 animate-red-circle shadow-sm" />
                          )}
                          <span className="relative z-10">
                            <TypingCell text={row.session_date} isTyping={isNewlyAdded && (currentStep?.type === 'STEP_SNAP_PAYLOAD' || currentStep?.type === 'STEP_DISPATCH_FROM_QUEUE')} />
                          </span>
                        </td>
                        <td className={`p-2 relative ${isWhereMatch && isColumnProjected('Sessions', 'status') ? 'bg-red-50/60' : ''}`}>
                          {isWhereMatch && !isEntireRowProjected('Sessions') && isColumnProjected('Sessions', 'status') && (
                            <div className="absolute -inset-0.5 rounded-lg border-2 border-red-600 bg-red-500/15 pointer-events-none z-20 animate-red-circle shadow-sm" />
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold relative z-10 ${
                              row.status === 'Confirmed'
                                ? 'bg-emerald-100 text-[#275D38] border border-emerald-300'
                                : row.status === 'Completed'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            <TypingCell text={row.status} isTyping={isNewlyAdded && (currentStep?.type === 'STEP_SNAP_PAYLOAD' || currentStep?.type === 'STEP_DISPATCH_FROM_QUEUE')} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Physical Highlighted Empty Ghost Slot at Bottom of Sessions with Character Typing Effect */}
                  {ghostSlot && ghostSlot.table === 'Sessions' && (
                    <tr
                      ref={sessionsBottomRef}
                      className="bg-emerald-50 border-2 border-dashed border-[#275D38] animate-pulse text-[#275D38] font-bold"
                    >
                      <td className="p-2 text-center text-[10px] bg-slate-100 font-mono">
                        {sessionsTable.rows.length}
                      </td>
                      <td className="p-2 text-center">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300 text-[9px]">
                          <Lock className="w-3 h-3" /> PADLOCK
                        </span>
                      </td>
                      <td className="p-2 text-amber-700">
                        <TypingCell text={ghostSlot.rowId} isTyping={true} prefix="#" />
                      </td>
                      <td className="p-2 text-blue-700 bg-blue-50/20">
                        <TypingCell text={ghostSlot.rowData.student_id} isTyping={true} prefix="#" />
                      </td>
                      <td className="p-2 text-blue-700 bg-blue-50/20">
                        <TypingCell text={ghostSlot.rowData.tutor_id} isTyping={true} prefix="#" />
                      </td>
                      <td className="p-2 text-slate-600">
                        <TypingCell text={ghostSlot.rowData.session_date} isTyping={true} />
                      </td>
                      <td className="p-2 text-[#275D38] font-semibold">
                        <TypingCell text={`${ghostSlot.rowData.status} (Snapping...)`} isTyping={true} />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* DYNAMIC CUSTOM CONSTRUCTED DATABASE TABLES (from DDL Builder) */}
          {Object.keys(databaseState)
            .filter((k) => !['Students', 'Tutors', 'Sessions'].includes(k))
            .map((tableName) => {
              const table = databaseState[tableName];
              if (!table) return null;
              const isTarget = currentStep?.targetTable === tableName || activeSql?.toLowerCase().includes(tableName.toLowerCase());
              return (
                <div
                  key={tableName}
                  className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-md flex flex-col relative z-10 ${
                    isTarget ? 'border-[#275D38] ring-4 ring-emerald-500/40 shadow-2xl bg-emerald-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="p-3 bg-[#275D38]/10 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#275D38]" />
                      <h3 className="font-mono font-bold text-xs text-[#275D38]">{tableName}</h3>
                      <span className="text-[10px] text-slate-500 font-mono">({table.rows.length} rows)</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-[#275D38] font-bold border border-emerald-300">
                        Custom Built Table
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 font-semibold">
                        <Key className="w-3 h-3 text-amber-600" /> PK: {table.schema.primaryKey}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[11px] sticky top-0 bg-slate-100 z-10">
                          <th className="p-2 w-8 text-center text-slate-400">#</th>
                          <th className="p-2 w-16 text-center text-slate-400">Lock</th>
                          {table.schema.columns.map((col) => (
                            <th
                              key={col.name}
                              className={`p-2 ${
                                col.isPrimaryKey
                                  ? 'text-amber-800 bg-amber-100/70 border-b-2 border-amber-400 font-bold'
                                  : col.isForeignKey
                                  ? 'text-blue-800 bg-blue-100/70 border-b-2 border-blue-400 font-bold'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center gap-1">
                                {col.isPrimaryKey && <Key className="w-3 h-3 text-amber-600" />}
                                {col.isForeignKey && <Link className="w-3 h-3 text-blue-600" />}
                                <span>{col.name} {col.isPrimaryKey ? '(PK)' : col.isForeignKey ? `(FK ${col.foreignKeyCardinality || '1:M'})` : `(${col.type})`}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                        {table.rows.length === 0 ? (
                          <tr>
                            <td colSpan={table.schema.columns.length + 2} className="p-3 text-center text-slate-400 italic text-[10px]">
                              Table created! Ready to receive tuples.
                            </td>
                          </tr>
                        ) : (
                          table.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50 transition">
                              <td className="p-2 text-center text-[10px] text-slate-400 bg-slate-50">{rIdx + 1}</td>
                              <td className="p-2 text-center">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px]">
                                  <Lock className="w-2.5 h-2.5 opacity-40" /> FREE
                                </span>
                              </td>
                              {table.schema.columns.map((col) => (
                                <td key={col.name} className="p-2 font-mono">
                                  {String(row[col.name] !== undefined ? row[col.name] : '')}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

          {/* PHYSICAL QUERY RESULTS TRAY AT BOTTOM OF STAGE */}
          <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-[#275D38]/50 p-4 flex flex-col gap-2.5 shadow-md relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#275D38]/10 text-[#275D38]">
                  <Table className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <span>Query Results Tray</span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-[#275D38] text-white font-bold">
                      {extractedTrayRows.length} rows populated
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Populates incrementally after every matched and joined row in real time
                  </p>
                </div>
              </div>
            </div>

            {/* Extracted Rows Table */}
            {extractedTrayRows.length === 0 ? (
              <div className="text-center text-slate-500 py-4 text-xs font-mono italic">
                Results Tray Empty — Execute a SQL Query to watch Foreign Key tokens unlock parent records and populate rows step-by-step
              </div>
            ) : (
              <div className="overflow-x-auto max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-[11px] font-mono border-collapse">
                  <thead>
                    <tr className={`border-b ${activeSql?.includes('SELECT') ? 'bg-cyan-100/70 text-cyan-950 border-cyan-400' : 'bg-slate-100 text-[#275D38] border-slate-200'}`}>
                      <th className="p-1.5 w-8 text-center text-slate-400">#</th>
                      {Object.keys(extractedTrayRows[0]).map((col) => (
                        <th key={col} className={`p-1.5 px-2.5 font-bold whitespace-nowrap ${activeSql?.includes('SELECT') ? 'bg-cyan-100/90 text-cyan-950 border-b-2 border-cyan-500' : ''}`}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {extractedTrayRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-emerald-50/50 transition animate-fadeIn">
                        <td className="p-1.5 text-center text-[10px] text-slate-400 bg-slate-50">
                          {idx + 1}
                        </td>
                        {Object.keys(extractedTrayRows[0]).map((col) => (
                          <td key={col} className="p-1.5 px-2.5 whitespace-nowrap">
                            <TypingCell text={row[col]} isTyping={idx === extractedTrayRows.length - 1} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DYNAMIC SVG OVERLAY: DIRECT PK (Column Header) ➔ FK (Column Header) DOTTED CONNECTOR LINES */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-visible">
        <svg className="w-full h-full overflow-visible">
          <defs>
            <filter id="uvuGlowEffect" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Dotted Line: Students <th> (PK student_id) ➔ Sessions <th> (FK student_id) */}
          {anchorPkStudent && anchorFkStudent && (
            <g>
              <path
                d={`M ${anchorPkStudent.x} ${anchorPkStudent.y} C ${anchorPkStudent.x} ${anchorPkStudent.y + 60}, ${anchorFkStudent.x} ${anchorFkStudent.y - 60}, ${anchorFkStudent.x} ${anchorFkStudent.y}`}
                stroke="#275D38"
                strokeWidth={isTraversingStudentsToSessions ? '4' : '2.5'}
                strokeDasharray="6 4"
                fill="none"
                filter="url(#uvuGlowEffect)"
                className={isTraversingStudentsToSessions ? 'animate-pulse' : 'opacity-85'}
              />
              {/* Endpoint Circles directly at Column Headers */}
              <circle cx={anchorPkStudent.x} cy={anchorPkStudent.y} r="5" fill="#275D38" stroke="#ffffff" strokeWidth="2" />
              <circle cx={anchorFkStudent.x} cy={anchorFkStudent.y} r="5" fill="#275D38" stroke="#ffffff" strokeWidth="2" />
            </g>
          )}

          {/* 2. Dotted Line: Tutors <th> (PK tutor_id) ➔ Sessions <th> (FK tutor_id) */}
          {anchorPkTutor && anchorFkTutor && (
            <g>
              <path
                d={`M ${anchorPkTutor.x} ${anchorPkTutor.y} C ${anchorPkTutor.x} ${anchorPkTutor.y + 60}, ${anchorFkTutor.x} ${anchorFkTutor.y - 60}, ${anchorFkTutor.x} ${anchorFkTutor.y}`}
                stroke="#D4AF37"
                strokeWidth={isTraversingSessionsToTutors ? '4' : '2.5'}
                strokeDasharray="6 4"
                fill="none"
                filter="url(#uvuGlowEffect)"
                className={isTraversingSessionsToTutors ? 'animate-pulse' : 'opacity-90'}
              />
              {/* Endpoint Circles directly at Column Headers */}
              <circle cx={anchorPkTutor.x} cy={anchorPkTutor.y} r="5" fill="#D4AF37" stroke="#ffffff" strokeWidth="2" />
              <circle cx={anchorFkTutor.x} cy={anchorFkTutor.y} r="5" fill="#D4AF37" stroke="#ffffff" strokeWidth="2" />
            </g>
          )}
        </svg>

        {/* Interactive Labeled Cardinality Badges in center of paths */}
        {anchorPkStudent && anchorFkStudent && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-30"
            style={{
              left: `${(anchorPkStudent.x + anchorFkStudent.x) / 2}px`,
              top: `${(anchorPkStudent.y + anchorFkStudent.y) / 2}px`,
            }}
          >
            <div className="group relative cursor-help">
              <span
                className={`text-[10px] font-mono px-2.5 py-1 rounded-full border shadow-lg flex items-center gap-1.5 font-bold transition-all duration-200 hover:scale-110 ${
                  isTraversingStudentsToSessions
                    ? 'bg-[#275D38] text-white border-emerald-300 ring-4 ring-emerald-300/40 animate-pulse'
                    : 'bg-emerald-50 text-[#275D38] border-emerald-400 hover:bg-[#275D38] hover:text-white'
                }`}
              >
                <span className="px-1.5 py-0.2 rounded bg-emerald-200/80 text-[#275D38] font-bold text-[9px] group-hover:bg-white group-hover:text-[#275D38]">
                  1:M
                </span>
                <Link className="w-3 h-3" />
                <span>student_id ➔ student_id</span>
              </span>

              {/* Rich Tooltip Popover on Hover */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:flex flex-col w-80 p-3.5 bg-slate-950/95 text-white rounded-2xl shadow-2xl z-50 text-xs font-sans border border-emerald-500/40 pointer-events-none backdrop-blur animate-fadeIn">
                <div className="font-bold text-emerald-300 flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>1:M (One-to-Many Relationship)</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-900/80 text-emerald-200 border border-emerald-700">
                    Foreign Key
                  </span>
                </div>
                <p className="text-slate-200 mt-2 text-[11px] leading-relaxed">
                  <strong className="text-emerald-400">One Student</strong> in <code className="text-white bg-slate-800 px-1 py-0.5 rounded font-mono">Students</code> can book <strong className="text-emerald-400">Many Sessions</strong> in <code className="text-white bg-slate-800 px-1 py-0.5 rounded font-mono">Sessions</code>. Each session belongs to exactly one student.
                </p>
                <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                  <span>Parent PK: Students.student_id (1)</span>
                  <span>➔</span>
                  <span>Child FK: Sessions.student_id (M)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {anchorPkTutor && anchorFkTutor && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-30"
            style={{
              left: `${(anchorPkTutor.x + anchorFkTutor.x) / 2}px`,
              top: `${(anchorPkTutor.y + anchorFkTutor.y) / 2}px`,
            }}
          >
            <div className="group relative cursor-help">
              <span
                className={`text-[10px] font-mono px-2.5 py-1 rounded-full border shadow-lg flex items-center gap-1.5 font-bold transition-all duration-200 hover:scale-110 ${
                  isTraversingSessionsToTutors
                    ? 'bg-[#D4AF37] text-slate-950 border-yellow-400 ring-4 ring-yellow-300/40 animate-pulse'
                    : 'bg-amber-50 text-amber-900 border-amber-400 hover:bg-[#D4AF37] hover:text-slate-950'
                }`}
              >
                <span className="px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900 font-bold text-[9px] group-hover:bg-slate-900 group-hover:text-amber-300">
                  1:M
                </span>
                <Link className="w-3 h-3" />
                <span>tutor_id ➔ tutor_id</span>
              </span>

              {/* Rich Tooltip Popover on Hover */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:flex flex-col w-80 p-3.5 bg-slate-950/95 text-white rounded-2xl shadow-2xl z-50 text-xs font-sans border border-yellow-500/40 pointer-events-none backdrop-blur animate-fadeIn">
                <div className="font-bold text-yellow-300 flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>1:M (One-to-Many Relationship)</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-yellow-900/80 text-yellow-200 border border-yellow-700">
                    Foreign Key
                  </span>
                </div>
                <p className="text-slate-200 mt-2 text-[11px] leading-relaxed">
                  <strong className="text-yellow-400">One Tutor</strong> in <code className="text-white bg-slate-800 px-1 py-0.5 rounded font-mono">Tutors</code> can conduct <strong className="text-yellow-400">Many Sessions</strong> in <code className="text-white bg-slate-800 px-1 py-0.5 rounded font-mono">Sessions</code>. Each session is assigned to exactly one tutor.
                </p>
                <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                  <span>Parent PK: Tutors.tutor_id (1)</span>
                  <span>➔</span>
                  <span>Child FK: Sessions.tutor_id (M)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2D Animated Worker Robots Layer with Dynamic Unclipped Speech Bubbles */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-visible">
        {workerRobots.map((robot) => {
          const isBlocked = robot.status === 'LOCKED_BLOCKED';
          const isHoldingCard = !!robot.carryingCard;
          const isHoldingKey = robot.status === 'HOLDING_KEY' || robot.status === 'UNLOCKING_PK';
          const isSnapping = robot.status === 'SNAPPING_ROW';
          const isSuccess = robot.status === 'SUCCESS';

          // Safe clamping for speech bubble positioning so it is NEVER clipped
          const isNearLeft = robot.x <= 28;
          const isNearRight = robot.x >= 72;

          const bubbleAlignStyle = isNearLeft
            ? { left: '0%', transform: 'none' }
            : isNearRight
            ? { right: '0%', transform: 'none' }
            : { left: '50%', transform: 'translateX(-50%)' };

          const pointerAlignStyle = isNearLeft
            ? { left: '20px' }
            : isNearRight
            ? { right: '20px' }
            : { left: '50%', transform: 'translateX(-50%)' };

          return (
            <div
              key={robot.id}
              className="absolute transition-all duration-700 ease-out flex flex-col items-center pointer-events-auto"
              style={{ left: `${robot.x}%`, top: `${robot.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              {/* UNCLIPPED DYNAMIC SPEECH BUBBLE ANCHORED OVER ROBOT */}
              {robot.speech && (
                <div
                  className="relative mb-2 w-max max-w-[320px] sm:max-w-[360px] z-40 animate-bounce-subtle"
                  style={bubbleAlignStyle}
                >
                  <div className="bg-slate-900 border-2 border-[#275D38] text-white p-2.5 px-3.5 rounded-2xl shadow-2xl flex items-start gap-2 text-xs font-sans font-semibold leading-snug backdrop-blur break-words">
                    {isBlocked && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-spin" />}
                    {isHoldingKey && <Key className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5 animate-bounce" />}
                    {isSnapping && <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                    {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                    {!isBlocked && !isHoldingKey && !isSnapping && !isSuccess && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                    )}
                    <span className="text-slate-100">{robot.speech}</span>
                  </div>
                  {/* Speech Bubble Pointer Triangle */}
                  <div
                    className="w-3 h-3 bg-slate-900 border-r-2 border-b-2 border-[#275D38] rotate-45 absolute -bottom-1.5"
                    style={pointerAlignStyle}
                  />
                </div>
              )}

              {/* TANGIBLE FOREIGN KEY TOKEN IN HANDS */}
              {isHoldingKey && robot.carryingKeyToken && (
                <div className="mb-2 p-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 border-2 border-yellow-200 text-slate-950 shadow-2xl flex items-center gap-2 text-xs font-mono font-extrabold animate-bounce">
                  <Key className="w-4 h-4 text-slate-950 fill-current" />
                  <span>
                    🔑 FK Key: {robot.carryingKeyToken.keyName} = #{robot.carryingKeyToken.keyValue}
                  </span>
                </div>
              )}

              {/* Physical Payload Data Card in Hands */}
              {isHoldingCard && !isHoldingKey && (
                <div className="mb-1.5 p-2 px-3 rounded-xl bg-gradient-to-r from-[#275D38] to-[#1b4327] border-2 border-emerald-400 text-white shadow-2xl flex flex-col gap-0.5 text-[10px] font-mono animate-pulse">
                  <div className="flex items-center gap-1 font-bold text-emerald-200">
                    <FileText className="w-3 h-3 text-emerald-300" />
                    <span>Payload: {robot.carryingCard?.title}</span>
                  </div>
                </div>
              )}

              {/* 2D SVG Robot Body (UVU Emerald Green & Gold) */}
              <div className="relative">
                {isBlocked && (
                  <div className="absolute -inset-2.5 rounded-full border-2 border-dashed border-amber-500 animate-spin" />
                )}
                {isHoldingKey && (
                  <div className="absolute -inset-2.5 rounded-full bg-yellow-400/30 animate-pulse" />
                )}
                {isSnapping && (
                  <div className="absolute -inset-2.5 rounded-full bg-emerald-500/30 animate-ping" />
                )}

                <svg width="46" height="54" viewBox="0 0 48 56" fill="none" className="filter drop-shadow-md">
                  <line x1="24" y1="12" x2="24" y2="2" stroke="#64748b" strokeWidth="2" />
                  <circle cx="24" cy="2" r="3" fill={isBlocked ? '#f59e0b' : isHoldingKey ? '#d97706' : '#275D38'} />
                  <rect x="8" y="10" width="32" height="22" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="2" />
                  <rect x="12" y="14" width="24" height="12" rx="3" fill="#1e293b" />
                  {isBlocked ? (
                    <>
                      <circle cx="18" cy="20" r="2.5" fill="#f59e0b" />
                      <circle cx="30" cy="20" r="2.5" fill="#f59e0b" />
                    </>
                  ) : (
                    <>
                      <circle cx="18" cy="20" r="2.5" fill="#38bdf8" />
                      <circle cx="30" cy="20" r="2.5" fill="#38bdf8" />
                    </>
                  )}
                  {/* Robot Body (UVU Green) */}
                  <rect x="10" y="34" width="28" height="18" rx="4" fill="#275D38" />
                  <circle cx="24" cy="43" r="3" fill="#D4AF37" />
                  <ellipse cx="24" cy="53" rx="8" ry="3" fill="#334155" />
                </svg>

                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow text-white bg-[#275D38]">
                    {robot.name}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
