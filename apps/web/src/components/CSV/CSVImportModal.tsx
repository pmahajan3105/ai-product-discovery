import React from 'react';
import { Text, Container, Modal } from '../Zeda';
import { CSVImportBody } from './CSVImportBody';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCsvImport: (data: { file: File; mapping: { [key: string]: string } }) => Promise<{ error?: any; data?: any }>;
  moduleFields: {
    displayName: string;
    isRequired: boolean;
    typeId: string;
  }[];
  file?: File;
  tableData?: { csvField: string; feedbackField: string; csvData: string[] }[];
}

const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen,
  onClose,
  onCsvImport,
  moduleFields,
  file,
  tableData,
}) => {
  const resetAndCloseModal = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndCloseModal}>
      <Container
        width="900px"
        padding={{ all: 24 }}
        maxHeight="90vh"
        overflow="hidden"
      >
        <Text
          fontSize="text_lg"
          fontWeight="semiBold"
          margin={{ bottom: 24 }}
        >
          Import CSV
        </Text>
        <CSVImportBody
          onCsvImport={onCsvImport}
          moduleFields={moduleFields}
          onClose={resetAndCloseModal}
          file={file}
          tableData={tableData}
        />
      </Container>
    </Modal>
  );
};

export default CSVImportModal;