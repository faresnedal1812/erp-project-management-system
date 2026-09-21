/**
 * CSV Exporter
 * Converts an array of flat objects to a RFC 4180 compliant CSV string.
 * All values are correctly escaped (commas, quotes, newlines).
 */

const escapeCsvValue = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  const sanitized = /^[=+\-@\t\r\n]/.test(str) ? `'${str}` : str;
  return `"${sanitized.replace(/"/g, '""')}"`;
};

/**
 * @param {object[]} rows   - Array of flat objects (report data)
 * @returns {string}        - CSV text content
 */
export const buildCsv = (rows) => {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(escapeCsvValue).join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsvValue(row[h])).join(","),
  );
  return [headerLine, ...dataLines].join("\r\n");
};
