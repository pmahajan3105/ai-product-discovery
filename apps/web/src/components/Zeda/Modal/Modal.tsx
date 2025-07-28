// Extracted and simplified from Zeda's Modal component
import React from 'react';
import styled from '@emotion/styled';
import ReactDOM from 'react-dom';
import { Colors } from '../../../theme/colors';
import { X } from 'lucide-react';
import IconButton from '../../Button/IconButton';

export interface ModalProps {
  isOpen: boolean;
  toggle: () => void;
  children: React.ReactNode;
  
  // Positioning
  isCenter?: boolean;
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  minWidth?: number | string;
  minHeight?: number | string;
  
  // Styling
  className?: string;
  padding?: string;
  
  // Behavior
  disableBackDropClick?: boolean;
  backdrop?: boolean;
  showBoxShadow?: boolean;
  hasCloseIcon?: boolean;
}

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1040;
  width: 100vw;
  height: 100vh;
`;

const BackDrop = styled.div<{ backdrop: boolean; blurBackdrop: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: ${({ backdrop }) => (backdrop ? `rgba(52, 64, 84, 0.7)` : `transparent`)};
  ${({ blurBackdrop }) => blurBackdrop && `backdrop-filter: blur(4px);`}
`;

const ModalContainer = styled.div<{
  isCenter: boolean;
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  minWidth?: number | string;
  minHeight?: number | string;
  showBoxShadow: boolean;
  padding?: string;
}>`
  position: absolute;
  background: ${Colors.white};
  z-index: 1050;
  border-radius: 12px;
  overflow: hidden;
  
  ${({ showBoxShadow }) =>
    showBoxShadow &&
    `box-shadow: 0 20px 24px -4px rgba(16, 24, 40, 0.08), 0px 8px 8px -4px rgba(16, 24, 40, 0.03);`}
  
  ${({ width }) => width && `width: ${typeof width === 'number' ? `${width}px` : width};`}
  ${({ height }) => height && `height: ${typeof height === 'number' ? `${height}px` : height};`}
  ${({ maxHeight }) => maxHeight && `max-height: ${typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight};`}
  ${({ maxWidth }) => maxWidth && `max-width: ${typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth};`}
  ${({ minHeight }) => minHeight && `min-height: ${typeof minHeight === 'number' ? `${minHeight}px` : minHeight};`}
  ${({ minWidth }) => minWidth && `min-width: ${typeof minWidth === 'number' ? `${minWidth}px` : minWidth};`}
  ${({ padding }) => padding && `padding: ${padding};`}
  
  ${({ isCenter }) =>
    isCenter
      ? `
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  `
      : `
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
  `}
`;

const CloseButton = styled(IconButton)`
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1;
`;

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  toggle,
  children,
  isCenter = true,
  width,
  height,
  maxWidth,
  maxHeight,
  minWidth = 400,
  minHeight,
  className,
  padding = '24px',
  disableBackDropClick = false,
  backdrop = true,
  showBoxShadow = true,
  hasCloseIcon = true,
}) => {
  const handleBackdropClick = () => {
    if (disableBackDropClick) return;
    toggle();
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <ModalOverlay onClick={handleBackdropClick}>
      <ModalContainer
        className={className}
        onClick={handleContainerClick}
        isCenter={isCenter}
        width={width}
        height={height}
        maxWidth={maxWidth}
        maxHeight={maxHeight}
        minWidth={minWidth}
        minHeight={minHeight}
        showBoxShadow={showBoxShadow}
        padding={padding}
      >
        {hasCloseIcon && (
          <CloseButton
            variant="ghost" 
            size="sm"
            onClick={toggle}
          >
            <X size={20} />
          </CloseButton>
        )}
        {children}
      </ModalContainer>
      {backdrop && (
        <BackDrop 
          backdrop={backdrop} 
          blurBackdrop={disableBackDropClick} 
        />
      )}
    </ModalOverlay>,
    document.body
  );
};

export default Modal;