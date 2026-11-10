import {
  SqlAst,
  JoinClause,
  ColumnDefinition,
  RelationshipCardinality,
  DataType,
  StoredProcedureParameter,
} from '../types/database';

export class SqlParser {
  /**
   * Known schema table names in the database
   */
  private static KNOWN_TABLES: Record<string, string> = {
    students: 'Students',
    tutors: 'Tutors',
    sessions: 'Sessions',
  };

  private static normalizeTableName(name: string): string {
    const lower = name.toLowerCase();
    return SqlParser.KNOWN_TABLES[lower] || name;
  }

  /**
   * Parses a SQL string into an AST with pedagogical query plan steps.
   */
  public static parse(sqlQuery: string): {
    ast: SqlAst;
    plan: string[];
    error?: string;
  } {
    // Strip single line comments and trailing semicolons, normalize whitespace
    const cleaned = sqlQuery
      .replace(/--.*$/gm, '')
      .replace(/;\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) {
      return {
        ast: { type: 'UNKNOWN', rawQuery: sqlQuery, table: '', columns: [] },
        plan: [],
        error: 'Empty SQL query provided.',
      };
    }

    const upper = cleaned.toUpperCase();

    if (upper.startsWith('SELECT')) {
      return SqlParser.parseSelect(cleaned);
    } else if (/^CREATE\s+(?:OR\s+REPLACE\s+)?VIEW/i.test(upper)) {
      return SqlParser.parseCreateView(cleaned);
    } else if (/^CREATE\s+(?:OR\s+REPLACE\s+)?(?:PROCEDURE|PROC)/i.test(upper)) {
      return SqlParser.parseCreateProcedure(cleaned);
    } else if (upper.startsWith('CREATE')) {
      return SqlParser.parseCreateTable(cleaned);
    } else if (/^DROP\s+VIEW/i.test(upper)) {
      return SqlParser.parseDropView(cleaned);
    } else if (/^DROP\s+(?:PROCEDURE|PROC)/i.test(upper)) {
      return SqlParser.parseDropProcedure(cleaned);
    } else if (/^DROP\s+TABLE/i.test(upper)) {
      return SqlParser.parseDropTable(cleaned);
    } else if (/^(?:CALL|EXEC|EXECUTE)\s+/i.test(upper)) {
      return SqlParser.parseCallProcedure(cleaned);
    } else if (upper.startsWith('INSERT')) {
      return SqlParser.parseInsert(cleaned);
    } else if (upper.startsWith('UPDATE')) {
      return SqlParser.parseUpdate(cleaned);
    } else if (upper.startsWith('DELETE')) {
      return SqlParser.parseDelete(cleaned);
    }

    return {
      ast: { type: 'UNKNOWN', rawQuery: sqlQuery, table: '', columns: [] },
      plan: [],
      error: `Unsupported SQL command. Supported statements: SELECT, INSERT, UPDATE, DELETE, CREATE/DROP TABLE, CREATE/DROP VIEW, CREATE/DROP PROCEDURE, CALL/EXEC.`,
    };
  }

  /**
   * Splits a SQL script into individual statements while respecting single/double quotes,
   * comments, and BEGIN ... END blocks in stored procedures.
   */
  public static splitScriptStatements(script: string): string[] {
    const stmts: string[] = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inLineComment = false;
    let inBlockComment = false;
    let blockDepth = 0;

    for (let i = 0; i < script.length; i++) {
      const char = script[i];
      const nextChar = script[i + 1] || '';

      // Check comments
      if (!inSingleQuote && !inDoubleQuote) {
        if (!inLineComment && !inBlockComment && char === '-' && nextChar === '-') {
          inLineComment = true;
          i++;
          continue;
        }
        if (inLineComment && (char === '\n' || char === '\r')) {
          inLineComment = false;
          continue;
        }
        if (!inLineComment && !inBlockComment && char === '/' && nextChar === '*') {
          inBlockComment = true;
          i++;
          continue;
        }
        if (inBlockComment && char === '*' && nextChar === '/') {
          inBlockComment = false;
          i++;
          continue;
        }
      }

      if (inLineComment || inBlockComment) continue;

      // Check quotes
      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        current += char;
        continue;
      }
      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        current += char;
        continue;
      }

      // Check BEGIN ... END depth
      if (!inSingleQuote && !inDoubleQuote) {
        const remaining = script.slice(i);
        if (/^BEGIN\b/i.test(remaining)) {
          blockDepth++;
        } else if (/^END\b/i.test(remaining)) {
          blockDepth = Math.max(0, blockDepth - 1);
        }

        // Semicolon statement boundary
        if (char === ';' && blockDepth === 0) {
          const trimmed = current.trim();
          if (trimmed) stmts.push(trimmed);
          current = '';
          continue;
        }
      }

      current += char;
    }

    const trimmed = current.trim();
    if (trimmed) stmts.push(trimmed);
    return stmts;
  }

  /**
   * Parses a multi-statement SQL script.
   */
  public static parseScript(script: string): {
    statements: { ast: SqlAst; plan: string[]; error?: string }[];
    hasErrors: boolean;
  } {
    const rawStmts = SqlParser.splitScriptStatements(script);
    const statements = rawStmts.map((s) => SqlParser.parse(s));
    const hasErrors = statements.some((s) => !!s.error);
    return { statements, hasErrors };
  }

  /**
   * Splits SQL comma-separated arguments while respecting nested parentheses and quotes.
   */
  public static splitSqlArguments(text: string): string[] {
    const result: string[] = [];
    let current = '';
    let parenDepth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        current += char;
      } else if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        current += char;
      } else if (char === '(' && !inSingleQuote && !inDoubleQuote) {
        parenDepth++;
        current += char;
      } else if (char === ')' && !inSingleQuote && !inDoubleQuote) {
        parenDepth = Math.max(0, parenDepth - 1);
        current += char;
      } else if (char === ',' && parenDepth === 0 && !inSingleQuote && !inDoubleQuote) {
        if (current.trim()) result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) result.push(current.trim());
    return result;
  }

  public static parseCreateTable(sql: string): { ast: SqlAst; plan: string[]; error?: string } {
    try {
      const match = sql.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s*\(([\s\S]+)\)$/i);
      if (!match) {
        return {
          ast: { type: 'CREATE_TABLE', rawQuery: sql, table: '', columns: [] },
          plan: [],
          error: "Syntax error in CREATE TABLE statement. Expected format: CREATE TABLE <TableName> (<colName> <type> [PRIMARY KEY / REFERENCES ...], ...)",
        };
      }

      const rawTableName = match[1].trim();
      const tableName = rawTableName.charAt(0).toUpperCase() + rawTableName.slice(1);
      const body = match[2].trim();

      const colDefs: ColumnDefinition[] = [];
      const foreignKeys: {
        column: string;
        targetTable: string;
        targetColumn: string;
        cardinality: RelationshipCardinality;
      }[] = [];
      let primaryKey = '';

      const lines = SqlParser.splitSqlArguments(body).map((l) => l.trim()).filter(Boolean);

      for (const line of lines) {
        // Table constraints
        const pkConstraintMatch = line.match(/^PRIMARY\s+KEY\s*\(([a-zA-Z0-9_]+)\)/i);
        if (pkConstraintMatch) {
          primaryKey = pkConstraintMatch[1].trim();
          const targetCol = colDefs.find((c) => c.name.toLowerCase() === primaryKey.toLowerCase());
          if (targetCol) targetCol.isPrimaryKey = true;
          continue;
        }

        const fkConstraintMatch = line.match(/^FOREIGN\s+KEY\s*\(([a-zA-Z0-9_]+)\)\s+REFERENCES\s+([a-zA-Z0-9_]+)\s*\(([a-zA-Z0-9_]+)\)/i);
        if (fkConstraintMatch) {
          const colName = fkConstraintMatch[1].trim();
          const rawTarget = fkConstraintMatch[2].trim();
          const targetTable = SqlParser.normalizeTableName(rawTarget);
          const targetCol = fkConstraintMatch[3].trim();
          const targetColDef = colDefs.find((c) => c.name.toLowerCase() === colName.toLowerCase());
          if (targetColDef) {
            targetColDef.isForeignKey = true;
            targetColDef.foreignKeyTarget = { table: targetTable, column: targetCol };
            targetColDef.foreignKeyCardinality = '1:M';
          }
          foreignKeys.push({
            column: colName,
            targetTable,
            targetColumn: targetCol,
            cardinality: '1:M',
          });
          continue;
        }

        // Inline column definition: <name> <type> [PRIMARY KEY] [REFERENCES target(col)] [UNIQUE]
        const colParts = line.split(/\s+/);
        if (colParts.length < 2) continue;

        const colName = colParts[0].trim().replace(/^[`"']|[`"']$/g, '');
        const rawType = colParts[1].trim().toUpperCase();
        let dataType: DataType = 'TEXT';
        if (rawType.includes('INT')) dataType = 'INTEGER';
        else if (rawType.includes('DATE') || rawType.includes('TIME')) dataType = 'DATE';
        else if (rawType.includes('VARCHAR') || rawType.includes('CHAR')) dataType = 'VARCHAR';
        else if (rawType.includes('NUMERIC') || rawType.includes('DECIMAL') || rawType.includes('REAL') || rawType.includes('FLOAT')) dataType = 'INTEGER';

        const isPk = /PRIMARY\s+KEY/i.test(line);
        const isFk = /REFERENCES/i.test(line);
        const isUnique = /UNIQUE/i.test(line);

        let fkTarget: { table: string; column: string } | undefined;
        let cardinality: RelationshipCardinality = '1:M';

        if (isFk) {
          const refMatch = line.match(/REFERENCES\s+([a-zA-Z0-9_]+)\s*\(\s*([a-zA-Z0-9_]+)\s*\)/i);
          if (refMatch) {
            const tgtTable = SqlParser.normalizeTableName(refMatch[1].trim());
            const tgtCol = refMatch[2].trim();
            cardinality = isUnique ? '1:1' : '1:M';
            fkTarget = { table: tgtTable, column: tgtCol };
            foreignKeys.push({
              column: colName,
              targetTable: tgtTable,
              targetColumn: tgtCol,
              cardinality,
            });
          }
        }

        if (isPk && !primaryKey) {
          primaryKey = colName;
        }

        colDefs.push({
          name: colName,
          type: dataType,
          isPrimaryKey: isPk,
          isForeignKey: isFk,
          foreignKeyTarget: fkTarget,
          foreignKeyCardinality: isFk ? cardinality : undefined,
        });
      }

      if (!primaryKey && colDefs.length > 0) {
        primaryKey = colDefs[0].name;
        colDefs[0].isPrimaryKey = true;
      }

      let tableCardinality: RelationshipCardinality = '1:M';
      if (foreignKeys.length >= 2) {
        tableCardinality = 'M:M';
      }

      const plan: string[] = [
        `1. Query Parser: Verified DDL Table Schema for '${tableName}'`,
        `2. Physical Allocation: Worker Robot provisions Memory Block & Table Frame on Visualizer Canvas`,
        `3. Schema Stamping: Stamp ${colDefs.length} Columns ([${colDefs.map((c) => c.name).join(', ')}]) with Primary Key (${primaryKey})`,
      ];
      if (foreignKeys.length > 0) {
        foreignKeys.forEach((fk) => {
          plan.push(`4. Relational Wiring: Link ${tableName}.${fk.column} ➔ ${fk.targetTable}.${fk.targetColumn} [Cardinality: ${fk.cardinality}]`);
        });
      }
      plan.push(`${foreignKeys.length > 0 ? 5 : 4}. Commit DDL Catalog Transaction to WAL & Render Active Table`);

      return {
        ast: {
          type: 'CREATE_TABLE',
          rawQuery: sql,
          table: tableName,
          columns: colDefs.map((c) => c.name),
          createTable: {
            tableName,
            columns: colDefs,
            primaryKey,
            foreignKeys,
            cardinality: tableCardinality,
          },
        },
        plan,
      };
    } catch (e: any) {
      return {
        ast: { type: 'CREATE_TABLE', rawQuery: sql, table: '', columns: [] },
        plan: [],
        error: `DDL Parse error: ${e.message}`,
      };
    }
  }

  private static parseSelect(sql: string): { ast: SqlAst; plan: string[]; error?: string } {
    try {
      // Find FROM keyword
      const fromIndex = sql.search(/\s+FROM\s+/i);
      if (fromIndex === -1) {
        return {
          ast: { type: 'SELECT', rawQuery: sql, table: '', columns: [] },
          plan: [],
          error: "Syntax error in SELECT statement. Missing 'FROM' clause.",
        };
      }

      const selectPart = sql.substring(0, fromIndex).replace(/^SELECT\s+/i, '').trim();
      if (!selectPart) {
        return {
          ast: { type: 'SELECT', rawQuery: sql, table: '', columns: [] },
          plan: [],
          error: "Syntax error: No columns specified after 'SELECT'.",
        };
      }

      const remainder = sql.substring(fromIndex).replace(/^\s+FROM\s+/i, '').trim();

      // Separate WHERE clause if present
      const whereMatch = remainder.match(/\s+WHERE\s+/i);
      const whereIndex = whereMatch ? remainder.search(/\s+WHERE\s+/i) : -1;

      let fromAndJoinsPart = whereIndex !== -1 ? remainder.substring(0, whereIndex).trim() : remainder;
      let afterWherePart = whereIndex !== -1 ? remainder.substring(whereIndex).replace(/^\s+WHERE\s+/i, '').trim() : '';

      // Strip ORDER BY and LIMIT
      if (afterWherePart.search(/\s+ORDER\s+BY\s+/i) !== -1) {
        afterWherePart = afterWherePart.substring(0, afterWherePart.search(/\s+ORDER\s+BY\s+/i)).trim();
      }
      if (fromAndJoinsPart.search(/\s+ORDER\s+BY\s+/i) !== -1) {
        fromAndJoinsPart = fromAndJoinsPart.substring(0, fromAndJoinsPart.search(/\s+ORDER\s+BY\s+/i)).trim();
      }
      if (afterWherePart.search(/\s+LIMIT\s+/i) !== -1) {
        afterWherePart = afterWherePart.substring(0, afterWherePart.search(/\s+LIMIT\s+/i)).trim();
      }
      if (fromAndJoinsPart.search(/\s+LIMIT\s+/i) !== -1) {
        fromAndJoinsPart = fromAndJoinsPart.substring(0, fromAndJoinsPart.search(/\s+LIMIT\s+/i)).trim();
      }

      // Parse primary table and all JOIN clauses
      const joinTokens = fromAndJoinsPart.split(/\s+(?:INNER\s+|LEFT\s+|RIGHT\s+)?JOIN\s+/i);
      const rawPrimaryTable = joinTokens[0].trim();
      const primaryTable = SqlParser.normalizeTableName(rawPrimaryTable);

      const joinClauses: JoinClause[] = [];
      for (let i = 1; i < joinTokens.length; i++) {
        const joinStr = joinTokens[i].trim();
        // Format: "<targetTable> ON <sourceCol> = <targetCol>"
        const onMatch = joinStr.match(/^([a-zA-Z0-9_]+)\s+ON\s+([a-zA-Z0-9_.]+)\s*=\s*([a-zA-Z0-9_.]+)$/i);
        if (onMatch) {
          const rawTargetTable = onMatch[1].trim();
          const targetTable = SqlParser.normalizeTableName(rawTargetTable);
          const colA = onMatch[2].trim();
          const colB = onMatch[3].trim();
          joinClauses.push({
            type: 'INNER',
            targetTable,
            sourceColumn: colA,
            targetColumn: colB,
          });
        }
      }

      const isAllCols = selectPart.replace(/\s+/g, '') === '*' || selectPart.trim() === '*';
      const columns = isAllCols
        ? ['*']
        : SqlParser.splitSqlArguments(selectPart).map((c) => c.trim());

      let whereClause: SqlAst['whereClause'] | undefined;
      if (afterWherePart) {
        const andParts = afterWherePart.split(/\s+AND\s+/i);
        const firstCond = SqlParser.parseCondition(andParts[0]);
        if (firstCond) {
          const mainWhere: NonNullable<SqlAst['whereClause']> = {
            column: firstCond.col,
            operator: firstCond.op,
            value: firstCond.val,
          };
          if (andParts.length > 1) {
            const secondCond = SqlParser.parseCondition(andParts[1]);
            if (secondCond) {
              mainWhere.andWhere = {
                column: secondCond.col,
                operator: secondCond.op,
                value: secondCond.val,
              };
            }
          }
          whereClause = mainWhere;
        }
      }

      // Generate pedagogical query plan
      const plan: string[] = [];
      plan.push(`1. Acquire Shared (S) Read-Locks on target table(s)`);
      plan.push(`2. Sequential Table Scan on '${primaryTable}'`);
      if (whereClause) {
        plan.push(`3. Filter Predicate: Evaluate [${afterWherePart}] for each row`);
      }
      joinClauses.forEach((jc, idx) => {
        plan.push(`${4 + idx}. Nested-Loop Join: Cross-reference '${primaryTable}.${jc.sourceColumn}' with '${jc.targetTable}.${jc.targetColumn}'`);
      });
      plan.push(`${4 + joinClauses.length}. Project Columns: [${columns.join(', ')}] into Output Buffer`);
      plan.push(`${5 + joinClauses.length}. Stream Results to Query Results Tray & Release Shared Locks`);

      return {
        ast: {
          type: 'SELECT',
          rawQuery: sql,
          table: primaryTable,
          columns,
          whereClause,
          joinClause: joinClauses.length > 0 ? joinClauses[0] : undefined,
          joinClauses,
        },
        plan,
      };
    } catch (e: any) {
      return {
        ast: { type: 'SELECT', rawQuery: sql, table: '', columns: [] },
        plan: [],
        error: `Parse error in SELECT: ${e.message}`,
      };
    }
  }

  private static parseCondition(condStr: string): { col: string; op: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE'; val: any } | null {
    const match = condStr.match(/([a-zA-Z0-9_.]+)\s*(=|!=|<>|<=|>=|<|>|LIKE)\s*(.+)/i);
    if (!match) return null;

    const col = match[1].trim();
    let op = match[2].trim().toUpperCase();
    if (op === '<>') op = '!=';
    let val: any = match[3].trim();

    // Strip single or double quotes for strings
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    } else if (!isNaN(Number(val)) && val !== '') {
      val = Number(val);
    }

    return { col, op: op as any, val };
  }

  private static parseInsert(sql: string): { ast: SqlAst; plan: string[]; error?: string } {
    try {
      // 1. With columns: INSERT INTO table (col1, col2) VALUES (val1, val2)
      // 2. Without columns: INSERT INTO table VALUES (val1, val2)
      const withColsMatch = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([\s\S]+?)\)\s*VALUES\s*\(([\s\S]+?)\)/i);
      const withoutColsMatch = !withColsMatch
        ? sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*VALUES\s*\(([\s\S]+?)\)/i)
        : null;

      if (!withColsMatch && !withoutColsMatch) {
        return {
          ast: { type: 'INSERT', rawQuery: sql, table: '', columns: [] },
          plan: [],
          error: 'Syntax error in INSERT statement. Expected format: INSERT INTO <table> [(<col1>, <col2>)] VALUES (<val1>, <val2>)',
        };
      }

      const rawTable = withColsMatch ? withColsMatch[1].trim() : withoutColsMatch![1].trim();
      const table = SqlParser.normalizeTableName(rawTable);

      const cols = withColsMatch
        ? SqlParser.splitSqlArguments(withColsMatch[2]).map((c) => c.trim().replace(/^[`"']|[`"']$/g, ''))
        : [];

      const rawVals = SqlParser.splitSqlArguments(
        withColsMatch ? withColsMatch[3] : withoutColsMatch![2]
      );

      const insertValues: Record<string, any> = {};
      rawVals.forEach((valStr, idx) => {
        let v: any = valStr.trim();
        if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
          v = v.slice(1, -1);
        } else if (!isNaN(Number(v)) && v !== '') {
          v = Number(v);
        }
        const colName = cols[idx] || `col_${idx + 1}`;
        insertValues[colName] = v;
      });

      const plan = [
        `1. Begin Write Transaction (Generate TxID)`,
        `2. Write-Ahead Log (WAL): Append tentative INSERT record with LSN`,
        `3. Acquire Exclusive (X) Lock on Table/Row slot in '${table}'`,
        `4. Verify Primary Key uniqueness and Foreign Key referential integrity`,
        `5. Materialize new row in in-memory memory page`,
        `6. WAL Commit record written -> Flush buffers`,
        `7. Strict 2PL: Release Exclusive Lock`,
      ];

      return {
        ast: {
          type: 'INSERT',
          rawQuery: sql,
          table,
          columns: cols.length > 0 ? cols : Object.keys(insertValues),
          insertValues,
        },
        plan,
      };
    } catch (e: any) {
      return {
        ast: { type: 'INSERT', rawQuery: sql, table: '', columns: [] },
        plan: [],
        error: `Parse error in INSERT: ${e.message}`,
      };
    }
  }

  private static parseUpdate(sql: string): { ast: SqlAst; plan: string[]; error?: string } {
    try {
      // UPDATE Table SET col = val WHERE condition
      const match = sql.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
      if (!match) {
        return {
          ast: { type: 'UPDATE', rawQuery: sql, table: '', columns: [] },
          plan: [],
          error: 'Syntax error in UPDATE statement. Expected format: UPDATE <table> SET <col> = <val> [WHERE <condition>]',
        };
      }

      const table = SqlParser.normalizeTableName(match[1].trim());
      const setPart = match[2].trim();
      const wherePart = match[3]?.trim();

      const updateValues: Record<string, any> = {};
      const setClauses = setPart.split(',');
      for (const clause of setClauses) {
        const [col, valStr] = clause.split('=').map((s) => s.trim());
        let val: any = valStr;
        if ((valStr.startsWith("'") && valStr.endsWith("'")) || (valStr.startsWith('"') && valStr.endsWith('"'))) {
          val = valStr.slice(1, -1);
        } else if (!isNaN(Number(valStr))) {
          val = Number(valStr);
        }
        updateValues[col] = val;
      }

      let whereClause: SqlAst['whereClause'] | undefined;
      if (wherePart) {
        const cond = SqlParser.parseCondition(wherePart);
        if (cond) {
          whereClause = {
            column: cond.col,
            operator: cond.op,
            value: cond.val,
          };
        }
      }

      const plan = [
        `1. Begin Write Transaction`,
        `2. Acquire Intent Exclusive (IX) and row-level Exclusive (X) locks on target records`,
        `3. Table Scan to evaluate WHERE predicate [${wherePart || 'ALL ROWS'}]`,
        `4. Append before-image and after-image to WAL buffer`,
        `5. Update target row values in-place`,
        `6. Write COMMIT record to WAL and release locks`,
      ];

      return {
        ast: {
          type: 'UPDATE',
          rawQuery: sql,
          table,
          columns: Object.keys(updateValues),
          updateValues,
          whereClause,
        },
        plan,
      };
    } catch (e: any) {
      return {
        ast: { type: 'UPDATE', rawQuery: sql, table: '', columns: [] },
        plan: [],
        error: `Parse error in UPDATE: ${e.message}`,
      };
    }
  }

  private static parseDelete(sql: string): { ast: SqlAst; plan: string[]; error?: string } {
    try {
      // DELETE FROM Table WHERE condition
      const match = sql.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?$/i);
      if (!match) {
        return {
          ast: { type: 'DELETE', rawQuery: sql, table: '', columns: [] },
          plan: [],
          error: 'Syntax error in DELETE statement. Expected format: DELETE FROM <table> [WHERE <condition>]',
        };
      }

      const table = SqlParser.normalizeTableName(match[1].trim());
      const wherePart = match[2]?.trim();

      let whereClause: SqlAst['whereClause'] | undefined;
      if (wherePart) {
        const cond = SqlParser.parseCondition(wherePart);
        if (cond) {
          whereClause = {
            column: cond.col,
            operator: cond.op,
            value: cond.val,
          };
        }
      }

      const plan = [
        `1. Begin Write Transaction`,
        `2. Acquire Exclusive (X) Lock on target row(s)`,
        `3. Check Foreign Key constraints in referencing tables`,
        `4. Write WAL record for tombstone deletion`,
        `5. Remove row from table memory page`,
        `6. Commit transaction and release locks`,
      ];

      return {
        ast: {
          type: 'DELETE',
          rawQuery: sql,
          table,
          columns: [],
          whereClause,
        },
        plan,
      };
    } catch (e: any) {
      return {
        ast: { type: 'DELETE', rawQuery: sql, table: '', columns: [] },
        plan: [],
        error: `Parse error in DELETE: ${e.message}`,
      };
    }
  }

  private static parseCreateView(sql: string): { ast: SqlAst; plan: string[]; error?: string } {
    try {
      // CREATE [OR REPLACE] VIEW [IF NOT EXISTS] view_name [(col1, col2)] AS <query>
      const match = sql.match(/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)(?:\s*\(([\s\S]+?)\))?\s+AS\s+([\s\S]+)$/i);
      if (!match) {
        return {
          ast: { type: 'CREATE_VIEW', rawQuery: sql, table: '', columns: [] },
          plan: [],
          error: 'Syntax error in CREATE VIEW. Expected format: CREATE VIEW <name> [(<columns>)] AS SELECT ...',
        };
      }

      const name = match[1].trim();
      const colString = match[2];
      const viewQuery = match[3].trim().replace(/;+$/, '');

      const columns = colString
        ? SqlParser.splitSqlArguments(colString).map((c) => c.trim().replace(/^[`"']|[`"']$/g, ''))
        : [];

      const innerParse = SqlParser.parseSelect(viewQuery);
      if (innerParse.error) {
        return {
          ast: { type: 'CREATE_VIEW', rawQuery: sql, table: name, columns },
          plan: [],
          error: `Error in VIEW definition query: ${innerParse.error}`,
        };
      }

      const plan = [
        `1. Parse underlying SELECT query definition`,
        `2. Validate referenced base tables and attributes`,
        `3. Compute projected view schema attributes`,
        `4. Register view '${name}' in database catalog (sys.views)`,
      ];

      return {
        ast: {
          type: 'CREATE_VIEW',
          rawQuery: sql,
          table: name,
          columns: columns.length > 0 ? columns : innerParse.ast.columns,
          createView: {
            name,
            query: viewQuery,
            columns: columns.length > 0 ? columns : innerParse.ast.columns,
          },
        },
        plan,
      };
    } catch (e: any) {
      return {
        ast: { type: 'CREATE_VIEW', rawQuery: sql, table: '', columns: [] },
        plan: [],
        error: `Parse error in CREATE VIEW: ${e.message}`,
      };
    }
  }

  private static parseDropView(sql: string): { ast: SqlAst; plan: string[]; error?: string } {
    try {
      const match = sql.match(/DROP\s+VIEW\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
      if (!match) {
        return {
          ast: { type: 'DROP_VIEW', rawQuery: sql, table: '', columns: [] },
          plan: [],
          error: 'Syntax error in DROP VIEW. Expected format: DROP VIEW [IF EXISTS] <view_name>',
        };
      }

      const name = match[1].trim();
      const ifExists = /IF\s+EXISTS/i.test(sql);

      return {
        ast: {
          type: 'DROP_VIEW',
          rawQuery: sql,
          table: name,
          columns: [],
          dropView: { name, ifExists },
        },
        plan: [`1. Check existence in catalog`, `2. Remove view definition for '${name}'`],
      };
    } catch (e: any) {
      return {
        ast: { type: 'DROP_VIEW', rawQuery: sql, table: '', columns: [] },
        plan: [],
        error: `Parse error in DROP VIEW: ${e.message}`,
      };
    }
  }

  private static parseCreateProcedure(sql: string): { ast: SqlAst; plan: string[]; error?: string } {
    try {
      const match = sql.match(/CREATE\s+(?:OR\s+REPLACE\s+)?(?:PROCEDURE|PROC)\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s*(?:\(([\s\S]*?)\))?\s*(?:AS\s+)?(?:BEGIN\s+)?([\s\S]+?)(?:\s*END)?(?:\s*;)?$/i);
      if (!match) {
        return {
          ast: { type: 'CREATE_PROCEDURE', rawQuery: sql, table: '', columns: [] },
          plan: [],
          error: 'Syntax error in CREATE PROCEDURE. Expected format: CREATE PROCEDURE <name>(<params>) BEGIN <body> END',
        };
      }

      const name = match[1].trim();
      const paramsRaw = match[2] ? match[2].trim() : '';
      let body = match[3].trim();
      body = body.replace(/\s*END\s*;?$/i, '').trim();

      const parameters: StoredProcedureParameter[] = [];
      if (paramsRaw) {
        const paramList = SqlParser.splitSqlArguments(paramsRaw);
        for (const p of paramList) {
          const cleanP = p.trim();
          if (!cleanP) continue;
          const tokens = cleanP.replace(/^(?:IN|OUT|INOUT)\s+/i, '').split(/\s+/);
          const pName = tokens[0].replace(/^[@]/, '').trim();
          const pType = tokens.slice(1).join(' ') || 'VARCHAR';
          parameters.push({ name: pName, type: pType });
        }
      }

      const plan = [
        `1. Parse procedure parameter signatures (${parameters.length} parameter(s))`,
        `2. Compile and syntax-check procedure body routine`,
        `3. Register stored procedure '${name}' into system catalog (sys.procedures)`,
      ];

      return {
        ast: {
          type: 'CREATE_PROCEDURE',
          rawQuery: sql,
          table: name,
          columns: [],
          createProcedure: {
            name,
            parameters,
            body,
          },
        },
        plan,
      };
    } catch (e: any) {
      return {
        ast: { type: 'CREATE_PROCEDURE', rawQuery: sql, table: '', columns: [] },
        plan: [],
        error: `Parse error in CREATE PROCEDURE: ${e.message}`,
      };
    }
  }

  private static parseDropProcedure(sql: string): { ast: SqlAst; plan: string[]; error?: string } {
    try {
      const match = sql.match(/DROP\s+(?:PROCEDURE|PROC)\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
      if (!match) {
        return {
          ast: { type: 'DROP_PROCEDURE', rawQuery: sql, table: '', columns: [] },
          plan: [],
          error: 'Syntax error in DROP PROCEDURE. Expected format: DROP PROCEDURE [IF EXISTS] <proc_name>',
        };
      }

      const name = match[1].trim();
      const ifExists = /IF\s+EXISTS/i.test(sql);

      return {
        ast: {
          type: 'DROP_PROCEDURE',
          rawQuery: sql,
          table: name,
          columns: [],
          dropProcedure: { name, ifExists },
        },
        plan: [`1. Check routine existence in catalog`, `2. Remove routine definition for '${name}'`],
      };
    } catch (e: any) {
      return {
        ast: { type: 'DROP_PROCEDURE', rawQuery: sql, table: '', columns: [] },
        plan: [],
        error: `Parse error in DROP PROCEDURE: ${e.message}`,
      };
    }
  }

  private static parseCallProcedure(sql: string): { ast: SqlAst; plan: string[]; error?: string } {
    try {
      const match = sql.match(/^(?:CALL|EXEC|EXECUTE)\s+([a-zA-Z0-9_]+)(?:\s*\(([\s\S]*?)\)|\s+([\s\S]+))?$/i);
      if (!match) {
        return {
          ast: { type: 'CALL_PROCEDURE', rawQuery: sql, table: '', columns: [] },
          plan: [],
          error: 'Syntax error in CALL/EXEC. Expected format: CALL <procedure_name>(<arguments>)',
        };
      }

      const name = match[1].trim();
      const argsRaw = (match[2] !== undefined ? match[2] : match[3]) || '';

      const rawArgs = argsRaw.trim() ? SqlParser.splitSqlArguments(argsRaw.trim()) : [];
      const parsedArgs = rawArgs.map((arg) => {
        const trimmed = arg.trim();
        if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
          return trimmed.slice(1, -1);
        }
        if (!isNaN(Number(trimmed)) && trimmed !== '') {
          return Number(trimmed);
        }
        if (trimmed.toUpperCase() === 'NULL') return null;
        if (trimmed.toUpperCase() === 'TRUE') return true;
        if (trimmed.toUpperCase() === 'FALSE') return false;
        return trimmed;
      });

      return {
        ast: {
          type: 'CALL_PROCEDURE',
          rawQuery: sql,
          table: name,
          columns: [],
          callProcedure: {
            name,
            arguments: parsedArgs,
          },
        },
        plan: [
          `1. Lookup procedure '${name}' in catalog`,
          `2. Bind ${parsedArgs.length} argument(s) to parameter variables`,
          `3. Execute procedure body routine statements`,
        ],
      };
    } catch (e: any) {
      return {
        ast: { type: 'CALL_PROCEDURE', rawQuery: sql, table: '', columns: [] },
        plan: [],
        error: `Parse error in CALL/EXEC: ${e.message}`,
      };
    }
  }

  private static parseDropTable(sql: string): { ast: SqlAst; plan: string[]; error?: string } {
    try {
      const match = sql.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
      if (!match) {
        return {
          ast: { type: 'DROP_TABLE', rawQuery: sql, table: '', columns: [] },
          plan: [],
          error: 'Syntax error in DROP TABLE. Expected format: DROP TABLE [IF EXISTS] <table_name>',
        };
      }

      const name = SqlParser.normalizeTableName(match[1].trim());
      const ifExists = /IF\s+EXISTS/i.test(sql);

      return {
        ast: {
          type: 'DROP_TABLE',
          rawQuery: sql,
          table: name,
          columns: [],
          dropTable: { name, ifExists },
        },
        plan: [`1. Check table '${name}' in catalog`, `2. Drop data pages and unregister schema`],
      };
    } catch (e: any) {
      return {
        ast: { type: 'DROP_TABLE', rawQuery: sql, table: '', columns: [] },
        plan: [],
        error: `Parse error in DROP TABLE: ${e.message}`,
      };
    }
  }
}
