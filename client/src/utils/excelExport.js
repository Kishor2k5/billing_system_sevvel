import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const toSafeDate = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
  return date.toISOString().split('T')[0];
};

const normalizeReportName = (name = 'report') =>
  String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'report';

export function exportToExcel(data, reportName) {
  const worksheet = XLSX.utils.json_to_sheet(Array.isArray(data) ? data : []);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream',
  });

  const fileName = `${normalizeReportName(reportName)}-${toSafeDate()}.xlsx`;
  saveAs(blob, fileName);
}
