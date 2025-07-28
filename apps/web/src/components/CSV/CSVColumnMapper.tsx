import React, { useState, useEffect } from 'react';
import { FlexContainer, Container, Text, Button, Select } from '../Zeda';
import { Colors, FontSize, FontWeight, ColorFamily } from '../../theme/colors';
import { FlexAlignItems, FlexDirection, FlexJustify } from '../../theme/layout';

interface CSVColumnMapperProps {
  csvData: { csvField: string; feedbackField: string; csvData: string[] }[];
  moduleFields: {
    displayName: string;
    isRequired: boolean;
    typeId: string;
  }[];
  onMapping: (mapping: { [key: string]: string }) => void;
  onImport: () => void;
  onBack: () => void;
  onClose: () => void;
}

enum MappingState {
  INCOMPLETE = 'incomplete',
  FINISHED_ONCE = 'finished_once',
  DONE = 'done',
}

export const CSVColumnMapper: React.FC<CSVColumnMapperProps> = ({
  csvData,
  moduleFields,
  onMapping,
  onImport,
  onBack,
  onClose,
}) => {
  const [mapping, setMapping] = useState<{ [key: string]: string }>({});
  const [mappingState, setMappingState] = useState<MappingState>(MappingState.INCOMPLETE);

  const mandatoryFields = moduleFields.filter(field => field.isRequired);
  const mappingValues = Object.values(mapping);

  const mappingIncludesFields = mandatoryFields.every(field =>
    mappingValues.includes(field.typeId)
  );

  useEffect(() => {
    if (!mappingIncludesFields) {
      setMappingState(MappingState.INCOMPLETE);
      return;
    }

    setMappingState(MappingState.FINISHED_ONCE);
    setTimeout(() => {
      setMappingState(MappingState.DONE);
    }, 1000);
  }, [mappingIncludesFields]);

  useEffect(() => {
    onMapping(mapping);
  }, [mapping, onMapping]);

  const fieldOptions = moduleFields.map(field => ({
    label: field.displayName,
    value: field.typeId,
    disabled: mappingValues.includes(field.typeId),
    isRequired: field.isRequired,
  }));

  const handleFieldChange = (csvField: string, selectedValue: string) => {
    setMapping(prev => ({
      ...prev,
      [csvField]: selectedValue,
    }));
  };

  const getMappingStatusIcon = () => {
    switch (mappingState) {
      case MappingState.INCOMPLETE:
        return '⚠️';
      case MappingState.FINISHED_ONCE:
        return '⏳';
      case MappingState.DONE:
        return '✅';
      default:
        return '⚠️';
    }
  };

  const getMappingStatusText = () => {
    switch (mappingState) {
      case MappingState.INCOMPLETE:
        return 'Please map all required fields';
      case MappingState.FINISHED_ONCE:
        return 'Validating mapping...';
      case MappingState.DONE:
        return 'All required fields mapped successfully';
      default:
        return 'Please map all required fields';
    }
  };

  return (
    <FlexContainer direction={FlexDirection.column} height="500px">
      {/* Status Banner */}
      <FlexContainer
        padding={{ all: 12 }}
        bgColor={Colors.info50}
        alignItems={FlexAlignItems.center}
        gap={8}
        border={{ radius: 4 }}
        margin={{ bottom: 16 }}
      >
        <Text fontSize={FontSize.text_lg}>{getMappingStatusIcon()}</Text>
        <Text fontSize={FontSize.text_sm} color={Colors.info600}>
          {getMappingStatusText()}
        </Text>
      </FlexContainer>

      {/* Mapping Table */}
      <Container
        height="380px"
        overflow="auto"
        border={{ radius: 8, color: Colors.grey200, all: 1 }}
        flex="1"
      >
        {/* Table Header */}
        <FlexContainer
          bgColor={Colors.grey50}
          border={{ color: Colors.grey200, bottom: 1 }}
          padding={{ left: 16, right: 16, top: 12, bottom: 12 }}
          alignItems={FlexAlignItems.center}
        >
          <FlexContainer width="200px" minWidth="200px">
            <Text
              color={Colors.grey500}
              fontWeight={FontWeight.semiBold}
              fontSize={FontSize.text_xs}
            >
              📄 CSV Fields
            </Text>
          </FlexContainer>
          <FlexContainer width="200px" minWidth="200px" margin={{ left: 16 }}>
            <Text
              color={Colors.grey500}
              fontWeight={FontWeight.semiBold}
              fontSize={FontSize.text_xs}
            >
              🎯 FeedbackHub Fields
            </Text>
          </FlexContainer>
          <FlexContainer flex="1" margin={{ left: 16 }}>
            <Text
              color={Colors.grey500}
              fontWeight={FontWeight.semiBold}
              fontSize={FontSize.text_xs}
            >
              📊 Sample Data
            </Text>
          </FlexContainer>
        </FlexContainer>

        {/* Table Rows */}
        <Container height="calc(100% - 45px)" overflow="auto">
          {csvData.map((dataItem, index) => (
            <FlexContainer
              key={dataItem.csvField}
              padding={{ left: 16, right: 16, top: 12, bottom: 12 }}
              border={{ color: Colors.grey200, bottom: 1 }}
              alignItems={FlexAlignItems.center}
              bgColor={index % 2 === 0 ? Colors.white : Colors.grey25}
            >
              {/* CSV Field Name */}
              <FlexContainer width="200px" minWidth="200px">
                <Text
                  fontSize={FontSize.text_sm}
                  fontWeight={FontWeight.medium}
                  color={Colors.grey700}
                >
                  {dataItem.csvField}
                </Text>
              </FlexContainer>

              {/* Field Mapping Select */}
              <FlexContainer width="200px" minWidth="200px" margin={{ left: 16 }}>
                <Select
                  value={mapping[dataItem.csvField] || ''}
                  onChange={(value) => handleFieldChange(dataItem.csvField, value)}
                  placeholder="Select field..."
                  options={[
                    { label: '-- No mapping --', value: '' },
                    ...fieldOptions.map(option => ({
                      ...option,
                      label: option.isRequired ? `${option.label} *` : option.label,
                    })),
                  ]}
                  width="100%"
                />
              </FlexContainer>

              {/* Sample Data */}
              <FlexContainer flex="1" margin={{ left: 16 }}>
                <Text
                  fontSize={FontSize.text_sm}
                  color={Colors.grey600}
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {dataItem.csvData.filter(Boolean).slice(0, 3).join(', ') || 'No data'}
                </Text>
              </FlexContainer>
            </FlexContainer>
          ))}
        </Container>
      </Container>

      {/* Action Buttons */}
      <FlexContainer
        justify={FlexJustify.spaceBetween}
        margin={{ top: 16 }}
      >
        <Button
          variant="secondary"
          colorTheme={ColorFamily.grey}
          onClick={onBack}
        >
          Back
        </Button>

        <FlexContainer gap={12}>
          <Button
            variant="secondary"
            colorTheme={ColorFamily.grey}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!mappingIncludesFields}
            onClick={onImport}
          >
            Import Data
          </Button>
        </FlexContainer>
      </FlexContainer>
    </FlexContainer>
  );
};

export default CSVColumnMapper;