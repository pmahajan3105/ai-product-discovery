import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { FlexContainer, Text, Button } from '../Zeda';
import { Colors, FontSize, FontWeight, ColorFamily } from '../../theme/colors';
import { FlexAlignItems, FlexDirection, FlexJustify } from '../../theme/layout';

interface CSVFileUploaderProps {
  moduleFields: {
    displayName: string;
    isRequired: boolean;
    typeId: string;
  }[];
  onFileUpload: (file: File, data: any[]) => void;
  onClose: () => void;
}

export const CSVFileUploader: React.FC<CSVFileUploaderProps> = ({
  moduleFields,
  onFileUpload,
  onClose,
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mandatoryFields = moduleFields.filter(field => field.isRequired);
  const optionalFields = moduleFields.filter(field => !field.isRequired);

  const handleFile = useCallback((file: File) => {
    setIsProcessing(true);
    setError(null);

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      setIsProcessing(false);
      return;
    }

    Papa.parse(file, {
      complete: (results) => {
        try {
          if (results.errors.length > 0) {
            setError('Error parsing CSV file');
            setIsProcessing(false);
            return;
          }

          if (!results.data || results.data.length === 0) {
            setError('CSV file is empty');
            setIsProcessing(false);
            return;
          }

          // Get first 3 rows as preview data
          const previewData = results.data.slice(0, 3);
          const headers = results.meta.fields || [];

          if (headers.length === 0) {
            setError('No headers found in CSV file');
            setIsProcessing(false);
            return;
          }

          const mappingData = headers.map((header: string, index: number) => ({
            csvField: header,
            feedbackField: '',
            csvData: previewData.map((row: any) => row[header] || ''),
            id: `row_${index}`,
          }));

          onFileUpload(file, mappingData);
          setIsProcessing(false);
        } catch (err) {
          setError('Error processing CSV file');
          setIsProcessing(false);
        }
      },
      header: true,
      skipEmptyLines: true,
      error: (error) => {
        setError(`CSV parsing error: ${error.message}`);
        setIsProcessing(false);
      },
    });
  }, [onFileUpload]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploadedFile(file);
      handleFile(file);
    }
  }, [handleFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
    disabled: isProcessing,
  });

  const removeFile = () => {
    setUploadedFile(null);
    setError(null);
  };

  return (
    <FlexContainer
      direction={FlexDirection.row}
      gap={16}
      height="500px"
    >
      {/* Fields Info Panel */}
      <FlexContainer
        direction={FlexDirection.column}
        border={{ all: 1, radius: 8, color: Colors.grey200 }}
        padding={{ all: 16 }}
        width="200px"
        minWidth="200px"
        maxHeight="460px"
        overflow="auto"
      >
        <Text
          fontSize={FontSize.text_sm}
          fontWeight={FontWeight.medium}
          color={Colors.grey500}
          margin={{ bottom: 12 }}
        >
          Required Fields
        </Text>
        {mandatoryFields.map((field) => (
          <Text
            key={field.typeId}
            fontSize={FontSize.text_sm}
            color={Colors.grey700}
            margin={{ bottom: 8 }}
          >
            {field.displayName}
          </Text>
        ))}

        {optionalFields.length > 0 && (
          <>
            <Text
              fontSize={FontSize.text_sm}
              fontWeight={FontWeight.medium}
              color={Colors.grey500}
              margin={{ bottom: 12, top: 16 }}
            >
              Optional Fields
            </Text>
            {optionalFields.map((field) => (
              <Text
                key={field.typeId}
                fontSize={FontSize.text_sm}
                color={Colors.grey700}
                margin={{ bottom: 8 }}
              >
                {field.displayName}
              </Text>
            ))}
          </>
        )}
      </FlexContainer>

      {/* Upload Area */}
      <FlexContainer
        direction={FlexDirection.column}
        flex="1"
      >
        {!uploadedFile ? (
          <FlexContainer
            {...getRootProps()}
            direction={FlexDirection.column}
            alignItems={FlexAlignItems.center}
            justify={FlexJustify.center}
            border={{
              all: 2,
              radius: 12,
              color: isDragActive ? Colors.primary600 : Colors.grey200,
              style: isDragActive ? 'dashed' : 'solid',
            }}
            bgColor={isDragActive ? Colors.primary25 : Colors.transparent}
            padding={{ all: 40 }}
            height="330px"
            cursor="pointer"
          >
            <input {...getInputProps()} />
            <FlexContainer
              width={72}
              height={72}
              bgColor={Colors.grey100}
              border={{ all: 4, color: Colors.grey50, radius: 36 }}
              justify={FlexJustify.center}
              alignItems={FlexAlignItems.center}
              margin={{ bottom: 16 }}
            >
              📁
            </FlexContainer>
            <Text
              fontSize={FontSize.text_sm}
              color={Colors.grey600}
              textAlign="center"
              margin={{ bottom: 8 }}
            >
              {isDragActive ? 'Drop the CSV file here' : 'Drag & drop your CSV file here'}
            </Text>
            <Text
              fontSize={FontSize.text_sm}
              color={Colors.primary600}
              fontWeight={FontWeight.semiBold}
            >
              or browse files
            </Text>
          </FlexContainer>
        ) : (
          <FlexContainer
            direction={FlexDirection.column}
            alignItems={FlexAlignItems.center}
            justify={FlexJustify.center}
            border={{ all: 2, radius: 12, color: Colors.success600, style: 'dashed' }}
            bgColor={Colors.success25}
            padding={{ all: 40 }}
            height="330px"
          >
            <FlexContainer
              alignItems={FlexAlignItems.center}
              gap={12}
              margin={{ bottom: 16 }}
            >
              <Text fontSize="40px">📄</Text>
              <Text
                fontSize={FontSize.text_sm}
                color={Colors.grey500}
                cursor="pointer"
                onClick={removeFile}
              >
                🗑️
              </Text>
            </FlexContainer>
            <Text
              fontSize={FontSize.text_sm}
              color={Colors.grey700}
              fontWeight={FontWeight.medium}
              margin={{ bottom: 4 }}
            >
              {uploadedFile.name}
            </Text>
            <Text
              fontSize={FontSize.text_xs}
              color={Colors.grey600}
            >
              {(uploadedFile.size / 1024).toFixed(1)} KB
            </Text>
            {isProcessing && (
              <Text
                fontSize={FontSize.text_sm}
                color={Colors.primary600}
                margin={{ top: 12 }}
              >
                Processing...
              </Text>
            )}
          </FlexContainer>
        )}

        {error && (
          <Text
            fontSize={FontSize.text_sm}
            color={Colors.error600}
            margin={{ top: 12 }}
            textAlign="center"
          >
            {error}
          </Text>
        )}

        {/* Important Notes */}
        <FlexContainer
          direction={FlexDirection.column}
          margin={{ top: 16 }}
        >
          <Text
            fontSize={FontSize.text_sm}
            fontWeight={FontWeight.semiBold}
            color={Colors.grey900}
            margin={{ bottom: 8 }}
          >
            Important Notes
          </Text>
          <Text
            fontSize={FontSize.text_xs}
            color={Colors.grey600}
            margin={{ bottom: 4 }}
          >
            • CSV file should have headers in the first row
          </Text>
          <Text
            fontSize={FontSize.text_xs}
            color={Colors.grey600}
            margin={{ bottom: 4 }}
          >
            • Maximum file size: 10MB
          </Text>
          <Text
            fontSize={FontSize.text_xs}
            color={Colors.grey600}
          >
            • Required fields must be mapped to proceed
          </Text>
        </FlexContainer>

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
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!uploadedFile || !!error || isProcessing}
            onClick={() => uploadedFile && handleFile(uploadedFile)}
          >
            {isProcessing ? 'Processing...' : 'Next: Map Columns'}
          </Button>
        </FlexContainer>
      </FlexContainer>
    </FlexContainer>
  );
};

export default CSVFileUploader;