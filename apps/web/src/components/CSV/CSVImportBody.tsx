import React, { useState } from 'react';
import { CSVFileUploader } from './CSVFileUploader';
import { CSVColumnMapper } from './CSVColumnMapper';
import { CSVImportProgress } from './CSVImportProgress';

interface CSVImportBodyProps {
  _onCsvImport: (data: { file: File; mapping: { [key: string]: string } }) => Promise<{ error?: any; data?: any }>;
  moduleFields: {
    displayName: string;
    isRequired: boolean;
    typeId: string;
  }[];
  onClose: () => void;
  file?: File;
  tableData?: { csvField: string; feedbackField: string; csvData: string[] }[];
}

enum ImportState {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  MAPPING = 'mapping',
  IMPORTING = 'importing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export const CSVImportBody: React.FC<CSVImportBodyProps> = ({
  _onCsvImport,
  moduleFields,
  onClose,
  file,
  tableData,
}) => {
  const [importState, setImportState] = useState<ImportState>(
    file ? ImportState.MAPPING : ImportState.IDLE
  );
  const [csvFile, setCsvFile] = useState<File | null>(file || null);
  const [parsedData, setParsedData] = useState<{ csvField: string; feedbackField: string; csvData: string[] }[]>(
    tableData || []
  );
  const [mapping, setMapping] = useState<{ [key: string]: string }>({});
  const [progressData, setProgressData] = useState({
    totalCount: 0,
    failedCount: 0,
    progress: 0,
    currentRecord: 0,
  });
  const [_taskId, _setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (uploadedFile: File, data: any[]) => {
    setCsvFile(uploadedFile);
    setParsedData(data);
    setImportState(ImportState.MAPPING);
    setError(null);
  };

  const handleMapping = (fieldMapping: { [key: string]: string }) => {
    setMapping(fieldMapping);
  };

  const handleImport = async () => {
    if (!csvFile) return;

    setImportState(ImportState.IMPORTING);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('csvFile', csvFile);
      formData.append('mapping', JSON.stringify(mapping));

      const response = await fetch('/api/csv-import/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Import failed');
        setImportState(ImportState.ERROR);
        return;
      }

      setTaskId(data.result.id);
      // Start polling for progress
      startProgressPolling(data.result.id);
    } catch (err: any) {
      setError(err.message || 'Import failed');
      setImportState(ImportState.ERROR);
    }
  };

  const startProgressPolling = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/csv-import/status/${id}`);
        const data = await response.json();

        if (!response.ok) {
          console.error('Error polling status:', data.error);
          setError(data.error || 'Failed to check import status');
          setImportState(ImportState.ERROR);
          clearInterval(interval);
          return;
        }

        const currentRecordIndex = data.isCompleted ? data.totalCount : data.currentIndex;

        setProgressData({
          totalCount: data.totalCount ?? 0,
          failedCount: data.failedCount ?? 0,
          currentRecord: currentRecordIndex ?? 0,
          progress: Math.ceil(((currentRecordIndex ?? 0) * 100) / (data.totalCount ?? 1)) ?? 0,
        });

        if (data.isCompleted) {
          setImportState(ImportState.COMPLETED);
          clearInterval(interval);
        }
      } catch (err: any) {
        console.error('Error polling import status:', err);
        setError(err.message || 'Failed to check import status');
        setImportState(ImportState.ERROR);
        clearInterval(interval);
      }
    }, 1000);
  };

  const resetImport = () => {
    setImportState(ImportState.IDLE);
    setCsvFile(null);
    setParsedData([]);
    setMapping({});
    setProgressData({ totalCount: 0, failedCount: 0, progress: 0, currentRecord: 0 });
    setTaskId(null);
    setError(null);
  };

  if (importState === ImportState.IMPORTING || importState === ImportState.COMPLETED) {
    return (
      <CSVImportProgress
        progressData={progressData}
        isCompleted={importState === ImportState.COMPLETED}
        onClose={onClose}
        onStartOver={resetImport}
      />
    );
  }

  if (importState === ImportState.ERROR) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h3>Import Error</h3>
        <p>{error}</p>
        <button onClick={resetImport}>Try Again</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }

  if (importState === ImportState.MAPPING) {
    return (
      <CSVColumnMapper
        csvData={parsedData}
        moduleFields={moduleFields}
        onMapping={handleMapping}
        onImport={handleImport}
        onBack={() => setImportState(ImportState.IDLE)}
        onClose={onClose}
      />
    );
  }

  return (
    <CSVFileUploader
      moduleFields={moduleFields}
      onFileUpload={handleFileUpload}
      onClose={onClose}
    />
  );
};

export default CSVImportBody;