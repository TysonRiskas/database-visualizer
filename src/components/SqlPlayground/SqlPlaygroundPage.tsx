import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  RotateCcw,
  Trash2,
  FileCode,
  Table,
  Eye,
  Settings,
  Database,
  ChevronRight,
  ChevronDown,
  Key,
  Link,
  Code2,
  Terminal,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Copy,
  Download,
  Clock,
  Sparkles,
  Layers,
  Cpu,
} from 'lucide-react';
import {
  DatabaseState,
  PlaygroundState,
  QueryResult,
  ViewDefinition,
  StoredProcedureDefinition,
  QueryHistoryItem,
} from '../../types/database';
import { PlaygroundEngine } from '../../db/playgroundEngine';

interface SqlPlaygroundPageProps {
  playgroundState: PlaygroundState;
  onUpdatePlaygroundState: (newState: PlaygroundState) => void;
  onResetDatabase: () => void;
  onOpenHelp: () => void;
}

const SNIPPET_TEMPLATES = [
  {
    label: '-- Select a template snippet --',
    sql: '',
  },
  {
    label: '1. CREATE VIEW: Active Students',
    sql: `CREATE VIEW ActiveStudents AS\nSELECT student_id, first_name, last_name, major\nFROM Students\nWHERE major = 'Computer Science';\n\nSELECT * FROM ActiveStudents;`,
  },
  {
    label: '2. CREATE VIEW: Tutor Schedule Overview (JOIN)',
    sql: `CREATE VIEW TutorScheduleOverview AS\nSELECT Tutors.name, Tutors.department, Sessions.session_date, Sessions.status\nFROM Sessions\nJOIN Tutors ON Sessions.tutor_id = Tutors.tutor_id;\n\nSELECT * FROM TutorScheduleOverview;`,
  },
  {
    label: '3. CREATE PROCEDURE: Parameterized Add Student',
    sql: `CREATE PROCEDURE RegisterStudent(p_id INT, p_fname VARCHAR, p_lname VARCHAR, p_major VARCHAR)\nBEGIN\n  INSERT INTO Students (student_id, first_name, last_name, major)\n  VALUES (p_id, p_fname, p_lname, p_major);\nEND;\n\nCALL RegisterStudent(7, 'Maya', 'Lin', 'Architecture');\n\nSELECT * FROM Students WHERE student_id = 7;`,
  },
  {
    label: '4. CREATE PROCEDURE: Mark Confirmed Sessions Completed',
    sql: `CREATE PROCEDURE CompleteAllConfirmed()\nBEGIN\n  UPDATE Sessions SET status = 'Completed' WHERE status = 'Confirmed';\nEND;\n\nCALL CompleteAllConfirmed();\n\nSELECT * FROM Sessions;`,
  },
  {
    label: '5. Multi-Table JOIN Query',
    sql: `SELECT Students.first_name, Students.major, Tutors.name, Sessions.session_date\nFROM Sessions\nJOIN Tutors ON Sessions.tutor_id = Tutors.tutor_id\nJOIN Students ON Sessions.student_id = Students.student_id;`,
  },
];

export const SqlPlaygroundPage: React.FC<SqlPlaygroundPageProps> = ({
  playgroundState,
  onUpdatePlaygroundState,
  onResetDatabase,
  onOpenHelp,
}) => {
  // Clean slate editor: starts completely empty with NO prepopulated code
  const [editorSql, setEditorSql] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'results' | 'messages' | 'definition' | 'history'>('results');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<{
    results: QueryResult[];
    messages: string[];
    hasErrors: boolean;
    totalDurationMs: number;
  }>({
    results: [],
    messages: ['VS Code SQL Studio ready. Enter SQL queries, CREATE VIEW, or CREATE PROCEDURE above and click Run.'],
    hasErrors: false,
    totalDurationMs: 0,
  });

  // Explorer collapse state
  const [tablesExpanded, setTablesExpanded] = useState<boolean>(true);
  const [viewsExpanded, setViewsExpanded] = useState<boolean>(true);
  const [procsExpanded, setProcsExpanded] = useState<boolean>(true);
  const [expandedTableNames, setExpandedTableNames] = useState<Record<string, boolean>>({});

  // Active object definition viewer
  const [selectedDefinition, setSelectedDefinition] = useState<{
    type: 'Table' | 'View' | 'Procedure';
    name: string;
    code: string;
  } | null>(null);

  // Editor cursor / line tracking
  const [cursorPosition, setCursorPosition] = useState<{ line: number; col: number }>({ line: 1, col: 1 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lines = useMemo(() => editorSql.split('\n'), [editorSql]);
  const tableNames = Object.keys(playgroundState.databaseState);
  const viewNames = Object.keys(playgroundState.views);
  const procNames = Object.keys(playgroundState.procedures);

  // Execute SQL script
  const handleRunScript = () => {
    const trimmed = editorSql.trim();
    if (!trimmed) {
      setExecutionResult({
        results: [],
        messages: ['⚠️ Editor is empty. Enter SQL statement(s) to execute.'],
        hasErrors: false,
        totalDurationMs: 0,
      });
      setActiveTab('messages');
      return;
    }

    setIsExecuting(true);
    setTimeout(() => {
      const outcome = PlaygroundEngine.executeScript(playgroundState, trimmed);
      onUpdatePlaygroundState(outcome.state);
      setExecutionResult({
        results: outcome.results,
        messages: outcome.messages,
        hasErrors: outcome.hasErrors,
        totalDurationMs: outcome.totalDurationMs,
      });

      if (outcome.results.length > 0) {
        setActiveTab('results');
      } else {
        setActiveTab('messages');
      }
      setIsExecuting(false);
    }, 50);
  };

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to run
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunScript();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newVal = editorSql.substring(0, start) + '  ' + editorSql.substring(end);
      setEditorSql(newVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Update cursor position line & col
  const handleCursorMove = () => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const textUpToCursor = editorSql.substring(0, pos);
    const lineList = textUpToCursor.split('\n');
    setCursorPosition({
      line: lineList.length,
      col: lineList[lineList.length - 1].length + 1,
    });
  };

  // Insert helper into editor
  const handleInsertSql = (sql: string) => {
    setEditorSql((prev) => (prev ? `${prev}\n\n${sql}` : sql));
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Toggle table expand
  const toggleTableExpand = (name: string) => {
    setExpandedTableNames((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Export Results to CSV
  const handleExportCsv = () => {
    const currentResult = executionResult.results[0];
    if (!currentResult || currentResult.rows.length === 0) return;
    const header = currentResult.columns.join(',');
    const rows = currentResult.rows.map((r) =>
      currentResult.columns.map((col) => `"${String(r[col] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sql_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full bg-[#1e1e1e] text-[#cccccc] font-sans rounded-2xl border border-[#3c3c3c] overflow-hidden shadow-2xl flex flex-col min-h-[780px] animate-fadeIn select-none">
      {/* 1. TOP VSCODE TITLEBAR */}
      <div className="h-10 bg-[#323233] border-b border-[#252526] px-4 flex items-center justify-between text-xs">
        {/* Left: Window title & breadcrumb */}
        <div className="flex items-center gap-2 font-mono">
          <div className="w-3 h-3 rounded-full bg-[#007acc] flex items-center justify-center text-[8px] font-bold text-white">
            SQL
          </div>
          <span className="text-[#969696] font-medium hidden sm:inline">UVU Database Visualizer &gt;</span>
          <span className="text-white font-semibold flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-[#007acc]" />
            <span>query.sql</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#007acc]/20 text-[#007acc] border border-[#007acc]/40 font-mono">
            VS Code SQL Studio
          </span>
        </div>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-2">
          {/* Template snippets selector */}
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleInsertSql(e.target.value);
                e.target.value = '';
              }
            }}
            className="p-1 px-2.5 rounded bg-[#252526] hover:bg-[#3c3c3c] border border-[#3c3c3c] text-[11px] text-[#cccccc] font-mono focus:outline-none transition"
            title="Reference snippet templates"
          >
            {SNIPPET_TEMPLATES.map((tpl, i) => (
              <option key={i} value={tpl.sql}>
                {tpl.label}
              </option>
            ))}
          </select>

          {/* Reset DB */}
          <button
            onClick={onResetDatabase}
            className="p-1.5 px-2.5 rounded bg-[#252526] hover:bg-[#3c3c3c] border border-[#3c3c3c] text-[11px] text-[#cccccc] flex items-center gap-1.5 transition"
            title="Reset Playground Database, Views, and Procedures"
          >
            <RotateCcw className="w-3 h-3 text-[#dcdcaa]" />
            <span className="hidden md:inline">Reset DB</span>
          </button>

          {/* Clear Editor */}
          <button
            onClick={() => setEditorSql('')}
            className="p-1.5 px-2.5 rounded bg-[#252526] hover:bg-[#3c3c3c] border border-[#3c3c3c] text-[11px] text-[#cccccc] flex items-center gap-1.5 transition"
            title="Clear SQL Editor"
          >
            <Trash2 className="w-3 h-3 text-[#f14c4c]" />
            <span className="hidden md:inline">Clear</span>
          </button>

          {/* Primary Run Button */}
          <button
            onClick={handleRunScript}
            disabled={isExecuting}
            className="p-1.5 px-4 rounded bg-[#007acc] hover:bg-[#0062a3] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run (Ctrl+Enter)</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: LEFT ACTIVITY BAR + EXPLORER + RIGHT EDITOR/OUTPUT */}
      <div className="flex-1 flex overflow-hidden min-h-[700px]">
        {/* ACTIVITY BAR (Far Left Strip) */}
        <div className="w-12 bg-[#333333] border-r border-[#252526] flex flex-col items-center py-3 gap-4 shrink-0">
          <button
            className="p-2 text-white border-l-2 border-[#007acc] bg-[#252526] rounded-r transition"
            title="Database Explorer"
          >
            <Database className="w-5 h-5 text-[#007acc]" />
          </button>
          <button
            onClick={onOpenHelp}
            className="p-2 text-[#858585] hover:text-white transition"
            title="SQL & Relational Theory Reference"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className="p-2 text-[#858585] hover:text-white transition"
            title="Query History"
          >
            <Clock className="w-5 h-5" />
          </button>
        </div>

        {/* EXPLORER SIDEBAR */}
        <div className="w-64 bg-[#252526] border-r border-[#3c3c3c] flex flex-col shrink-0 overflow-y-auto font-mono text-xs select-none">
          <div className="p-3 uppercase text-[10px] font-bold text-[#858585] tracking-wider border-b border-[#3c3c3c] flex items-center justify-between">
            <span>Database Explorer</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#333333] text-[#cccccc]">
              InMemory
            </span>
          </div>

          {/* SECTION 1: TABLES */}
          <div className="border-b border-[#333333]">
            <button
              onClick={() => setTablesExpanded((prev) => !prev)}
              className="w-full p-2 px-3 flex items-center justify-between text-left hover:bg-[#2a2d2e] text-[#cccccc] font-bold text-[11px] transition"
            >
              <div className="flex items-center gap-1.5">
                {tablesExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#858585]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#858585]" />}
                <Table className="w-3.5 h-3.5 text-[#4ec9b0]" />
                <span>TABLES</span>
              </div>
              <span className="text-[10px] px-1.5 rounded-full bg-[#333333] text-[#969696]">
                {tableNames.length}
              </span>
            </button>

            {tablesExpanded && (
              <div className="pb-1 pl-3">
                {tableNames.map((tName) => {
                  const table = playgroundState.databaseState[tName];
                  const isExpanded = !!expandedTableNames[tName];
                  return (
                    <div key={tName} className="flex flex-col">
                      <div className="flex items-center justify-between pr-2 hover:bg-[#2a2d2e] rounded group py-1">
                        <button
                          onClick={() => toggleTableExpand(tName)}
                          className="flex items-center gap-1.5 text-[11px] text-[#9cdcfe] hover:text-white flex-1 text-left"
                        >
                          {isExpanded ? <ChevronDown className="w-3 h-3 text-[#858585]" /> : <ChevronRight className="w-3 h-3 text-[#858585]" />}
                          <span>{tName}</span>
                          <span className="text-[10px] text-[#858585]">({table.rows.length})</span>
                        </button>
                        <button
                          onClick={() => handleInsertSql(`SELECT * FROM ${tName};`)}
                          className="opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 rounded bg-[#007acc] text-white transition"
                          title={`Generate SELECT * FROM ${tName}`}
                        >
                          SELECT
                        </button>
                      </div>

                      {/* Columns list */}
                      {isExpanded && (
                        <div className="pl-5 space-y-0.5 py-1 border-l border-[#3c3c3c] ml-2">
                          {table.schema.columns.map((col) => (
                            <div key={col.name} className="flex items-center gap-1.5 text-[10px] text-[#d4d4d4] py-0.5">
                              {col.isPrimaryKey ? (
                                <span title="Primary Key"><Key className="w-2.5 h-2.5 text-[#dcdcaa] shrink-0" /></span>
                              ) : col.isForeignKey ? (
                                <span title="Foreign Key"><Link className="w-2.5 h-2.5 text-[#569cd6] shrink-0" /></span>
                              ) : (
                                <div className="w-2.5 h-2.5 rounded-full bg-[#3c3c3c] shrink-0" />
                              )}
                              <span className={col.isPrimaryKey ? 'font-bold text-[#dcdcaa]' : ''}>
                                {col.name}
                              </span>
                              <span className="text-[9px] text-[#858585]">({col.type})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: VIEWS */}
          <div className="border-b border-[#333333]">
            <button
              onClick={() => setViewsExpanded((prev) => !prev)}
              className="w-full p-2 px-3 flex items-center justify-between text-left hover:bg-[#2a2d2e] text-[#cccccc] font-bold text-[11px] transition"
            >
              <div className="flex items-center gap-1.5">
                {viewsExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#858585]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#858585]" />}
                <Eye className="w-3.5 h-3.5 text-[#569cd6]" />
                <span>VIEWS</span>
              </div>
              <span className="text-[10px] px-1.5 rounded-full bg-[#333333] text-[#969696]">
                {viewNames.length}
              </span>
            </button>

            {viewsExpanded && (
              <div className="pb-1 pl-4 pr-2">
                {viewNames.length === 0 ? (
                  <p className="text-[10px] text-[#858585] py-1 italic font-sans">
                    No views created yet. Use CREATE VIEW to add one!
                  </p>
                ) : (
                  viewNames.map((vName) => {
                    const view = playgroundState.views[vName];
                    return (
                      <div
                        key={vName}
                        className="flex items-center justify-between py-1 px-1 rounded hover:bg-[#2a2d2e] group"
                      >
                        <button
                          onClick={() => {
                            setSelectedDefinition({
                              type: 'View',
                              name: view.name,
                              code: `CREATE VIEW ${view.name} AS\n${view.definitionQuery};`,
                            });
                            setActiveTab('definition');
                          }}
                          className="flex items-center gap-1.5 text-[11px] text-[#569cd6] hover:underline"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{vName}</span>
                        </button>
                        <button
                          onClick={() => handleInsertSql(`SELECT * FROM ${vName};`)}
                          className="opacity-0 group-hover:opacity-100 text-[9px] px-1.5 py-0.5 rounded bg-[#007acc] text-white transition"
                          title={`Query View: SELECT * FROM ${vName}`}
                        >
                          SELECT
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* SECTION 3: STORED PROCEDURES */}
          <div className="border-b border-[#333333]">
            <button
              onClick={() => setProcsExpanded((prev) => !prev)}
              className="w-full p-2 px-3 flex items-center justify-between text-left hover:bg-[#2a2d2e] text-[#cccccc] font-bold text-[11px] transition"
            >
              <div className="flex items-center gap-1.5">
                {procsExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#858585]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#858585]" />}
                <Cpu className="w-3.5 h-3.5 text-[#ce9178]" />
                <span>STORED PROCEDURES</span>
              </div>
              <span className="text-[10px] px-1.5 rounded-full bg-[#333333] text-[#969696]">
                {procNames.length}
              </span>
            </button>

            {procsExpanded && (
              <div className="pb-2 pl-4 pr-2">
                {procNames.length === 0 ? (
                  <p className="text-[10px] text-[#858585] py-1 italic font-sans">
                    No procedures created yet. Use CREATE PROCEDURE to add one!
                  </p>
                ) : (
                  procNames.map((pName) => {
                    const proc = playgroundState.procedures[pName];
                    const paramsCall = proc.parameters.map((p) => `'value'`).join(', ');
                    return (
                      <div
                        key={pName}
                        className="flex items-center justify-between py-1 px-1 rounded hover:bg-[#2a2d2e] group"
                      >
                        <button
                          onClick={() => {
                            const paramSig = proc.parameters.map((p) => `${p.name} ${p.type}`).join(', ');
                            setSelectedDefinition({
                              type: 'Procedure',
                              name: proc.name,
                              code: `CREATE PROCEDURE ${proc.name}(${paramSig})\nBEGIN\n  ${proc.body}\nEND;`,
                            });
                            setActiveTab('definition');
                          }}
                          className="flex items-center gap-1.5 text-[11px] text-[#ce9178] hover:underline"
                        >
                          <Cpu className="w-3 h-3" />
                          <span>{pName}()</span>
                        </button>
                        <button
                          onClick={() => handleInsertSql(`CALL ${pName}(${paramsCall});`)}
                          className="opacity-0 group-hover:opacity-100 text-[9px] px-1.5 py-0.5 rounded bg-[#ce9178] text-black font-bold transition"
                          title={`Generate CALL ${pName}(...)`}
                        >
                          CALL
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: TOP EDITOR + BOTTOM OUTPUT DOCK */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
          {/* TOP EDITOR SECTION */}
          <div className="flex-1 flex flex-col min-h-[300px] border-b-2 border-[#007acc]/40">
            {/* Editor tab strip */}
            <div className="h-9 bg-[#252526] border-b border-[#1e1e1e] flex items-center px-2 gap-1 text-xs">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1e1e1e] border-t-2 border-[#007acc] text-white rounded-t text-xs font-mono font-medium">
                <FileCode className="w-3.5 h-3.5 text-[#007acc]" />
                <span>playground.sql</span>
              </div>
            </div>

            {/* Editor Textarea with line numbers */}
            <div className="flex-1 flex overflow-hidden relative font-mono text-[13px]">
              {/* Line numbers gutter */}
              <div className="w-11 py-3 bg-[#1e1e1e] text-[#858585] text-right pr-3 select-none border-r border-[#2d2d2d] font-mono leading-6 shrink-0">
                {lines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={editorSql}
                onChange={(e) => setEditorSql(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={handleCursorMove}
                onKeyUp={handleCursorMove}
                spellCheck={false}
                placeholder="-- VS Code SQL Studio: Type SQL queries, CREATE VIEW, or CREATE PROCEDURE here...&#10;-- Press Ctrl+Enter to Run"
                className="flex-1 p-3 bg-[#1e1e1e] text-[#d4d4d4] font-mono leading-6 resize-none focus:outline-none placeholder:text-[#5a5a5a] caret-[#007acc] overflow-y-auto"
              />
            </div>
          </div>

          {/* BOTTOM OUTPUT DOCK */}
          <div className="h-[340px] flex flex-col bg-[#1e1e1e] overflow-hidden">
            {/* Output tabs bar */}
            <div className="h-9 bg-[#252526] border-b border-[#3c3c3c] flex items-center justify-between px-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('results')}
                  className={`px-3 py-1.5 font-bold transition flex items-center gap-1.5 text-xs ${
                    activeTab === 'results'
                      ? 'text-white border-b-2 border-[#007acc]'
                      : 'text-[#858585] hover:text-[#cccccc]'
                  }`}
                >
                  <Table className="w-3.5 h-3.5 text-[#4ec9b0]" />
                  <span>Results</span>
                  {executionResult.results.length > 0 && (
                    <span className="text-[10px] px-1.5 rounded-full bg-[#007acc]/30 text-[#007acc]">
                      {executionResult.results[0].rows.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('messages')}
                  className={`px-3 py-1.5 font-bold transition flex items-center gap-1.5 text-xs ${
                    activeTab === 'messages'
                      ? 'text-white border-b-2 border-[#007acc]'
                      : 'text-[#858585] hover:text-[#cccccc]'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-[#569cd6]" />
                  <span>Messages</span>
                  {executionResult.hasErrors && (
                    <span className="w-2 h-2 rounded-full bg-[#f14c4c]" />
                  )}
                </button>

                {selectedDefinition && (
                  <button
                    onClick={() => setActiveTab('definition')}
                    className={`px-3 py-1.5 font-bold transition flex items-center gap-1.5 text-xs ${
                      activeTab === 'definition'
                        ? 'text-white border-b-2 border-[#007acc]'
                        : 'text-[#858585] hover:text-[#cccccc]'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5 text-[#dcdcaa]" />
                    <span>{selectedDefinition.type}: {selectedDefinition.name}</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 font-bold transition flex items-center gap-1.5 text-xs ${
                    activeTab === 'history'
                      ? 'text-white border-b-2 border-[#007acc]'
                      : 'text-[#858585] hover:text-[#cccccc]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-[#ce9178]" />
                  <span>History</span>
                </button>
              </div>

              {activeTab === 'results' && executionResult.results.length > 0 && (
                <button
                  onClick={handleExportCsv}
                  className="p-1 px-2.5 rounded bg-[#333333] hover:bg-[#3c3c3c] text-[10px] text-[#cccccc] flex items-center gap-1 transition"
                  title="Export results to CSV"
                >
                  <Download className="w-3 h-3 text-[#4ec9b0]" />
                  <span>Export CSV</span>
                </button>
              )}
            </div>

            {/* Output Tab Contents */}
            <div className="flex-1 overflow-auto p-2 font-mono text-xs">
              {/* TAB 1: RESULTS GRID */}
              {activeTab === 'results' && (
                <div>
                  {executionResult.results.length === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center text-[#858585] gap-2 select-none">
                      <Table className="w-8 h-8 opacity-40 text-[#4ec9b0]" />
                      <p className="text-xs">No result set returned. Run a SELECT query or query a View to see data.</p>
                      <button
                        onClick={() => handleInsertSql('SELECT * FROM Students;')}
                        className="text-[11px] text-[#007acc] hover:underline"
                      >
                        Example: SELECT * FROM Students;
                      </button>
                    </div>
                  ) : (
                    executionResult.results.map((res, rIdx) => (
                      <div key={rIdx} className="mb-4">
                        <div className="overflow-x-auto rounded border border-[#3c3c3c]">
                          <table className="w-full border-collapse text-left font-mono text-[11px]">
                            <thead>
                              <tr className="bg-[#2d2d2d] text-[#4ec9b0] border-b border-[#3c3c3c]">
                                <th className="p-2 border-r border-[#3c3c3c] text-center w-10 text-[#858585] select-none font-bold">
                                  #
                                </th>
                                {res.columns.map((col) => (
                                  <th key={col} className="p-2 border-r border-[#3c3c3c] font-bold">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {res.rows.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={res.columns.length + 1}
                                    className="p-4 text-center text-[#858585] italic"
                                  >
                                    (0 rows returned)
                                  </td>
                                </tr>
                              ) : (
                                res.rows.map((row, rowIdx) => (
                                  <tr
                                    key={rowIdx}
                                    className={`border-b border-[#2d2d2d] hover:bg-[#2a2d2e] ${
                                      rowIdx % 2 === 1 ? 'bg-[#252526]' : 'bg-[#1e1e1e]'
                                    }`}
                                  >
                                    <td className="p-2 border-r border-[#3c3c3c] text-center text-[#858585] select-none">
                                      {rowIdx + 1}
                                    </td>
                                    {res.columns.map((col) => {
                                      const val = row[col];
                                      return (
                                        <td key={col} className="p-2 border-r border-[#3c3c3c] text-[#d4d4d4]">
                                          {val === null || val === undefined ? (
                                            <span className="text-[#858585] italic font-sans text-[10px]">
                                              NULL
                                            </span>
                                          ) : typeof val === 'number' ? (
                                            <span className="text-[#b5cea8]">{val}</span>
                                          ) : (
                                            <span>{String(val)}</span>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className="text-[10px] text-[#858585] mt-1.5 flex items-center justify-between">
                          <span>
                            {res.rows.length} row(s) returned • Scanned {res.rowsScanned} row(s)
                          </span>
                          <span>Time: {res.executionTimeMs}ms</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: MESSAGES */}
              {activeTab === 'messages' && (
                <div className="space-y-1 font-mono text-[11px] p-2 leading-relaxed">
                  {executionResult.messages.map((msg, i) => (
                    <div
                      key={i}
                      className={
                        msg.startsWith('❌')
                          ? 'text-[#f14c4c] font-bold'
                          : msg.startsWith('✅')
                          ? 'text-[#4ec9b0] font-bold'
                          : msg.startsWith('⚠️')
                          ? 'text-[#dcdcaa]'
                          : msg.startsWith('📊')
                          ? 'text-[#569cd6]'
                          : 'text-[#cccccc]'
                      }
                    >
                      {msg}
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: OBJECT DEFINITION */}
              {activeTab === 'definition' && selectedDefinition && (
                <div className="p-2 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#3c3c3c] pb-2">
                    <span className="text-xs font-bold text-[#dcdcaa]">
                      {selectedDefinition.type}: {selectedDefinition.name}
                    </span>
                    <button
                      onClick={() => handleInsertSql(selectedDefinition.code)}
                      className="p-1 px-2.5 rounded bg-[#007acc] text-white text-[11px] flex items-center gap-1 font-mono hover:bg-[#0062a3] transition"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy to Editor</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-[#252526] rounded border border-[#3c3c3c] text-[#ce9178] font-mono text-xs overflow-x-auto leading-relaxed">
                    {selectedDefinition.code}
                  </pre>
                </div>
              )}

              {/* TAB 4: QUERY HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-2 p-1">
                  {playgroundState.queryHistory.length === 0 ? (
                    <p className="text-center text-[#858585] py-8 text-xs italic">
                      No query history recorded yet. Run queries above to build history.
                    </p>
                  ) : (
                    playgroundState.queryHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded bg-[#252526] border border-[#3c3c3c] flex items-center justify-between gap-3 text-xs hover:border-[#007acc] transition group"
                      >
                        <div className="flex-1 min-w-0 font-mono">
                          <div className="flex items-center gap-2 text-[10px] text-[#858585] mb-1">
                            {item.success ? (
                              <CheckCircle2 className="w-3 h-3 text-[#4ec9b0]" />
                            ) : (
                              <XCircle className="w-3 h-3 text-[#f14c4c]" />
                            )}
                            <span>{item.timestamp}</span>
                            <span>•</span>
                            <span>{item.durationMs}ms</span>
                            {item.rowsAffected !== undefined && (
                              <>
                                <span>•</span>
                                <span>{item.rowsAffected} rows</span>
                              </>
                            )}
                          </div>
                          <pre className="text-[11px] text-[#d4d4d4] truncate overflow-hidden">
                            {item.sql}
                          </pre>
                        </div>
                        <button
                          onClick={() => setEditorSql(item.sql)}
                          className="shrink-0 p-1.5 px-3 rounded bg-[#333333] hover:bg-[#007acc] text-white text-[10px] font-mono transition"
                        >
                          Load
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM BLUE STATUS BAR */}
      <div className="h-6 bg-[#007acc] text-white text-[11px] px-3 flex items-center justify-between font-mono select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Ready</span>
          </span>
          <span>|</span>
          <span>
            Ln {cursorPosition.line}, Col {cursorPosition.col}
          </span>
          <span>|</span>
          <span>UTF-8</span>
          <span>|</span>
          <span>SQL (ANSI/Relational)</span>
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          <span>
            {tableNames.length} Tables, {viewNames.length} Views, {procNames.length} Procedures
          </span>
          <span>|</span>
          <span>UVU Wolverine Database Lab</span>
        </div>
      </div>
    </div>
  );
};
export default SqlPlaygroundPage;
