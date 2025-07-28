import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { FlexContainer, Container, Text, Button } from '../Zeda';
import { Colors, FontSize, FontWeight, ColorFamily } from '../../theme/colors';
import { FlexAlignItems, FlexDirection, FlexJustify } from '../../theme/layout';
import { useCSVWorker, processCSVFallback, CSVProcessingProgress } from '../../hooks/useCSVWorker';
import { validateCSVFile } from '../../lib/csv/StreamingCSVParser';

interface EnhancedCSVFileUploaderProps {
  moduleFields: {
    displayName: string;
    isRequired: boolean;
    typeId: string;
  }[];
  onFileProcessed: (data: {
    file: File;
    rows: any[];
    headers: string[];
    stats: {
      totalRows: number;
      validRows: number;
      errorRows: number;
      processingTime: number;
    };
  }) => void;
  onClose: () => void;
  maxFileSize?: number; // in bytes, default 50MB
  supportedFormats?: string[];
}

export const EnhancedCSVFileUploader: React.FC<EnhancedCSVFileUploaderProps> = ({
  moduleFields,
  onFileProcessed,
  onClose,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  supportedFormats = ['.csv', '.txt']
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [useWorker, setUseWorker] = useState(true);
  
  const processingAbortRef = useRef<AbortController | null>(null);
  
  // Use Web Worker for large file processing
  const [workerState, { processFile: processWithWorker, cancel: cancelWorker, reset: resetWorker }] = useCSVWorker();

  const mandatoryFields = moduleFields.filter(field => field.isRequired);
  const optionalFields = moduleFields.filter(field => !field.isRequired);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setValidationResult(null);
    setIsValidating(true);

    try {
      // First, validate the file structure
      const validation = await validateCSVFile(file);
      setValidationResult(validation);

      if (!validation.isValid) {
        setError(validation.errors?.join(', ') || 'Invalid CSV file');
        return;
      }

      setUploadedFile(file);
    } catch (err: any) {
      setError(err.message || 'Failed to validate CSV file');
    } finally {
      setIsValidating(false);
    }
  }, []);

  const handleProcessFile = useCallback(async () => {
    if (!uploadedFile || !validationResult?.isValid) return;

    try {
      setError(null);
      
      // Determine processing method based on file size and worker support
      const shouldUseWorker = useWorker && workerState.isSupported && uploadedFile.size > 1024 * 1024; // 1MB threshold

      let result;
      
      if (shouldUseWorker) {
        // Use Web Worker for large files
        result = await processWithWorker(uploadedFile, {
          chunkSize: 1000,
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
        });
      } else {
        // Use fallback processing for smaller files or unsupported browsers
        result = await processCSVFallback(uploadedFile, {
          chunkSize: 500,
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
        });
      }

      // Process successful, pass data to parent
      onFileProcessed({
        file: uploadedFile,
        rows: result.rows,
        headers: result.meta.fields,
        stats: result.stats,
      });

    } catch (err: any) {
      setError(err.message || 'Failed to process CSV file');
      console.error('CSV processing error:', err);
    }
  }, [uploadedFile, validationResult, useWorker, workerState.isSupported, processWithWorker, onFileProcessed]);

  const handleCancelProcessing = useCallback(() => {
    if (processingAbortRef.current) {
      processingAbortRef.current.abort();
    }
    cancelWorker();
    resetWorker();
    setError(null);
  }, [cancelWorker, resetWorker]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors.some((e: any) => e.code === 'file-too-large')) {
        setError(`File size exceeds ${formatBytes(maxFileSize)} limit`);
      } else if (rejection.errors.some((e: any) => e.code === 'file-invalid-type')) {
        setError(`File type not supported. Please upload: ${supportedFormats.join(', ')}`);
      } else {
        setError('File upload failed');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      handleFile(acceptedFiles[0]);
    }
  }, [handleFile, maxFileSize, supportedFormats]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': supportedFormats,
    },
    multiple: false,
    maxSize: maxFileSize,
    disabled: isValidating || workerState.isProcessing,
  });

  const removeFile = () => {
    setUploadedFile(null);
    setValidationResult(null);
    setError(null);
    resetWorker();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderProgressBar = (progress: CSVProcessingProgress) => (
    <Container margin={{ top: 16 }}>
      <FlexContainer justify={FlexJustify.spaceBetween} margin={{ bottom: 8 }}>
        <Text fontSize="text_sm" color="grey700">
          Processing... {progress.progress}%
        </Text>
        <Text fontSize="text_xs" color="grey500">
          {progress.processedRows.toLocaleString()} / {progress.totalRows.toLocaleString()} rows
        </Text>
      </FlexContainer>
      
      <Container
        height="6px"
        bgColor="grey200"
        border={{ radius: 3 }}
        overflow="hidden"
      >
        <Container
          width={`${progress.progress}%`}
          height="100%"
          bgColor="primary500"
          style={{ transition: 'width 0.3s ease' }}
        />
      </Container>
      
      <FlexContainer justify={FlexJustify.spaceBetween} margin={{ top: 4 }}>
        <Text fontSize="text_xs" color="grey500">
          {Math.round(progress.timeElapsed / 1000)}s elapsed
        </Text>
        <Text fontSize="text_xs" color="grey500">
          {progress.estimatedTimeRemaining > 0 
            ? `~${Math.round(progress.estimatedTimeRemaining / 1000)}s remaining`
            : 'Calculating...'
          }
        </Text>
      </FlexContainer>
    </Container>
  );

  return (
    <FlexContainer direction={FlexDirection.row} gap={16} height="600px">
      {/* Fields Info Panel */}
      <FlexContainer
        direction={FlexDirection.column}
        border={{ all: 1, radius: 8, color: "grey200" }}
        padding={{ all: 16 }}
        width="220px"
        minWidth="220px"
        maxHeight="580px"
        overflow="auto"
      >
        <Text
          fontSize="text_sm"
          fontWeight="medium"
          color="grey500"
          margin={{ bottom: 12 }}
        >
          Required Fields
        </Text>
        {mandatoryFields.map((field) => (
          <Text
            key={field.typeId}
            fontSize="text_sm"
            color="grey700"
            margin={{ bottom: 8 }}
          >
            • {field.displayName}
          </Text>
        ))}

        {optionalFields.length > 0 && (
          <>
            <Text
              fontSize="text_sm"
              fontWeight="medium"
              color="grey500"
              margin={{ bottom: 12, top: 16 }}
            >
              Optional Fields
            </Text>
            {optionalFields.map((field) => (
              <Text
                key={field.typeId}
                fontSize="text_sm"
                color="grey700"
                margin={{ bottom: 8 }}
              >
                • {field.displayName}
              </Text>
            ))}
          </>
        )}

        {/* Performance Info */}
        <Container
          margin={{ top: 24 }}
          padding={{ all: 12 }}
          bgColor="info25"
          border={{ radius: 6, color: "info200", all: 1 }}
        >
          <Text fontSize="text_xs" color="info700" fontWeight="semiBold" margin={{ bottom: 4 }}>
            Performance Features:
          </Text>
          <Text fontSize="text_xs" color="info600" margin={{ bottom: 2 }}>
            • Web Worker processing for large files
          </Text>
          <Text fontSize="text_xs" color="info600" margin={{ bottom: 2 }}>
            • Streaming parser with chunking
          </Text>
          <Text fontSize="text_xs" color="info600" margin={{ bottom: 2 }}>
            • Real-time progress tracking
          </Text>
          <Text fontSize="text_xs" color="info600">
            • Memory optimization
          </Text>
        </Container>
      </FlexContainer>

      {/* Upload Area */}
      <FlexContainer direction={FlexDirection.column} flex="1">
        {!uploadedFile ? (
          <FlexContainer
            {...getRootProps()}
            direction={FlexDirection.column}
            alignItems={FlexAlignItems.center}
            justify={FlexJustify.center}
            border={{
              all: 2,
              radius: 12,
              color: isDragActive ? "primary600" : "grey200",
              style: isDragActive ? 'dashed' : 'solid',
            }}
            bgColor={isDragActive ? "primary25" : "transparent"}
            padding={{ all: 40 }}
            height="400px"
            cursor="pointer"
            style={{
              opacity: isValidating || workerState.isProcessing ? 0.6 : 1,
            }}
          >
            <input {...getInputProps()} />
            
            <FlexContainer
              width={72}
              height={72}
              bgColor="grey100"
              border={{ all: 4, color: "grey50", radius: 36 }}
              justify={FlexJustify.center}
              alignItems={FlexAlignItems.center}
              margin={{ bottom: 16 }}
            >
              {isValidating ? '⏳' : '📁'}
            </FlexContainer>
            
            <Text
              fontSize="text_lg"
              fontWeight="semiBold"
              color="grey700"
              textAlign="center"
              margin={{ bottom: 8 }}
            >
              {isValidating ? 'Validating CSV...' : 
               isDragActive ? 'Drop your CSV file here' : 
               'Upload CSV File'}
            </Text>
            
            <Text
              fontSize="text_sm"
              color="grey500"
              textAlign="center"
              margin={{ bottom: 16 }}
            >
              {isValidating ? 'Please wait while we validate your file' :
               `Drag & drop or click to browse (max ${formatBytes(maxFileSize)})`}
            </Text>
            
            <FlexContainer direction={FlexDirection.column} alignItems={FlexAlignItems.center} gap={4}>
              <Text fontSize="text_xs" color="primary600" fontWeight="medium">
                Supported formats: {supportedFormats.join(', ')}
              </Text>
              {workerState.isSupported && (
                <Text fontSize="text_xs" color="success600">
                  ⚡ High-performance processing enabled
                </Text>
              )}
            </FlexContainer>
          </FlexContainer>
        ) : (
          <FlexContainer direction={FlexDirection.column}>
            {/* File Info */}
            <FlexContainer
              direction={FlexDirection.column}
              padding={{ all: 20 }}
              border={{ all: 2, radius: 12, color: "success300", style: 'dashed' }}
              bgColor="success25"
              margin={{ bottom: 16 }}
            >
              <FlexContainer alignItems={FlexAlignItems.center} gap={12} margin={{ bottom: 12 }}>
                <Text fontSize="text_2xl">📄</Text>
                <FlexContainer direction={FlexDirection.column} flex="1">
                  <Text fontSize="text_lg" fontWeight="semiBold" color="grey700">
                    {uploadedFile.name}
                  </Text>
                  <Text fontSize="text_sm" color="grey500">
                    {formatBytes(uploadedFile.size)} • {validationResult?.fileInfo.type}
                  </Text>
                </FlexContainer>
                <Text
                  fontSize="text_sm"
                  color="grey500"
                  cursor="pointer"
                  onClick={removeFile}
                  style={{ padding: '4px 8px', borderRadius: '4px' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = Colors.grey100;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  🗑️ Remove
                </Text>
              </FlexContainer>

              {/* Validation Results */}
              {validationResult && (
                <Container>
                  <FlexContainer alignItems={FlexAlignItems.center} gap={8} margin={{ bottom: 8 }}>
                    <Text fontSize="text_sm">✅</Text>
                    <Text fontSize="text_sm" color="success700" fontWeight="medium">
                      File validated successfully
                    </Text>
                  </FlexContainer>
                  
                  <FlexContainer gap={24}>
                    <FlexContainer direction={FlexDirection.column}>
                      <Text fontSize="text_xs" color="grey500">Headers Found</Text>
                      <Text fontSize="text_sm" fontWeight="medium" color="grey700">
                        {validationResult.headers?.length || 0}
                      </Text>
                    </FlexContainer>
                    <FlexContainer direction={FlexDirection.column}>
                      <Text fontSize="text_xs" color="grey500">Sample Rows</Text>
                      <Text fontSize="text_sm" fontWeight="medium" color="grey700">
                        {validationResult.sampleData?.length || 0}
                      </Text>
                    </FlexContainer>
                  </FlexContainer>
                </Container>
              )}
            </FlexContainer>

            {/* Processing Progress */}
            {workerState.isProcessing && workerState.progress && renderProgressBar(workerState.progress)}

            {/* Processing Method Toggle */}
            {!workerState.isProcessing && workerState.isSupported && (
              <FlexContainer
                alignItems={FlexAlignItems.center}
                gap={12}
                margin={{ bottom: 16 }}
                padding={{ all: 12 }}
                bgColor="grey25"
                border={{ radius: 6 }}
              >
                <input
                  type="checkbox"
                  checked={useWorker}
                  onChange={(e) => setUseWorker(e.target.checked)}
                  id="use-worker"
                />
                <label htmlFor="use-worker">
                  <Text fontSize="text_sm" color="grey700">
                    Use background processing for large files (recommended)
                  </Text>
                </label>
              </FlexContainer>
            )}
          </FlexContainer>
        )}

        {error && (
          <Container
            margin={{ top: 16 }}
            padding={{ all: 12 }}
            bgColor="error25"
            border={{ radius: 6, color: "error200", all: 1 }}
          >
            <Text fontSize="text_sm" color="error700">
              ❌ {error}
            </Text>
          </Container>
        )}

        {/* Action Buttons */}
        <FlexContainer
          justify={FlexJustify.flexEnd}
          gap={12}
          margin={{ top: 24 }}
        >
          <Button
            variant="secondary"
            colorTheme={ColorFamily.grey}
            onClick={onClose}
            disabled={workerState.isProcessing}
          >
            Cancel
          </Button>
          
          {workerState.isProcessing ? (
            <Button
              variant="secondary"
              colorTheme={ColorFamily.error}
              onClick={handleCancelProcessing}
            >
              Stop Processing
            </Button>
          ) : (
            <Button
              variant="primary"
              disabled={!uploadedFile || !validationResult?.isValid || isValidating}
              onClick={handleProcessFile}
            >
              {isValidating ? 'Validating...' : 'Process & Continue'}
            </Button>
          )}
        </FlexContainer>
      </FlexContainer>
    </FlexContainer>
  );
};

export default EnhancedCSVFileUploader;