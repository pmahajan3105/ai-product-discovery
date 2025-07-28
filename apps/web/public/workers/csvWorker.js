/**
 * CSV Processing Web Worker
 * Handles large CSV files in background without blocking main thread
 */

/* global importScripts, Papa */

// Import Papa Parse for the worker
importScripts('https://unpkg.com/papaparse@5.4.1/papaparse.min.js');

class CSVWorker {
  constructor() {
    this.isProcessing = false;
    this.currentOperation = null;
  }

  /**
   * Process CSV file with chunking and progress updates
   */
  processCSV(file, config = {}) {
    if (this.isProcessing) {
      this.postMessage({
        type: 'error',
        error: 'Another CSV processing operation is already in progress'
      });
      return;
    }

    this.isProcessing = true;
    this.currentOperation = 'parsing';
    
    const startTime = Date.now();
    let processedRows = 0;
    const chunks = [];
    const errors = [];

    const defaultConfig = {
      chunkSize: 1000,
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      ...config
    };

    // Estimate file processing for progress
    const totalEstimatedRows = Math.floor(file.size / 100); // Rough estimate

    this.postMessage({
      type: 'started',
      config: defaultConfig,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    });

    Papa.parse(file, {
      ...defaultConfig,
      chunk: (chunk) => {
        try {
          // Validate chunk data
          const validRows = this.validateChunkData(chunk.data, chunk.meta.fields);
          chunks.push(validRows);
          processedRows += chunk.data.length;
          errors.push(...chunk.errors);

          // Calculate progress
          const progress = Math.min(95, (processedRows / totalEstimatedRows) * 100);
          const timeElapsed = Date.now() - startTime;
          const estimatedTimeRemaining = progress > 0 ? (timeElapsed / progress) * (100 - progress) : 0;

          // Send progress update
          this.postMessage({
            type: 'progress',
            data: {
              processedRows,
              totalRows: totalEstimatedRows,
              progress: Math.round(progress),
              timeElapsed,
              estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
              currentChunk: chunks.length,
              chunkSize: chunk.data.length,
              errors: errors.length
            }
          });

          // Memory management: clear old chunks if too many
          if (chunks.length > 10) {
            chunks.splice(0, chunks.length - 5);
          }

        } catch (error) {
          this.postMessage({
            type: 'error',
            error: `Chunk processing error: ${error.message}`
          });
        }
      },
      complete: (results) => {
        try {
          const processingTime = Date.now() - startTime;
          
          // Flatten all chunks
          const allData = chunks.flat();
          
          // Final validation and cleanup
          const cleanedData = this.performFinalCleaning(allData, results.meta.fields);
          
          this.postMessage({
            type: 'complete',
            data: {
              rows: cleanedData,
              meta: {
                fields: results.meta.fields,
                delimiter: results.meta.delimiter,
                linebreak: results.meta.linebreak
              },
              stats: {
                totalRows: allData.length,
                validRows: cleanedData.length,
                errorRows: errors.length,
                processingTime,
                averageRowsPerSecond: Math.round(allData.length / (processingTime / 1000))
              },
              errors: errors.map(error => ({
                message: error.message,
                type: error.type,
                code: error.code,
                row: error.row
              }))
            }
          });

        } catch (error) {
          this.postMessage({
            type: 'error',
            error: `Final processing error: ${error.message}`
          });
        } finally {
          this.isProcessing = false;
          this.currentOperation = null;
        }
      },
      error: (error) => {
        this.postMessage({
          type: 'error',
          error: `CSV parsing error: ${error.message}`
        });
        this.isProcessing = false;
        this.currentOperation = null;
      }
    });
  }

  /**
   * Validate and clean chunk data
   */
  validateChunkData(rows, fields) {
    if (!Array.isArray(rows) || !fields) return [];

    return rows.filter(row => {
      // Skip empty rows
      if (!row || typeof row !== 'object') return false;
      
      // Check if row has any non-empty values
      const hasData = Object.values(row).some(value => 
        value !== null && value !== undefined && value !== ''
      );
      
      return hasData;
    }).map(row => {
      // Clean and standardize row data
      const cleanedRow = {};
      fields.forEach(field => {
        let value = row[field];
        
        // Handle different data types
        if (typeof value === 'string') {
          value = value.trim();
          
          // Convert empty strings to null
          if (value === '') {
            value = null;
          }
          
          // Try to parse numbers
          if (!isNaN(value) && !isNaN(parseFloat(value))) {
            const numValue = parseFloat(value);
            if (Number.isInteger(numValue) && Math.abs(numValue) < Number.MAX_SAFE_INTEGER) {
              value = parseInt(value, 10);
            } else {
              value = numValue;
            }
          }
          
          // Parse booleans
          if (value === 'true' || value === 'TRUE') value = true;
          if (value === 'false' || value === 'FALSE') value = false;
        }
        
        cleanedRow[field] = value;
      });
      
      return cleanedRow;
    });
  }

  /**
   * Perform final data cleaning and validation
   */
  performFinalCleaning(data, fields) {
    if (!Array.isArray(data)) return [];

    // Remove duplicates based on all fields
    const seen = new Set();
    const uniqueData = data.filter(row => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort data to ensure consistent output
    return uniqueData.sort((a, b) => {
      // Sort by first non-null field
      for (const field of fields) {
        const aVal = a[field];
        const bVal = b[field];
        
        if (aVal !== bVal) {
          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;
          
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            return aVal.localeCompare(bVal);
          }
          
          return aVal < bVal ? -1 : 1;
        }
      }
      return 0;
    });
  }

  /**
   * Cancel current operation
   */
  cancel() {
    if (this.isProcessing) {
      this.isProcessing = false;
      this.currentOperation = null;
      this.postMessage({
        type: 'cancelled',
        message: 'CSV processing was cancelled'
      });
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    this.postMessage({
      type: 'status',
      data: {
        isProcessing: this.isProcessing,
        currentOperation: this.currentOperation
      }
    });
  }

  /**
   * Send message to main thread
   */
  postMessage(message) {
    self.postMessage(message);
  }
}

// Initialize worker
const csvWorker = new CSVWorker();

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;

  switch (type) {
    case 'process':
      csvWorker.processCSV(data.file, data.config);
      break;
    
    case 'cancel':
      csvWorker.cancel();
      break;
    
    case 'status':
      csvWorker.getStatus();
      break;
    
    default:
      csvWorker.postMessage({
        type: 'error',
        error: `Unknown message type: ${type}`
      });
  }
};