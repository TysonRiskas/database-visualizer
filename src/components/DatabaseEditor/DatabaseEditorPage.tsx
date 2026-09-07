import React, { useState, useMemo } from 'react';
import {
  Database,
  Sparkles,
  BookOpen,
  Layers,
  Key,
  Link,
  Table,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Bot,
  ArrowRight,
  Info,
  Compass,
  Code2,
  Check,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Lightbulb,
  PlusCircle,
  Edit3,
  Trash2,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { DatabaseState, RowData, SimulationStep } from '../../types/database';
import { StageCanvas } from '../EngineRoom/StageCanvas';
import { PlaybackController } from '../PlaybackController';

interface DatabaseEditorPageProps {
  databaseState: DatabaseState;
  onRunDml: (dmlScript: string) => void;
  isSimulating: boolean;
  activeLocks: any[];
  currentStep?: SimulationStep;
  workerRobots: any[];
  extractedTrayRows: RowData[];
  speed: number;
  setSpeed: (s: number) => void;
  isPlaying: boolean;
  onTogglePlayPause: () => void;
  onNextStep: () => void;
  onResetSimulation: () => void;
  onResetDatabase: () => void;
  currentStepIndex: number;
  totalStepsCount: number;
  onOpenHelp: () => void;
}

interface DynamicChecklist {
  id: string;
  label: string;
  passed: boolean;
}

interface TutorialStep {
  stepNumber: number;
  title: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'COMPOUND' | 'FREEFORM';
  badge: string;
  badgeColor: string;
  conceptTitle: string;
  conceptDescription: string;
  flexibilityNote: string;
  anatomyGuide: {
    line: string;
    explanation: string;
  }[];
  hintLevel1: string;
  hintLevel2: string;
  defaultButtonLabel: string;
}

const DML_TUTORIAL_STEPS: TutorialStep[] = [
  {
    stepNumber: 1,
    title: 'Adding Records (INSERT INTO)',
    operation: 'INSERT',
    badge: 'Step 1: Adding Data',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    conceptTitle: 'Tuple Insertion & Primary Key Uniqueness',
    conceptDescription:
      'The INSERT statement creates new records in a table. In relational databases, the engine first acquires an Exclusive Lock, verifies that the Primary Key is unique, writes a log record to the Write-Ahead Log (WAL), and materializes the row in an in-memory data page.',
    flexibilityNote:
      'You can insert any student name and major! Make sure to provide a new unique student_id (e.g. 6 or higher).',
    anatomyGuide: [
      {
        line: 'INSERT INTO Students',
        explanation: 'Declares the target table where the new record will be stored.',
      },
      {
        line: '(student_id, first_name, last_name, major)',
        explanation: 'Column list matching the schema attributes in order.',
      },
      {
        line: "VALUES (6, 'Samantha', 'Miller', 'Web Development');",
        explanation: 'The literal values to store. Numbers are unquoted; text values are enclosed in single quotes.',
      },
    ],
    hintLevel1: "Use: INSERT INTO Students (student_id, first_name, last_name, major) VALUES (6, 'Samantha', 'Miller', 'Web Development');",
    hintLevel2: "INSERT INTO Students (student_id, first_name, last_name, major) VALUES (6, 'Samantha', 'Miller', 'Web Development');",
    defaultButtonLabel: 'Execute INSERT Statement',
  },
  {
    stepNumber: 2,
    title: 'Editing Records (UPDATE ... SET ... WHERE)',
    operation: 'UPDATE',
    badge: 'Step 2: Modifying Data',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    conceptTitle: 'Predicate Filtering & In-Place Mutation',
    conceptDescription:
      'The UPDATE statement modifies existing data. The engine performs a sequential scan evaluating the WHERE predicate. When a row matches, it acquires an Exclusive (X) Padlock, records both before-image and after-image in the WAL buffer, and overwrites attributes in-place.',
    flexibilityNote:
      "You can change any student's major (e.g. 'Software Engineering', 'Data Science', 'Cybersecurity') using their student_id.",
    anatomyGuide: [
      {
        line: 'UPDATE Students',
        explanation: 'Specifies which table contains the records to be altered.',
      },
      {
        line: "SET major = 'Software Engineering'",
        explanation: 'Assigns the new value to the specified column.',
      },
      {
        line: 'WHERE student_id = 1;',
        explanation: 'Crucial filter! Targets only the exact row matching this condition.',
      },
    ],
    hintLevel1: "Use: UPDATE Students SET major = 'Software Engineering' WHERE student_id = 1;",
    hintLevel2: "UPDATE Students SET major = 'Software Engineering' WHERE student_id = 1;",
    defaultButtonLabel: 'Execute UPDATE Statement',
  },
  {
    stepNumber: 3,
    title: 'Deleting Records (DELETE FROM ... WHERE)',
    operation: 'DELETE',
    badge: 'Step 3: Removing Data',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    conceptTitle: 'Referential Integrity & Tombstone Logging',
    conceptDescription:
      'The DELETE statement removes records. The engine checks Foreign Key constraints to guarantee that no active records in child tables reference this key. It then writes a deletion tombstone record to WAL and reclaims the row slot.',
    flexibilityNote:
      'Delete session #1004 from the Sessions table. Observe how the engine targets only that row and keeps others safe.',
    anatomyGuide: [
      {
        line: 'DELETE FROM Sessions',
        explanation: 'Declares which table rows will be removed from.',
      },
      {
        line: 'WHERE session_id = 1004;',
        explanation: 'Specifies the exact record to delete. Without WHERE, ALL rows in the table would be deleted!',
      },
    ],
    hintLevel1: 'Use: DELETE FROM Sessions WHERE session_id = 1004;',
    hintLevel2: 'DELETE FROM Sessions WHERE session_id = 1004;',
    defaultButtonLabel: 'Execute DELETE Statement',
  },
  {
    stepNumber: 4,
    title: 'Compound WHERE Filtering Safety',
    operation: 'COMPOUND',
    badge: 'Step 4: Safety Filters',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    conceptTitle: 'Compound Predicates (AND) & Preventing Unintended Updates',
    conceptDescription:
      'In production databases, accidental mass updates are a major hazard. Using multiple conditions with AND allows precise row targeting across multiple attributes.',
    flexibilityNote:
      "Update Sessions to mark all 'Confirmed' appointments for Tutor #101 as 'Completed'.",
    anatomyGuide: [
      {
        line: 'UPDATE Sessions',
        explanation: 'Targets the tutoring sessions table.',
      },
      {
        line: "SET status = 'Completed'",
        explanation: 'Sets the status attribute to Completed.',
      },
      {
        line: "WHERE tutor_id = 101 AND status = 'Confirmed';",
        explanation: 'Compound filter: both conditions must evaluate to TRUE for a row to be updated.',
      },
    ],
    hintLevel1: "Use: UPDATE Sessions SET status = 'Completed' WHERE tutor_id = 101 AND status = 'Confirmed';",
    hintLevel2: "UPDATE Sessions SET status = 'Completed' WHERE tutor_id = 101 AND status = 'Confirmed';",
    defaultButtonLabel: 'Execute Compound UPDATE',
  },
  {
    stepNumber: 5,
    title: 'Free-Form DML Studio',
    operation: 'FREEFORM',
    badge: 'Step 5: Master Challenge',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    conceptTitle: 'Full Data Manipulation Freedom',
    conceptDescription:
      'You are now ready to manipulate any table! Write custom INSERT, UPDATE, or DELETE statements, or switch to the Interactive Visual Form Editor tab to click and add/edit rows with automatic SQL generation.',
    flexibilityNote:
      'Try inserting a new Tutor, updating an appointment date, or deleting a cancelled booking.',
    anatomyGuide: [
      {
        line: 'INSERT INTO Tutors VALUES (104, "Dr. Grace Hopper", "CompSci", "grace@uvu.edu");',
        explanation: 'Insert a new tutor into the faculty roster.',
      },
      {
        line: 'UPDATE Sessions SET session_date = "2026-09-02 10:00" WHERE session_id = 1001;',
        explanation: 'Reschedule a tutoring session.',
      },
    ],
    hintLevel1: 'Try inserting into Tutors, Students, or Sessions, or run any custom DML.',
    hintLevel2: "INSERT INTO Tutors VALUES (104, 'Dr. Grace Hopper', 'Systems', 'grace@uvu.edu');",
    defaultButtonLabel: 'Execute Custom DML',
  },
];

const getDmlStepChecklist = (
  stepNumber: number,
  sql: string
): { items: DynamicChecklist[]; error?: string } => {
  const trimmed = sql.trim();

  if (stepNumber === 1) {
    const hasInsert = /INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i.test(trimmed);
    const hasValues = /VALUES\s*\(/i.test(trimmed);
    const hasStudents = /Students/i.test(trimmed);

    const items: DynamicChecklist[] = [
      { id: 'c1', label: 'Use INSERT INTO statement', passed: hasInsert },
      { id: 'c2', label: "Target table 'Students'", passed: hasStudents },
      { id: 'c3', label: 'Include VALUES (...) payload', passed: hasValues },
      { id: 'c4', label: 'Valid SQL syntax ending', passed: trimmed.endsWith(';') || trimmed.endsWith(')') },
    ];
    return { items };
  }

  if (stepNumber === 2) {
    const hasUpdate = /UPDATE\s+([a-zA-Z0-9_]+)/i.test(trimmed);
    const hasSet = /SET\s+/i.test(trimmed);
    const hasWhere = /WHERE\s+/i.test(trimmed);
    const hasStudents = /Students/i.test(trimmed);

    const items: DynamicChecklist[] = [
      { id: 'c1', label: 'Use UPDATE statement', passed: hasUpdate },
      { id: 'c2', label: "Target table 'Students'", passed: hasStudents },
      { id: 'c3', label: 'Specify column assignment with SET', passed: hasSet },
      { id: 'c4', label: 'Filter exact record with WHERE', passed: hasWhere },
    ];
    return { items };
  }

  if (stepNumber === 3) {
    const hasDelete = /DELETE\s+FROM\s+([a-zA-Z0-9_]+)/i.test(trimmed);
    const hasWhere = /WHERE\s+/i.test(trimmed);
    const hasSessions = /Sessions/i.test(trimmed);

    const items: DynamicChecklist[] = [
      { id: 'c1', label: 'Use DELETE FROM statement', passed: hasDelete },
      { id: 'c2', label: "Target table 'Sessions'", passed: hasSessions },
      { id: 'c3', label: 'Filter specific row with WHERE', passed: hasWhere },
      { id: 'c4', label: 'Valid SQL syntax ending', passed: trimmed.endsWith(';') || !trimmed.endsWith('WHERE') },
    ];
    return { items };
  }

  if (stepNumber === 4) {
    const hasUpdate = /UPDATE\s+Sessions/i.test(trimmed);
    const hasSet = /SET\s+/i.test(trimmed);
    const hasAnd = /WHERE\s+.+\s+AND\s+/i.test(trimmed);

    const items: DynamicChecklist[] = [
      { id: 'c1', label: 'Use UPDATE Sessions', passed: hasUpdate },
      { id: 'c2', label: 'Include SET assignment', passed: hasSet },
      { id: 'c3', label: 'Include compound filter using AND', passed: hasAnd },
    ];
    return { items };
  }

  // Step 5
  const isDml = /^(INSERT|UPDATE|DELETE|SELECT)\s+/i.test(trimmed);
  return {
    items: [
      { id: 'c1', label: 'Valid SQL statement (INSERT, UPDATE, DELETE, or SELECT)', passed: isDml },
    ],
  };
};

export const DatabaseEditorPage: React.FC<DatabaseEditorPageProps> = ({
  databaseState,
  onRunDml,
  isSimulating,
  activeLocks,
  currentStep,
  workerRobots,
  extractedTrayRows,
  speed,
  setSpeed,
  isPlaying,
  onTogglePlayPause,
  onNextStep,
  onResetSimulation,
  onResetDatabase,
  currentStepIndex,
  totalStepsCount,
  onOpenHelp,
}) => {
  // Mode: Guided Walkthrough Tutorial vs Interactive Visual Form vs Free SQL Console
  const [editorMode, setEditorMode] = useState<'tutorial' | 'form' | 'sql'>('tutorial');

  // Tutorial state
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [dmlCode, setDmlCode] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Visual Form Editor State
  const tableNames = Object.keys(databaseState);
  const [selectedTable, setSelectedTable] = useState<string>(tableNames[0] || 'Students');
  const [formAction, setFormAction] = useState<'insert' | 'update' | 'delete'>('insert');
  const [formFieldValues, setFormFieldValues] = useState<Record<string, any>>({});
  const [selectedRowPk, setSelectedRowPk] = useState<any>('');

  const currentTutorial = DML_TUTORIAL_STEPS[activeStepIndex] || DML_TUTORIAL_STEPS[0];
  const checklist = useMemo(
    () => getDmlStepChecklist(currentTutorial.stepNumber, dmlCode),
    [currentTutorial.stepNumber, dmlCode]
  );

  const activeTableState = databaseState[selectedTable];
  const tableColumns = activeTableState?.schema.columns || [];
  const tablePkName = activeTableState?.schema.primaryKey;
  const tableRows = activeTableState?.rows || [];

  // Auto-generate SQL from Form Editor
  const generatedFormSql = useMemo(() => {
    if (!activeTableState || !selectedTable) return '';

    if (formAction === 'insert') {
      const cols: string[] = [];
      const vals: string[] = [];
      tableColumns.forEach((col) => {
        const val = formFieldValues[col.name];
        if (val !== undefined && val !== '') {
          cols.push(col.name);
          vals.push(typeof val === 'number' || !isNaN(Number(val)) ? String(val) : `'${val}'`);
        }
      });
      if (cols.length === 0) return `-- Fill in fields above to generate INSERT statement...`;
      return `INSERT INTO ${selectedTable} (${cols.join(', ')})\nVALUES (${vals.join(', ')});`;
    }

    if (formAction === 'update') {
      if (!selectedRowPk) return `-- Select a record to update above...`;
      const sets: string[] = [];
      tableColumns.forEach((col) => {
        if (col.name === tablePkName) return; // Don't change PK
        const val = formFieldValues[col.name];
        if (val !== undefined && val !== '') {
          const valStr = typeof val === 'number' || !isNaN(Number(val)) ? String(val) : `'${val}'`;
          sets.push(`${col.name} = ${valStr}`);
        }
      });
      if (sets.length === 0) return `-- Modify at least one attribute above to generate UPDATE statement...`;
      return `UPDATE ${selectedTable}\nSET ${sets.join(', ')}\nWHERE ${tablePkName} = ${selectedRowPk};`;
    }

    if (formAction === 'delete') {
      if (!selectedRowPk) return `-- Select a record to delete above...`;
      return `DELETE FROM ${selectedTable}\nWHERE ${tablePkName} = ${selectedRowPk};`;
    }

    return '';
  }, [formAction, selectedTable, activeTableState, formFieldValues, selectedRowPk, tableColumns, tablePkName]);

  const handleExecuteTutorialStep = () => {
    const trimmed = dmlCode.trim();
    if (!trimmed) {
      setValidationError('Please type your SQL DML statement before executing.');
      return;
    }

    const check = getDmlStepChecklist(currentTutorial.stepNumber, trimmed);
    const failed = check.items.filter((i) => !i.passed);
    if (failed.length > 0 && currentTutorial.stepNumber <= 4) {
      setValidationError(`Missing requirement: "${failed[0].label}". Review the guided syntax reference above.`);
      return;
    }

    setValidationError(null);
    onRunDml(trimmed);

    if (!completedSteps.includes(currentTutorial.stepNumber)) {
      setCompletedSteps((prev) => [...prev, currentTutorial.stepNumber]);
    }
  };

  const handleExecuteFormMutation = () => {
    if (!generatedFormSql || generatedFormSql.startsWith('--')) {
      setValidationError('Please complete the form fields to generate a valid SQL mutation.');
      return;
    }
    setValidationError(null);
    onRunDml(generatedFormSql);
  };

  const handleSelectRowForForm = (row: RowData) => {
    if (!tablePkName) return;
    const pkVal = row[tablePkName];
    setSelectedRowPk(pkVal);
    const fields: Record<string, any> = {};
    tableColumns.forEach((c) => {
      fields[c.name] = row[c.name];
    });
    setFormFieldValues(fields);
  };

  return (
    <div className="flex flex-col gap-5 w-full animate-fadeIn">
      {/* 1. PLAYBACK CONTROLLER BAR */}
      <PlaybackController
        speed={speed}
        setSpeed={setSpeed}
        isPlaying={isPlaying}
        onTogglePlayPause={onTogglePlayPause}
        onNextStep={onNextStep}
        onResetSimulation={onResetSimulation}
        onResetDatabase={onResetDatabase}
        currentStepIndex={currentStepIndex}
        totalStepsCount={totalStepsCount}
        isSimulating={isSimulating}
      />

      {/* 2. MAIN WORKSPACE: LEFT EDITOR PANEL + RIGHT STAGE CANVAS */}
      <div className="flex flex-col xl:flex-row items-start gap-6 w-full">
        {/* LEFT SIDEBAR: DML Studio Controller */}
        <div className="w-full xl:w-[540px] shrink-0 bg-white rounded-3xl border border-slate-200 p-5 shadow-xl flex flex-col gap-4">
          {/* Header & Mode Switcher */}
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Database Record Editor
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Data Manipulation Language (DML) Studio
                  </p>
                </div>
              </div>

              <button
                onClick={onResetDatabase}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                title="Reset Editor Database"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => {
                  setEditorMode('tutorial');
                  setValidationError(null);
                }}
                className={`py-1.5 rounded-xl transition flex items-center justify-center gap-1 ${
                  editorMode === 'tutorial'
                    ? 'bg-white text-purple-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-purple-600" />
                <span>Tutorial</span>
              </button>

              <button
                onClick={() => {
                  setEditorMode('form');
                  setValidationError(null);
                }}
                className={`py-1.5 rounded-xl transition flex items-center justify-center gap-1 ${
                  editorMode === 'form'
                    ? 'bg-white text-purple-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5 text-purple-600" />
                <span>Visual Form</span>
              </button>

              <button
                onClick={() => {
                  setEditorMode('sql');
                  setValidationError(null);
                }}
                className={`py-1.5 rounded-xl transition flex items-center justify-center gap-1 ${
                  editorMode === 'sql'
                    ? 'bg-white text-purple-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-purple-600" />
                <span>Free SQL</span>
              </button>
            </div>
          </div>

          {/* ================= MODE 1: GUIDED DML TUTORIAL ================= */}
          {editorMode === 'tutorial' && (
            <div className="flex flex-col gap-4">
              {/* Step Navigation Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {DML_TUTORIAL_STEPS.map((step, idx) => {
                  const isCurrent = idx === activeStepIndex;
                  const isDone = completedSteps.includes(step.stepNumber);
                  return (
                    <button
                      key={step.stepNumber}
                      onClick={() => {
                        setActiveStepIndex(idx);
                        setDmlCode('');
                        setValidationError(null);
                        setShowHint(false);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                        isCurrent
                          ? 'bg-purple-700 text-white shadow-md'
                          : isDone
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <span>#{step.stepNumber}</span>
                      )}
                      <span>{step.operation}</span>
                    </button>
                  );
                })}
              </div>

              {/* Step Concept Card */}
              <div className="bg-purple-50/60 rounded-2xl border border-purple-200 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${currentTutorial.badgeColor}`}>
                    {currentTutorial.badge}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Step {currentTutorial.stepNumber} of {DML_TUTORIAL_STEPS.length}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900">
                  {currentTutorial.conceptTitle}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  {currentTutorial.conceptDescription}
                </p>

                <div className="pt-2 border-t border-purple-200/80 text-[11px] text-purple-950 font-sans flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Practice Goal:</strong> {currentTutorial.flexibilityNote}
                  </span>
                </div>
              </div>

              {/* Syntax Anatomy Guide */}
              <div className="bg-slate-900 rounded-2xl p-3.5 text-xs font-mono space-y-2 text-slate-200 shadow-inner">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Code2 className="w-3 h-3 text-purple-400" />
                  <span>SQL Syntax Structure</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  {currentTutorial.anatomyGuide.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                      <span className="text-purple-300 font-bold shrink-0">{item.line}</span>
                      <span className="text-slate-400 text-[10px] font-sans">➔ {item.explanation}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Checklist */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3 space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  Requirement Checklist
                </span>
                <div className="space-y-1 text-xs">
                  {checklist.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      {item.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className={item.passed ? 'text-slate-900 font-medium line-through opacity-75' : 'text-slate-700'}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hint Accordion */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowHint((prev) => !prev)}
                  className="w-full p-2.5 px-3.5 flex items-center justify-between text-xs font-bold text-amber-900 hover:bg-amber-100/60 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                    <span>Need an Example or Syntax Reminder?</span>
                  </div>
                  {showHint ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                {showHint && (
                  <div className="p-3 border-t border-amber-200 bg-white space-y-2 text-[11px]">
                    <p className="text-slate-700 leading-relaxed font-sans">
                      <strong>Guided Syntax:</strong> {currentTutorial.hintLevel1}
                    </p>
                    <pre className="p-2 rounded-lg bg-slate-900 text-purple-300 font-mono text-[10px] overflow-x-auto">
                      {currentTutorial.hintLevel2}
                    </pre>
                  </div>
                )}
              </div>

              {/* Error Banner */}
              {validationError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2 shadow-sm animate-shake">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="font-sans leading-relaxed text-[11px]">{validationError}</p>
                </div>
              )}

              {/* SQL Input Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Table className="w-3.5 h-3.5 text-purple-700" />
                    <span>SQL Mutation Workspace</span>
                  </label>
                  {dmlCode && (
                    <button
                      type="button"
                      onClick={() => setDmlCode('')}
                      className="text-[10px] text-slate-400 hover:text-slate-700 transition"
                    >
                      Clear SQL
                    </button>
                  )}
                </div>

                <div className="relative rounded-2xl border border-slate-300 bg-slate-950 text-purple-300 font-mono text-xs shadow-inner overflow-hidden">
                  <textarea
                    value={dmlCode}
                    onChange={(e) => {
                      setDmlCode(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    rows={4}
                    spellCheck={false}
                    className="w-full p-3 bg-transparent text-purple-200 font-mono text-[11px] leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-slate-600"
                    placeholder={`-- Type your ${currentTutorial.operation} statement here...`}
                  />
                </div>
              </div>

              {/* Execute Button */}
              <button
                onClick={handleExecuteTutorialStep}
                disabled={isSimulating}
                className="w-full py-3 px-4 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-lg shadow-purple-900/15 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Bot className="w-4 h-4 text-purple-200" />
                <span>{currentTutorial.defaultButtonLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ================= MODE 2: VISUAL FORM EDITOR ================= */}
          {editorMode === 'form' && (
            <div className="flex flex-col gap-4">
              {/* Target Table Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-purple-700" />
                  <span>Target Table to Edit</span>
                </label>
                <select
                  value={selectedTable}
                  onChange={(e) => {
                    setSelectedTable(e.target.value);
                    setFormFieldValues({});
                    setSelectedRowPk('');
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {tableNames.map((name) => (
                    <option key={name} value={name}>
                      {name} ({databaseState[name]?.rows.length || 0} rows)
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons: INSERT / UPDATE / DELETE */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormAction('insert');
                    setFormFieldValues({});
                    setSelectedRowPk('');
                  }}
                  className={`p-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    formAction === 'insert'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Add Row</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormAction('update')}
                  className={`p-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    formAction === 'update'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>✏️ Edit Row</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormAction('delete')}
                  className={`p-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    formAction === 'delete'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>🗑️ Delete Row</span>
                </button>
              </div>

              {/* Row Selector for UPDATE / DELETE */}
              {(formAction === 'update' || formAction === 'delete') && (
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Select Record to {formAction.toUpperCase()}</span>
                    <span className="text-[10px] text-slate-500 font-mono">By Primary Key ({tablePkName})</span>
                  </label>
                  <select
                    value={selectedRowPk}
                    onChange={(e) => {
                      const pk = e.target.value;
                      setSelectedRowPk(pk);
                      const row = tableRows.find((r) => String(r[tablePkName!]) === String(pk));
                      if (row) handleSelectRowForForm(row);
                    }}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-800"
                  >
                    <option value="">-- Choose a record --</option>
                    {tableRows.map((r, i) => (
                      <option key={i} value={r[tablePkName!]}>
                        PK #{r[tablePkName!]}: {Object.entries(r).filter(([k]) => k !== tablePkName).map(([_, v]) => String(v)).slice(0, 2).join(' - ')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dynamic Field Inputs for INSERT or UPDATE */}
              {(formAction === 'insert' || formAction === 'update') && (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {tableColumns.map((col) => {
                    const isPk = col.isPrimaryKey;
                    const isFk = col.isForeignKey;
                    const isReadOnly = formAction === 'update' && isPk;

                    return (
                      <div key={col.name} className="flex flex-col gap-1">
                        <label className="text-[11px] font-mono font-bold text-slate-700 flex items-center gap-1.5">
                          {isPk && <Key className="w-3 h-3 text-amber-600" />}
                          {isFk && <Link className="w-3 h-3 text-blue-600" />}
                          <span>{col.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({col.type}) {isPk ? '[Primary Key]' : isFk ? '[Foreign Key]' : ''}
                          </span>
                        </label>
                        <input
                          type="text"
                          value={formFieldValues[col.name] ?? ''}
                          disabled={isReadOnly}
                          onChange={(e) => {
                            setFormFieldValues((prev) => ({
                              ...prev,
                              [col.name]: e.target.value,
                            }));
                          }}
                          placeholder={isReadOnly ? '(Auto: Primary Key Locked)' : `Value for ${col.name}...`}
                          className={`p-2 rounded-xl border text-xs font-mono transition ${
                            isReadOnly
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : 'bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Real-time Generated SQL Preview */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    <span>Real-Time Generated SQL</span>
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                    1:1 Visual Translation
                  </span>
                </div>
                <pre className="p-2.5 rounded-xl bg-slate-950 text-purple-300 font-mono text-[10px] overflow-x-auto border border-slate-800 leading-relaxed">
                  {generatedFormSql}
                </pre>
              </div>

              {/* Error Banner */}
              {validationError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2 shadow-sm animate-shake">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="font-sans leading-relaxed text-[11px]">{validationError}</p>
                </div>
              )}

              {/* Run Button */}
              <button
                onClick={handleExecuteFormMutation}
                disabled={isSimulating}
                className="w-full py-3 px-4 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-lg shadow-purple-900/15 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Bot className="w-4 h-4 text-purple-200" />
                <span>Execute {formAction.toUpperCase()} on {selectedTable}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ================= MODE 3: FREE-FORM SQL CONSOLE ================= */}
          {editorMode === 'sql' && (
            <div className="flex flex-col gap-4">
              <div className="space-y-1 text-xs text-slate-600 font-sans leading-relaxed">
                <p>
                  Write any SQL <strong>INSERT</strong>, <strong>UPDATE</strong>, or <strong>DELETE</strong> statement to execute on the live database.
                </p>
                <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-mono space-y-1">
                  <div>• INSERT INTO Students VALUES (7, 'Alex', 'Chen', 'AI');</div>
                  <div>• UPDATE Students SET major = 'Robotics' WHERE student_id = 2;</div>
                  <div>• DELETE FROM Sessions WHERE session_id = 1002;</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-purple-700" />
                  <span>Custom SQL Editor</span>
                </label>
                <div className="rounded-2xl border border-slate-300 bg-slate-950 text-purple-300 font-mono text-xs shadow-inner overflow-hidden">
                  <textarea
                    value={dmlCode}
                    onChange={(e) => {
                      setDmlCode(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    rows={6}
                    spellCheck={false}
                    className="w-full p-3.5 bg-transparent text-purple-200 font-mono text-[11px] leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-slate-600"
                    placeholder="-- Type any INSERT, UPDATE, or DELETE query here..."
                  />
                </div>
              </div>

              {/* Error Banner */}
              {validationError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2 shadow-sm animate-shake">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="font-sans leading-relaxed text-[11px]">{validationError}</p>
                </div>
              )}

              <button
                onClick={() => {
                  if (!dmlCode.trim()) {
                    setValidationError('Please type a SQL statement before executing.');
                    return;
                  }
                  setValidationError(null);
                  onRunDml(dmlCode.trim());
                }}
                disabled={isSimulating}
                className="w-full py-3 px-4 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-lg shadow-purple-900/15 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Bot className="w-4 h-4 text-purple-200" />
                <span>Execute SQL Statement</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* RIGHT STAGE CANVAS: Live Database Tables, Padlocks & Little Robot */}
        <div className="flex-1 w-full min-w-0">
          <StageCanvas
            databaseState={databaseState}
            activeLocks={activeLocks}
            currentStep={currentStep}
            workerRobots={workerRobots}
            extractedTrayRows={extractedTrayRows}
          />
        </div>
      </div>
    </div>
  );
};
export default DatabaseEditorPage;
