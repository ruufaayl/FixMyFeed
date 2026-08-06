/**
 * Parsing and validation for implementation/WORKSTREAM_REGISTRY.md (task T004).
 *
 * Pure functions, no filesystem access — testable in isolation with in-memory
 * markdown strings, and reused by tools/traceability/check.mjs against the
 * real repository.
 *
 * Traceability: WORKSTREAM_REGISTRY.md functional requirements ("Task state
 * transitions must follow the implementation status ledger") and
 * IMPLEMENTATION_STATUS.md ("Allowed states: Not Started, Blocked, In
 * Progress, In Review, Verified, Released, Deprecated").
 */

export const ALLOWED_STATES = Object.freeze([
  "Not Started",
  "Blocked",
  "In Progress",
  "In Review",
  "Verified",
  "Released",
  "Deprecated",
]);

const TASK_ID_RE = /^T\d{3}$/;
const EPIC_ID_RE = /^E\d{2}$/;

/**
 * Extracts rows from the "## Task Inventory" markdown table.
 * @param {string} markdown
 * @returns {{task: string, name: string, epic: string, status: string, line: number}[]}
 */
export function parseRegistryTable(markdown) {
  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.findIndex((l) =>
    /^\|\s*Task\s*\|\s*Name\s*\|\s*Epic\s*\|\s*Status\s*\|/.test(l),
  );
  if (headerIndex === -1) return [];

  const rows = [];
  for (let i = headerIndex + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("|")) break; // table ended
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 4) continue;
    const [task, name, epic, status] = cells;
    rows.push({ task, name, epic, status, line: i + 1 });
  }
  return rows;
}

/**
 * Validates registry rows: allowed states, well-formed and unique IDs.
 * @param {{task: string, epic: string, status: string, line: number}[]} rows
 * @returns {{code: string, message: string}[]} issues
 */
export function validateRegistryRows(rows) {
  const issues = [];
  const seenTasks = new Map();

  for (const row of rows) {
    if (!TASK_ID_RE.test(row.task)) {
      issues.push({
        code: "malformed_task_id",
        message: `line ${row.line}: task id "${row.task}" does not match T### `,
      });
    } else if (seenTasks.has(row.task)) {
      issues.push({
        code: "duplicate_task_id",
        message: `line ${row.line}: duplicate task id "${row.task}" (first seen at line ${seenTasks.get(row.task)})`,
      });
    } else {
      seenTasks.set(row.task, row.line);
    }

    if (!EPIC_ID_RE.test(row.epic)) {
      issues.push({
        code: "malformed_epic_id",
        message: `line ${row.line}: epic id "${row.epic}" does not match E## for task ${row.task}`,
      });
    }

    if (!ALLOWED_STATES.includes(row.status)) {
      issues.push({
        code: "invalid_state",
        message: `line ${row.line}: status "${row.status}" for task ${row.task} is not one of: ${ALLOWED_STATES.join(", ")}`,
      });
    }
  }

  return issues;
}

/**
 * Cross-checks registry task/epic IDs against the on-disk task and epic
 * documents, bidirectionally: every registry row must have a doc, and every
 * doc must have a registry row.
 * @param {{task: string, epic: string}[]} rows
 * @param {string[]} taskFileIds - Task IDs derived from implementation/tasks/*.md filenames.
 * @param {string[]} epicFileIds - Epic IDs derived from implementation/epics/*.md filenames.
 * @returns {{code: string, message: string}[]} issues
 */
export function crossCheckDocs(rows, taskFileIds, epicFileIds) {
  const issues = [];
  const registryTasks = new Set(rows.map((r) => r.task));
  const registryEpics = new Set(rows.map((r) => r.epic));
  const taskFiles = new Set(taskFileIds);
  const epicFiles = new Set(epicFileIds);

  for (const task of registryTasks) {
    if (!taskFiles.has(task)) {
      issues.push({
        code: "orphan_registry_task",
        message: `registry references ${task} but no implementation/tasks/${task}-*.md exists`,
      });
    }
  }
  for (const task of taskFiles) {
    if (!registryTasks.has(task)) {
      issues.push({
        code: "orphan_task_doc",
        message: `implementation/tasks/${task}-*.md exists but ${task} is missing from the registry`,
      });
    }
  }
  for (const epic of registryEpics) {
    if (!epicFiles.has(epic)) {
      issues.push({
        code: "orphan_registry_epic",
        message: `registry references ${epic} but no implementation/epics/${epic}-*.md exists`,
      });
    }
  }

  return issues;
}
