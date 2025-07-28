import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';
import { Download, FileText, Database, Grid } from 'lucide-react';
import Button from '../Button/Button';
import Modal from '../Zeda/Modal/Modal';
import Select from '../Zeda/Select/Select';
import { FilterCondition } from '../Filter/filterHelpers';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'csv' | 'json' | 'xlsx', includeFilters: boolean) => void;
  currentFilters: FilterCondition[];
  totalCount: number;
  filteredCount?: number;
  isLoading?: boolean;
}

const ModalContent = styled.div`
  padding: 24px;
  min-width: 400px;
`;

const ModalTitle = styled.h3`
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: ${Colors.grey900};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const OptionSection = styled.div`
  margin-bottom: 24px;
`;

const SectionLabel = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: ${Colors.grey700};
  margin-bottom: 12px;
`;

const FormatOptions = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

const FormatButton = styled.button<{ selected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border: 2px solid ${props => props.selected ? Colors.primary500 : Colors.grey200};
  border-radius: 8px;
  background: ${props => props.selected ? Colors.primary50 : Colors.white};
  color: ${props => props.selected ? Colors.primary700 : Colors.grey700};
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  font-weight: 500;

  &:hover {
    border-color: ${Colors.primary300};
    background: ${Colors.primary50};
  }

  svg {
    color: ${props => props.selected ? Colors.primary600 : Colors.grey500};
  }
`;

const DataSection = styled.div`
  background: ${Colors.grey50};
  border: 1px solid ${Colors.grey200};
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 24px;
`;

const DataOption = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const DataLabel = styled.div`
  font-size: 14px;
  color: ${Colors.grey700};
`;

const DataCount = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${Colors.grey900};
`;

const FilterSummary = styled.div`
  background: ${Colors.blue50};
  border: 1px solid ${Colors.blue200};
  border-radius: 4px;
  padding: 12px;
  margin-top: 12px;
  font-size: 12px;
  color: ${Colors.blue700};
`;

const RadioGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const RadioOption = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: ${Colors.grey700};
  cursor: pointer;
`;

const RadioInput = styled.input`
  margin: 0;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid ${Colors.grey200};
`;

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  currentFilters,
  totalCount,
  filteredCount,
  isLoading = false
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json' | 'xlsx'>('csv');
  const [exportScope, setExportScope] = useState<'all' | 'filtered'>('all');

  const hasFilters = currentFilters.length > 0;
  const displayCount = exportScope === 'filtered' && filteredCount !== undefined ? filteredCount : totalCount;

  const handleExport = () => {
    onExport(selectedFormat, exportScope === 'filtered');
  };

  const formatOptions = [
    {
      value: 'csv' as const,
      label: 'CSV',
      description: 'Comma-separated values',
      icon: <FileText size={20} />
    },
    {
      value: 'json' as const,
      label: 'JSON',
      description: 'JavaScript Object Notation',
      icon: <Database size={20} />
    },
    {
      value: 'xlsx' as const,
      label: 'Excel',
      description: 'Microsoft Excel format',
      icon: <Grid size={20} />
    }
  ];

  return (
    <Modal isOpen={isOpen} toggle={onClose} width={500}>
      <ModalContent>
        <ModalTitle>
          <Download size={20} />
          Export Feedback Data
        </ModalTitle>

        {/* Format Selection */}
        <OptionSection>
          <SectionLabel>Export Format</SectionLabel>
          <FormatOptions>
            {formatOptions.map(option => (
              <FormatButton
                key={option.value}
                selected={selectedFormat === option.value}
                onClick={() => setSelectedFormat(option.value)}
              >
                {option.icon}
                <div>
                  <div style={{ fontWeight: '600' }}>{option.label}</div>
                  <div style={{ fontSize: '10px', opacity: 0.8 }}>
                    {option.description}
                  </div>
                </div>
              </FormatButton>
            ))}
          </FormatOptions>
        </OptionSection>

        {/* Data Scope */}
        <OptionSection>
          <SectionLabel>Data to Export</SectionLabel>
          <DataSection>
            <RadioGroup>
              <RadioOption>
                <RadioInput
                  type="radio"
                  name="exportScope"
                  value="all"
                  checked={exportScope === 'all'}
                  onChange={() => setExportScope('all')}
                />
                <div style={{ flex: 1 }}>
                  <DataOption>
                    <DataLabel>All feedback items</DataLabel>
                    <DataCount>{totalCount.toLocaleString()} items</DataCount>
                  </DataOption>
                </div>
              </RadioOption>

              {hasFilters && filteredCount !== undefined && (
                <RadioOption>
                  <RadioInput
                    type="radio"
                    name="exportScope"
                    value="filtered"
                    checked={exportScope === 'filtered'}
                    onChange={() => setExportScope('filtered')}
                  />
                  <div style={{ flex: 1 }}>
                    <DataOption>
                      <DataLabel>Current filtered results</DataLabel>
                      <DataCount>{filteredCount.toLocaleString()} items</DataCount>
                    </DataOption>
                    <FilterSummary>
                      {currentFilters.length} active filter{currentFilters.length !== 1 ? 's' : ''} applied
                    </FilterSummary>
                  </div>
                </RadioOption>
              )}
            </RadioGroup>
          </DataSection>
        </OptionSection>

        <ModalActions>
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            variant="primary"
            disabled={isLoading || displayCount === 0}
          >
            {isLoading ? (
              'Exporting...'
            ) : (
              <>
                <Download size={16} />
                Export {displayCount.toLocaleString()} items
              </>
            )}
          </Button>
        </ModalActions>
      </ModalContent>
    </Modal>
  );
};

export default ExportModal;