// Simplified FilterContainer for FeedbackHub
// Based on Zeda's FilterContainer but simplified with local state management

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';
import Select from '../Zeda/Select/Select';
import Modal from '../Zeda/Modal/Modal';
import Button from '../Button/Button';
import ValueComponent, { SelectOption } from './ValueComponent';
import {
  FilterCondition,
  FilterField,
  FilterFieldType,
  getFeedbackFilterFields,
  getOperatorOptions,
  createEmptyFilter,
  isValidFilter,
  getFilterCount,
  filtersToQuery,
  QuickFilter,
  getQuickFilters,
  getDefaultValueForFieldType,
} from './filterHelpers';
import { Filter, Plus, X, Save, Bookmark } from 'lucide-react';

export interface FilterContainerProps {
  /**
   * Current filter conditions
   */
  filters: FilterCondition[];
  
  /**
   * Callback when filters change
   */
  onFiltersChange: (filters: FilterCondition[]) => void;
  
  /**
   * Available filter fields (optional, defaults to feedback fields)
   */
  fields?: FilterField[];
  
  /**
   * Custom field options for select/multi-select fields
   */
  fieldOptions?: Record<string, SelectOption[]>;
  
  /**
   * Quick filter presets (optional)
   */
  quickFilters?: QuickFilter[];
  
  /**
   * Show quick filters section
   */
  showQuickFilters?: boolean;
  
  /**
   * Trigger element for opening filter modal
   */
  children?: React.ReactNode;
  
  /**
   * Custom modal width
   */
  modalWidth?: number;

  /**
   * Saved filter presets
   */
  savedPresets?: Array<{
    id: string;
    name: string;
    filters: FilterCondition[];
    isDefault: boolean;
    isShared: boolean;
  }>;

  /**
   * Callback to save current filters as preset
   */
  onSavePreset?: (name: string, isShared: boolean) => void;

  /**
   * Callback to load a saved preset
   */
  onLoadPreset?: (preset: { id: string; name: string; filters: FilterCondition[] }) => void;
}

const FilterButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FilterCount = styled.span`
  background-color: ${Colors.primary500};
  color: ${Colors.white};
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 500;
  min-width: 16px;
  text-align: center;
`;

const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 400px;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid ${Colors.grey200};
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${Colors.grey900};
`;

const QuickFiltersSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const QuickFiltersTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: ${Colors.grey700};
`;

const QuickFilterButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const QuickFilterButton = styled(Button)`
  font-size: 12px;
  padding: 6px 12px;
  height: auto;
`;

const FiltersSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
`;

const FilterRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background-color: ${Colors.grey50};
  border-radius: 8px;
  border: 1px solid ${Colors.grey200};
`;

const FilterRowContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  flex-wrap: wrap;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: ${Colors.grey500};
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: ${Colors.grey200};
    color: ${Colors.grey700};
  }
`;

const AddFilterButton = styled(Button)`
  align-self: flex-start;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid ${Colors.grey200};
`;

const FooterLeft = styled.div`
  font-size: 14px;
  color: ${Colors.grey600};
`;

const FooterRight = styled.div`
  display: flex;
  gap: 12px;
`;

const SavedPresetsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${Colors.grey200};
`;

const SavedPresetsTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: ${Colors.grey700};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PresetList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const PresetButton = styled.button<{ isDefault?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: ${props => props.isDefault ? Colors.primary50 : Colors.grey50};
  border: 1px solid ${props => props.isDefault ? Colors.primary200 : Colors.grey200};
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: ${props => props.isDefault ? Colors.primary700 : Colors.grey700};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.isDefault ? Colors.primary100 : Colors.grey100};
    border-color: ${props => props.isDefault ? Colors.primary300 : Colors.grey300};
  }
`;

const SavePresetSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: ${Colors.grey50};
  border-radius: 4px;
  border: 1px dashed ${Colors.grey300};
`;

const SavePresetInput = styled.input`
  flex: 1;
  padding: 6px 8px;
  border: 1px solid ${Colors.grey200};
  border-radius: 4px;
  font-size: 12px;
  
  &::placeholder {
    color: ${Colors.grey400};
  }
`;

const SavePresetActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Checkbox = styled.input`
  margin: 0;
`;

const CheckboxLabel = styled.label`
  font-size: 12px;
  color: ${Colors.grey600};
  cursor: pointer;
`;

const FilterContainer: React.FC<FilterContainerProps> = ({
  filters,
  onFiltersChange,
  fields = getFeedbackFilterFields(),
  fieldOptions = {},
  quickFilters = getQuickFilters(),
  showQuickFilters = true,
  children,
  modalWidth = 800,
  savedPresets = [],
  onSavePreset,
  onLoadPreset,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterCondition[]>([...filters]);
  const [presetName, setPresetName] = useState('');
  const [sharePreset, setSharePreset] = useState(false);

  // Sync local filters with props when modal opens
  React.useEffect(() => {
    if (isModalOpen) {
      setLocalFilters([...filters]);
    }
  }, [isModalOpen, filters]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleApplyFilters = () => {
    const validFilters = localFilters.filter(isValidFilter);
    onFiltersChange(validFilters);
    setIsModalOpen(false);
  };

  const handleClearFilters = () => {
    setLocalFilters([]);
    onFiltersChange([]);
    setIsModalOpen(false);
  };

  const handleAddFilter = () => {
    setLocalFilters([...localFilters, createEmptyFilter()]);
  };

  const handleRemoveFilter = (index: number) => {
    const newFilters = localFilters.filter((_, i) => i !== index);
    setLocalFilters(newFilters);
  };

  const handleFilterChange = (index: number, updatedFilter: Partial<FilterCondition>) => {
    const newFilters = localFilters.map((filter, i) => 
      i === index ? { ...filter, ...updatedFilter } : filter
    );
    setLocalFilters(newFilters);
  };

  const handleQuickFilter = (quickFilter: QuickFilter) => {
    setLocalFilters([...localFilters, ...quickFilter.filters]);
  };

  const handleSavePreset = () => {
    if (presetName.trim() && onSavePreset) {
      onSavePreset(presetName.trim(), sharePreset);
      setPresetName('');
      setSharePreset(false);
    }
  };

  const handleLoadPreset = (preset: { id: string; name: string; filters: FilterCondition[] }) => {
    if (onLoadPreset) {
      setLocalFilters([...preset.filters]);
      onLoadPreset(preset);
    }
  };

  const getFieldByKey = (key: string) => fields.find(field => field.key === key);

  const getFieldOptions = (fieldKey: string) => {
    return fieldOptions[fieldKey] || [];
  };

  const renderFilterRow = (filter: FilterCondition, index: number) => {
    const selectedField = getFieldByKey(filter.key);
    const operatorOptions = selectedField ? getOperatorOptions(selectedField.type) : [];

    return (
      <FilterRow key={index}>
        <FilterRowContent>
          {/* Field Selection */}
          <Select
            value={filter.key}
            onChange={(e) => {
              const newFieldKey = e.target.value;
              const newField = getFieldByKey(newFieldKey);
              const newOperator = newField ? getOperatorOptions(newField.type)[0]?.value || '' : '';
              const newValue = newField ? getDefaultValueForFieldType(newField.type) : null;
              
              handleFilterChange(index, {
                key: newFieldKey,
                operator: newOperator,
                values: newValue,
              });
            }}
            options={fields.map(field => ({ value: field.key, label: field.name }))}
            placeholder="Select field"
            size="sm"
            width={180}
          />

          {/* Operator Selection */}
          {filter.key && (
            <Select
              value={filter.operator}
              onChange={(e) => {
                const newOperator = e.target.value;
                handleFilterChange(index, { operator: newOperator });
              }}
              options={operatorOptions}
              placeholder="Select operator"
              size="sm"
              width={140}
            />
          )}

          {/* Value Input */}
          {filter.key && filter.operator && selectedField && (
            <ValueComponent
              fieldType={selectedField.type}
              fieldKey={filter.key}
              fieldName={selectedField.name}
              operator={filter.operator as any}
              value={filter.values}
              options={getFieldOptions(filter.key)}
              onChange={(value) => handleFilterChange(index, { values: value })}
            />
          )}
        </FilterRowContent>

        <RemoveButton
          onClick={() => handleRemoveFilter(index)}
          title="Remove filter"
        >
          <X size={16} />
        </RemoveButton>
      </FilterRow>
    );
  };

  const activeFilterCount = getFilterCount(filters);

  return (
    <>
      {/* Trigger Element */}
      {children ? (
        <div onClick={handleOpenModal} style={{ cursor: 'pointer' }}>
          {children}
        </div>
      ) : (
        <FilterButton onClick={handleOpenModal} variant="secondary">
          <Filter size={16} />
          Filters
          {activeFilterCount > 0 && (
            <FilterCount>{activeFilterCount}</FilterCount>
          )}
        </FilterButton>
      )}

      {/* Filter Modal */}
      <Modal
        isOpen={isModalOpen}
        toggle={handleCloseModal}
        width={modalWidth}
        padding="0"
      >
        <div style={{ padding: '24px' }}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Filters</ModalTitle>
            </ModalHeader>

            {/* Saved Presets */}
            {savedPresets.length > 0 && (
              <SavedPresetsSection>
                <SavedPresetsTitle>
                  <Bookmark size={16} />
                  Saved Filter Presets
                </SavedPresetsTitle>
                <PresetList>
                  {savedPresets.map(preset => (
                    <PresetButton
                      key={preset.id}
                      isDefault={preset.isDefault}
                      onClick={() => handleLoadPreset(preset)}
                    >
                      <Bookmark size={12} />
                      {preset.name}
                      {preset.isShared && (
                        <span style={{ fontSize: '10px', opacity: 0.7 }}>
                          (shared)
                        </span>
                      )}
                    </PresetButton>
                  ))}
                </PresetList>
              </SavedPresetsSection>
            )}

            {/* Quick Filters */}
            {showQuickFilters && quickFilters.length > 0 && (
              <QuickFiltersSection>
                <QuickFiltersTitle>Quick Filters</QuickFiltersTitle>
                <QuickFilterButtons>
                  {quickFilters.map((quickFilter, index) => (
                    <QuickFilterButton
                      key={index}
                      variant="secondary"
                      onClick={() => handleQuickFilter(quickFilter)}
                    >
                      {quickFilter.label}
                    </QuickFilterButton>
                  ))}
                </QuickFilterButtons>
              </QuickFiltersSection>
            )}

            {/* Filter Rows */}
            <FiltersSection>
              {localFilters.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  color: Colors.grey500, 
                  padding: '40px 20px',
                  fontStyle: 'italic'
                }}>
                  No filters added yet. Click "Add Filter" to get started.
                </div>
              ) : (
                localFilters.map((filter, index) => renderFilterRow(filter, index))
              )}

              <AddFilterButton
                onClick={handleAddFilter}
                variant="secondary"
              >
                <Plus size={16} />
                Add Filter
              </AddFilterButton>
            </FiltersSection>

            {/* Save Preset Section */}
            {onSavePreset && localFilters.filter(isValidFilter).length > 0 && (
              <SavePresetSection>
                <Save size={16} color={Colors.grey500} />
                <SavePresetInput
                  placeholder="Enter preset name to save..."
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                />
                <SavePresetActions>
                  <Checkbox
                    type="checkbox"
                    id="share-preset"
                    checked={sharePreset}
                    onChange={(e) => setSharePreset(e.target.checked)}
                  />
                  <CheckboxLabel htmlFor="share-preset">
                    Share with team
                  </CheckboxLabel>
                  <Button
                    onClick={handleSavePreset}
                    variant="secondary"
                    size="sm"
                    disabled={!presetName.trim()}
                  >
                    Save
                  </Button>
                </SavePresetActions>
              </SavePresetSection>
            )}

            {/* Modal Footer */}
            <ModalFooter>
              <FooterLeft>
                {localFilters.filter(isValidFilter).length} active filter{localFilters.filter(isValidFilter).length !== 1 ? 's' : ''}
              </FooterLeft>
              <FooterRight>
                <Button
                  onClick={handleClearFilters}
                  variant="ghost"
                >
                  Clear All
                </Button>
                <Button
                  onClick={handleCloseModal}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApplyFilters}
                  variant="primary"
                >
                  Apply Filters
                </Button>
              </FooterRight>
            </ModalFooter>
          </ModalContent>
        </div>
      </Modal>
    </>
  );
};

export default FilterContainer;

// Export utility functions for external use
export {
  type FilterCondition,
  type FilterField,
  FilterFieldType,
  getFeedbackFilterFields,
  isValidFilter,
  getFilterCount,
  filtersToQuery,
};