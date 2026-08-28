import {
  SqlAst,
  JoinClause,
  ColumnDefinition,
  RelationshipCardinality,
  DataType,
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
    } else if (upper.startsWith('CREATE')) {
      return SqlParser.parseCreateTable(cleaned);
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
      error: `Unsupported SQL command. Supported statements: SELECT, CREATE TABLE, INSERT, UPDATE, DELETE.`,
    };
  }

  /**
   * Parses a multi-statement SQL DDL script.
   */
  public static parseScript(script: string): {
    statements: { ast: SqlAst; plan: string[]; error?: string }[];
    hasErrors: boolean;
  } {
    const rawStmts = script
      .replace(/--.*$/gm, '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);

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
}
