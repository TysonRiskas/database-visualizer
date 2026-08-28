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
} from 'lucide-react';
import { DatabaseState, RelationshipCardinality } from '../../types/database';
import { StageCanvas } from '../EngineRoom/StageCanvas';
import { PlaybackController } from '../PlaybackController';

interface DatabaseBuilderPageProps {
  databaseState: DatabaseState;
  onRunDdl: (ddlScript: string) => void;
  isSimulating: boolean;
  activeLocks: any[];
  currentStep?: any;
  workerRobots: any[];
  extractedTrayRows: any[];
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
  badge: string;
  badgeColor: string;
  cardinality?: RelationshipCardinality;
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

const getStepChecklist = (
  stepNumber: number,
  sql: string
): {
  items: DynamicChecklist[];
  detectedTableName?: string;
  detectedPk?: string;
  detectedFks?: string[];
  error?: string;
} => {
  const trimmed = sql.trim();

  if (stepNumber === 1 || stepNumber === 2) {
    const tableMatch = trimmed.match(/CREATE\s+TABLE\s+([a-zA-Z0-9_]+)\s*\(/i);
    const tableName = tableMatch ? tableMatch[1].trim() : undefined;
    const hasCreateTable = !!tableMatch;

    // Check for inline PRIMARY KEY or table constraint PRIMARY KEY (...)
    const pkInlineMatch = trimmed.match(/([a-zA-Z0-9_]+)\s+[a-zA-Z0-9_()]+\s+PRIMARY\s+KEY/i);
    const pkConstraintMatch = trimmed.match(/PRIMARY\s+KEY\s*\(\s*([a-zA-Z0-9_]+)\s*\)/i);
    const pkColumn = pkInlineMatch ? pkInlineMatch[1] : pkConstraintMatch ? pkConstraintMatch[1] : undefined;
    const hasPk = !!pkColumn;

    const hasDataTypes = /(INTEGER|TEXT|VARCHAR|INT|NUMERIC|REAL|BOOLEAN|DATE|FLOAT|CHAR)/i.test(trimmed);
    const hasClosing = /\)\s*;?$/m.test(trimmed) || /\)\s*;/i.test(trimmed);

    const items: DynamicChecklist[] = [
      {
        id: 'create_table',
        label: tableName ? `Valid CREATE TABLE ${tableName} (` : 'Valid CREATE TABLE <YourTableName> (',
        passed: hasCreateTable,
      },
      {
        id: 'primary_key',
        label: pkColumn ? `Designates PRIMARY KEY (${pkColumn})` : 'Designates a PRIMARY KEY (PK 🔑) column',
        passed: hasPk,
      },
      {
        id: 'data_types',
        label: 'Specifies valid column data types (INTEGER, TEXT, etc.)',
        passed: hasDataTypes,
      },
      {
        id: 'closing',
        label: 'Ends with closing parenthesis and semicolon );',
        passed: hasClosing,
      },
    ];

    let error: string | undefined;
    if (!hasCreateTable) error = 'Missing "CREATE TABLE <TableName> (". Give your table a name!';
    else if (!hasPk) error = `Table ${tableName || ''} needs a PRIMARY KEY (e.g. ${tableName?.toLowerCase() || 'item'}_id INTEGER PRIMARY KEY).`;
    else if (!hasDataTypes) error = 'Ensure columns have valid data types (INTEGER, TEXT, VARCHAR, etc.).';
    else if (!hasClosing) error = 'Ensure statement ends with closing parenthesis and semicolon: );';

    return { items, detectedTableName: tableName, detectedPk: pkColumn, error };
  }

  if (stepNumber === 3) {
    const tableMatch = trimmed.match(/CREATE\s+TABLE\s+([a-zA-Z0-9_]+)\s*\(/i);
    const tableName = tableMatch ? tableMatch[1].trim() : undefined;
    const hasCreateTable = !!tableMatch;

    const pkInlineMatch = trimmed.match(/([a-zA-Z0-9_]+)\s+[a-zA-Z0-9_()]+\s+PRIMARY\s+KEY/i);
    const pkConstraintMatch = trimmed.match(/PRIMARY\s+KEY\s*\(\s*([a-zA-Z0-9_]+)\s*\)/i);
    const pkColumn = pkInlineMatch ? pkInlineMatch[1] : pkConstraintMatch ? pkConstraintMatch[1] : undefined;
    const hasPk = !!pkColumn;

    const refMatches = Array.from(trimmed.matchAll(/REFERENCES\s+([a-zA-Z0-9_]+)\s*\(\s*([a-zA-Z0-9_]+)\s*\)/gi));
    const detectedFks = refMatches.map((m) => `${m[1]}(${m[2]})`);
    const hasFk = detectedFks.length > 0;

    const hasClosing = /\)\s*;?$/m.test(trimmed) || /\)\s*;/i.test(trimmed);

    const items: DynamicChecklist[] = [
      {
        id: 'create_table',
        label: tableName ? `Valid CREATE TABLE ${tableName} (` : 'Valid CREATE TABLE <JunctionTable> (',
        passed: hasCreateTable,
      },
      {
        id: 'primary_key',
        label: pkColumn ? `Designates PRIMARY KEY (${pkColumn})` : 'Designates a PRIMARY KEY (PK 🔑)',
        passed: hasPk,
      },
      {
        id: 'foreign_key',
        label: hasFk ? `Foreign Key: REFERENCES ${detectedFks.join(', ')}` : 'Defines Foreign Key (REFERENCES <ParentTable>(<parent_pk>))',
        passed: hasFk,
      },
      {
        id: 'closing',
        label: 'Ends with closing parenthesis and semicolon );',
        passed: hasClosing,
      },
    ];

    let error: string | undefined;
    if (!hasCreateTable) error = 'Missing "CREATE TABLE <TableName> (". Give your table a name!';
    else if (!hasPk) error = 'Table needs a PRIMARY KEY.';
    else if (!hasFk) error = 'Add a Foreign Key referencing your parent table (e.g. <col> INTEGER REFERENCES ParentTable(pk_col)).';
    else if (!hasClosing) error = 'Ensure statement ends with closing parenthesis and semicolon: );';

    return { items, detectedTableName: tableName, detectedPk: pkColumn, detectedFks, error };
  }

  if (stepNumber === 4) {
    const hasInsert = /INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i.test(trimmed);
    const tableMatches = Array.from(trimmed.matchAll(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/gi));
    const targetTables = Array.from(new Set(tableMatches.map((m) => m[1])));
    const hasValues = /VALUES\s*\(/i.test(trimmed);
    const hasSemicolon = trimmed.includes(';');

    const items: DynamicChecklist[] = [
      {
        id: 'insert_into',
        label: targetTables.length > 0 ? `INSERT INTO ${targetTables.join(', ')}` : 'Uses valid INSERT INTO <table_name> syntax',
        passed: hasInsert,
      },
      {
        id: 'values_clause',
        label: 'Includes VALUES (...) clause with data rows',
        passed: hasValues,
      },
      {
        id: 'semicolon',
        label: 'Terminates statements with semicolon ;',
        passed: hasSemicolon,
      },
    ];

    let error: string | undefined;
    if (!hasInsert) error = 'Statement must include INSERT INTO <table_name> (<columns...>)';
    else if (!hasValues) error = 'Missing VALUES (...) clause with column values';
    else if (!hasSemicolon) error = 'End each INSERT statement with a semicolon ;';

    return { items, detectedTableName: targetTables.join(', '), error };
  }

  if (stepNumber === 5) {
    const hasSelect = /SELECT\s+.+\s+FROM/i.test(trimmed);
    const fromMatch = trimmed.match(/FROM\s+([a-zA-Z0-9_]+)/i);
    const fromTable = fromMatch ? fromMatch[1] : undefined;
    const hasFrom = !!fromTable;

    const items: DynamicChecklist[] = [
      {
        id: 'select_clause',
        label: 'Begins with SELECT <columns>',
        passed: hasSelect,
      },
      {
        id: 'from_clause',
        label: fromTable ? `Queries FROM ${fromTable}` : 'Includes FROM <driving_table>',
        passed: hasFrom,
      },
    ];

    let error: string | undefined;
    if (!hasSelect) error = 'Statement must begin with SELECT <columns> FROM <table_name>';
    else if (!hasFrom) error = 'Missing FROM <table_name> clause';

    return { items, detectedTableName: fromTable, error };
  }

  return { items: [] };
};

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    stepNumber: 1,
    title: 'Step 1: The Foundation — Base Entity Table',
    badge: 'PK Table',
    badgeColor: 'bg-emerald-100 text-[#275D38] border-emerald-300',
    conceptTitle: 'How to Declare a Table & Primary Key (PK)',
    conceptDescription:
      'Every relational database starts with base entity tables. We designate an ID column as the PRIMARY KEY (PK 🔑) so each record has a guaranteed unique physical identifier.',
    flexibilityNote:
      '💡 You can create ANY table you want (e.g., Courses, Products, Dogs, Employees, Cars)! Just follow valid SQL syntax.',
    anatomyGuide: [
      {
        line: 'CREATE TABLE <YourTableName> (',
        explanation: 'Allocates a new table with your chosen name followed by an open parenthesis (',
      },
      {
        line: '  <id_column> INTEGER PRIMARY KEY,',
        explanation: 'Declares an integer column and assigns it as the unique PRIMARY KEY (PK 🔑)',
      },
      {
        line: '  <name_column> TEXT,',
        explanation: 'Declares an attribute column to hold string text, followed by a comma',
      },
      {
        line: '  <other_column> INTEGER',
        explanation: 'Additional integer or text columns (no trailing comma on the last column)',
      },
      {
        line: ');',
        explanation: 'Closes the table definition with a closing parenthesis ) and semicolon ;',
      },
    ],
    hintLevel1:
      'Start with "CREATE TABLE <TableName> (" on line 1, define your columns on the next lines, and end with ");". Make sure your ID column has "INTEGER PRIMARY KEY".',
    hintLevel2: `CREATE TABLE Courses (
  course_id INTEGER PRIMARY KEY,
  course_name TEXT,
  department TEXT,
  credits INTEGER
);`,
    defaultButtonLabel: '🔨 Step 1: Construct Table',
  },
  {
    stepNumber: 2,
    title: 'Step 2: Second Entity — Independent Entity Table',
    badge: 'PK Table',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    conceptTitle: 'Relational Entities & Separation of Concerns',
    conceptDescription:
      'Relational databases store distinct entities in separate tables to avoid data redundancy. Here you create your second entity table with its own unique Primary Key.',
    flexibilityNote:
      '💡 Choose any complementary entity (e.g., Students, Owners, Customers, Departments, Authors)!',
    anatomyGuide: [
      {
        line: 'CREATE TABLE <SecondTableName> (',
        explanation: 'Declares your second entity table with an open parenthesis (',
      },
      {
        line: '  <id_column> INTEGER PRIMARY KEY,',
        explanation: 'Assigns a unique identifier for each record in this second table',
      },
      {
        line: '  <attribute_1> TEXT,',
        explanation: 'Descriptive text column for this entity',
      },
      {
        line: '  <attribute_2> TEXT',
        explanation: 'Additional column attribute',
      },
      {
        line: ');',
        explanation: 'Ends statement with closing parenthesis ) and semicolon ;',
      },
    ],
    hintLevel1:
      'Create your second entity table following the same pattern as Step 1 with a table name, a primary key, and descriptive columns.',
    hintLevel2: `CREATE TABLE Students (
  student_id INTEGER PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  major TEXT
);`,
    defaultButtonLabel: '🔨 Step 2: Construct Second Table',
  },
  {
    stepNumber: 3,
    title: 'Step 3: Relational Linkage — Foreign Keys (1:M / M:M)',
    badge: 'Relational Link',
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
    cardinality: 'M:M',
    conceptTitle: 'Establishing Relationships via Foreign Keys (FK)',
    conceptDescription:
      'To connect tables together, we add a Foreign Key using "REFERENCES ParentTable(pk_col)". When a junction table holds foreign keys to two tables, it resolves a Many-to-Many relationship!',
    flexibilityNote:
      '💡 Name your table whatever you like (e.g., Enrollments, Orders, Adoptions, Bookings) and reference your parent tables.',
    anatomyGuide: [
      {
        line: 'CREATE TABLE <JunctionTable> (',
        explanation: 'Declares the connecting junction/child table',
      },
      {
        line: '  <junction_id> INTEGER PRIMARY KEY,',
        explanation: 'Primary key for each specific relationship entry',
      },
      {
        line: '  <fk1_column> INTEGER REFERENCES <Table1>(<pk1>),',
        explanation: 'FOREIGN KEY linking this entry back to a parent record in Table 1',
      },
      {
        line: '  <fk2_column> INTEGER REFERENCES <Table2>(<pk2>),',
        explanation: 'FOREIGN KEY linking this entry back to a parent record in Table 2',
      },
      {
        line: '  <status_or_date> TEXT',
        explanation: 'Relationship metadata attribute',
      },
      {
        line: ');',
        explanation: 'Closes relationship table statement',
      },
    ],
    hintLevel1:
      'To connect two parent tables, write REFERENCES ParentTable(parent_pk) on the foreign key columns: "<col1> INTEGER REFERENCES Table1(pk1)" and "<col2> INTEGER REFERENCES Table2(pk2)".',
    hintLevel2: `CREATE TABLE Enrollments (
  enrollment_id INTEGER PRIMARY KEY,
  student_id INTEGER REFERENCES Students(student_id),
  course_id INTEGER REFERENCES Courses(course_id),
  semester TEXT,
  grade TEXT
);`,
    defaultButtonLabel: '🔗 Step 3: Wire Relational Schema',
  },
  {
    stepNumber: 4,
    title: 'Step 4: Tuple Population — Seed Records (INSERT INTO)',
    badge: 'WAL Tuples',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    conceptTitle: 'Inserting Rows & Data Types',
    conceptDescription:
      'Now we populate data pages with initial rows. In SQL, text strings are wrapped in single quotes like \'Sample Text\', while integers are written directly as numbers like 101.',
    flexibilityNote:
      '💡 Insert rows into the tables you just created using your own custom data values!',
    anatomyGuide: [
      {
        line: 'INSERT INTO <TableName> (col1, col2, ...)',
        explanation: 'Specifies target table and the ordered list of columns to populate',
      },
      {
        line: 'VALUES (1, \'Sample Text\', 4);',
        explanation: 'Provides matching values: integers directly, text strings wrapped in single quotes',
      },
    ],
    hintLevel1:
      'Write INSERT INTO <table> (col1, col2...) VALUES (val1, \'textVal\'...); for your tables. Remember text values need single quotes!',
    hintLevel2: `INSERT INTO Courses (course_id, course_name, department, credits) VALUES (301, 'Algorithms', 'Computer Science', 4);
INSERT INTO Students (student_id, first_name, last_name, major) VALUES (1, 'Alice', 'Smith', 'Computer Science');
INSERT INTO Enrollments (enrollment_id, student_id, course_id, semester, grade) VALUES (1, 1, 301, 'Fall 2026', 'A');`,
    defaultButtonLabel: '📥 Step 4: Populate Seed Tuples',
  },
  {
    stepNumber: 5,
    title: 'Step 5: Testing Your Database — Run SQL Query / JOIN',
    badge: 'Relational Query',
    badgeColor: 'bg-cyan-100 text-cyan-950 border-cyan-300',
    conceptTitle: 'Querying Data Across Your Relational Schema',
    conceptDescription:
      'Test your custom database! You can run a SELECT query with JOIN clauses to unlock parent records and stream results into the Results Tray.',
    flexibilityNote:
      '💡 Query any columns and tables from your database (e.g. SELECT * FROM TableName, or multi-table JOINs)!',
    anatomyGuide: [
      {
        line: 'SELECT <Table1.col>, <Table2.col>',
        explanation: 'Specifies which columns to retrieve using Table.column dot notation',
      },
      {
        line: 'FROM <DrivingTable>',
        explanation: 'The initial driving table',
      },
      {
        line: 'JOIN <TargetTable> ON <DrivingTable.fk> = <TargetTable.pk>;',
        explanation: 'Unlocks parent row where Foreign Key matches Primary Key',
      },
    ],
    hintLevel1:
      'Write a SELECT query starting FROM your driving table, optionally adding JOIN <Table> ON <fk> = <pk>.',
    hintLevel2: `SELECT Students.first_name, Students.major, Courses.course_name, Enrollments.grade
FROM Enrollments
JOIN Students ON Enrollments.student_id = Students.student_id
JOIN Courses ON Enrollments.course_id = Courses.course_id
WHERE Enrollments.grade = 'A';`,
    defaultButtonLabel: '🚀 Step 5: Execute SQL Query',
  },
];

export const DatabaseBuilderPage: React.FC<DatabaseBuilderPageProps> = ({
  databaseState,
  onRunDdl,
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
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  // Clean, empty string as requested by user
  const [ddlCode, setDdlCode] = useState<string>('');
  const [mode, setMode] = useState<'tutorial' | 'freeform'>('tutorial');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const currentTutorial = TUTORIAL_STEPS[activeStepIndex];

  // Dynamic live validation checklist (accepts ANY custom names & inputs!)
  const checklistResult = useMemo(() => {
    if (mode !== 'tutorial') return { items: [] };
    return getStepChecklist(currentTutorial.stepNumber, ddlCode);
  }, [mode, currentTutorial, ddlCode]);

  const checklistItems = checklistResult.items;
  const allChecklistPassed = useMemo(() => {
    if (mode !== 'tutorial') return true;
    return checklistItems.length > 0 && checklistItems.every((item) => item.passed);
  }, [mode, checklistItems]);

  // Dynamic action button label based on detected table name
  const actionButtonLabel = useMemo(() => {
    if (mode !== 'tutorial') return 'Construct Database (Execute SQL)';
    if (checklistResult.detectedTableName) {
      if (currentTutorial.stepNumber === 1 || currentTutorial.stepNumber === 2) {
        return `🔨 Step ${currentTutorial.stepNumber}: Construct ${checklistResult.detectedTableName} Table`;
      }
      if (currentTutorial.stepNumber === 3) {
        return `🔗 Step 3: Wire Schema (${checklistResult.detectedTableName})`;
      }
      if (currentTutorial.stepNumber === 4) {
        return `📥 Step 4: Populate Seed Tuples (${checklistResult.detectedTableName})`;
      }
      if (currentTutorial.stepNumber === 5) {
        return `🚀 Step 5: Execute Query on ${checklistResult.detectedTableName}`;
      }
    }
    return currentTutorial.defaultButtonLabel;
  }, [mode, currentTutorial, checklistResult]);

  const handleExecuteCurrentStep = () => {
    const trimmed = ddlCode.trim();
    if (!trimmed) {
      setValidationError('Please type your SQL statement into the editor box before running.');
      return;
    }

    if (mode === 'tutorial') {
      const stepCheck = getStepChecklist(currentTutorial.stepNumber, trimmed);
      const failedItems = stepCheck.items.filter((item) => !item.passed);
      if (failedItems.length > 0) {
        setValidationError(
          stepCheck.error || `Missing or incorrect requirement: "${failedItems[0].label}". Check the syntax guide above.`
        );
        return;
      }
    }

    setValidationError(null);
    onRunDdl(trimmed);

    if (!completedSteps.includes(currentTutorial.stepNumber)) {
      setCompletedSteps((prev) => [...prev, currentTutorial.stepNumber]);
    }
  };

  const handleAdvanceToStep = (index: number) => {
    setActiveStepIndex(index);
    setDdlCode('');
    setValidationError(null);
    setShowHint(false);
  };

  const handleResetTutorial = () => {
    onResetDatabase();
    setActiveStepIndex(0);
    setCompletedSteps([]);
    setDdlCode('');
    setValidationError(null);
    setShowHint(false);
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 1. PLAYBACK CONTROLLER BAR */}
      <PlaybackController
        speed={speed}
        setSpeed={setSpeed}
        isPlaying={isPlaying}
        onTogglePlayPause={onTogglePlayPause}
        onNextStep={onNextStep}
        onResetSimulation={onResetSimulation}
        onResetDatabase={handleResetTutorial}
        currentStepIndex={currentStepIndex}
        totalStepsCount={totalStepsCount}
        isSimulating={isSimulating}
      />

      {/* 2. MAIN BUILDER WORKSPACE: LEFT TUTORIAL SIDEBAR + RIGHT BLANK STAGE */}
      <div className="flex flex-col xl:flex-row items-start gap-6 w-full">
        {/* LEFT SIDEBAR: Step-by-Step Guided Tutorial */}
        <div className="w-full xl:w-[540px] shrink-0 bg-white rounded-3xl border border-slate-200 p-5 shadow-xl flex flex-col gap-4">
          {/* Header with Mode Toggle & Theory */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 text-[#275D38]">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Database Construction Tutorial
                </h2>
                <p className="text-[11px] text-slate-500">
                  Granular SQL syntax training & step-by-step walkthrough
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleResetTutorial}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                title="Wipe Stage & Restart Tutorial"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenHelp}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Theory</span>
              </button>
            </div>
          </div>

          {/* Mode Switcher: Step-by-Step Walkthrough vs. Free-form SQL */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => {
                setMode('tutorial');
                setValidationError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                mode === 'tutorial'
                  ? 'bg-white text-[#275D38] shadow font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Guided Tutorial</span>
            </button>
            <button
              onClick={() => {
                setMode('freeform');
                setValidationError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                mode === 'freeform'
                  ? 'bg-white text-[#275D38] shadow font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Free-form SQL Editor</span>
            </button>
          </div>

          {mode === 'tutorial' && (
            <>
              {/* Step Navigation Ribbon */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {TUTORIAL_STEPS.map((step, sIdx) => {
                  const isCurrent = activeStepIndex === sIdx;
                  const isDone = completedSteps.includes(step.stepNumber);
                  return (
                    <button
                      key={step.stepNumber}
                      onClick={() => handleAdvanceToStep(sIdx)}
                      className={`flex-1 min-w-[76px] py-1.5 px-2 rounded-xl border text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                        isCurrent
                          ? 'bg-[#275D38] text-white border-[#275D38] shadow-sm ring-2 ring-emerald-500/20'
                          : isDone
                          ? 'bg-emerald-50 text-[#275D38] border-emerald-300'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-3 h-3 text-emerald-600 font-bold" />
                      ) : null}
                      <span>Step {step.stepNumber}</span>
                    </button>
                  );
                })}
              </div>

              {/* Granular SQL Training Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#275D38]" />
                    <span>{currentTutorial.title}</span>
                  </span>
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border ${currentTutorial.badgeColor}`}
                  >
                    {currentTutorial.badge}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-[#275D38] flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    <span>{currentTutorial.conceptTitle}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                    {currentTutorial.conceptDescription}
                  </p>
                </div>

                {/* Flexibility Note */}
                <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-[11px] text-[#275D38] font-medium leading-relaxed">
                  {currentTutorial.flexibilityNote}
                </div>

                {/* Granular Syntax Anatomy Training */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono">
                    SQL Syntax Training & Structure Breakdown:
                  </span>
                  <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
                    {currentTutorial.anatomyGuide.map((item, aIdx) => (
                      <div key={aIdx} className="p-2.5 flex flex-col gap-1.5 hover:bg-slate-50/70 transition">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <code className="font-mono font-bold text-[#275D38] text-[11px] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/80 inline-block shadow-2xs">
                            {item.line}
                          </code>
                        </div>
                        <p className="text-slate-600 text-[11px] font-sans leading-relaxed pl-1 break-words whitespace-normal">
                          <span className="text-[#275D38] font-bold mr-1">➔</span>
                          {item.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Real-time Syntax Checklist */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono flex items-center justify-between">
                    <span>Live Syntax Checklist:</span>
                    <span className={allChecklistPassed ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                      {checklistItems.filter((r) => r.passed).length} / {checklistItems.length} Passed
                    </span>
                  </span>
                  <div className="grid grid-cols-1 gap-1">
                    {checklistItems.map((item) => (
                      <div
                        key={item.id}
                        className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono flex items-center gap-2 transition ${
                          item.passed
                            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        {item.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                        )}
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progressive Hint Accordion */}
                <div className="border border-amber-200 bg-amber-50/40 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowHint(!showHint)}
                    className="w-full p-2.5 flex items-center justify-between text-[11px] font-bold text-amber-900 hover:bg-amber-100/50 transition"
                  >
                    <div className="flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                      <span>Need an Example or Syntax Reminder?</span>
                    </div>
                    {showHint ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                  {showHint && (
                    <div className="p-3 border-t border-amber-200 bg-white space-y-2 text-[11px]">
                      <div className="text-slate-700">
                        <strong>💡 Guided Advice:</strong> {currentTutorial.hintLevel1}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          Example SQL Reference:
                        </span>
                        <pre className="p-2 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[10px] overflow-x-auto">
                          {currentTutorial.hintLevel2}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Diagnostic Error Banner */}
          {validationError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2.5 shadow-sm animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">Syntax Diagnostic Feedback:</span>
                <p className="text-[11px] text-rose-800 leading-relaxed font-sans">
                  {validationError}
                </p>
              </div>
            </div>
          )}

          {/* SQL Editor (Starts completely empty) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5 text-[#275D38]" />
                <span>SQL Workspace Editor</span>
              </label>
              {ddlCode && (
                <button
                  type="button"
                  onClick={() => {
                    setDdlCode('');
                    setValidationError(null);
                  }}
                  className="text-[10px] text-slate-400 hover:text-slate-700 transition"
                >
                  Clear SQL
                </button>
              )}
            </div>

            <div
              className={`relative rounded-2xl border bg-slate-950 text-emerald-400 font-mono text-xs shadow-inner overflow-hidden transition-all ${
                validationError ? 'border-rose-400 ring-2 ring-rose-400/20' : 'border-slate-300'
              }`}
            >
              <textarea
                value={ddlCode}
                onChange={(e) => {
                  setDdlCode(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                rows={9}
                spellCheck={false}
                className="w-full p-3.5 bg-transparent text-emerald-300 font-mono text-[11px] leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-600"
                placeholder={
                  mode === 'tutorial'
                    ? '-- Type your SQL statement here (any custom table or column names)...'
                    : '-- Write any custom CREATE TABLE or INSERT INTO statements here...'
                }
              />
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleExecuteCurrentStep}
            disabled={isSimulating}
            className="w-full py-3 px-4 rounded-2xl bg-[#275D38] hover:bg-[#1b4327] text-white font-bold text-xs shadow-lg shadow-emerald-900/15 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <Bot className="w-4 h-4 text-emerald-200" />
            <span>{actionButtonLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* RIGHT / CENTER STAGE: Blank Canvas Ready for Step-by-Step Robot Assembly */}
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
export default DatabaseBuilderPage;
