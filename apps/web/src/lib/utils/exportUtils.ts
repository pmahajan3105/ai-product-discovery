/**
 * Export utilities for feedback data
 */

interface ExportData {
  data: any[];
  filename: string;
  format: 'csv' | 'json' | 'xlsx';
}

/**
 * Convert array of objects to CSV format
 */
export function arrayToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Download data as a file
 */
export function downloadFile(content: string, filename: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Export data to CSV format and trigger download
 */
export function exportToCSV(data: any[], filename: string): void {
  const csvContent = arrayToCSV(data);
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export data to JSON format and trigger download
 */
export function exportToJSON(data: any[], filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
}

/**
 * Export data to Excel format (basic CSV with .xlsx extension)
 * For a full Excel implementation, you would need a library like xlsx
 */
export function exportToExcel(data: any[], filename: string): void {
  // For now, we'll export as CSV with .xlsx extension
  // In a production app, you'd want to use a proper Excel library
  const csvContent = arrayToCSV(data);
  downloadFile(csvContent, filename.replace('.xlsx', '.csv'), 'text/csv;charset=utf-8;');
}

/**
 * Main export function that handles different formats
 */
export function exportData(exportData: ExportData): void {
  const { data, filename, format } = exportData;
  
  switch (format) {
    case 'csv':
      exportToCSV(data, filename);
      break;
    case 'json':
      exportToJSON(data, filename);
      break;
    case 'xlsx':
      exportToExcel(data, filename);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Format feedback data for export
 */
export function formatFeedbackForExport(feedbacks: any[]): any[] {
  return feedbacks.map(feedback => ({
    ID: feedback.id,
    Title: feedback.title,
    Description: feedback.description,
    Status: feedback.status,
    Priority: feedback.priority,
    Category: feedback.category || '',
    Source: feedback.source,
    'Customer Name': feedback.customerName || '',
    'Customer Email': feedback.customerEmail || '',
    'Customer Company': feedback.customerCompany || '',
    'Assigned To': feedback.assignedTo || '',
    Upvotes: feedback.upvoteCount || 0,
    'Created At': new Date(feedback.createdAt).toLocaleDateString(),
    'Updated At': new Date(feedback.updatedAt).toLocaleDateString()
  }));
}

/**
 * Generate export filename with timestamp
 */
export function generateExportFilename(prefix: string, format: string): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${prefix}-${timestamp}.${format}`;
}