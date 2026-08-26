import { DatabaseState } from '../types/database';

export const INITIAL_DATABASE_STATE: DatabaseState = {
  Students: {
    schema: {
      name: 'Students',
      primaryKey: 'student_id',
      columns: [
        { name: 'student_id', type: 'INTEGER', isPrimaryKey: true, nullable: false },
        { name: 'first_name', type: 'TEXT', nullable: false },
        { name: 'last_name', type: 'TEXT', nullable: false },
        { name: 'major', type: 'TEXT', nullable: false },
      ],
    },
    rows: [
      { student_id: 1, first_name: 'Alice', last_name: 'Johnson', major: 'Computer Science' },
      { student_id: 2, first_name: 'Bob', last_name: 'Smith', major: 'Mathematics' },
      { student_id: 3, first_name: 'Charlie', last_name: 'Davis', major: 'Data Science' },
      { student_id: 4, first_name: 'Diana', last_name: 'Prince', major: 'Physics' },
      { student_id: 5, first_name: 'Evan', last_name: 'Wright', major: 'Cybersecurity' },
    ],
  },
  Tutors: {
    schema: {
      name: 'Tutors',
      primaryKey: 'tutor_id',
      columns: [
        { name: 'tutor_id', type: 'INTEGER', isPrimaryKey: true, nullable: false },
        { name: 'name', type: 'TEXT', nullable: false },
        { name: 'subject_specialty', type: 'TEXT', nullable: false },
        { name: 'max_capacity', type: 'INTEGER', nullable: false },
      ],
    },
    rows: [
      { tutor_id: 101, name: 'Dr. Alan Turing', subject_specialty: 'Algorithms & AI', max_capacity: 4 },
      { tutor_id: 102, name: 'Prof. Ada Lovelace', subject_specialty: 'Calculus & Logic', max_capacity: 3 },
      { tutor_id: 103, name: 'Dr. Grace Hopper', subject_specialty: 'Database Systems', max_capacity: 5 },
      { tutor_id: 104, name: 'Dr. Claude Shannon', subject_specialty: 'Information Theory', max_capacity: 2 },
    ],
  },
  Sessions: {
    schema: {
      name: 'Sessions',
      primaryKey: 'session_id',
      columns: [
        { name: 'session_id', type: 'INTEGER', isPrimaryKey: true, nullable: false },
        {
          name: 'student_id',
          type: 'INTEGER',
          isForeignKey: true,
          foreignKeyTarget: { table: 'Students', column: 'student_id' },
          nullable: false,
        },
        {
          name: 'tutor_id',
          type: 'INTEGER',
          isForeignKey: true,
          foreignKeyTarget: { table: 'Tutors', column: 'tutor_id' },
          nullable: false,
        },
        { name: 'session_date', type: 'DATE', nullable: false },
        { name: 'status', type: 'TEXT', nullable: false },
      ],
    },
    rows: [
      { session_id: 1001, student_id: 1, tutor_id: 101, session_date: '2026-08-27 10:00', status: 'Confirmed' },
      { session_id: 1002, student_id: 2, tutor_id: 102, session_date: '2026-08-27 11:30', status: 'Completed' },
      { session_id: 1003, student_id: 3, tutor_id: 103, session_date: '2026-08-27 13:00', status: 'Pending' },
      { session_id: 1004, student_id: 4, tutor_id: 101, session_date: '2026-08-28 09:00', status: 'Confirmed' },
      { session_id: 1005, student_id: 5, tutor_id: 103, session_date: '2026-08-28 14:00', status: 'Completed' },
      { session_id: 1006, student_id: 1, tutor_id: 104, session_date: '2026-08-29 15:30', status: 'Cancelled' },
    ],
  },
};

export function getFreshDatabaseState(): DatabaseState {
  return JSON.parse(JSON.stringify(INITIAL_DATABASE_STATE));
}
