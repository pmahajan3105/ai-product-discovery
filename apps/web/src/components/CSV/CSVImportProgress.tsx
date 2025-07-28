import React from 'react';
import { FlexContainer, Container, Text, Button } from '../Zeda';
import { Colors, FontSize, FontWeight, ColorFamily } from '../../theme/colors';
import { FlexAlignItems, FlexDirection, FlexJustify } from '../../theme/layout';

interface CSVImportProgressProps {
  progressData: {
    totalCount: number;
    failedCount: number;
    progress: number;
    currentRecord: number;
  };
  isCompleted: boolean;
  onClose: () => void;
  onStartOver: () => void;
}

export const CSVImportProgress: React.FC<CSVImportProgressProps> = ({
  progressData,
  isCompleted,
  onClose,
  onStartOver,
}) => {
  const { totalCount, failedCount, progress, currentRecord } = progressData;
  const successCount = totalCount - failedCount;

  return (
    <FlexContainer
      direction={FlexDirection.column}
      alignItems={FlexAlignItems.center}
      justify={FlexJustify.center}
      height="400px"
      padding={{ all: 40 }}
    >
      {/* Progress Circle */}
      <FlexContainer
        width={120}
        height={120}
        border={{ all: 8, color: isCompleted ? Colors.success500 : Colors.primary500, radius: 60 }}
        alignItems={FlexAlignItems.center}
        justify={FlexJustify.center}
        margin={{ bottom: 24 }}
        position="relative"
      >
        <Text
          fontSize={FontSize.text_2xl}
          fontWeight={FontWeight.bold}
          color={isCompleted ? Colors.success600 : Colors.primary600}
        >
          {isCompleted ? '✓' : `${progress}%`}
        </Text>
      </FlexContainer>

      {/* Status Text */}
      <Text
        fontSize={FontSize.text_lg}
        fontWeight={FontWeight.semiBold}
        color={Colors.grey900}
        margin={{ bottom: 8 }}
        textAlign="center"
      >
        {isCompleted ? 'Import Completed!' : 'Importing Data...'}
      </Text>

      <Text
        fontSize={FontSize.text_sm}
        color={Colors.grey600}
        margin={{ bottom: 24 }}
        textAlign="center"
      >
        {isCompleted 
          ? 'Your CSV data has been successfully imported.'
          : `Processing record ${currentRecord} of ${totalCount}`
        }
      </Text>

      {/* Progress Stats */}
      <FlexContainer
        direction={FlexDirection.row}
        gap={32}
        margin={{ bottom: 32 }}
      >
        <FlexContainer direction={FlexDirection.column} alignItems={FlexAlignItems.center}>
          <Text
            fontSize={FontSize.text_2xl}
            fontWeight={FontWeight.bold}
            color={Colors.grey900}
          >
            {totalCount.toLocaleString()}
          </Text>
          <Text
            fontSize={FontSize.text_sm}
            color={Colors.grey500}
          >
            Total Records
          </Text>
        </FlexContainer>

        {isCompleted && (
          <>
            <FlexContainer direction={FlexDirection.column} alignItems={FlexAlignItems.center}>
              <Text
                fontSize={FontSize.text_2xl}
                fontWeight={FontWeight.bold}
                color={Colors.success600}
              >
                {successCount.toLocaleString()}
              </Text>
              <Text
                fontSize={FontSize.text_sm}
                color={Colors.grey500}
              >
                Successful
              </Text>
            </FlexContainer>

            {failedCount > 0 && (
              <FlexContainer direction={FlexDirection.column} alignItems={FlexAlignItems.center}>
                <Text
                  fontSize={FontSize.text_2xl}
                  fontWeight={FontWeight.bold}
                  color={Colors.error600}
                >
                  {failedCount.toLocaleString()}
                </Text>
                <Text
                  fontSize={FontSize.text_sm}
                  color={Colors.grey500}
                >
                  Failed
                </Text>
              </FlexContainer>
            )}
          </>
        )}
      </FlexContainer>

      {/* Progress Bar (only show while importing) */}
      {!isCompleted && (
        <Container
          width="300px"
          height="8px"
          bgColor={Colors.grey200}
          border={{ radius: 4 }}
          margin={{ bottom: 24 }}
          overflow="hidden"
        >
          <Container
            width={`${progress}%`}
            height="100%"
            bgColor={Colors.primary500}
            style={{ transition: 'width 0.3s ease' }}
          />
        </Container>
      )}

      {/* Action Buttons */}
      <FlexContainer gap={16}>
        {isCompleted ? (
          <>
            <Button
              variant="secondary"
              colorTheme={ColorFamily.grey}
              onClick={onStartOver}
            >
              Import Another File
            </Button>
            <Button
              variant="primary"
              onClick={onClose}
            >
              View Feedback
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            colorTheme={ColorFamily.grey}
            onClick={onClose}
            disabled
          >
            Please wait...
          </Button>
        )}
      </FlexContainer>

      {/* Error Notice */}
      {isCompleted && failedCount > 0 && (
        <FlexContainer
          margin={{ top: 24 }}
          padding={{ all: 12 }}
          bgColor={Colors.warning50}
          border={{ radius: 4, color: Colors.warning200, all: 1 }}
          maxWidth="400px"
        >
          <Text
            fontSize={FontSize.text_sm}
            color={Colors.warning700}
            textAlign="center"
          >
            {failedCount} record(s) failed to import. Check your email for details about the failed records.
          </Text>
        </FlexContainer>
      )}
    </FlexContainer>
  );
};

export default CSVImportProgress;