import { useState, useRef, useCallback, useEffect } from 'react';

export interface CSVProcessingProgress {
  processedRows: number;
  totalRows: number;
  progress: number; // 0-100
  timeElapsed: number;
  estimatedTimeRemaining: number;
  currentChunk: number;
  chunkSize: number;
  errors: number;
}

export interface CSVProcessingResult {
  rows: any[];
  meta: {
    fields: string[];
    delimiter: string;
    linebreak: string;
  };
  stats: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    processingTime: number;
    averageRowsPerSecond: number;
  };
  errors: Array<{
    message: string;
    type: string;
    code: string;
    row: number;
  }>;
}

export interface CSVWorkerConfig {
  chunkSize?: number;
  header?: boolean;
  skipEmptyLines?: boolean;
  dynamicTyping?: boolean;
}

export interface UseCSVWorkerState {
  isProcessing: boolean;
  progress: CSVProcessingProgress | null;
  result: CSVProcessingResult | null;
  error: string | null;
  isSupported: boolean;
}

export interface UseCSVWorkerActions {
  processFile: (file: File, config?: CSVWorkerConfig) => Promise<CSVProcessingResult>;
  cancel: () => void;
  reset: () => void;
}

export function useCSVWorker(): [UseCSVWorkerState, UseCSVWorkerActions] {
  const [state, setState] = useState<UseCSVWorkerState>({
    isProcessing: false,
    progress: null,
    result: null,
    error: null,
    isSupported: typeof Worker !== 'undefined',
  });

  const workerRef = useRef<Worker | null>(null);
  const promiseRef = useRef<{
    resolve: (result: CSVProcessingResult) => void;
    reject: (error: Error) => void;
  } | null>(null);

  // Initialize worker
  const initWorker = useCallback(() => {
    if (!state.isSupported) return null;

    try {
      const worker = new Worker('/workers/csvWorker.js');

      worker.onmessage = (e) => {
        const { type, data, error } = e.data;

        switch (type) {
          case 'started':
            setState(prev => ({
              ...prev,
              isProcessing: true,
              error: null,
              progress: null,
              result: null,
            }));
            break;

          case 'progress':
            setState(prev => ({
              ...prev,
              progress: data,
            }));
            break;

          case 'complete':
            setState(prev => ({
              ...prev,
              isProcessing: false,
              result: data,
              progress: null,
            }));
            
            if (promiseRef.current) {
              promiseRef.current.resolve(data);
              promiseRef.current = null;
            }
            break;

          case 'error':
            setState(prev => ({
              ...prev,
              isProcessing: false,
              error: error || 'Unknown processing error',
              progress: null,
            }));
            
            if (promiseRef.current) {
              promiseRef.current.reject(new Error(error || 'CSV processing failed'));
              promiseRef.current = null;
            }
            break;

          case 'cancelled':
            setState(prev => ({
              ...prev,
              isProcessing: false,
              progress: null,
            }));
            
            if (promiseRef.current) {
              promiseRef.current.reject(new Error('Processing was cancelled'));
              promiseRef.current = null;
            }
            break;

          default:
            console.warn('Unknown worker message type:', type);
        }
      };

      worker.onerror = (error) => {
        console.error('CSV Worker error:', error);
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: 'Worker initialization failed',
        }));
        
        if (promiseRef.current) {
          promiseRef.current.reject(new Error('Worker error occurred'));
          promiseRef.current = null;
        }
      };

      return worker;
    } catch (error) {
      console.error('Failed to create CSV worker:', error);
      setState(prev => ({
        ...prev,
        isSupported: false,
        error: 'Web Workers not supported',
      }));
      return null;
    }
  }, [state.isSupported]);

  // Process file using worker
  const processFile = useCallback(async (
    file: File,
    config: CSVWorkerConfig = {}
  ): Promise<CSVProcessingResult> => {
    if (!state.isSupported) {
      throw new Error('Web Workers not supported in this browser');
    }

    if (state.isProcessing) {
      throw new Error('Another file is currently being processed');
    }

    // Initialize worker if not already done
    if (!workerRef.current) {
      workerRef.current = initWorker();
      if (!workerRef.current) {
        throw new Error('Failed to initialize CSV worker');
      }
    }

    return new Promise((resolve, reject) => {
      promiseRef.current = { resolve, reject };

      const defaultConfig: CSVWorkerConfig = {
        chunkSize: 1000,
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        ...config,
      };

      // Send file to worker for processing
      workerRef.current!.postMessage({
        type: 'process',
        data: {
          file,
          config: defaultConfig,
        },
      });
    });
  }, [state.isSupported, state.isProcessing, initWorker]);

  // Cancel processing
  const cancel = useCallback(() => {
    if (workerRef.current && state.isProcessing) {
      workerRef.current.postMessage({ type: 'cancel' });
    }
  }, [state.isProcessing]);

  // Reset state
  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      isProcessing: false,
      progress: null,
      result: null,
      error: null,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      promiseRef.current = null;
    };
  }, []);

  return [
    state,
    {
      processFile,
      cancel,
      reset,
    },
  ];
}

/**
 * Fallback processing for browsers without Web Worker support
 */
export async function processCSVFallback(
  file: File,
  config: CSVWorkerConfig = {},
  onProgress?: (progress: CSVProcessingProgress) => void
): Promise<CSVProcessingResult> {
  // Dynamic import to avoid loading Papa Parse if not needed
  const Papa = await import('papaparse');

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let processedRows = 0;
    const chunks: any[][] = [];
    const errors: any[] = [];

    const defaultConfig = {
      chunkSize: 1000,
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      ...config,
    };

    Papa.parse(file, {
      ...defaultConfig,
      chunk: (chunk: any) => {
        chunks.push(chunk.data);
        processedRows += chunk.data.length;
        errors.push(...chunk.errors);

        if (onProgress) {
          onProgress({
            processedRows,
            totalRows: Math.floor(file.size / 100), // Rough estimate
            progress: Math.min(95, (processedRows * 100) / Math.floor(file.size / 100)),
            timeElapsed: Date.now() - startTime,
            estimatedTimeRemaining: 0,
            currentChunk: chunks.length,
            chunkSize: chunk.data.length,
            errors: errors.length,
          });
        }
      },
      complete: (results: any) => {
        const allData = chunks.flat();
        const processingTime = Date.now() - startTime;

        resolve({
          rows: allData,
          meta: {
            fields: results.meta.fields || [],
            delimiter: results.meta.delimiter,
            linebreak: results.meta.linebreak,
          },
          stats: {
            totalRows: allData.length,
            validRows: allData.length - errors.length,
            errorRows: errors.length,
            processingTime,
            averageRowsPerSecond: Math.round(allData.length / (processingTime / 1000)),
          },
          errors,
        });
      },
      error: (error: any) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      },
    });
  });
}

export default useCSVWorker;