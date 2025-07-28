/**
 * Streaming CSV Parser for Large File Performance
 * Based on Papa Parse with chunking and memory optimization
 */

import Papa from 'papaparse';

export interface CSVParseConfig {
  chunkSize?: number; // Number of rows per chunk (default: 1000)
  delimiter?: string;
  skipEmptyLines?: boolean;
  header?: boolean;
  preview?: number; // Number of rows to preview (0 = all)
  maxFileSize?: number; // Max file size in bytes (default: 50MB)
}

export interface CSVChunk {
  data: any[];
  meta: {
    cursor: number;
    delimiter: string;
    linebreak: string;
    aborted: boolean;
    truncated: boolean;
    fields?: string[];
  };
}

export interface CSVParseProgress {
  totalRows: number;
  processedRows: number;
  currentChunk: number;
  totalChunks: number;
  progress: number; // 0-100
  timeElapsed: number;
  estimatedTimeRemaining: number;
}

export interface CSVParseResult {
  data: any[];
  meta: Papa.ParseMeta;
  errors: Papa.ParseError[];
  stats: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    processingTime: number;
    memoryUsage?: number;
  };
}

export class StreamingCSVParser {
  private config: Required<CSVParseConfig>;
  private startTime: number = 0;
  private processedRows: number = 0;
  private totalEstimatedRows: number = 0;
  private chunks: any[][] = [];
  private errors: Papa.ParseError[] = [];

  constructor(config: CSVParseConfig = {}) {
    this.config = {
      chunkSize: config.chunkSize || 1000,
      delimiter: config.delimiter || '',
      skipEmptyLines: config.skipEmptyLines !== false,
      header: config.header !== false,
      preview: config.preview || 0,
      maxFileSize: config.maxFileSize || 50 * 1024 * 1024, // 50MB
    };
  }

  /**
   * Parse file with streaming for large files
   */
  async parseFile(
    file: File,
    onProgress?: (progress: CSVParseProgress) => void,
    onChunk?: (chunk: CSVChunk) => void
  ): Promise<CSVParseResult> {
    return new Promise((resolve, reject) => {
      // Validate file size
      if (file.size > this.config.maxFileSize) {
        reject(new Error(`File size ${this.formatBytes(file.size)} exceeds maximum allowed size of ${this.formatBytes(this.config.maxFileSize)}`));
        return;
      }

      this.startTime = Date.now();
      this.processedRows = 0;
      this.chunks = [];
      this.errors = [];

      // Estimate total rows for progress calculation
      this.estimateTotalRows(file);

      Papa.parse(file, {
        ...this.config,
        chunk: (chunk: Papa.ParseResult<any>) => {
          this.handleChunk(chunk, onProgress, onChunk);
        },
        complete: (results: Papa.ParseResult<any>) => {
          this.handleComplete(results, resolve);
        },
        error: (error: Papa.ParseError) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  }

  /**
   * Parse file in preview mode (first N rows only)
   */
  async parsePreview(file: File, previewRows: number = 5): Promise<CSVParseResult> {
    return new Promise((resolve, reject) => {
      if (file.size > this.config.maxFileSize) {
        reject(new Error(`File size exceeds maximum allowed size`));
        return;
      }

      Papa.parse(file, {
        header: this.config.header,
        skipEmptyLines: this.config.skipEmptyLines,
        preview: previewRows,
        complete: (results) => {
          resolve({
            data: results.data,
            meta: results.meta,
            errors: results.errors,
            stats: {
              totalRows: results.data.length,
              validRows: results.data.length,
              errorRows: results.errors.length,
              processingTime: 0,
            }
          });
        },
        error: (error) => {
          reject(new Error(`Preview parsing error: ${error.message}`));
        }
      });
    });
  }

  /**
   * Validate CSV structure without full parsing
   */
  async validateStructure(file: File): Promise<{
    isValid: boolean;
    headers?: string[];
    sampleData?: any[];
    errors?: string[];
  }> {
    try {
      const preview = await this.parsePreview(file, 3);
      
      if (preview.errors.length > 0) {
        return {
          isValid: false,
          errors: preview.errors.map(e => e.message)
        };
      }

      return {
        isValid: true,
        headers: preview.meta.fields,
        sampleData: preview.data,
      };
    } catch (error: any) {
      return {
        isValid: false,
        errors: [error.message]
      };
    }
  }

  private handleChunk(
    chunk: Papa.ParseResult<any>,
    onProgress?: (progress: CSVParseProgress) => void,
    onChunk?: (chunk: CSVChunk) => void
  ) {
    // Store chunk data
    this.chunks.push(chunk.data);
    this.processedRows += chunk.data.length;
    this.errors.push(...chunk.errors);

    // Calculate progress
    const timeElapsed = Date.now() - this.startTime;
    const progress = this.totalEstimatedRows > 0 
      ? Math.min(95, (this.processedRows / this.totalEstimatedRows) * 100)
      : 0;

    const estimatedTimeRemaining = progress > 0 
      ? (timeElapsed / progress) * (100 - progress)
      : 0;

    const progressInfo: CSVParseProgress = {
      totalRows: this.totalEstimatedRows,
      processedRows: this.processedRows,
      currentChunk: this.chunks.length,
      totalChunks: Math.ceil(this.totalEstimatedRows / this.config.chunkSize),
      progress,
      timeElapsed,
      estimatedTimeRemaining,
    };

    // Notify progress
    if (onProgress) {
      onProgress(progressInfo);
    }

    // Notify chunk processed
    if (onChunk) {
      onChunk({
        data: chunk.data,
        meta: chunk.meta
      });
    }

    // Memory management: clear processed chunks if too many
    if (this.chunks.length > 10) {
      this.chunks = this.chunks.slice(-5); // Keep only last 5 chunks
    }
  }

  private handleComplete(
    results: Papa.ParseResult<any>,
    resolve: (result: CSVParseResult) => void
  ) {
    const processingTime = Date.now() - this.startTime;
    
    // Flatten all chunks into final data
    const allData = this.chunks.flat();
    
    const result: CSVParseResult = {
      data: allData,
      meta: results.meta,
      errors: this.errors,
      stats: {
        totalRows: allData.length,
        validRows: allData.length - this.errors.length,
        errorRows: this.errors.length,
        processingTime,
        memoryUsage: this.estimateMemoryUsage(allData),
      }
    };

    resolve(result);
  }

  /**
   * Estimate total rows based on file size and sample
   */
  private estimateTotalRows(file: File) {
    // Simple estimation: assume average row size based on file size
    // This is a rough estimate for progress calculation
    const avgBytesPerRow = 100; // Conservative estimate
    this.totalEstimatedRows = Math.floor(file.size / avgBytesPerRow);
  }

  /**
   * Estimate memory usage of parsed data
   */
  private estimateMemoryUsage(data: any[]): number {
    if (data.length === 0) return 0;
    
    // Rough estimation: JSON stringify sample and extrapolate
    const sampleSize = Math.min(100, data.length);
    const sample = data.slice(0, sampleSize);
    const sampleMemory = new Blob([JSON.stringify(sample)]).size;
    
    return Math.floor((sampleMemory / sampleSize) * data.length);
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Cancel ongoing parsing operation
   */
  cancel() {
    // Papa Parse doesn't have a direct cancel method
    // This would need to be implemented with AbortController in a real scenario
    console.warn('CSV parsing cancellation not yet implemented');
  }
}

/**
 * Utility function for quick CSV validation
 */
export async function validateCSVFile(file: File): Promise<{
  isValid: boolean;
  errors?: string[];
  headers?: string[];
  sampleData?: any[];
  fileInfo: {
    name: string;
    size: string;
    type: string;
  };
}> {
  const parser = new StreamingCSVParser();
  const validation = await parser.validateStructure(file);
  
  return {
    ...validation,
    fileInfo: {
      name: file.name,
      size: new StreamingCSVParser().formatBytes(file.size),
      type: file.type || 'text/csv',
    }
  };
}

export default StreamingCSVParser;