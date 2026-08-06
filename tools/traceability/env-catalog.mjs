/**
 * Parsing and cross-checking for ENVIRONMENT_VARIABLE_CATALOG.md (task T004).
 *
 * Generalizes the ad hoc check performed manually during T003 into a
 * reusable, standing gate: enforces AC-002 ("No undocumented ... environment
 * variable ... is introduced") every time either the catalog or
 * packages/config's schema changes, not just once at authoring time.
 *
 * Pure functions, no filesystem access.
 */

const SECTION_HEADING = "## Authoritative Variable Matrix";
const ROW_RE = /^\|\s*`([A-Z0-9_]+)`\s*\|/;

/**
 * Extracts variable names from the catalog's "Authoritative Variable Matrix"
 * table only, avoiding false matches from prose or other sections.
 * @param {string} markdown
 * @returns {string[]}
 */
export function parseCatalogVariableNames(markdown) {
  const sectionIndex = markdown.indexOf(SECTION_HEADING);
  if (sectionIndex === -1) return [];
  const section = markdown.slice(sectionIndex);
  const names = [];
  for (const line of section.split(/\r?\n/)) {
    const match = ROW_RE.exec(line);
    if (match) names.push(match[1]);
  }
  return names;
}

/**
 * Diffs the catalog's variable names against the schema's variable names.
 * @param {string[]} catalogNames
 * @param {string[]} schemaNames
 * @returns {{code: string, message: string}[]} issues
 */
export function diffVariables(catalogNames, schemaNames) {
  const issues = [];
  const catalogSet = new Set(catalogNames);
  const schemaSet = new Set(schemaNames);

  for (const name of catalogNames) {
    if (!schemaSet.has(name)) {
      issues.push({
        code: "documented_but_unimplemented",
        message: `${name} is documented in ENVIRONMENT_VARIABLE_CATALOG.md but missing from packages/config's schema`,
      });
    }
  }
  for (const name of schemaNames) {
    if (!catalogSet.has(name)) {
      issues.push({
        code: "undocumented_variable",
        message: `${name} is present in packages/config's schema but not documented in ENVIRONMENT_VARIABLE_CATALOG.md (AC-002 violation)`,
      });
    }
  }

  const dupes = catalogNames.filter((name, i) => catalogNames.indexOf(name) !== i);
  for (const name of new Set(dupes)) {
    issues.push({
      code: "duplicate_catalog_entry",
      message: `${name} appears more than once in the catalog table`,
    });
  }

  return issues;
}
