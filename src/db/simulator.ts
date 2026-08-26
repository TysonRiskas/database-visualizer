import {
  DatabaseState,
  LockEntry,
  LockWaitQueueEntry,
  QueryResult,
  RowData,
  SimulationStep,
  WorkerRobotState,
  WaitQueueLaneRobot,
  JoinClause,
} from '../types/database';
import { LockManager } from './lockManager';
import { SqlParser } from './sqlParser';

export class SimulationGenerator {
  private static getTimestamp(): string {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d
      .getMilliseconds()
      .toString()
      .padStart(3, '0')}`;
  }

  /**
   * Generates discrete simulation steps for TPS Insert with relational pathway navigation and typing effect triggers.
   */
  public static generateTpsInsertSteps(
    initialState: DatabaseState,
    bookingData: {
      studentId: number;
      tutorId: number;
      sessionDate: string;
      status: string;
      newStudent?: { firstName: string; lastName: string; major: string };
    }
  ): { steps: SimulationStep[]; finalState: DatabaseState } {
    const steps: SimulationStep[] = [];
    const state = JSON.parse(JSON.stringify(initialState)) as DatabaseState;
    const lockMgr = new LockManager();
    const txId = `Tx-${Math.floor(100 + Math.random() * 900)}`;
    const threadName = 'Wolverine Agent';
    const threadColor = 'blue' as const;
    const threadHex = '#275D38';

    const newSessionId =
      state.Sessions.rows.length > 0
        ? Math.max(...state.Sessions.rows.map((r) => Number(r.session_id))) + 1
        : 1001;

    let targetStudentId = bookingData.studentId;
    let newStudentRow: RowData | undefined;

    const isMultiTableSignUp = bookingData.newStudent && bookingData.studentId === 0;

    if (isMultiTableSignUp) {
      targetStudentId =
        state.Students.rows.length > 0
          ? Math.max(...state.Students.rows.map((r) => Number(r.student_id))) + 1
          : 1;
      newStudentRow = {
        student_id: targetStudentId,
        first_name: bookingData.newStudent!.firstName,
        last_name: bookingData.newStudent!.lastName,
        major: bookingData.newStudent!.major,
      };
    }

    const sessionPayload: RowData = {
      session_id: newSessionId,
      student_id: targetStudentId,
      tutor_id: bookingData.tutorId,
      session_date: bookingData.sessionDate,
      status: bookingData.status,
    };

    const sqlStr = isMultiTableSignUp
      ? `INSERT INTO Students VALUES (${targetStudentId}, '${newStudentRow?.first_name}', '${newStudentRow?.last_name}', '${newStudentRow?.major}');\nINSERT INTO Sessions VALUES (${newSessionId}, ${targetStudentId}, ${bookingData.tutorId}, '${bookingData.sessionDate}', '${bookingData.status}');`
      : `INSERT INTO Sessions (session_id, student_id, tutor_id, session_date, status) VALUES (${newSessionId}, ${targetStudentId}, ${bookingData.tutorId}, '${bookingData.sessionDate}', '${bookingData.status}');`;

    if (isMultiTableSignUp && newStudentRow) {
      const totalSteps = 8;
      let stepCounter = 1;

      // STEP 1: Robot picks up combined sign-up + booking payload at Left Staging Dock 1
      steps.push({
        stepIndex: 0,
        totalSteps,
        type: 'STEP_PICKUP_PAYLOAD',
        txId,
        threadId: 't1',
        threadName,
        threadColor,
        title: `Step 1: Picked Up New Student & Booking Payload`,
        actionSummary: `Robot picked up Sign-up & Booking payload at Left-Hand Staging Dock #1.`,
        pedagogicalDetail: `Multi-Table Transaction: Signing up student '${newStudentRow.first_name} ${newStudentRow.last_name}' and booking a session in one atomic transaction.`,
        timestamp: SimulationGenerator.getTimestamp(),
        activeSqlString: sqlStr,
        sqlClauseHighlight: 'INSERT',
        workerStatesSnapshot: [
          {
            id: 't1',
            name: threadName,
            color: threadColor,
            accentHex: threadHex,
            txId,
            status: 'HOLDING_CARD',
            x: 6,
            y: 22,
            speech: `Signing up new student ${newStudentRow.first_name} ${newStudentRow.last_name} and booking Tutor #${bookingData.tutorId}!`,
            carryingCard: {
              title: `Sign-up + Session #${newSessionId}`,
              details: { ...newStudentRow, tutor_id: bookingData.tutorId },
            },
          },
        ],
        tableStateSnapshot: JSON.parse(JSON.stringify(state)),
        activeLocksSnapshot: lockMgr.getActiveLocks(),
        waitingLocksSnapshot: lockMgr.getWaitQueue(),
      });

      // STEP 2: Place Padlock on Students table
      lockMgr.requestLock({
        txId,
        threadName,
        threadColor,
        table: 'Students',
        rowId: targetStudentId,
        mode: 'EXCLUSIVE',
      });

      steps.push({
        stepIndex: stepCounter++,
        totalSteps,
        type: 'STEP_PLACE_PADLOCK',
        txId,
        threadId: 't1',
        threadName,
        threadColor,
        title: `Step 2: Placed Padlock on 'Students' Table`,
        actionSummary: `Placed Exclusive PADLOCK on 'Students' table to mint new Primary Key (student_id = ${targetStudentId}).`,
        pedagogicalDetail: `Strict 2PL Growing Phase: Locking Students table row slot before minting new Primary Key.`,
        timestamp: SimulationGenerator.getTimestamp(),
        targetTable: 'Students',
        targetRowId: targetStudentId,
        activeSqlString: sqlStr,
        sqlClauseHighlight: 'INSERT',
        padlock: {
          table: 'Students',
          rowId: targetStudentId,
          isLocked: true,
          holderName: threadName,
          holderColor: threadColor,
          mode: 'EXCLUSIVE',
        },
        ghostSlot: {
          table: 'Students',
          rowId: targetStudentId,
          rowData: newStudentRow,
          isSnapped: false,
        },
        workerStatesSnapshot: [
          {
            id: 't1',
            name: threadName,
            color: threadColor,
            accentHex: threadHex,
            txId,
            status: 'SNAPPING_ROW',
            x: 35,
            y: 35,
            speech: `Locked Students row slot! Minting new Primary Key: student_id = ${targetStudentId}`,
          },
        ],
        tableStateSnapshot: JSON.parse(JSON.stringify(state)),
        activeLocksSnapshot: lockMgr.getActiveLocks(),
        waitingLocksSnapshot: lockMgr.getWaitQueue(),
      });

      // STEP 3: Materialize new Student in Students table (Typing effect)
      state.Students.rows.push(newStudentRow);

      steps.push({
        stepIndex: stepCounter++,
        totalSteps,
        type: 'STEP_SNAP_PAYLOAD',
        txId,
        threadId: 't1',
        threadName,
        threadColor,
        title: `Step 3: Snapped New Student into 'Students'`,
        actionSummary: `Materialized ${newStudentRow.first_name} ${newStudentRow.last_name} into 'Students'. Primary Key #${targetStudentId} minted!`,
        pedagogicalDetail: `Student tuple committed to memory page. The new Primary Key #${targetStudentId} will now be used as the Foreign Key for the session.`,
        timestamp: SimulationGenerator.getTimestamp(),
        targetTable: 'Students',
        targetRowId: targetStudentId,
        activeSqlString: sqlStr,
        sqlClauseHighlight: 'VALUES',
        padlock: {
          table: 'Students',
          rowId: targetStudentId,
          isLocked: true,
          holderName: threadName,
          holderColor: threadColor,
          mode: 'EXCLUSIVE',
        },
        ghostSlot: {
          table: 'Students',
          rowId: targetStudentId,
          rowData: newStudentRow,
          isSnapped: true,
        },
        workerStatesSnapshot: [
          {
            id: 't1',
            name: threadName,
            color: threadColor,
            accentHex: threadHex,
            txId,
            status: 'HOLDING_CARD',
            x: 35,
            y: 35,
            speech: `Student record typed & materialized with PK #${targetStudentId}! Now carrying to Sessions...`,
            carryingCard: {
              title: `Session #${newSessionId} (FK=${targetStudentId})`,
              details: sessionPayload,
            },
          },
        ],
        tableStateSnapshot: JSON.parse(JSON.stringify(state)),
        activeLocksSnapshot: lockMgr.getActiveLocks(),
        waitingLocksSnapshot: lockMgr.getWaitQueue(),
      });

      // STEP 4: Traversing along the Dotted Relational Pathway (Students -> Sessions)
      steps.push({
        stepIndex: stepCounter++,
        totalSteps,
        type: 'STEP_MOVE_TO_RESOURCE',
        txId,
        threadId: 't1',
        threadName,
        threadColor,
        title: `Step 4: Following Relational Pathway (Students ➔ Sessions)`,
        actionSummary: `Robot navigating along the dotted Foreign Key pathway (Students.student_id ➔ Sessions.student_id).`,
        pedagogicalDetail: `Schema Navigation: Passing the newly generated student_id PK as the referential FK into Sessions.`,
        timestamp: SimulationGenerator.getTimestamp(),
        activeSqlString: sqlStr,
        sqlClauseHighlight: 'INSERT',
        workerStatesSnapshot: [
          {
            id: 't1',
            name: threadName,
            color: threadColor,
            accentHex: threadHex,
            txId,
            status: 'WALKING',
            x: 45,
            y: 50,
            speech: `Following Foreign Key pathway (Students.student_id ➔ Sessions.student_id)...`,
            carryingCard: {
              title: `Session #${newSessionId} (FK=${targetStudentId})`,
              details: sessionPayload,
            },
          },
        ],
        tableStateSnapshot: JSON.parse(JSON.stringify(state)),
        activeLocksSnapshot: lockMgr.getActiveLocks(),
        waitingLocksSnapshot: lockMgr.getWaitQueue(),
      });

      // STEP 5: Place Padlock on Sessions Table
      lockMgr.requestLock({
        txId,
        threadName,
        threadColor,
        table: 'Sessions',
        rowId: newSessionId,
        mode: 'EXCLUSIVE',
      });

      steps.push({
        stepIndex: stepCounter++,
        totalSteps,
        type: 'STEP_PLACE_PADLOCK',
        txId,
        threadId: 't1',
        threadName,
        threadColor,
        title: `Step 5: Placed Padlock on 'Sessions' Table`,
        actionSummary: `Placed Exclusive PADLOCK on 'Sessions' row slot and allocated memory page.`,
        pedagogicalDetail: `Strict 2PL Growing Phase: Locking Sessions row slot for atomic insert.`,
        timestamp: SimulationGenerator.getTimestamp(),
        targetTable: 'Sessions',
        targetRowId: newSessionId,
        activeSqlString: sqlStr,
        sqlClauseHighlight: 'INSERT',
        padlock: {
          table: 'Sessions',
          rowId: newSessionId,
          isLocked: true,
          holderName: threadName,
          holderColor: threadColor,
          mode: 'EXCLUSIVE',
        },
        ghostSlot: {
          table: 'Sessions',
          rowId: newSessionId,
          rowData: sessionPayload,
          isSnapped: false,
        },
        workerStatesSnapshot: [
          {
            id: 't1',
            name: threadName,
            color: threadColor,
            accentHex: threadHex,
            txId,
            status: 'HOLDING_CARD',
            x: 35,
            y: 65,
            speech: `Locked Sessions table! Linking Foreign Key student_id = ${targetStudentId}`,
            carryingCard: {
              title: `Session #${newSessionId}`,
              details: sessionPayload,
            },
          },
        ],
        tableStateSnapshot: JSON.parse(JSON.stringify(state)),
        activeLocksSnapshot: lockMgr.getActiveLocks(),
        waitingLocksSnapshot: lockMgr.getWaitQueue(),
      });

      // STEP 6: Snap Session row into Sessions (Typing effect)
      state.Sessions.rows.push(sessionPayload);

      steps.push({
        stepIndex: stepCounter++,
        totalSteps,
        type: 'STEP_SNAP_PAYLOAD',
        txId,
        threadId: 't1',
        threadName,
        threadColor,
        title: `Step 6: Snapped Session #${newSessionId} into 'Sessions'`,
        actionSummary: `Snapped Session #${newSessionId} with FK student_id=${targetStudentId} and tutor_id=${bookingData.tutorId} into 'Sessions'.`,
        pedagogicalDetail: `Referential integrity verified across Students and Tutors.`,
        timestamp: SimulationGenerator.getTimestamp(),
        targetTable: 'Sessions',
        targetRowId: newSessionId,
        targetRowIndex: state.Sessions.rows.length - 1,
        activeSqlString: sqlStr,
        sqlClauseHighlight: 'VALUES',
        padlock: {
          table: 'Sessions',
          rowId: newSessionId,
          isLocked: true,
          holderName: threadName,
          holderColor: threadColor,
          mode: 'EXCLUSIVE',
        },
        ghostSlot: {
          table: 'Sessions',
          rowId: newSessionId,
          rowData: sessionPayload,
          isSnapped: true,
        },
        workerStatesSnapshot: [
          {
            id: 't1',
            name: threadName,
            color: threadColor,
            accentHex: threadHex,
            txId,
            status: 'SNAPPING_ROW',
            x: 35,
            y: 68,
            speech: `Typed and snapped Session #${newSessionId}! Both tables linked via FK.`,
          },
        ],
        tableStateSnapshot: JSON.parse(JSON.stringify(state)),
        activeLocksSnapshot: lockMgr.getActiveLocks(),
        waitingLocksSnapshot: lockMgr.getWaitQueue(),
      });

      // STEP 7: Multi-Table Commit & Simultaneous Lock Release
      lockMgr.releaseLocksForTx(txId);

      steps.push({
        stepIndex: stepCounter++,
        totalSteps,
        type: 'STEP_RELEASE_PADLOCK',
        txId,
        threadId: 't1',
        threadName,
        threadColor,
        title: `Step 7: Atomic Commit & Simultaneous Padlock Release`,
        actionSummary: `Multi-table transaction committed! Both padlocks on 'Students' and 'Sessions' removed simultaneously (Strict 2PL).`,
        pedagogicalDetail: `Strict 2PL Shrinking Phase: Both Exclusive locks are released atomically at the moment of commit.`,
        timestamp: SimulationGenerator.getTimestamp(),
        activeSqlString: sqlStr,
        sqlClauseHighlight: 'COMMIT',
        padlock: {
          table: 'Sessions',
          rowId: newSessionId,
          isLocked: false,
          holderName: '',
          holderColor: '',
          mode: 'NONE',
        },
        workerStatesSnapshot: [
          {
            id: 't1',
            name: threadName,
            color: threadColor,
            accentHex: threadHex,
            txId,
            status: 'SUCCESS',
            x: 6,
            y: 22,
            speech: `Atomic COMMIT successful! Released padlocks on both Students & Sessions ✔`,
          },
        ],
        tableStateSnapshot: JSON.parse(JSON.stringify(state)),
        activeLocksSnapshot: lockMgr.getActiveLocks(),
        waitingLocksSnapshot: lockMgr.getWaitQueue(),
      });

      // STEP 8: Return to Left Staging Dock 1
      steps.push({
        stepIndex: stepCounter++,
        totalSteps,
        type: 'STEP_COMPLETE',
        txId,
        threadId: 't1',
        threadName,
        threadColor,
        title: `Step 8: Returned to Left Staging Bay (Dock #1)`,
        actionSummary: `Transaction finished. Returned to Left Staging Dock #1. Database is consistent and unobstructed.`,
        pedagogicalDetail: `Atomicity & Consistency preserved across multi-table write.`,
        timestamp: SimulationGenerator.getTimestamp(),
        activeSqlString: sqlStr,
        workerStatesSnapshot: [
          {
            id: 't1',
            name: threadName,
            color: threadColor,
            accentHex: threadHex,
            txId,
            status: 'IDLE',
            x: 6,
            y: 22,
            speech: `Resting at Left Staging Dock #1. Tables are completely unobstructed!`,
          },
        ],
        tableStateSnapshot: JSON.parse(JSON.stringify(state)),
        activeLocksSnapshot: lockMgr.getActiveLocks(),
        waitingLocksSnapshot: lockMgr.getWaitQueue(),
      });

      return { steps, finalState: state };
    }

    // ----------------------------------------------------
    // SINGLE-TABLE EXISTING STUDENT BOOKING (6 Steps)
    // ----------------------------------------------------
    const totalSteps = 6;
    let stepCounter = 1;

    // STEP 1: Robot picks up data card at Left Dock 1
    steps.push({
      stepIndex: 0,
      totalSteps,
      type: 'STEP_PICKUP_PAYLOAD',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `Step 1: Picked Up Physical Data Card at Dock #1`,
      actionSummary: `Robot picked up Data Card for Session #${newSessionId} at Left-Hand Staging Dock #1.`,
      pedagogicalDetail: `The booking request was received. Robot carries the physical payload.`,
      timestamp: SimulationGenerator.getTimestamp(),
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'INSERT',
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'HOLDING_CARD',
          x: 6,
          y: 22,
          speech: `Picked up Data Card for Session #${newSessionId} with Tutor #${bookingData.tutorId}`,
          carryingCard: {
            title: `Session #${newSessionId}`,
            details: sessionPayload,
          },
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 2: WAL Log
    steps.push({
      stepIndex: stepCounter++,
      totalSteps,
      type: 'STEP_WAL_APPEND',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `Step 2: Logged to Write-Ahead Log (WAL)`,
      actionSummary: `Logged changes to WAL (LSN #1012). Robot traveling to 'Sessions' table.`,
      pedagogicalDetail: `Durability Guarantee: Changes logged to WAL buffer.`,
      timestamp: SimulationGenerator.getTimestamp(),
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'INSERT',
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'WALKING',
          x: 25,
          y: 45,
          speech: `Logged LSN #1012 to Write-Ahead Log (WAL)! Moving to Sessions table...`,
          carryingCard: {
            title: `Session #${newSessionId}`,
            details: sessionPayload,
          },
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 3: Place Padlock on Sessions
    lockMgr.requestLock({
      txId,
      threadName,
      threadColor,
      table: 'Sessions',
      rowId: newSessionId,
      mode: 'EXCLUSIVE',
    });

    steps.push({
      stepIndex: stepCounter++,
      totalSteps,
      type: 'STEP_PLACE_PADLOCK',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `Step 3: Placed Exclusive Padlock on 'Sessions'`,
      actionSummary: `Placed Exclusive PADLOCK on 'Sessions' table slot (Strict 2PL Phase 1).`,
      pedagogicalDetail: `Strict 2PL: Placed heavy padlock on target row.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Sessions',
      targetRowId: newSessionId,
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'VALUES',
      padlock: {
        table: 'Sessions',
        rowId: newSessionId,
        isLocked: true,
        holderName: threadName,
        holderColor: threadColor,
        mode: 'EXCLUSIVE',
      },
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'HOLDING_CARD',
          x: 35,
          y: 65,
          speech: `Placed Exclusive PADLOCK on Sessions slot #${newSessionId}!`,
          carryingCard: {
            title: `Session #${newSessionId}`,
            details: sessionPayload,
          },
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 4: Empty Highlighted Ghost Slot
    steps.push({
      stepIndex: stepCounter++,
      totalSteps,
      type: 'STEP_GHOST_SLOT_CREATED',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `Step 4: Created Highlighted Ghost Slot`,
      actionSummary: `Allocated highlighted empty Ghost Slot for Session #${newSessionId} at bottom of 'Sessions'.`,
      pedagogicalDetail: `Allocated memory page slot.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Sessions',
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'VALUES',
      ghostSlot: {
        table: 'Sessions',
        rowId: newSessionId,
        rowData: sessionPayload,
        isSnapped: false,
      },
      padlock: {
        table: 'Sessions',
        rowId: newSessionId,
        isLocked: true,
        holderName: threadName,
        holderColor: threadColor,
        mode: 'EXCLUSIVE',
      },
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'SNAPPING_ROW',
          x: 35,
          y: 68,
          speech: `Prepared memory page slot at bottom of table. Ready to type!`,
          carryingCard: {
            title: `Session #${newSessionId}`,
            details: sessionPayload,
          },
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 5: Snap payload into cells (Typing effect)
    state.Sessions.rows.push(sessionPayload);

    steps.push({
      stepIndex: stepCounter++,
      totalSteps,
      type: 'STEP_SNAP_PAYLOAD',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `Step 5: Snapped Payload into Cells`,
      actionSummary: `Snapped Data Card into cells. Validated Foreign Keys (Student #${targetStudentId}, Tutor #${bookingData.tutorId}).`,
      pedagogicalDetail: `Data materialized into table.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Sessions',
      targetRowId: newSessionId,
      targetRowIndex: state.Sessions.rows.length - 1,
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'VALUES',
      ghostSlot: {
        table: 'Sessions',
        rowId: newSessionId,
        rowData: sessionPayload,
        isSnapped: true,
      },
      padlock: {
        table: 'Sessions',
        rowId: newSessionId,
        isLocked: true,
        holderName: threadName,
        holderColor: threadColor,
        mode: 'EXCLUSIVE',
      },
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'SNAPPING_ROW',
          x: 35,
          y: 68,
          speech: `Typed and snapped Session #${newSessionId} into table! Foreign Keys validated.`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 6: Commit, release padlock and return to Left Dock 1
    lockMgr.releaseLocksForTx(txId);

    steps.push({
      stepIndex: stepCounter++,
      totalSteps,
      type: 'STEP_RELEASE_PADLOCK',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `Step 6: Committed & Returned to Left Dock #1`,
      actionSummary: `Transaction committed! Padlock removed (Strict 2PL Phase 2). Returned to Left Staging Dock #1.`,
      pedagogicalDetail: `Strict 2PL Shrinking Phase complete. Database is consistent.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Sessions',
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'COMMIT',
      padlock: {
        table: 'Sessions',
        rowId: newSessionId,
        isLocked: false,
        holderName: '',
        holderColor: '',
        mode: 'NONE',
      },
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'SUCCESS',
          x: 6,
          y: 22,
          speech: `Transaction COMMITTED! Returned to Left-Hand Dock #1 ✔`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    return { steps, finalState: state };
  }

  /**
   * Generates sequential, clearly-paced simulation steps for 3 Concurrent Transactions:
   * Alpha (Dock 1), Beta (Dock 2), Gamma (Dock 3).
   */
  public static generateConcurrentBookingsSteps(
    initialState: DatabaseState
  ): { steps: SimulationStep[]; finalState: DatabaseState } {
    const steps: SimulationStep[] = [];
    const state = JSON.parse(JSON.stringify(initialState)) as DatabaseState;
    const lockMgr = new LockManager();

    // 3 Worker Robots with Home Docks at the Left-Hand Staging Bay
    const t1 = { id: 't1', name: 'Alpha Agent', color: 'blue' as const, hex: '#275D38', txId: 'Tx-201', baseX: 6, baseY: 22 };
    const t2 = { id: 't2', name: 'Beta Agent', color: 'amber' as const, hex: '#D4AF37', txId: 'Tx-202', baseX: 6, baseY: 52 };
    const t3 = { id: 't3', name: 'Gamma Agent', color: 'purple' as const, hex: '#7E22CE', txId: 'Tx-203', baseX: 6, baseY: 82 };

    const totalSteps = 10;
    let stepCounter = 1;

    const baseSessionId =
      state.Sessions.rows.length > 0
        ? Math.max(...state.Sessions.rows.map((r) => Number(r.session_id))) + 1
        : 1001;

    const newStudentId =
      state.Students.rows.length > 0
        ? Math.max(...state.Students.rows.map((r) => Number(r.student_id))) + 1
        : 6;

    // Transaction 1 (Alpha): Alice (#1) books Tutor #101
    const sessionT1: RowData = {
      session_id: baseSessionId,
      student_id: 1,
      tutor_id: 101,
      session_date: '2026-08-30 09:00',
      status: 'Confirmed',
    };

    // Transaction 3 (Gamma): Diana (#4) books Tutor #102 in parallel
    const sessionT3: RowData = {
      session_id: baseSessionId + 1,
      student_id: 4,
      tutor_id: 102,
      session_date: '2026-08-30 11:00',
      status: 'Confirmed',
    };

    // Transaction 2 (Beta): New Student Mateo Silva + Request for Tutor #101 (Multi-Table Transaction)
    const newStudentMateo: RowData = {
      student_id: newStudentId,
      first_name: 'Mateo',
      last_name: 'Silva',
      major: 'Data Science',
    };

    const sessionT2: RowData = {
      session_id: baseSessionId + 2,
      student_id: newStudentId,
      tutor_id: 101,
      session_date: '2026-08-30 10:00',
      status: 'Confirmed',
    };

    let robots: WorkerRobotState[] = [
      {
        id: t1.id,
        name: t1.name,
        color: t1.color,
        accentHex: t1.hex,
        txId: t1.txId,
        status: 'HOLDING_CARD',
        x: t1.baseX,
        y: t1.baseY,
        carryingCard: { title: `Session #${sessionT1.session_id}`, details: sessionT1 },
        speech: `Target: Tutor #101 (Alice)`,
      },
      {
        id: t2.id,
        name: t2.name,
        color: t2.color,
        accentHex: t2.hex,
        txId: t2.txId,
        status: 'HOLDING_CARD',
        x: t2.baseX,
        y: t2.baseY,
        carryingCard: { title: `New Student Mateo + Tutor #101`, details: { ...newStudentMateo, ...sessionT2 } },
        speech: `Target: New Student + Tutor #101`,
      },
      {
        id: t3.id,
        name: t3.name,
        color: t3.color,
        accentHex: t3.hex,
        txId: t3.txId,
        status: 'HOLDING_CARD',
        x: t3.baseX,
        y: t3.baseY,
        carryingCard: { title: `Session #${sessionT3.session_id}`, details: sessionT3 },
        speech: `Target: Tutor #102 (Diana)`,
      },
    ];

    const updateRobots = (patch: (r: WorkerRobotState) => WorkerRobotState) => {
      robots = robots.map(patch);
    };

    // STEP 1: All 3 Threads Spawn at Left-Hand Docks
    steps.push({
      stepIndex: 0,
      totalSteps,
      type: 'STEP_INIT',
      txId: 'CONCURRENCY_GROUP',
      threadId: 'multi',
      threadName: 'ThreadPool',
      threadColor: 'blue',
      title: `Step 1: 3 Concurrent Threads Pick Up Payloads at Left Staging Bay`,
      actionSummary: `3 threads spawned at Left-Hand Docks (Alpha at Dock 1, Beta at Dock 2, Gamma at Dock 3).`,
      pedagogicalDetail: `Concurrency Setup: Robot Alpha (Tx-201) and Robot Beta (Tx-202) target the same resource (Tutor #101). Robot Gamma (Tx-203) targets independent Tutor #102.`,
      timestamp: SimulationGenerator.getTimestamp(),
      workerStatesSnapshot: JSON.parse(JSON.stringify(robots)),
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 2: Robot Alpha moves to Tutors and places Exclusive Lock on Tutor #101
    lockMgr.requestLock({
      txId: t1.txId,
      threadName: t1.name,
      threadColor: t1.color,
      table: 'Tutors',
      rowId: 101,
      mode: 'EXCLUSIVE',
    });

    updateRobots((r) =>
      r.id === t1.id ? { ...r, status: 'WALKING', x: 80, y: 35, speech: `Acquired Exclusive PADLOCK on Tutor #101!` } : r
    );

    steps.push({
      stepIndex: stepCounter++,
      totalSteps,
      type: 'STEP_PLACE_PADLOCK',
      txId: t1.txId,
      threadId: t1.id,
      threadName: t1.name,
      threadColor: t1.color,
      title: `Step 2: Robot Alpha Placed Exclusive Padlock on Tutor #101`,
      actionSummary: `Robot Alpha placed an Exclusive PADLOCK on Tutor #101 row (Strict 2PL Phase 1).`,
      pedagogicalDetail: `Strict 2PL: Robot Alpha locks Tutor #101 before modifying sessions.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Tutors',
      targetRowId: 101,
      padlock: {
        table: 'Tutors',
        rowId: 101,
        isLocked: true,
        holderName: t1.name,
        holderColor: t1.color,
        mode: 'EXCLUSIVE',
      },
      workerStatesSnapshot: JSON.parse(JSON.stringify(robots)),
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 3: Robot Gamma places lock on Tutor #102 in Parallel
    lockMgr.requestLock({
      txId: t3.txId,
      threadName: t3.name,
      threadColor: t3.color,
      table: 'Tutors',
      rowId: 102,
      mode: 'EXCLUSIVE',
    });

    updateRobots((r) =>
      r.id === t3.id ? { ...r, status: 'WALKING', x: 80, y: 48, speech: `Locked Tutor #102 in parallel (Independent resource!)` } : r
    );

    steps.push({
      stepIndex: stepCounter++,
      totalSteps,
      type: 'STEP_PLACE_PADLOCK',
      txId: t3.txId,
      threadId: t3.id,
      threadName: t3.name,
      threadColor: t3.color,
      title: `Step 3: Robot Gamma Locked Tutor #102 (Parallel Execution)`,
      actionSummary: `Robot Gamma locked Tutor #102 (Independent resource runs concurrently without blocking).`,
      pedagogicalDetail: `Row-level locking enables non-conflicting transactions to execute in parallel.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Tutors',
      targetRowId: 102,
      padlock: {
        table: 'Tutors',
        rowId: 102,
        isLocked: true,
        holderName: t3.name,
        holderColor: t3.color,
        mode: 'EXCLUSIVE',
      },
      workerStatesSnapshot: JSON.parse(JSON.stringify(robots)),
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 4: Robot Beta arrives at Tutor #101 -> CONTENTION! Enters Lock Wait Queue Lane
    lockMgr.requestLock({
      txId: t2.txId,
      threadName: t2.name,
      threadColor: t2.color,
      table: 'Tutors',
      rowId: 101,
      mode: 'EXCLUSIVE',
    });

    const waitQueueRobotsList: WaitQueueLaneRobot[] = [
      {
        id: t2.id,
        name: t2.name,
        color: t2.color,
        txId: t2.txId,
        waitingOnResource: 'Tutors:101 (Alpha Agent)',
        timerSec: 1.5,
        queuePosition: 1,
      },
    ];

    updateRobots((r) =>
      r.id === t2.id
        ? {
            ...r,
            status: 'LOCKED_BLOCKED',
            x: 85,
            y: 12,
            speech: `BLOCKED by Alpha on Tutor #101! Enqueued in Lock Wait Queue (#1)... ⏳`,
            inQueueLane: {
              queuePosition: 1,
              waitingOnResource: 'Tutors:101',
              timerSec: 1.5,
            },
          }
        : r
    );

    steps.push({
      stepIndex: stepCounter++,
      totalSteps,
      type: 'STEP_ENTER_WAIT_QUEUE',
      txId: t2.txId,
      threadId: t2.id,
      threadName: t2.name,
      threadColor: t2.color,
      title: `Step 4: LOCK CONTENTION - Robot Beta Enters Lock Wait Queue Lane`,
      actionSummary: `LOCK CONTENTION! Robot Beta entered the on-stage Lock Wait Queue Lane (Slot #1) waiting for Tutor #101.`,
      pedagogicalDetail: `Concurrency Hazard Prevented: Robot Beta cannot write or lock Tutor #101 while Alpha's padlock is active. It waits safely in queue.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Tutors',
      targetRowId: 101,
      waitQueueLaneRobots: waitQueueRobotsList,
      workerStatesSnapshot: JSON.parse(JSON.stringify(robots)),
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 5: Robot Alpha types & writes Session #1007
    state.Sessions.rows.push(sessionT1);

    updateRobots((r) =>
      r.id === t1.id
        ? { ...r, status: 'SNAPPING_ROW', x: 55, y: 65, speech: `Typing Session #${sessionT1.session_id} (Alice + Turing)...` }
        : r
    );

    steps.push({
      stepIndex: stepCounter++,
      totalSteps,
      type: 'STEP_SNAP_PAYLOAD',
      txId: t1.txId,
      threadId: t1.id,
      threadName: t1.name,
      threadColor: t1.color,
      title: `Step 5: Robot Alpha Snapped Session #${sessionT1.session_id} into Sessions`,
      actionSummary: `Robot Alpha typed and materialized Session #${sessionT1.session_id} into 'Sessions'.`,
      pedagogicalDetail: `Write-Ahead Logging ensures session is durable.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Sessions',
      targetRowId: sessionT1.session_id,
      waitQueueLaneRobots: waitQueueRobotsList,
      workerStatesSnapshot: JSON.parse(JSON.stringify(robots)),
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 6: Robot Gamma writes Session #1008, Commits & Returns to Dock 3
    state.Sessions.rows.push(sessionT3);
    lockMgr.releaseLocksForTx(t3.txId);

    updateRobots((r) => {
      if (r.id === t3.id)
        return {
          ...r,
          status: 'SUCCESS',
          x: t3.baseX,
          y: t3.baseY,
          speech: `Session #${sessionT3.session_id} committed! Returned to Dock #3 ✔`,
        };
      return r;
    });

    steps.push({
      stepIndex: stepCounter++,
      totalSteps,
      type: 'STEP_SNAP_PAYLOAD',
      txId: t3.txId,
      threadId: t3.id,
      threadName: t3.name,
      threadColor: t3.color,
      title: `Step 6: Robot Gamma Committed Session #${sessionT3.session_id} & Returned to Dock #3`,
      actionSummary: `Robot Gamma committed Session #${sessionT3.session_id} in parallel and returned to Left Dock #3.`,
      pedagogicalDetail: `Non-conflicting transaction completes independently and frees its thread resources.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Sessions',
      targetRowId: sessionT3.session_id,
      waitQueueLaneRobots: waitQueueRobotsList,
      workerStatesSnapshot: JSON.parse(JSON.stringify(robots)),
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 7: Robot Alpha Commits, Releases Padlock on Tutor #101 & Returns to Dock 1
    lockMgr.releaseLocksForTx(t1.txId);

    updateRobots((r) => {
      if (r.id === t1.id)
        return {
          ...r,
          status: 'SUCCESS',
          x: t1.baseX,
          y: t1.baseY,
          speech: `Committed & Released Lock on Tutor #101! Returned to Dock #1 ✔`,
        };
      return r;
    });

    steps.push({
      stepIndex: stepCounter++,
      totalSteps,
      type: 'STEP_RELEASE_PADLOCK',
      txId: t1.txId,
      threadId: t1.id,
      threadName: t1.name,
      threadColor: t1.color,
      title: `Step 7: Robot Alpha Committed -> Lock on Tutor #101 Released`,
      actionSummary: `Robot Alpha committed Session #${sessionT1.session_id}, removed Padlock on Tutor #101, and returned to Left Dock #1.`,
      pedagogicalDetail: `Lock Handoff: The Lock Manager signals the next thread waiting in queue.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Tutors',
      targetRowId: 101,
      waitQueueLaneRobots: waitQueueRobotsList,
      padlock: {
        table: 'Tutors',
        rowId: 101,
        isLocked: false,
        holderName: '',
        holderColor: '',
        mode: 'NONE',
      },
      workerStatesSnapshot: JSON.parse(JSON.stringify(robots)),
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 8: Robot Beta Dispatched from Queue -> Mints New Student Mateo Silva in 'Students' Table!
    state.Students.rows.push(newStudentMateo);

    lockMgr.requestLock({
      txId: t2.txId,
      threadName: t2.name,
      threadColor: t2.color,
      table: 'Students',
      rowId: newStudentId,
      mode: 'EXCLUSIVE',
    });

    updateRobots((r) => {
      if (r.id === t2.id)
        return {
          ...r,
          status: 'SNAPPING_ROW',
          x: 45,
          y: 35,
          speech: `DISPATCHED from Queue! Minted New Student Mateo Silva (PK #${newStudentId}) in Students!`,
          inQueueLane: undefined,
        };
      return r;
    });

    steps.push({
      stepIndex: stepCounter++,
      totalSteps,
      type: 'STEP_DISPATCH_FROM_QUEUE',
      txId: t2.txId,
      threadId: t2.id,
      threadName: t2.name,
      threadColor: t2.color,
      title: `Step 8: Robot Beta Dispatched -> Materialized New Student Mateo Silva`,
      actionSummary: `Robot Beta DISPATCHED from Wait Queue! Created & typed New Student 'Mateo Silva' in 'Students' (Minted PK #${newStudentId}).`,
      pedagogicalDetail: `Multi-Table Multi-Threaded Execution: Robot Beta registers the student in 'Students' before linking the session in 'Sessions'.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Students',
      targetRowId: newStudentId,
      waitQueueLaneRobots: [], // Empty queue!
      ghostSlot: {
        table: 'Students',
        rowId: newStudentId,
        rowData: newStudentMateo,
        isSnapped: true,
      },
      workerStatesSnapshot: JSON.parse(JSON.stringify(robots)),
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 9: Robot Beta Passes FK student_id=6 to 'Sessions' & Snaps Session #1009 with Tutor #101
    state.Sessions.rows.push(sessionT2);

    lockMgr.requestLock({
      txId: t2.txId,
      threadName: t2.name,
      threadColor: t2.color,
      table: 'Sessions',
      rowId: sessionT2.session_id,
      mode: 'EXCLUSIVE',
    });

    updateRobots((r) => {
      if (r.id === t2.id)
        return {
          ...r,
          status: 'SNAPPING_ROW',
          x: 55,
          y: 68,
          speech: `Typed Session #${sessionT2.session_id} with FK student_id=${newStudentId} & Tutor #101!`,
        };
      return r;
    });

    steps.push({
      stepIndex: stepCounter++,
      totalSteps,
      type: 'STEP_SNAP_PAYLOAD',
      txId: t2.txId,
      threadId: t2.id,
      threadName: t2.name,
      threadColor: t2.color,
      title: `Step 9: Robot Beta Snapped Session #${sessionT2.session_id} into 'Sessions'`,
      actionSummary: `Robot Beta typed and snapped Session #${sessionT2.session_id} with FK student_id=${newStudentId} and tutor_id=101 into 'Sessions'.`,
      pedagogicalDetail: `Multi-Table Linkage: Foreign Key referential integrity verified across both newly created Student and Tutor records.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Sessions',
      targetRowId: sessionT2.session_id,
      ghostSlot: {
        table: 'Sessions',
        rowId: sessionT2.session_id,
        rowData: sessionT2,
        isSnapped: true,
      },
      workerStatesSnapshot: JSON.parse(JSON.stringify(robots)),
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 10: Robot Beta Commits & All 3 Threads Rest Consistently at Left Docks
    lockMgr.releaseLocksForTx(t2.txId);

    updateRobots((r) => {
      if (r.id === t2.id)
        return {
          ...r,
          status: 'SUCCESS',
          x: t2.baseX,
          y: t2.baseY,
          speech: `Multi-table transaction committed! Returned to Dock #2 ✔`,
        };
      return { ...r, status: 'IDLE' };
    });

    steps.push({
      stepIndex: stepCounter++,
      totalSteps,
      type: 'STEP_COMPLETE',
      txId: t2.txId,
      threadId: t2.id,
      threadName: t2.name,
      threadColor: t2.color,
      title: `Step 10: All 3 Concurrent Transactions Committed & Resting in Left Staging Bay`,
      actionSummary: `All 3 concurrent transactions finished with 0 conflicts. All robots safely returned to Left Staging Docks.`,
      pedagogicalDetail: `Complete 2PL Concurrency Verification: Full ACID isolation preserved across single-table and multi-table concurrent writes.`,
      timestamp: SimulationGenerator.getTimestamp(),
      waitQueueLaneRobots: [],
      workerStatesSnapshot: JSON.parse(JSON.stringify(robots)),
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    return { steps, finalState: state };
  }

  /**
   * [A] ATOMICITY DEMONSTRATION: Simulated mid-transaction crash & automatic clean rollback.
   */
  public static generateAtomicityRollbackSteps(
    initialState: DatabaseState
  ): { steps: SimulationStep[]; finalState: DatabaseState } {
    const steps: SimulationStep[] = [];
    const pristineState = JSON.parse(JSON.stringify(initialState)) as DatabaseState;
    const workingState = JSON.parse(JSON.stringify(initialState)) as DatabaseState;
    const lockMgr = new LockManager();
    const txId = 'Tx-ATOMIC-ROLLBACK';
    const threadName = 'Atomicity Agent';
    const threadColor = 'rose' as const;
    const threadHex = '#E11D48';

    const newStudentId = 6;
    const newStudentData: RowData = {
      student_id: newStudentId,
      first_name: 'Carlos',
      last_name: 'Mendez',
      major: 'Cybersecurity',
    };

    const targetSessionId = 1008;
    const sessionPayload: RowData = {
      session_id: targetSessionId,
      student_id: newStudentId,
      tutor_id: 101,
      session_date: '2026-09-01 14:00',
      status: 'Confirmed',
    };

    const sqlStr = `BEGIN TRANSACTION;\nINSERT INTO Students VALUES (6, 'Carlos', 'Mendez', 'Cybersecurity');\n-- [CRASH SIMULATION] Network Drop before Sessions write!\nINSERT INTO Sessions VALUES (1008, 6, 101, '2026-09-01 14:00', 'Confirmed');\nCOMMIT;`;

    const totalSteps = 7;

    // STEP 1: Spawn at Left Dock 1
    steps.push({
      stepIndex: 0,
      totalSteps,
      type: 'STEP_INIT',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `[A] Step 1: Initiated Multi-Table Atomic Transaction`,
      actionSummary: `Robot picked up combined Sign-up & Booking payload at Left Dock #1. Target: All-or-Nothing execution.`,
      pedagogicalDetail: `Atomicity Principle: The transaction must either complete entirely across both tables or leave the database completely unaltered.`,
      timestamp: SimulationGenerator.getTimestamp(),
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'INSERT',
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'HOLDING_CARD',
          x: 6,
          y: 22,
          speech: `[A] Atomicity Test: Signing up Carlos Mendez (PK #6) & Booking Session #1008...`,
          carryingCard: { title: 'Carlos Mendez + Session #1008', details: { ...newStudentData, ...sessionPayload } },
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(workingState)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 2: Lock Students Table
    lockMgr.requestLock({
      txId,
      threadName,
      threadColor,
      table: 'Students',
      rowId: newStudentId,
      mode: 'EXCLUSIVE',
    });

    steps.push({
      stepIndex: 1,
      totalSteps,
      type: 'STEP_PLACE_PADLOCK',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `[A] Step 2: Placed Padlock on Students Table`,
      actionSummary: `Acquired Exclusive PADLOCK on 'Students' table to insert Carlos Mendez.`,
      pedagogicalDetail: `Strict 2PL Growing Phase in action.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Students',
      targetRowId: newStudentId,
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'INSERT',
      padlock: {
        table: 'Students',
        rowId: newStudentId,
        isLocked: true,
        holderName: threadName,
        holderColor: threadColor,
        mode: 'EXCLUSIVE',
      },
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'SNAPPING_ROW',
          x: 35,
          y: 35,
          speech: `Locked Students row #6. Inserting Carlos Mendez...`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(workingState)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 3: Materialize Student in Students table (Partial write in memory)
    workingState.Students.rows.push(newStudentData);

    steps.push({
      stepIndex: 2,
      totalSteps,
      type: 'STEP_SNAP_PAYLOAD',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `[A] Step 3: Snapped Carlos Mendez into 'Students'`,
      actionSummary: `Materialized Carlos Mendez (PK #6) into 'Students'. Partial write exists in memory.`,
      pedagogicalDetail: `Student table written. Now proceeding to second table (Sessions).`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Students',
      targetRowId: newStudentId,
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'VALUES',
      ghostSlot: {
        table: 'Students',
        rowId: newStudentId,
        rowData: newStudentData,
        isSnapped: true,
      },
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'HOLDING_CARD',
          x: 35,
          y: 35,
          speech: `Carlos Mendez typed in Students! Now carrying FK to Sessions...`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(workingState)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 4: Traveling to Sessions...
    steps.push({
      stepIndex: 3,
      totalSteps,
      type: 'STEP_MOVE_TO_RESOURCE',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `[A] Step 4: Traveling Along Relational Pathway`,
      actionSummary: `Robot following Foreign Key pathway to 'Sessions' table.`,
      pedagogicalDetail: `Passing FK student_id=6 into Sessions.`,
      timestamp: SimulationGenerator.getTimestamp(),
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'INSERT',
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'WALKING',
          x: 45,
          y: 50,
          speech: `Traversing pathway... [Simulating Network / Power Interruption]`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(workingState)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 5: CRITICAL FAILURE OCCURS!
    steps.push({
      stepIndex: 4,
      totalSteps,
      type: 'STEP_ABORT_ROLLBACK',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `[A] Step 5: CRITICAL FAULT DETECTED! Automatic ROLLBACK Triggered`,
      actionSummary: `CRITICAL ERROR: Connection dropped before Sessions write! Transaction aborted. Initiating ROLLBACK!`,
      pedagogicalDetail: `Atomicity Invariant: Because the transaction failed before reaching COMMIT, all partial changes MUST be completely undone.`,
      timestamp: SimulationGenerator.getTimestamp(),
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'ROLLBACK',
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'LOCKED_BLOCKED',
          x: 35,
          y: 50,
          speech: `⚠️ CRITICAL FAULT: Network connection dropped! Initiating automatic ROLLBACK...`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(workingState)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 6: Rollback Erases uncommitted student record from Students table
    workingState.Students.rows = workingState.Students.rows.filter(
      (r) => String(r.student_id) !== String(newStudentId)
    );
    lockMgr.releaseLocksForTx(txId);

    steps.push({
      stepIndex: 5,
      totalSteps,
      type: 'STEP_ROLLBACK_COMPLETE',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `[A] Step 6: Undid Partial Writes & Erased Carlos Mendez`,
      actionSummary: `ROLLBACK executed! Erased uncommitted student record from 'Students' and released all padlocks.`,
      pedagogicalDetail: `Rollback Segment / Undo Log applied: Carlos Mendez removed. No orphan record left in Students.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Students',
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'ROLLBACK',
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'SUCCESS',
          x: 6,
          y: 22,
          speech: `ROLLBACK Complete: Erased Carlos Mendez from Students. Returned to Dock #1!`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(workingState)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 7: Finished & 100% Consistent
    steps.push({
      stepIndex: 6,
      totalSteps,
      type: 'STEP_COMPLETE',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `[A] Step 7: Atomicity Guaranteed (0 Corrupted State)`,
      actionSummary: `Atomicity demonstration complete. The database is in the exact pristine state as before the transaction began.`,
      pedagogicalDetail: `All-or-Nothing verified: Zero partial records, zero lock leaks.`,
      timestamp: SimulationGenerator.getTimestamp(),
      activeSqlString: sqlStr,
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'IDLE',
          x: 6,
          y: 22,
          speech: `[A] Atomicity Proved: Either ALL tables succeed, or ALL changes roll back!`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(pristineState)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    return { steps, finalState: pristineState };
  }

  /**
   * [C] CONSISTENCY DEMONSTRATION: Foreign Key constraint validation and violation rejection.
   */
  public static generateConsistencyViolationSteps(
    initialState: DatabaseState
  ): { steps: SimulationStep[]; finalState: DatabaseState } {
    const steps: SimulationStep[] = [];
    const state = JSON.parse(JSON.stringify(initialState)) as DatabaseState;
    const lockMgr = new LockManager();
    const txId = 'Tx-CONSISTENCY-FK-CHECK';
    const threadName = 'Consistency Agent';
    const threadColor = 'amber' as const;
    const threadHex = '#D4AF37';

    const sqlStr = `INSERT INTO Sessions (session_id, student_id, tutor_id, session_date, status)\nVALUES (1010, 1, 999, '2026-09-02 10:00', 'Confirmed');\n-- Constraint Check: FOREIGN KEY (tutor_id) REFERENCES Tutors(tutor_id)`;

    const totalSteps = 5;

    // STEP 1: Spawn at Left Dock 1
    steps.push({
      stepIndex: 0,
      totalSteps,
      type: 'STEP_INIT',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `[C] Step 1: Received Booking Request with Non-Existent Tutor #999`,
      actionSummary: `Robot received booking payload requesting invalid Tutor #999 at Left Dock #1. Commencing schema constraint evaluation.`,
      pedagogicalDetail: `Consistency Principle: Database transactions must transition the database from one valid state to another, preserving all Foreign Key and schema invariants.`,
      timestamp: SimulationGenerator.getTimestamp(),
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'INSERT',
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'HOLDING_CARD',
          x: 6,
          y: 22,
          speech: `[C] Consistency Check: Verifying Foreign Key (tutor_id = 999) in Tutors table...`,
          carryingCard: {
            title: 'Session #1010 (Tutor #999)',
            details: { session_id: 1010, student_id: 1, tutor_id: 999, status: 'Confirmed' },
          },
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 2: Glides to Tutors Table to lookup Tutor #999
    steps.push({
      stepIndex: 1,
      totalSteps,
      type: 'STEP_MOVE_TO_RESOURCE',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `[C] Step 2: Looking Up Parent Primary Key in 'Tutors'`,
      actionSummary: `Robot searching 'Tutors' table for Primary Key tutor_id = 999.`,
      pedagogicalDetail: `Referential Integrity Check: Before creating a child session, the database engine verifies parent existence in Tutors.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Tutors',
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'INSERT',
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'SCANNING',
          x: 80,
          y: 35,
          speech: `Scanning Tutors table: #101 (Turing), #102 (Lovelace), #103 (Knuth)... Where is #999?`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 3: Primary Key Not Found! Constraint Violation
    steps.push({
      stepIndex: 2,
      totalSteps,
      type: 'STEP_CONSTRAINT_VIOLATION',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `[C] Step 3: FOREIGN KEY CONSTRAINT VIOLATION!`,
      actionSummary: `CONSTRAINT VIOLATION: Primary Key 'tutor_id = 999' DOES NOT EXIST in 'Tutors' table!`,
      pedagogicalDetail: `Referential Integrity Preservation: Allowing this insert would create an orphan child record pointing to a non-existent entity.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Tutors',
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'INSERT',
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'LOCKED_BLOCKED',
          x: 80,
          y: 35,
          speech: `❌ FOREIGN KEY VIOLATION! Tutor #999 does not exist in Tutors table!`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 4: Transaction Aborted & Return to Dock 1
    steps.push({
      stepIndex: 3,
      totalSteps,
      type: 'STEP_ABORT_ROLLBACK',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `[C] Step 4: Transaction Aborted & Returned to Dock #1`,
      actionSummary: `Insert rejected. Zero rows written to 'Sessions'. Returned to Left Staging Dock #1.`,
      pedagogicalDetail: `The database engine guarantees that invalid relational states can never be committed.`,
      timestamp: SimulationGenerator.getTimestamp(),
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'ROLLBACK',
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'SUCCESS',
          x: 6,
          y: 22,
          speech: `Transaction safely aborted! Zero orphan records written ✔`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 5: Complete & Consistent
    steps.push({
      stepIndex: 4,
      totalSteps,
      type: 'STEP_COMPLETE',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `[C] Step 5: Consistency Invariants Maintained`,
      actionSummary: `Consistency demonstration complete. All Foreign Key relationships remain 100% valid.`,
      pedagogicalDetail: `Consistency guarantees that schema constraints are perpetually enforced.`,
      timestamp: SimulationGenerator.getTimestamp(),
      activeSqlString: sqlStr,
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'IDLE',
          x: 6,
          y: 22,
          speech: `[C] Consistency Proved: Referential integrity strictly enforced!`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    return { steps, finalState: state };
  }

  /**
   * [D] DURABILITY DEMONSTRATION: Write-Ahead Logging (WAL), Log Sequence Numbers (LSN), and non-volatile disk flush.
   */
  public static generateDurabilityWalSteps(
    initialState: DatabaseState
  ): { steps: SimulationStep[]; finalState: DatabaseState } {
    const steps: SimulationStep[] = [];
    const state = JSON.parse(JSON.stringify(initialState)) as DatabaseState;
    const lockMgr = new LockManager();
    const txId = 'Tx-DURABILITY-WAL';
    const threadName = 'Durability Agent';
    const threadColor = 'emerald' as const;
    const threadHex = '#059669';

    const newSessionId =
      state.Sessions.rows.length > 0
        ? Math.max(...state.Sessions.rows.map((r) => Number(r.session_id))) + 1
        : 1001;

    const sessionPayload: RowData = {
      session_id: newSessionId,
      student_id: 2, // Bob
      tutor_id: 103, // Knuth
      session_date: '2026-09-05 15:30',
      status: 'Confirmed',
    };

    const sqlStr = `BEGIN TRANSACTION;\n-- 1. Append Log Record to Non-Volatile WAL Journal\n[WAL LSN #1094] INSERT Sessions (session_id: ${newSessionId}, student: 2, tutor: 103);\n-- 2. Modify In-Memory Data Page & Flush to Disk\nINSERT INTO Sessions VALUES (${newSessionId}, 2, 103, '2026-09-05 15:30', 'Confirmed');\nCOMMIT;`;

    const totalSteps = 6;

    // STEP 1: Spawn at Left Dock 1
    steps.push({
      stepIndex: 0,
      totalSteps,
      type: 'STEP_INIT',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `[D] Step 1: Received Durable Booking Request at Dock #1`,
      actionSummary: `Robot received booking for Session #${newSessionId} at Left Dock #1. Target: Guarantee survival across crashes.`,
      pedagogicalDetail: `Durability Principle: Once a transaction commits, its modifications will permanently persist in non-volatile storage, even during power loss.`,
      timestamp: SimulationGenerator.getTimestamp(),
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'INSERT',
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'HOLDING_CARD',
          x: 6,
          y: 22,
          speech: `[D] Durability Test: Stamping WAL Log before writing to memory page...`,
          carryingCard: { title: `Session #${newSessionId}`, details: sessionPayload },
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 2: Write-Ahead Log (WAL) Journal Append
    steps.push({
      stepIndex: 1,
      totalSteps,
      type: 'STEP_WAL_APPEND',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `[D] Step 2: Stamped LSN #1094 to Write-Ahead Log (WAL)`,
      actionSummary: `Appended transaction record to Write-Ahead Log (WAL) journal with Log Sequence Number LSN #1094.`,
      pedagogicalDetail: `Write-Ahead Logging Rule: Changes MUST be serialized and flushed to the sequential WAL file on disk BEFORE modifying in-memory table pages.`,
      timestamp: SimulationGenerator.getTimestamp(),
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'INSERT',
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'WALKING',
          x: 25,
          y: 45,
          speech: `Stamped LSN #1094 to Write-Ahead Log (WAL) journal on disk!`,
          carryingCard: { title: `Session #${newSessionId}`, details: sessionPayload },
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 3: Padlock & Page Slot Allocation
    lockMgr.requestLock({
      txId,
      threadName,
      threadColor,
      table: 'Sessions',
      rowId: newSessionId,
      mode: 'EXCLUSIVE',
    });

    steps.push({
      stepIndex: 2,
      totalSteps,
      type: 'STEP_PLACE_PADLOCK',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `[D] Step 3: Allocated In-Memory Table Page Slot`,
      actionSummary: `Placed Exclusive PADLOCK on 'Sessions' row #${newSessionId} and prepared data page.`,
      pedagogicalDetail: `Strict 2PL in-memory lock acquired.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Sessions',
      targetRowId: newSessionId,
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'VALUES',
      padlock: {
        table: 'Sessions',
        rowId: newSessionId,
        isLocked: true,
        holderName: threadName,
        holderColor: threadColor,
        mode: 'EXCLUSIVE',
      },
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'HOLDING_CARD',
          x: 35,
          y: 65,
          speech: `Locked Sessions table. Writing Session #${newSessionId} to table page...`,
          carryingCard: { title: `Session #${newSessionId}`, details: sessionPayload },
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 4: Snap into Cells & Typing
    state.Sessions.rows.push(sessionPayload);

    steps.push({
      stepIndex: 3,
      totalSteps,
      type: 'STEP_SNAP_PAYLOAD',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `[D] Step 4: Materialized Session #${newSessionId} into Table Page`,
      actionSummary: `Typed and materialized Session #${newSessionId} (Bob + Knuth) into 'Sessions'.`,
      pedagogicalDetail: `In-memory dirty page modified. Backed by disk WAL.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Sessions',
      targetRowId: newSessionId,
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'VALUES',
      ghostSlot: {
        table: 'Sessions',
        rowId: newSessionId,
        rowData: sessionPayload,
        isSnapped: true,
      },
      padlock: {
        table: 'Sessions',
        rowId: newSessionId,
        isLocked: true,
        holderName: threadName,
        holderColor: threadColor,
        mode: 'EXCLUSIVE',
      },
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'SNAPPING_ROW',
          x: 35,
          y: 68,
          speech: `Typed Session #${newSessionId}! Preparing fsync() to non-volatile disk...`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 5: COMMIT & FSYNC DISK FLUSH
    lockMgr.releaseLocksForTx(txId);

    steps.push({
      stepIndex: 4,
      totalSteps,
      type: 'STEP_RELEASE_PADLOCK',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `[D] Step 5: Committed & Flushed fsync() to Disk`,
      actionSummary: `COMMIT successful! fsync() flushed log buffer to persistent disk. Padlock released.`,
      pedagogicalDetail: `Crash-Proof Guarantee: Even if power is completely cut at this exact millisecond, database recovery replay will restore Session #${newSessionId} from the WAL.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: 'Sessions',
      activeSqlString: sqlStr,
      sqlClauseHighlight: 'COMMIT',
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'SUCCESS',
          x: 6,
          y: 22,
          speech: `COMMIT Complete! Stamped & Flushed to non-volatile disk ✔`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // STEP 6: Complete & Return to Left Dock 1
    steps.push({
      stepIndex: 5,
      totalSteps,
      type: 'STEP_COMPLETE',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `[D] Step 6: Durability Guaranteed & Returned to Left Dock #1`,
      actionSummary: `Durability demonstration complete. Record is guaranteed permanent in storage.`,
      pedagogicalDetail: `Durability verified through Write-Ahead Logging.`,
      timestamp: SimulationGenerator.getTimestamp(),
      activeSqlString: sqlStr,
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'IDLE',
          x: 6,
          y: 22,
          speech: `[D] Durability Proved: Data is permanently committed to disk storage!`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    return { steps, finalState: state };
  }

  /**
   * Generates clause-by-clause structured simulation steps for SQL Query & JOIN execution:
   * Phase 1: SELECT * (Highlight projection target)
   * Phase 2: FROM Sessions (Focus driving table, Shared S-Lock, highlight all rows)
   * Phase 3: WHERE (Filter rows sequentially)
   * Phase 4: JOIN (Grab FK from Sessions -> Glide along connector -> Unlock PK in Tutors -> Project to Tray)
   * Phase 5: COMPLETE (Return to Left Dock #1)
   */
  public static generateSqlQuerySteps(
    initialState: DatabaseState,
    sqlQuery: string
  ): { steps: SimulationStep[]; queryResult: QueryResult } {
    const steps: SimulationStep[] = [];
    const state = JSON.parse(JSON.stringify(initialState)) as DatabaseState;
    const lockMgr = new LockManager();
    const txId = `Q-${Math.floor(100 + Math.random() * 900)}`;
    const threadName = 'Wolverine Inspector';
    const threadColor = 'cyan' as const;
    const threadHex = '#00843D';

    const parseResult = SqlParser.parse(sqlQuery);
    const ast = parseResult.ast;

    if (parseResult.error || ast.type !== 'SELECT') {
      const errorResult: QueryResult = {
        columns: ['Error'],
        rows: [{ Error: parseResult.error || 'Only SELECT queries can be visualized.' }],
        executionTimeMs: 10,
        rowsScanned: 0,
        rowsMatched: 0,
        queryPlanSteps: parseResult.plan,
      };

      steps.push({
        stepIndex: 0,
        totalSteps: 1,
        type: 'STEP_COMPLETE',
        txId,
        threadId: 't1',
        threadName,
        threadColor,
        title: `Query Execution Halted`,
        actionSummary: `Query Halted: ${parseResult.error || 'Invalid SQL.'}`,
        pedagogicalDetail: parseResult.error || 'Halted query.',
        timestamp: SimulationGenerator.getTimestamp(),
        activeSqlString: sqlQuery,
        workerStatesSnapshot: [
          {
            id: 't1',
            name: threadName,
            color: threadColor,
            accentHex: threadHex,
            txId,
            status: 'IDLE',
            x: 6,
            y: 22,
            speech: `Syntax Error: ${parseResult.error}`,
          },
        ],
        tableStateSnapshot: JSON.parse(JSON.stringify(state)),
        activeLocksSnapshot: lockMgr.getActiveLocks(),
        waitingLocksSnapshot: lockMgr.getWaitQueue(),
        queryResultSnapshot: errorResult,
      });

      return { steps, queryResult: errorResult };
    }

    const primaryTableName = Object.keys(state).find((k) => k.toLowerCase() === ast.table.toLowerCase()) || ast.table;
    const primaryTable = state[primaryTableName];

    if (!primaryTable) {
      const errorResult: QueryResult = {
        columns: ['Error'],
        rows: [{ Error: `Table '${primaryTableName}' not found in database schema.` }],
        executionTimeMs: 10,
        rowsScanned: 0,
        rowsMatched: 0,
      };
      return { steps, queryResult: errorResult };
    }

    // Dynamic stage coordinates based on targeted table
    let tableBaseX = 35;
    let tableBaseY = 58;
    if (primaryTableName === 'Students') {
      tableBaseX = 35;
      tableBaseY = 22;
    } else if (primaryTableName === 'Tutors') {
      tableBaseX = 75;
      tableBaseY = 22;
    } else {
      tableBaseX = 35;
      tableBaseY = 58;
    }

    const projectRow = (r: RowData, cols: string[]): RowData => {
      if (cols.includes('*')) return { ...r };
      const out: RowData = {};
      cols.forEach((col) => {
        const cleanCol = col.split('.').pop() || col;
        const matchedKey = Object.keys(r).find((k) => k.toLowerCase() === cleanCol.toLowerCase()) || cleanCol;
        out[cleanCol] = r[matchedKey] !== undefined ? r[matchedKey] : null;
      });
      return out;
    };

    const joinClauses: JoinClause[] = ast.joinClauses && ast.joinClauses.length > 0 
      ? ast.joinClauses 
      : (ast.joinClause ? [ast.joinClause] : []);

    const hasJoin = joinClauses.length > 0;
    const totalSteps = 3 + primaryTable.rows.length * (hasJoin ? (joinClauses.length * 3 + 1) : 1) + 1;
    let stepCounter = 1;

    // ----------------------------------------------------
    // PHASE 1: CLAUSE [SELECT] (PROJECTION SETUP)
    // ----------------------------------------------------
    const displayCols = ast.columns.join(', ');
    steps.push({
      stepIndex: 0,
      totalSteps,
      type: 'STEP_PARSE_SQL',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `Step 1: Clause [SELECT ${displayCols}] -> Projection Target Identified`,
      actionSummary: `Evaluating SELECT clause: Preparing to project [${displayCols}] from table '${primaryTableName}'. Target column headers highlighted!`,
      pedagogicalDetail: `Projection Phase: The query planner identifies target attributes [${displayCols}] to be extracted into the Query Results Tray.`,
      timestamp: SimulationGenerator.getTimestamp(),
      activeSqlString: sqlQuery,
      sqlClauseHighlight: 'SELECT',
      projectedColumns: ast.columns,
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'PARSING',
          x: 6,
          y: 22,
          speech: `SELECT ${displayCols}: Identifying output projection columns for final Results Tray!`,
          thought: `Columns: [${displayCols}]`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // ----------------------------------------------------
    // PHASE 2: CLAUSE [FROM Table] (TABLE FOCUS & SHARED S-LOCK)
    // ----------------------------------------------------
    lockMgr.requestLock({
      txId,
      threadName,
      threadColor,
      table: primaryTableName,
      mode: 'SHARED',
    });

    // Also acquire shared read locks on all joined tables
    joinClauses.forEach((jc) => {
      const joinTargetTableName = Object.keys(state).find((k) => k.toLowerCase() === jc.targetTable.toLowerCase()) || jc.targetTable;
      lockMgr.requestLock({
        txId,
        threadName,
        threadColor,
        table: joinTargetTableName,
        mode: 'SHARED',
      });
    });

    steps.push({
      stepIndex: stepCounter++,
      totalSteps,
      type: 'STEP_PLACE_PADLOCK',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `Step 2: Clause [FROM ${primaryTableName}] -> Focus Table & Shared S-Lock`,
      actionSummary: `Focus shifted to driving table '${primaryTableName}'! Acquired Shared Read Lock (S-Lock). Entire '${primaryTableName}' table highlighted!`,
      pedagogicalDetail: `Table Scan Phase: Database engine locks and loads the primary driving table (${primaryTableName}) into memory.`,
      timestamp: SimulationGenerator.getTimestamp(),
      targetTable: primaryTableName,
      activeSqlString: sqlQuery,
      sqlClauseHighlight: 'FROM',
      projectedColumns: ast.columns,
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'SCANNING',
          x: tableBaseX,
          y: tableBaseY,
          speech: `FROM ${primaryTableName}: Loading driving table ${primaryTableName} under Shared S-Lock!`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    // ----------------------------------------------------
    // PHASE 3 & 4: WHERE FILTER & MULTI-JOIN UNLOCK TRAVERSAL
    // ----------------------------------------------------
    const matchingRows: RowData[] = [];
    const trayRows: RowData[] = [];
    const evaluatedStatuses: {
      table?: string;
      rowIndex?: number;
      rowId?: any;
      status: 'MATCH' | 'FILTERED';
    }[] = [];

    for (let rowIndex = 0; rowIndex < primaryTable.rows.length; rowIndex++) {
      const row = primaryTable.rows[rowIndex];
      let passesWhere = true;

      if (ast.whereClause) {
        const whereCol = ast.whereClause.column.split('.').pop() || ast.whereClause.column;
        const matchedKey = Object.keys(row).find((k) => k.toLowerCase() === whereCol.toLowerCase()) || whereCol;
        const colVal = row[matchedKey];
        const targetVal = ast.whereClause.value;
        const op = ast.whereClause.operator;

        if (op === '=') passesWhere = String(colVal).toLowerCase() === String(targetVal).toLowerCase();
        else if (op === '!=') passesWhere = String(colVal).toLowerCase() !== String(targetVal).toLowerCase();
        else if (op === '>') passesWhere = Number(colVal) > Number(targetVal);
        else if (op === '<') passesWhere = Number(colVal) < Number(targetVal);
        else if (op === '>=') passesWhere = Number(colVal) >= Number(targetVal);
        else if (op === '<=') passesWhere = Number(colVal) <= Number(targetVal);
        else if (op === 'LIKE') passesWhere = String(colVal).toLowerCase().includes(String(targetVal).replace(/%/g, '').toLowerCase());
      }

      const rowYOffset = tableBaseY + Math.min(rowIndex * 3.5, 18);

      if (!passesWhere) {
        // Record marked as FILTERED (Struck through with Red Line)
        evaluatedStatuses.push({
          table: primaryTableName,
          rowIndex,
          rowId: row[primaryTable.schema.primaryKey],
          status: 'FILTERED',
        });

        steps.push({
          stepIndex: stepCounter++,
          totalSteps,
          type: 'STEP_SCAN_ROW',
          txId,
          threadId: 't1',
          threadName,
          threadColor,
          title: `Row [${rowIndex}]: WHERE FAILED ✖ (Struck Through with Red Line)`,
          actionSummary: `Evaluated WHERE on Row [${rowIndex}] -> FALSE ✖. Struck through record with a bold RED LINE!`,
          pedagogicalDetail: `Predicate evaluated to FALSE: Record does not meet WHERE criteria and is crossed out with a red strike-through line.`,
          timestamp: SimulationGenerator.getTimestamp(),
          targetTable: primaryTableName,
          targetRowIndex: rowIndex,
          targetRowId: row[primaryTable.schema.primaryKey],
          activeSqlString: sqlQuery,
          sqlClauseHighlight: 'WHERE',
          projectedColumns: ast.columns,
          extractedTrayRows: JSON.parse(JSON.stringify(trayRows)),
          evaluatedRowStatuses: JSON.parse(JSON.stringify(evaluatedStatuses)),
          predicateEvaluation: {
            expression: ast.whereClause ? `${ast.whereClause.column} ${ast.whereClause.operator} '${ast.whereClause.value}'` : 'TRUE',
            actualValues: row,
            passed: false,
            reason: `Filtered out`,
          },
          workerStatesSnapshot: [
            {
              id: 't1',
              name: threadName,
              color: threadColor,
              accentHex: threadHex,
              txId,
              status: 'SCANNING',
              x: tableBaseX,
              y: rowYOffset,
              targetTable: primaryTableName,
              targetRowIndex: rowIndex,
              speech: `Row [${rowIndex}]: WHERE ${ast.whereClause?.column} = '${ast.whereClause?.value}' is FALSE ✖. Struck through with RED LINE!`,
            },
          ],
          tableStateSnapshot: JSON.parse(JSON.stringify(state)),
          activeLocksSnapshot: lockMgr.getActiveLocks(),
          waitingLocksSnapshot: lockMgr.getWaitQueue(),
        });
      } else {
        // Record marked as MATCH (Circled with Red Circle)
        evaluatedStatuses.push({
          table: primaryTableName,
          rowIndex,
          rowId: row[primaryTable.schema.primaryKey],
          status: 'MATCH',
        });

        if (joinClauses.length > 0) {
          let combinedRow = { ...row };

          for (let jIdx = 0; jIdx < joinClauses.length; jIdx++) {
            const jc = joinClauses[jIdx];
            const joinTargetTableName = Object.keys(state).find((k) => k.toLowerCase() === jc.targetTable.toLowerCase()) || jc.targetTable;
            const joinTargetTable = state[joinTargetTableName];
            const srcCol = jc.sourceColumn.split('.').pop() || '';
            const tgtCol = jc.targetColumn.split('.').pop() || '';
            const fkVal = row[srcCol] !== undefined ? row[srcCol] : combinedRow[srcCol];
            const matchedParentRow = joinTargetTable?.rows.find((pr) => String(pr[tgtCol]) === String(fkVal));

            // Determine target table coordinates for robot animation
            let joinTargetX = 75;
            let joinTargetY = 25;
            if (joinTargetTableName === 'Students') {
              joinTargetX = 35;
              joinTargetY = 25;
            } else if (joinTargetTableName === 'Tutors') {
              joinTargetX = 75;
              joinTargetY = 25;
            }

            if (matchedParentRow) {
              evaluatedStatuses.push({
                table: joinTargetTableName,
                rowId: matchedParentRow[tgtCol],
                status: 'MATCH',
              });
              combinedRow = { ...combinedRow, ...matchedParentRow };
            }

            // 1. Grab Foreign Key Token from Sessions
            steps.push({
              stepIndex: stepCounter++,
              totalSteps,
              type: 'STEP_GRAB_KEY_TOKEN',
              txId,
              threadId: 't1',
              threadName,
              threadColor,
              title: `Row [${rowIndex}] (JOIN ${jIdx + 1}/${joinClauses.length}): Extracted FK (${srcCol} = #${fkVal})`,
              actionSummary: `Row [${rowIndex}] MATCH ✔! CIRCLED elements in '${primaryTableName}' and extracted Foreign Key (${srcCol} = #${fkVal}) for '${joinTargetTableName}'.`,
              pedagogicalDetail: `Foreign Key Extraction: The Foreign Key value #${fkVal} in ${primaryTableName} is extracted to unlock parent row in ${joinTargetTableName}.${tgtCol}.`,
              timestamp: SimulationGenerator.getTimestamp(),
              targetTable: primaryTableName,
              targetRowIndex: rowIndex,
              targetRowId: row[primaryTable.schema.primaryKey],
              activeSqlString: sqlQuery,
              sqlClauseHighlight: 'JOIN',
              projectedColumns: ast.columns,
              keyToken: {
                active: true,
                keyName: srcCol,
                keyValue: fkVal,
                sourceTable: primaryTableName,
                targetTable: joinTargetTableName,
                targetPkColumn: tgtCol,
                targetPkValue: fkVal,
                isUnlocking: false,
              },
              extractedTrayRows: JSON.parse(JSON.stringify(trayRows)),
              evaluatedRowStatuses: JSON.parse(JSON.stringify(evaluatedStatuses)),
              predicateEvaluation: {
                expression: ast.whereClause ? `${ast.whereClause.column} ${ast.whereClause.operator} '${ast.whereClause.value}'` : 'TRUE',
                actualValues: row,
                passed: true,
                reason: `Matched`,
              },
              workerStatesSnapshot: [
                {
                  id: 't1',
                  name: threadName,
                  color: threadColor,
                  accentHex: threadHex,
                  txId,
                  status: 'HOLDING_KEY',
                  x: tableBaseX,
                  y: rowYOffset,
                  speech: `JOIN [${joinTargetTableName}]: Extracted FK (${srcCol} = #${fkVal})!`,
                  carryingKeyToken: {
                    keyName: srcCol,
                    keyValue: fkVal,
                    sourceTable: primaryTableName,
                    targetTable: joinTargetTableName,
                  },
                },
              ],
              tableStateSnapshot: JSON.parse(JSON.stringify(state)),
              activeLocksSnapshot: lockMgr.getActiveLocks(),
              waitingLocksSnapshot: lockMgr.getWaitQueue(),
            });

            // 2. Traversing along Relational Pathway
            steps.push({
              stepIndex: stepCounter++,
              totalSteps,
              type: 'STEP_MOVE_TO_RESOURCE',
              txId,
              threadId: 't1',
              threadName,
              threadColor,
              title: `Gliding Along Relational Pathway (${primaryTableName} ➔ ${joinTargetTableName})`,
              actionSummary: `Robot following dotted Foreign Key pathway from ${primaryTableName}.${srcCol} to ${joinTargetTableName}.${tgtCol}.`,
              pedagogicalDetail: `Relational Navigation: Walking schema relationship link between Foreign Key and Primary Key.`,
              timestamp: SimulationGenerator.getTimestamp(),
              activeSqlString: sqlQuery,
              sqlClauseHighlight: 'JOIN',
              projectedColumns: ast.columns,
              keyToken: {
                active: true,
                keyName: srcCol,
                keyValue: fkVal,
                sourceTable: primaryTableName,
                targetTable: joinTargetTableName,
                targetPkColumn: tgtCol,
                targetPkValue: fkVal,
                isUnlocking: false,
              },
              extractedTrayRows: JSON.parse(JSON.stringify(trayRows)),
              evaluatedRowStatuses: JSON.parse(JSON.stringify(evaluatedStatuses)),
              workerStatesSnapshot: [
                {
                  id: 't1',
                  name: threadName,
                  color: threadColor,
                  accentHex: threadHex,
                  txId,
                  status: 'HOLDING_KEY',
                  x: (tableBaseX + joinTargetX) / 2,
                  y: (tableBaseY + joinTargetY) / 2,
                  speech: `Following Foreign Key pathway (${primaryTableName}.${srcCol} ➔ ${joinTargetTableName}.${tgtCol})...`,
                  carryingKeyToken: {
                    keyName: srcCol,
                    keyValue: fkVal,
                    sourceTable: primaryTableName,
                    targetTable: joinTargetTableName,
                  },
                },
              ],
              tableStateSnapshot: JSON.parse(JSON.stringify(state)),
              activeLocksSnapshot: lockMgr.getActiveLocks(),
              waitingLocksSnapshot: lockMgr.getWaitQueue(),
            });

            // 3. Arrive at Parent Table & Unlock Primary Key Row
            steps.push({
              stepIndex: stepCounter++,
              totalSteps,
              type: 'STEP_UNLOCK_PK_ROW',
              txId,
              threadId: 't1',
              threadName,
              threadColor,
              title: `🔑 UNLOCKED Primary Key #${fkVal} in '${joinTargetTableName}'!`,
              actionSummary: `Robot inserted Foreign Key Token into '${joinTargetTableName}' and UNLOCKED Primary Key (${tgtCol} = #${fkVal})!`,
              pedagogicalDetail: `Foreign Key -> Primary Key Resolution: Robot matches FK #${fkVal} with PK #${fkVal} in ${joinTargetTableName} and unlocks parent attributes.`,
              timestamp: SimulationGenerator.getTimestamp(),
              targetTable: joinTargetTableName,
              activeSqlString: sqlQuery,
              sqlClauseHighlight: 'JOIN',
              projectedColumns: ast.columns,
              keyToken: {
                active: true,
                keyName: srcCol,
                keyValue: fkVal,
                sourceTable: primaryTableName,
                targetTable: joinTargetTableName,
                targetPkColumn: tgtCol,
                targetPkValue: fkVal,
                isUnlocking: true,
              },
              joinBeam: {
                active: true,
                fromTable: primaryTableName,
                fromCol: srcCol,
                fromVal: fkVal,
                toTable: joinTargetTableName,
                toCol: tgtCol,
                toVal: fkVal,
              },
              extractedTrayRows: JSON.parse(JSON.stringify(trayRows)),
              evaluatedRowStatuses: JSON.parse(JSON.stringify(evaluatedStatuses)),
              workerStatesSnapshot: [
                {
                  id: 't1',
                  name: threadName,
                  color: threadColor,
                  accentHex: threadHex,
                  txId,
                  status: 'UNLOCKING_PK',
                  x: joinTargetX + 5,
                  y: joinTargetY + 5,
                  speech: `🔑 UNLOCKED Primary Key #${fkVal} in '${joinTargetTableName}'!`,
                },
              ],
              tableStateSnapshot: JSON.parse(JSON.stringify(state)),
              activeLocksSnapshot: lockMgr.getActiveLocks(),
              waitingLocksSnapshot: lockMgr.getWaitQueue(),
            });
          }

          // 4. Merge & Extract Combined Record to Results Tray
          const projectedMerged = projectRow(combinedRow, ast.columns);
          matchingRows.push(projectedMerged);
          trayRows.push(projectedMerged);

          steps.push({
            stepIndex: stepCounter++,
            totalSteps,
            type: 'STEP_EXTRACT_TO_TRAY',
            txId,
            threadId: 't1',
            threadName,
            threadColor,
            title: `Extracted Combined Record to Query Results Tray`,
            actionSummary: `Merged and projected attributes [${displayCols}] across joined tables into Results Tray!`,
            pedagogicalDetail: `Projection & Join Complete: The joined tuple is materialized into the final result set.`,
            timestamp: SimulationGenerator.getTimestamp(),
            activeSqlString: sqlQuery,
            sqlClauseHighlight: 'SELECT',
            projectedColumns: ast.columns,
            extractedTrayRows: JSON.parse(JSON.stringify(trayRows)),
            evaluatedRowStatuses: JSON.parse(JSON.stringify(evaluatedStatuses)),
            workerStatesSnapshot: [
              {
                id: 't1',
                name: threadName,
                color: threadColor,
                accentHex: threadHex,
                txId,
                status: 'SNAPPING_ROW',
                x: 35,
                y: 88,
                speech: `SELECT: Dropped combined tuple [${displayCols}] into Results Tray!`,
              },
            ],
            tableStateSnapshot: JSON.parse(JSON.stringify(state)),
            activeLocksSnapshot: lockMgr.getActiveLocks(),
            waitingLocksSnapshot: lockMgr.getWaitQueue(),
          });
        } else {
          // Simple SELECT without JOIN
          const projectedRow = projectRow(row, ast.columns);
          matchingRows.push(projectedRow);
          trayRows.push(projectedRow);

          steps.push({
            stepIndex: stepCounter++,
            totalSteps,
            type: 'STEP_EXTRACT_TO_TRAY',
            txId,
            threadId: 't1',
            threadName,
            threadColor,
            title: `Row [${rowIndex}]: MATCH ✔ (Circled for Results Tray)`,
            actionSummary: `Evaluated WHERE on Row [${rowIndex}] -> MATCH ✔. CIRCLED [${displayCols}] and extracted to Results Tray!`,
            pedagogicalDetail: `Matching tuple projected and added to result set.`,
            timestamp: SimulationGenerator.getTimestamp(),
            targetTable: primaryTableName,
            targetRowIndex: rowIndex,
            targetRowId: row[primaryTable.schema.primaryKey],
            activeSqlString: sqlQuery,
            sqlClauseHighlight: 'SELECT',
            projectedColumns: ast.columns,
            extractedTrayRows: JSON.parse(JSON.stringify(trayRows)),
            evaluatedRowStatuses: JSON.parse(JSON.stringify(evaluatedStatuses)),
            predicateEvaluation: {
              expression: ast.whereClause ? `${ast.whereClause.column} ${ast.whereClause.operator} '${ast.whereClause.value}'` : 'TRUE',
              actualValues: row,
              passed: true,
              reason: `Matched`,
            },
            workerStatesSnapshot: [
              {
                id: 't1',
                name: threadName,
                color: threadColor,
                accentHex: threadHex,
                txId,
                status: 'SNAPPING_ROW',
                x: 35,
                y: 88,
                speech: `SELECT: MATCH ✔ ⭕ CIRCLED Row [${rowIndex}] and extracted [${displayCols}] to Results Tray!`,
              },
            ],
            tableStateSnapshot: JSON.parse(JSON.stringify(state)),
            activeLocksSnapshot: lockMgr.getActiveLocks(),
            waitingLocksSnapshot: lockMgr.getWaitQueue(),
          });
        }
      }
    }

    // Determine final columns
    let resultColumns: string[] = [];
    if (ast.columns.includes('*')) {
      if (matchingRows.length > 0) {
        resultColumns = Object.keys(matchingRows[0]);
      } else {
        resultColumns = primaryTable.schema.columns.map((c) => c.name);
      }
    } else {
      resultColumns = ast.columns.map((c) => c.split('.').pop() || c);
    }

    const finalQueryResult: QueryResult = {
      columns: resultColumns,
      rows: trayRows,
      executionTimeMs: 8.5 + primaryTable.rows.length * 2,
      rowsScanned: primaryTable.rows.length,
      rowsMatched: trayRows.length,
      queryPlanSteps: parseResult.plan,
    };

    // Final Step: Complete, Release Locks & Return to Left Dock 1 (Preserves circles & crossed off rows!)
    lockMgr.releaseLocksForTx(txId);

    steps.push({
      stepIndex: stepCounter++,
      totalSteps,
      type: 'STEP_COMPLETE',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: `Step Final: Query Complete & Returned to Left Dock #1`,
      actionSummary: `Query complete! Extracted ${trayRows.length} matching rows [${displayCols}] into Query Results Tray. Released Shared locks and returned to Left Dock #1.`,
      pedagogicalDetail: `Query execution finished: ${trayRows.length} matching records extracted across ${primaryTable.rows.length} rows scanned.`,
      timestamp: SimulationGenerator.getTimestamp(),
      activeSqlString: sqlQuery,
      sqlClauseHighlight: undefined,
      projectedColumns: ast.columns,
      extractedTrayRows: trayRows,
      evaluatedRowStatuses: JSON.parse(JSON.stringify(evaluatedStatuses)),
      queryResultSnapshot: finalQueryResult,
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'SUCCESS',
          x: 6,
          y: 22,
          speech: `Query Execution Complete! Projected [${displayCols}] ready in Tray. Returned to Dock #1 ✔`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    return { steps, queryResult: finalQueryResult };
  }

  /**
   * Generates step-by-step physical robot construction animations for Build-Your-Own-Database DDL scripts.
   */
  public static generateBuildDatabaseSteps(
    currentState: DatabaseState,
    ddlScript: string
  ): { steps: SimulationStep[]; finalState: DatabaseState } {
    const state: DatabaseState = JSON.parse(JSON.stringify(currentState));
    const lockMgr = new LockManager();
    const steps: SimulationStep[] = [];

    const scriptResult = SqlParser.parseScript(ddlScript);
    const txId = 'Tx-DDL-Build';
    const threadName = 'Architect Agent (DDL)';
    const threadColor = 'emerald';
    const threadHex = '#275D38';

    let stepCounter = 0;
    const totalStatements = scriptResult.statements.length;
    const totalSteps = totalStatements * 6 + 2;

    // Step 0: Staging Bay Initialization & Schema Blueprint Inspection
    steps.push({
      stepIndex: stepCounter++,
      totalSteps,
      type: 'STEP_INIT',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: 'Step 1: Staging Bay -> Inspecting Database Schema Blueprint',
      actionSummary: `Worker Robot received DDL schema blueprint (${totalStatements} statements). Preparing memory buffers & physical construction bricks!`,
      pedagogicalDetail: 'DDL Initialization: Database catalog engine receives schema definitions and prepares transaction context.',
      timestamp: SimulationGenerator.getTimestamp(),
      activeSqlString: ddlScript.split('\n')[0] || ddlScript,
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'PARSING',
          x: 6,
          y: 22,
          speech: `DDL Blueprint Received (${totalStatements} tables/commands)! Moving to Stage Canvas to construct database...`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    let currentLsn = 400;

    for (let sIdx = 0; sIdx < scriptResult.statements.length; sIdx++) {
      const stmt = scriptResult.statements[sIdx];
      const ast = stmt.ast;

      if (ast.type === 'CREATE_TABLE' && ast.createTable) {
        const { tableName, columns, primaryKey, foreignKeys, cardinality } = ast.createTable;

        // Position on stage
        const existingTableCount = Object.keys(state).length;
        const tableX = existingTableCount % 2 === 0 ? 35 : 75;
        const tableY = existingTableCount < 2 ? 22 : 58;

        // 1. Move to Table Location with Table Frame Block
        steps.push({
          stepIndex: stepCounter++,
          totalSteps,
          type: 'STEP_MOVE_TO_RESOURCE',
          txId,
          threadId: 't1',
          threadName,
          threadColor,
          title: `Constructing Table Frame: '${tableName}' (Memory Allocation)`,
          actionSummary: `Robot transported physical storage frame and memory descriptor for new table '${tableName}'.`,
          pedagogicalDetail: `Table Allocation: Database engine allocates data pages, schema catalog metadata, and lock manager resources for '${tableName}'.`,
          timestamp: SimulationGenerator.getTimestamp(),
          targetTable: tableName,
          activeSqlString: ast.rawQuery,
          workerStatesSnapshot: [
            {
              id: 't1',
              name: threadName,
              color: threadColor,
              accentHex: threadHex,
              txId,
              status: 'MOVING',
              x: tableX,
              y: tableY,
              speech: `Allocating frame for new table '${tableName}' at memory block #${existingTableCount + 1}...`,
            },
          ],
          tableStateSnapshot: JSON.parse(JSON.stringify(state)),
          activeLocksSnapshot: lockMgr.getActiveLocks(),
          waitingLocksSnapshot: lockMgr.getWaitQueue(),
        });

        // Initialize table in state
        state[tableName] = {
          schema: {
            name: tableName,
            columns,
            primaryKey,
          },
          rows: [],
        };

        // 2. Lay Foundation & Stamp Frame
        steps.push({
          stepIndex: stepCounter++,
          totalSteps,
          type: 'STEP_CREATE_TABLE_FRAME',
          txId,
          threadId: 't1',
          threadName,
          threadColor,
          title: `🔨 Assembling Storage Frame for '${tableName}'`,
          actionSummary: `Physical table container assembled! Established primary key [${primaryKey}] index catalog.`,
          pedagogicalDetail: `Catalog Registry: Table '${tableName}' registered into pg_class/sys.tables with Primary Key constraint on '${primaryKey}'.`,
          timestamp: SimulationGenerator.getTimestamp(),
          targetTable: tableName,
          activeSqlString: ast.rawQuery,
          workerStatesSnapshot: [
            {
              id: 't1',
              name: threadName,
              color: threadColor,
              accentHex: threadHex,
              txId,
              status: 'INSERTING',
              x: tableX,
              y: tableY,
              speech: `🔨 Table Frame '${tableName}' assembled! Primary Key: [${primaryKey} 🔑]`,
            },
          ],
          tableStateSnapshot: JSON.parse(JSON.stringify(state)),
          activeLocksSnapshot: lockMgr.getActiveLocks(),
          waitingLocksSnapshot: lockMgr.getWaitQueue(),
        });

        // 3. Stamp Columns with Types
        const colListStr = columns.map((c) => `${c.name} (${c.type}${c.isPrimaryKey ? ' [PK]' : ''})`).join(', ');
        steps.push({
          stepIndex: stepCounter++,
          totalSteps,
          type: 'STEP_STAMP_COLUMNS',
          txId,
          threadId: 't1',
          threadName,
          threadColor,
          title: `🏷️ Stamped Columns: [${colListStr}]`,
          actionSummary: `Stamped ${columns.length} columns with strict type definitions on '${tableName}'.`,
          pedagogicalDetail: `Attribute Definition: Schema catalog records column offsets, binary widths, and nullability flags.`,
          timestamp: SimulationGenerator.getTimestamp(),
          targetTable: tableName,
          activeSqlString: ast.rawQuery,
          workerStatesSnapshot: [
            {
              id: 't1',
              name: threadName,
              color: threadColor,
              accentHex: threadHex,
              txId,
              status: 'HOLDING_KEY',
              x: tableX + 5,
              y: tableY + 5,
              speech: `🏷️ Stamped ${columns.length} columns on '${tableName}': [${colListStr}]`,
            },
          ],
          tableStateSnapshot: JSON.parse(JSON.stringify(state)),
          activeLocksSnapshot: lockMgr.getActiveLocks(),
          waitingLocksSnapshot: lockMgr.getWaitQueue(),
        });

        // 4. Wire Foreign Key Relationships (if any)
        if (foreignKeys && foreignKeys.length > 0) {
          for (const fk of foreignKeys) {
            steps.push({
              stepIndex: stepCounter++,
              totalSteps,
              type: 'STEP_WIRE_RELATIONSHIP_FK',
              txId,
              threadId: 't1',
              threadName,
              threadColor,
              title: `🔗 Wired Relational Link: ${tableName}.${fk.column} ➔ ${fk.targetTable}.${fk.targetColumn} [${fk.cardinality}]`,
              actionSummary: `Wired referential integrity conduit between ${tableName}.${fk.column} and parent ${fk.targetTable}.${fk.targetColumn} with cardinality badge [${fk.cardinality}].`,
              pedagogicalDetail: `Referential Integrity: Established Foreign Key constraint with cardinality [${fk.cardinality}]. Child records must reference existing parent keys.`,
              timestamp: SimulationGenerator.getTimestamp(),
              targetTable: tableName,
              activeSqlString: ast.rawQuery,
              keyToken: {
                active: true,
                keyName: fk.column,
                keyValue: `#FK`,
                sourceTable: tableName,
                targetTable: fk.targetTable,
                targetPkColumn: fk.targetColumn,
                targetPkValue: `#PK`,
                isUnlocking: false,
              },
              workerStatesSnapshot: [
                {
                  id: 't1',
                  name: threadName,
                  color: threadColor,
                  accentHex: threadHex,
                  txId,
                  status: 'HOLDING_KEY',
                  x: 55,
                  y: 40,
                  speech: `🔗 Connected Foreign Key conduit: ${tableName}.${fk.column} ➔ ${fk.targetTable}.${fk.targetColumn} [Cardinality: ${fk.cardinality}]!`,
                },
              ],
              tableStateSnapshot: JSON.parse(JSON.stringify(state)),
              activeLocksSnapshot: lockMgr.getActiveLocks(),
              waitingLocksSnapshot: lockMgr.getWaitQueue(),
            });
          }
        }

        // 5. Append WAL Log Record for DDL
        currentLsn++;
        steps.push({
          stepIndex: stepCounter++,
          totalSteps,
          type: 'STEP_WAL_APPEND',
          txId,
          threadId: 't1',
          threadName,
          threadColor,
          title: `📝 WAL Append: LSN #${currentLsn} (CREATE TABLE '${tableName}')`,
          actionSummary: `Persisted DDL transaction record to Write-Ahead Log (WAL) before catalog commit.`,
          pedagogicalDetail: `Durability Guarantee: All DDL catalog alterations are written to disk WAL before memory status is released.`,
          timestamp: SimulationGenerator.getTimestamp(),
          targetTable: tableName,
          activeSqlString: ast.rawQuery,
          workerStatesSnapshot: [
            {
              id: 't1',
              name: threadName,
              color: threadColor,
              accentHex: threadHex,
              txId,
              status: 'WRITING_WAL',
              x: tableX,
              y: tableY,
              speech: `📝 LSN #${currentLsn}: DDL log committed for '${tableName}'!`,
            },
          ],
          tableStateSnapshot: JSON.parse(JSON.stringify(state)),
          activeLocksSnapshot: lockMgr.getActiveLocks(),
          waitingLocksSnapshot: lockMgr.getWaitQueue(),
        });
      } else if (ast.type === 'INSERT' && ast.insertValues) {
        const targetTable = state[ast.table];
        if (targetTable) {
          targetTable.rows.push(ast.insertValues);
          currentLsn++;
          steps.push({
            stepIndex: stepCounter++,
            totalSteps,
            type: 'STEP_ROW_INSERT',
            txId,
            threadId: 't1',
            threadName,
            threadColor,
            title: `📥 Seed Record Materialized in '${ast.table}'`,
            actionSummary: `Populated initial seed row into '${ast.table}': ${JSON.stringify(ast.insertValues)}`,
            pedagogicalDetail: `Tuple Insertion: Row written to data page buffer under Exclusive Lock.`,
            timestamp: SimulationGenerator.getTimestamp(),
            targetTable: ast.table,
            activeSqlString: ast.rawQuery,
            workerStatesSnapshot: [
              {
                id: 't1',
                name: threadName,
                color: threadColor,
                accentHex: threadHex,
                txId,
                status: 'INSERTING',
                x: 50,
                y: 50,
                speech: `Inserted seed tuple into '${ast.table}'!`,
              },
            ],
            tableStateSnapshot: JSON.parse(JSON.stringify(state)),
            activeLocksSnapshot: lockMgr.getActiveLocks(),
            waitingLocksSnapshot: lockMgr.getWaitQueue(),
          });
        }
      }
    }

    // Final Step: Complete & Return to Left Dock #1
    steps.push({
      stepIndex: stepCounter++,
      totalSteps,
      type: 'STEP_CONSTRUCT_COMPLETE',
      txId,
      threadId: 't1',
      threadName,
      threadColor,
      title: '🎉 Database Construction Complete & Returned to Left Dock #1',
      actionSummary: `All tables constructed and verified! Released catalog locks and returned to Staging Dock #1. Database is live and ready for SQL queries!`,
      pedagogicalDetail: `Schema Online: New tables and relational cardinalities are fully queryable by the database engine.`,
      timestamp: SimulationGenerator.getTimestamp(),
      activeSqlString: undefined,
      workerStatesSnapshot: [
        {
          id: 't1',
          name: threadName,
          color: threadColor,
          accentHex: threadHex,
          txId,
          status: 'SUCCESS',
          x: 6,
          y: 22,
          speech: `🎉 Database Construction Complete! All tables & relationships are online and ready to query. Returned to Dock #1 ✔`,
        },
      ],
      tableStateSnapshot: JSON.parse(JSON.stringify(state)),
      activeLocksSnapshot: lockMgr.getActiveLocks(),
      waitingLocksSnapshot: lockMgr.getWaitQueue(),
    });

    return { steps, finalState: state };
  }
}
