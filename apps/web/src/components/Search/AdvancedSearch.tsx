import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';
import { Search, Filter, Save, Bookmark, X } from 'lucide-react';
import Button from '../Button/Button';
import Input from '../Zeda/Input/Input';
import Select from '../Zeda/Select/Select';
import Modal from '../Zeda/Modal/Modal';
import FilterContainer from '../Filter/FilterContainer';
import { FilterCondition } from '../Filter/filterHelpers';

interface SavedPreset {
  id: string;
  name: string;
  filters: FilterCondition[];
  isDefault: boolean;
  isShared: boolean;
  createdBy: string;
  creator?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface AdvancedSearchProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  onSearch: () => void;
  savedPresets?: SavedPreset[];
  onSavePreset?: (name: string, filters: FilterCondition[], isShared: boolean) => void;
  onLoadPreset?: (preset: SavedPreset) => void;
  onDeletePreset?: (presetId: string) => void;
}

const SearchContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: ${Colors.white};
  border: 1px solid ${Colors.grey200};
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
`;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SearchInputContainer = styled.div`
  position: relative;
  flex: 1;
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${Colors.grey400};
  z-index: 1;
`;

const SearchInput = styled(Input)`
  padding-left: 40px;
  
  &::placeholder {
    color: ${Colors.grey400};
  }
`;

const PresetRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const PresetSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
`;

const PresetButtons = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
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

const PresetActions = styled.div`
  display: flex;
  gap: 8px;
`;

const SavePresetModal = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${Colors.grey900};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: ${Colors.grey700};
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Checkbox = styled.input`
  margin: 0;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
`;

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  searchValue,
  onSearchChange,
  filters,
  onFiltersChange,
  onSearch,
  savedPresets = [],
  onSavePreset,
  onLoadPreset,
  onDeletePreset
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [sharePreset, setSharePreset] = useState(false);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  const handleSavePreset = () => {
    if (presetName.trim() && onSavePreset) {
      onSavePreset(presetName.trim(), filters, sharePreset);
      setPresetName('');
      setSharePreset(false);
      setShowSaveModal(false);
    }
  };

  const handleLoadPreset = (preset: SavedPreset) => {
    if (onLoadPreset) {
      onLoadPreset(preset);
    }
  };

  const defaultPreset = savedPresets.find(p => p.isDefault);
  const otherPresets = savedPresets.filter(p => !p.isDefault);

  return (
    <>
      <SearchContainer>
        <SearchRow>
          <SearchInputContainer>
            <SearchIcon size={16} />
            <SearchInput
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search feedback by title, description, customer, assignee..."
              size="lg"
            />
          </SearchInputContainer>
          
          <FilterContainer
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
          
          <Button
            onClick={onSearch}
            variant="primary"
          >
            <Search size={16} />
            Search
          </Button>
        </SearchRow>

        {savedPresets.length > 0 && (
          <PresetRow>
            <PresetSection>
              <Bookmark size={16} color={Colors.grey500} />
              <span style={{ fontSize: '14px', fontWeight: '500', color: Colors.grey700 }}>
                Saved Searches:
              </span>
              <PresetButtons>
                {defaultPreset && (
                  <PresetButton
                    isDefault
                    onClick={() => handleLoadPreset(defaultPreset)}
                  >
                    <Bookmark size={12} />
                    {defaultPreset.name}
                  </PresetButton>
                )}
                {otherPresets.map(preset => (
                  <PresetButton
                    key={preset.id}
                    onClick={() => handleLoadPreset(preset)}
                  >
                    {preset.name}
                    {preset.isShared && (
                      <span style={{ fontSize: '10px', opacity: 0.7 }}>
                        (shared)
                      </span>
                    )}
                  </PresetButton>
                ))}
              </PresetButtons>
            </PresetSection>

            <PresetActions>
              {onSavePreset && (filters.length > 0 || searchValue.trim()) && (
                <Button
                  onClick={() => setShowSaveModal(true)}
                  variant="secondary"
                  size="sm"
                >
                  <Save size={14} />
                  Save Search
                </Button>
              )}
            </PresetActions>
          </PresetRow>
        )}
      </SearchContainer>

      {/* Save Preset Modal */}
      <Modal
        isOpen={showSaveModal}
        toggle={() => setShowSaveModal(false)}
        width={400}
      >
        <SavePresetModal>
          <ModalTitle>Save Search Preset</ModalTitle>
          
          <FormGroup>
            <Label htmlFor="preset-name">Preset Name</Label>
            <Input
              id="preset-name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Enter preset name..."
              autoFocus
            />
          </FormGroup>

          <CheckboxGroup>
            <Checkbox
              type="checkbox"
              id="share-preset"
              checked={sharePreset}
              onChange={(e) => setSharePreset(e.target.checked)}
            />
            <Label htmlFor="share-preset">
              Share with team members
            </Label>
          </CheckboxGroup>

          <ModalActions>
            <Button
              onClick={() => setShowSaveModal(false)}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePreset}
              variant="primary"
              disabled={!presetName.trim()}
            >
              Save Preset
            </Button>
          </ModalActions>
        </SavePresetModal>
      </Modal>
    </>
  );
};

export default AdvancedSearch;