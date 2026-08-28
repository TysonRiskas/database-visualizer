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

interface RoomEnvironmentState {
  databaseState: DatabaseState;
  activeLocks: LockEntry[];
  waitingLocks: LockWaitQueueEntry[];
  walRecords: WalRecord[];
  extractedTrayRows: RowData[];
  queryResult?: QueryResult;
  workerRobots: WorkerRobotState[];
  simulationSteps: SimulationStep[];
  currentStepIndex: number;
  isPlaying: boolean;
  speed: number;
}

export const App: React.FC = () => {
  const engineRef = useRef<DatabaseEngine>(new DatabaseEngine());

  // View Mode: Welcome Overview vs. Engine Room Visualizer vs. Build Your Own Database
  const [viewMode, setViewMode] = useState<'welcome' | 'engine_room' | 'database_builder'>('welcome');

  // Theory Modal
  const [isEducationalModalOpen, setIsEducationalModalOpen] = useState<boolean>(false);

  // 1. ENGINE ROOM ENVIRONMENT (Initialized with UVU Tutoring DB: Students, Tutors, Sessions)
  const [engineEnv, setEngineEnv] = useState<RoomEnvironmentState>(() => ({
    databaseState: engineRef.current.getState(),
    activeLocks: [],
    waitingLocks: [],
    walRecords: [],
    extractedTrayRows: [],
    queryResult: undefined,
    workerRobots: INITIAL_ROBOTS,
    simulationSteps: [],
    currentStepIndex: -1,
    isPlaying: false,
    speed: 0.5,
  }));

  // Active ACID Concept for Engine Room
  const [activeAcidProperty, setActiveAcidProperty] = useState<AcidProperty | undefined>();

  // 2. BUILDER ROOM ENVIRONMENT (Initialized completely blank: {})
  const [builderEnv, setBuilderEnv] = useState<RoomEnvironmentState>(() => ({
    databaseState: {},
    activeLocks: [],
    waitingLocks: [],
    walRecords: [],
    extractedTrayRows: [],
    queryResult: undefined,
    workerRobots: INITIAL_ROBOTS,
    simulationSteps: [],
    currentStepIndex: -1,
    isPlaying: false,
    speed: 0.5,
  }));

  // Helper to apply step snapshot to Engine Environment
  const applyEngineStep = (step: SimulationStep, nextIndex: number, totalCount: number) => {
    setEngineEnv((prev) => {
      const next: RoomEnvironmentState = {
        ...prev,
        currentStepIndex: nextIndex,
        isPlaying: nextIndex < totalCount - 1,
      };
      if (step.tableStateSnapshot) next.databaseState = step.tableStateSnapshot;
      if (step.activeLocksSnapshot) next.activeLocks = step.activeLocksSnapshot;
      if (step.waitingLocksSnapshot) next.waitingLocks = step.waitingLocksSnapshot;
      if (step.workerStatesSnapshot) next.workerRobots = step.workerStatesSnapshot;
      if (step.extractedTrayRows !== undefined) next.extractedTrayRows = step.extractedTrayRows;
      if (step.queryResultSnapshot) next.queryResult = step.queryResultSnapshot;
      return next;
    });
  };

  // Helper to apply step snapshot to Builder Environment
  const applyBuilderStep = (step: SimulationStep, nextIndex: number, totalCount: number) => {
    setBuilderEnv((prev) => {
      const next: RoomEnvironmentState = {
        ...prev,
        currentStepIndex: nextIndex,
        isPlaying: nextIndex < totalCount - 1,
      };
      if (step.tableStateSnapshot) next.databaseState = step.tableStateSnapshot;
      if (step.activeLocksSnapshot) next.activeLocks = step.activeLocksSnapshot;
      if (step.waitingLocksSnapshot) next.waitingLocks = step.waitingLocksSnapshot;
      if (step.workerStatesSnapshot) next.workerRobots = step.workerStatesSnapshot;
      if (step.extractedTrayRows !== undefined) next.extractedTrayRows = step.extractedTrayRows;
      if (step.queryResultSnapshot) next.queryResult = step.queryResultSnapshot;
      return next;
    });
  };

  // Engine Room Timer Loop
  useEffect(() => {
    let timer: any;
    if (
      engineEnv.isPlaying &&
      engineEnv.simulationSteps.length > 0 &&
      engineEnv.currentStepIndex >= 0 &&
      engineEnv.currentStepIndex < engineEnv.simulationSteps.length - 1
    ) {
      const delay = Math.round(2000 / engineEnv.speed);
      timer = setTimeout(() => {
        const nextIndex = engineEnv.currentStepIndex + 1;
        applyEngineStep(engineEnv.simulationSteps[nextIndex], nextIndex, engineEnv.simulationSteps.length);
      }, delay);
    }
    return () => clearTimeout(timer);
  }, [engineEnv.isPlaying, engineEnv.simulationSteps, engineEnv.currentStepIndex, engineEnv.speed]);

  // Builder Room Timer Loop
  useEffect(() => {
    let timer: any;
    if (
      builderEnv.isPlaying &&
      builderEnv.simulationSteps.length > 0 &&
      builderEnv.currentStepIndex >= 0 &&
      builderEnv.currentStepIndex < builderEnv.simulationSteps.length - 1
    ) {
      const delay = Math.round(2000 / builderEnv.speed);
      timer = setTimeout(() => {
        const nextIndex = builderEnv.currentStepIndex + 1;
        applyBuilderStep(builderEnv.simulationSteps[nextIndex], nextIndex, builderEnv.simulationSteps.length);
      }, delay);
    }
    return () => clearTimeout(timer);
  }, [builderEnv.isPlaying, builderEnv.simulationSteps, builderEnv.currentStepIndex, builderEnv.speed]);

  // ===================== ENGINE ROOM ACTIONS =====================
  const startEngineSimulation = (steps: SimulationStep[]) => {
    if (steps.length === 0) return;
    const firstStep = steps[0];
    setEngineEnv((prev) => {
      const next: RoomEnvironmentState = {
        ...prev,
        simulationSteps: steps,
        currentStepIndex: 0,
        isPlaying: steps.length > 1,
      };
      if (firstStep.tableStateSnapshot) next.databaseState = firstStep.tableStateSnapshot;
      if (firstStep.activeLocksSnapshot) next.activeLocks = firstStep.activeLocksSnapshot;
      if (firstStep.waitingLocksSnapshot) next.waitingLocks = firstStep.waitingLocksSnapshot;
      if (firstStep.workerStatesSnapshot) next.workerRobots = firstStep.workerStatesSnapshot;
      if (firstStep.extractedTrayRows !== undefined) next.extractedTrayRows = firstStep.extractedTrayRows;
      if (firstStep.queryResultSnapshot) next.queryResult = firstStep.queryResultSnapshot;
      return next;
    });
  };

  const handleBookSession = (data: any) => {
    setActiveAcidProperty(undefined);
    const { steps } = SimulationGenerator.generateTpsInsertSteps(engineEnv.databaseState, data);
    startEngineSimulation(steps);
  };

  const handleFireConcurrent = () => {
    setActiveAcidProperty('I');
    const { steps } = SimulationGenerator.generateConcurrentBookingsSteps(engineEnv.databaseState);
    startEngineSimulation(steps);
  };

  const handleRunSql = (sql: string) => {
    setActiveAcidProperty(undefined);
    const { steps } = SimulationGenerator.generateSqlQuerySteps(engineEnv.databaseState, sql);
    startEngineSimulation(steps);
  };

  const handleRunAcidDemo = (property: AcidProperty) => {
    setActiveAcidProperty(property);
    if (property === 'A') {
      const { steps } = SimulationGenerator.generateAtomicityRollbackSteps(engineEnv.databaseState);
      startEngineSimulation(steps);
    } else if (property === 'C') {
      const { steps } = SimulationGenerator.generateConsistencyViolationSteps(engineEnv.databaseState);
      startEngineSimulation(steps);
    } else if (property === 'I') {
      const { steps } = SimulationGenerator.generateConcurrentBookingsSteps(engineEnv.databaseState);
      startEngineSimulation(steps);
    } else if (property === 'D') {
      const { steps } = SimulationGenerator.generateDurabilityWalSteps(engineEnv.databaseState);
      startEngineSimulation(steps);
    }
  };

  const handleEngineNextStep = () => {
    if (engineEnv.currentStepIndex < engineEnv.simulationSteps.length - 1) {
      const nextIndex = engineEnv.currentStepIndex + 1;
      applyEngineStep(engineEnv.simulationSteps[nextIndex], nextIndex, engineEnv.simulationSteps.length);
    }
  };

  const handleEngineTogglePlayPause = () => {
    setEngineEnv((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleEngineResetSimulation = () => {
    setEngineEnv((prev) => ({
      ...prev,
      simulationSteps: [],
      currentStepIndex: -1,
      isPlaying: false,
      activeLocks: [],
      waitingLocks: [],
      extractedTrayRows: [],
      workerRobots: INITIAL_ROBOTS,
    }));
    setActiveAcidProperty(undefined);
  };

  const handleEngineResetDatabase = () => {
    engineRef.current.reset();
    setEngineEnv({
      databaseState: engineRef.current.getState(),
      activeLocks: [],
      waitingLocks: [],
      walRecords: [],
      extractedTrayRows: [],
      queryResult: undefined,
      workerRobots: INITIAL_ROBOTS,
      simulationSteps: [],
      currentStepIndex: -1,
      isPlaying: false,
      speed: 0.5,
    });
    setActiveAcidProperty(undefined);
  };

  // ===================== BUILDER ROOM ACTIONS =====================
  const startBuilderSimulation = (steps: SimulationStep[]) => {
    if (steps.length === 0) return;
    const firstStep = steps[0];
    setBuilderEnv((prev) => {
      const next: RoomEnvironmentState = {
        ...prev,
        simulationSteps: steps,
        currentStepIndex: 0,
        isPlaying: steps.length > 1,
      };
      if (firstStep.tableStateSnapshot) next.databaseState = firstStep.tableStateSnapshot;
      if (firstStep.activeLocksSnapshot) next.activeLocks = firstStep.activeLocksSnapshot;
      if (firstStep.waitingLocksSnapshot) next.waitingLocks = firstStep.waitingLocksSnapshot;
      if (firstStep.workerStatesSnapshot) next.workerRobots = firstStep.workerStatesSnapshot;
      if (firstStep.extractedTrayRows !== undefined) next.extractedTrayRows = firstStep.extractedTrayRows;
      if (firstStep.queryResultSnapshot) next.queryResult = firstStep.queryResultSnapshot;
      return next;
    });
  };

  const handleRunDdl = (ddlScript: string) => {
    const cleaned = ddlScript.trim().toUpperCase();
    if (cleaned.startsWith('SELECT')) {
      const { steps } = SimulationGenerator.generateSqlQuerySteps(builderEnv.databaseState, ddlScript);
      startBuilderSimulation(steps);
    } else {
      const { steps } = SimulationGenerator.generateBuildDatabaseSteps(builderEnv.databaseState, ddlScript);
      startBuilderSimulation(steps);
    }
  };

  const handleBuilderNextStep = () => {
    if (builderEnv.currentStepIndex < builderEnv.simulationSteps.length - 1) {
      const nextIndex = builderEnv.currentStepIndex + 1;
      applyBuilderStep(builderEnv.simulationSteps[nextIndex], nextIndex, builderEnv.simulationSteps.length);
    }
  };

  const handleBuilderTogglePlayPause = () => {
    setBuilderEnv((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleBuilderResetSimulation = () => {
    setBuilderEnv((prev) => ({
      ...prev,
      simulationSteps: [],
      currentStepIndex: -1,
      isPlaying: false,
      activeLocks: [],
      waitingLocks: [],
      extractedTrayRows: [],
      workerRobots: INITIAL_ROBOTS,
    }));
  };

  const handleBuilderResetDatabase = () => {
    setBuilderEnv({
      databaseState: {},
      activeLocks: [],
      waitingLocks: [],
      walRecords: [],
      extractedTrayRows: [],
      queryResult: undefined,
      workerRobots: INITIAL_ROBOTS,
      simulationSteps: [],
      currentStepIndex: -1,
      isPlaying: false,
      speed: 0.5,
    });
  };

  const isEngineSimulating =
    engineEnv.simulationSteps.length > 0 && engineEnv.currentStepIndex < engineEnv.simulationSteps.length - 1;
  const isBuilderSimulating =
    builderEnv.simulationSteps.length > 0 && builderEnv.currentStepIndex < builderEnv.simulationSteps.length - 1;

  const currentEngineStep =
    engineEnv.currentStepIndex >= 0 && engineEnv.currentStepIndex < engineEnv.simulationSteps.length
      ? engineEnv.simulationSteps[engineEnv.currentStepIndex]
      : undefined;

  const currentBuilderStep =
    builderEnv.currentStepIndex >= 0 && builderEnv.currentStepIndex < builderEnv.simulationSteps.length
      ? builderEnv.simulationSteps[builderEnv.currentStepIndex]
      : undefined;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-[#275D38] selection:text-white">
      {/* 1. TOP BAR: UVU Header Controls & Action Modals */}
      <TopControlsBar
        databaseState={engineEnv.databaseState}
        onBookSession={handleBookSession}
        onFireConcurrent={handleFireConcurrent}
        onRunSql={handleRunSql}
        onOpenHelp={() => setIsEducationalModalOpen(true)}
        isSimulating={viewMode === 'database_builder' ? isBuilderSimulating : isEngineSimulating}
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
            databaseState={builderEnv.databaseState}
            onRunDdl={handleRunDdl}
            isSimulating={isBuilderSimulating}
            activeLocks={builderEnv.activeLocks}
            currentStep={currentBuilderStep}
            workerRobots={builderEnv.workerRobots}
            extractedTrayRows={builderEnv.extractedTrayRows}
            speed={builderEnv.speed}
            setSpeed={(s) => setBuilderEnv((prev) => ({ ...prev, speed: s }))}
            isPlaying={builderEnv.isPlaying}
            onTogglePlayPause={handleBuilderTogglePlayPause}
            onNextStep={handleBuilderNextStep}
            onResetSimulation={handleBuilderResetSimulation}
            onResetDatabase={handleBuilderResetDatabase}
            currentStepIndex={builderEnv.currentStepIndex}
            totalStepsCount={builderEnv.simulationSteps.length}
            onOpenHelp={() => setIsEducationalModalOpen(true)}
          />
        ) : (
          <>
            {/* Sticky Playback Controller Bar for Engine Room */}
            <PlaybackController
              speed={engineEnv.speed}
              setSpeed={(s) => setEngineEnv((prev) => ({ ...prev, speed: s }))}
              isPlaying={engineEnv.isPlaying}
              onTogglePlayPause={handleEngineTogglePlayPause}
              onNextStep={handleEngineNextStep}
              onResetSimulation={handleEngineResetSimulation}
              onResetDatabase={handleEngineResetDatabase}
              currentStepIndex={engineEnv.currentStepIndex}
              totalStepsCount={engineEnv.simulationSteps.length}
              isSimulating={isEngineSimulating}
            />

            {/* 2. CENTER STAGE + ACID SIDEBAR LAYOUT */}
            <div className="flex flex-col xl:flex-row items-start gap-6 w-full">
              {/* Main Stage Canvas for Engine Room */}
              <div className="flex-1 w-full min-w-0">
                <StageCanvas
                  databaseState={engineEnv.databaseState}
                  activeLocks={engineEnv.activeLocks}
                  currentStep={currentEngineStep}
                  workerRobots={engineEnv.workerRobots}
                  extractedTrayRows={engineEnv.extractedTrayRows}
                />
              </div>

              {/* Interactive ACID Framework Sidebar */}
              <AcidSidebar
                activeAcidProperty={activeAcidProperty}
                onRunAcidDemo={handleRunAcidDemo}
                isPlaying={engineEnv.isPlaying}
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
