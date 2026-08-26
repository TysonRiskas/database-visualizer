import React, { useState, useEffect, useRef } from 'react';
import {
  DatabaseState,
  LockEntry,
  LockWaitQueueEntry,
  QueryResult,
  RowData,
  SimulationStep,
  WalRecord,
  WorkerRobotState,
} from './types/database';
import { DatabaseEngine } from './db/engine';
import { SimulationGenerator } from './db/simulator';
import { TopControlsBar } from './components/TopControlsBar';
import { PlaybackController } from './components/PlaybackController';
import { StageCanvas } from './components/EngineRoom/StageCanvas';
import { EducationalModal } from './components/EducationalModal';
import { AcidSidebar, AcidProperty } from './components/AcidSidebar';
import { DatabaseBuilderPage } from './components/DatabaseBuilder/DatabaseBuilderPage';
import { WelcomePage } from './components/WelcomePage/WelcomePage';

const INITIAL_ROBOTS: WorkerRobotState[] = [
  {
    id: 't1',
    name: 'Wolverine Agent',
    color: 'blue',
    accentHex: '#275D38',
    txId: 'Tx-Idle',
    status: 'IDLE',
    x: 6,
    y: 22,
    speech: 'UVU Database Engine Ready! Select an operation or an ACID concept to visualize.',
  },
];

export const App: React.FC = () => {
  const engineRef = useRef<DatabaseEngine>(new DatabaseEngine());

  // View Mode: Welcome Overview vs. Engine Room Visualizer vs. Build Your Own Database
  const [viewMode, setViewMode] = useState<'welcome' | 'engine_room' | 'database_builder'>('welcome');

  // Reactive DB States (Engine Room has Tutoring DB; Builder starts completely blank)
  const [databaseState, setDatabaseState] = useState<DatabaseState>(() =>
    engineRef.current.getState()
  );
  const [builderDatabaseState, setBuilderDatabaseState] = useState<DatabaseState>({});

  const [activeLocks, setActiveLocks] = useState<LockEntry[]>([]);
  const [waitingLocks, setWaitingLocks] = useState<LockWaitQueueEntry[]>([]);
  const [walRecords, setWalRecords] = useState<WalRecord[]>([]);
  const [extractedTrayRows, setExtractedTrayRows] = useState<RowData[]>([]);
  const [queryResult, setQueryResult] = useState<QueryResult | undefined>();
  const [workerRobots, setWorkerRobots] = useState<WorkerRobotState[]>(INITIAL_ROBOTS);

  // Active ACID Concept
  const [activeAcidProperty, setActiveAcidProperty] = useState<AcidProperty | undefined>();

  // Playback States (Slower, Deliberate Timing)
  const [simulationSteps, setSimulationSteps] = useState<SimulationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(0.5);

  // Theory Modal
  const [isEducationalModalOpen, setIsEducationalModalOpen] = useState<boolean>(false);

  const isSimulating = simulationSteps.length > 0 && currentStepIndex < simulationSteps.length - 1;

  // Apply atomic step snapshot
  const applyStep = (step: SimulationStep) => {
    if (step.tableStateSnapshot) {
      if (viewMode === 'database_builder') {
        setBuilderDatabaseState(step.tableStateSnapshot);
      } else {
        setDatabaseState(step.tableStateSnapshot);
        engineRef.current.setState(step.tableStateSnapshot);
      }
    }
    if (step.activeLocksSnapshot) {
      setActiveLocks(step.activeLocksSnapshot);
    }
    if (step.waitingLocksSnapshot) {
      setWaitingLocks(step.waitingLocksSnapshot);
    }
    if (step.workerStatesSnapshot) {
      setWorkerRobots(step.workerStatesSnapshot);
    }
    if (step.extractedTrayRows !== undefined) {
      setExtractedTrayRows(step.extractedTrayRows);
    }
    if (step.queryResultSnapshot) {
      setQueryResult(step.queryResultSnapshot);
    }
  };

  // Timer loop for slower, deliberate playback
  useEffect(() => {
    let timer: any;

    if (
      isPlaying &&
      simulationSteps.length > 0 &&
      currentStepIndex >= 0 &&
      currentStepIndex < simulationSteps.length - 1
    ) {
      const baseDelay = 2000;
      const delay = Math.round(baseDelay / speed);

      timer = setTimeout(() => {
        const nextIndex = currentStepIndex + 1;
        setCurrentStepIndex(nextIndex);
        applyStep(simulationSteps[nextIndex]);

        if (nextIndex >= simulationSteps.length - 1) {
          setIsPlaying(false);
        }
      }, delay);
    }

    return () => clearTimeout(timer);
  }, [isPlaying, simulationSteps, currentStepIndex, speed, viewMode]);

  // Start new simulation
  const startSimulation = (steps: SimulationStep[]) => {
    if (steps.length === 0) return;
    setSimulationSteps(steps);
    setCurrentStepIndex(0);
    applyStep(steps[0]);
    setIsPlaying(true);
  };

  // User Actions
  const handleBookSession = (data: any) => {
    setActiveAcidProperty(undefined);
    const { steps } = SimulationGenerator.generateTpsInsertSteps(databaseState, data);
    startSimulation(steps);
  };

  const handleFireConcurrent = () => {
    setActiveAcidProperty('I');
    const { steps } = SimulationGenerator.generateConcurrentBookingsSteps(databaseState);
    startSimulation(steps);
  };

  const handleRunSql = (sql: string) => {
    setActiveAcidProperty(undefined);
    const { steps } = SimulationGenerator.generateSqlQuerySteps(databaseState, sql);
    startSimulation(steps);
  };

  const handleRunDdl = (ddlScript: string) => {
    setActiveAcidProperty(undefined);
    const cleaned = ddlScript.trim().toUpperCase();
    if (cleaned.startsWith('SELECT')) {
      const { steps } = SimulationGenerator.generateSqlQuerySteps(builderDatabaseState, ddlScript);
      startSimulation(steps);
    } else {
      const { steps } = SimulationGenerator.generateBuildDatabaseSteps(builderDatabaseState, ddlScript);
      startSimulation(steps);
    }
  };

  // ACID Demonstrations Trigger
  const handleRunAcidDemo = (property: AcidProperty) => {
    setActiveAcidProperty(property);
    if (property === 'A') {
      const { steps } = SimulationGenerator.generateAtomicityRollbackSteps(databaseState);
      startSimulation(steps);
    } else if (property === 'C') {
      const { steps } = SimulationGenerator.generateConsistencyViolationSteps(databaseState);
      startSimulation(steps);
    } else if (property === 'I') {
      const { steps } = SimulationGenerator.generateConcurrentBookingsSteps(databaseState);
      startSimulation(steps);
    } else if (property === 'D') {
      const { steps } = SimulationGenerator.generateDurabilityWalSteps(databaseState);
      startSimulation(steps);
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < simulationSteps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      applyStep(simulationSteps[nextIndex]);

      if (nextIndex >= simulationSteps.length - 1) {
        setIsPlaying(false);
      }
    }
  };

  const handleTogglePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleResetSimulation = () => {
    setSimulationSteps([]);
    setCurrentStepIndex(-1);
    setIsPlaying(false);
    setActiveLocks([]);
    setWaitingLocks([]);
    setExtractedTrayRows([]);
    setWorkerRobots(INITIAL_ROBOTS);
    setActiveAcidProperty(undefined);
  };

  const handleResetDatabase = () => {
    engineRef.current.reset();
    setDatabaseState(engineRef.current.getState());
    setActiveLocks([]);
    setWaitingLocks([]);
    setWalRecords([]);
    setExtractedTrayRows([]);
    setQueryResult(undefined);
    setWorkerRobots(INITIAL_ROBOTS);
    setSimulationSteps([]);
    setCurrentStepIndex(-1);
    setIsPlaying(false);
    setActiveAcidProperty(undefined);
  };

  const handleResetBuilderDatabase = () => {
    setBuilderDatabaseState({});
    setActiveLocks([]);
    setWaitingLocks([]);
    setWalRecords([]);
    setExtractedTrayRows([]);
    setQueryResult(undefined);
    setWorkerRobots(INITIAL_ROBOTS);
    setSimulationSteps([]);
    setCurrentStepIndex(-1);
    setIsPlaying(false);
  };

  const currentStep =
    currentStepIndex >= 0 && currentStepIndex < simulationSteps.length
      ? simulationSteps[currentStepIndex]
      : undefined;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-[#275D38] selection:text-white">
      {/* 1. TOP BAR: UVU Header Controls & Action Modals */}
      <TopControlsBar
        databaseState={databaseState}
        onBookSession={handleBookSession}
        onFireConcurrent={handleFireConcurrent}
        onRunSql={handleRunSql}
        onOpenHelp={() => setIsEducationalModalOpen(true)}
        isSimulating={isSimulating}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 flex flex-col gap-4">
        {viewMode === 'welcome' ? (
          <WelcomePage
            onSelectMode={(mode) => setViewMode(mode)}
            onOpenTheory={() => setIsEducationalModalOpen(true)}
          />
        ) : viewMode === 'database_builder' ? (
          <DatabaseBuilderPage
            databaseState={builderDatabaseState}
            onRunDdl={handleRunDdl}
            isSimulating={isSimulating}
            activeLocks={activeLocks}
            currentStep={currentStep}
            workerRobots={workerRobots}
            extractedTrayRows={extractedTrayRows}
            speed={speed}
            setSpeed={setSpeed}
            isPlaying={isPlaying}
            onTogglePlayPause={handleTogglePlayPause}
            onNextStep={handleNextStep}
            onResetSimulation={handleResetSimulation}
            onResetDatabase={handleResetBuilderDatabase}
            currentStepIndex={currentStepIndex}
            totalStepsCount={simulationSteps.length}
            onOpenHelp={() => setIsEducationalModalOpen(true)}
          />
        ) : (
          <>
            {/* Sticky Playback Controller Bar */}
            <PlaybackController
              speed={speed}
              setSpeed={setSpeed}
              isPlaying={isPlaying}
              onTogglePlayPause={handleTogglePlayPause}
              onNextStep={handleNextStep}
              onResetSimulation={handleResetSimulation}
              onResetDatabase={handleResetDatabase}
              currentStepIndex={currentStepIndex}
              totalStepsCount={simulationSteps.length}
              isSimulating={isSimulating}
            />

            {/* 2. CENTER STAGE + ACID SIDEBAR LAYOUT */}
            <div className="flex flex-col xl:flex-row items-start gap-6 w-full">
              {/* Main Stage Canvas */}
              <div className="flex-1 w-full min-w-0">
                <StageCanvas
                  databaseState={databaseState}
                  activeLocks={activeLocks}
                  currentStep={currentStep}
                  workerRobots={workerRobots}
                  extractedTrayRows={extractedTrayRows}
                />
              </div>

              {/* Interactive ACID Framework Sidebar */}
              <AcidSidebar
                activeAcidProperty={activeAcidProperty}
                onRunAcidDemo={handleRunAcidDemo}
                isPlaying={isPlaying}
              />
            </div>
          </>
        )}
      </main>

      {/* Educational Theory Guide Modal */}
      <EducationalModal
        isOpen={isEducationalModalOpen}
        onClose={() => setIsEducationalModalOpen(false)}
      />
    </div>
  );
};
export default App;
