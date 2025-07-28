import React from 'react';
import styled from '@emotion/styled';
import ReactDOM from 'react-dom';
import { Colors } from '../../theme/colors';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backdrop?: boolean;
  disableBackDropClick?: boolean;
  width?: number | string;
  height?: number | string;
  maxHeight?: number | string;
  maxWidth?: number | string;
  className?: string;
}

const BackDrop = styled.div<{ backdrop: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1040;
  width: 100vw;
  height: 100vh;
  background: ${({ backdrop }) => (backdrop ? `rgba(52, 64, 84, 0.7)` : `transparent`)};
`;

const ModalContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1050;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModalContent = styled.div<{
  width?: number | string;
  height?: number | string;
  maxHeight?: number | string;
  maxWidth?: number | string;
}>`
  background: ${Colors.white};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 24px -4px rgba(16, 24, 40, 0.08), 0px 8px 8px -4px rgba(16, 24, 40, 0.03);
  ${({ width }) => width && `width: ${typeof width === 'number' ? `${width}px` : width};`}
  ${({ height }) => height && `height: ${typeof height === 'number' ? `${height}px` : height};`}
  ${({ maxHeight }) => maxHeight && `max-height: ${typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight};`}
  ${({ maxWidth }) => maxWidth && `max-width: ${typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth};`}
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: ${Colors.grey500};
  padding: 4px;
  border-radius: 4px;
  z-index: 1051;

  &:hover {
    background: ${Colors.grey100};
    color: ${Colors.grey700};
  }
`;

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  backdrop = true,
  disableBackDropClick = false,
  width,
  height,
  maxHeight,
  maxWidth,
  className,
}) => {
  const handleBackdropClick = () => {
    if (!disableBackDropClick) {
      onClose();
    }
  };

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <ModalContainer onClick={handleBackdropClick}>
      <ModalContent
        className={className}
        onClick={handleContentClick}
        width={width}
        height={height}
        maxHeight={maxHeight}
        maxWidth={maxWidth}
      >
        <CloseButton onClick={onClose}>×</CloseButton>
        {children}
      </ModalContent>
      {backdrop && <BackDrop backdrop={backdrop} />}
    </ModalContainer>,
    document.body
  );
};

export default Modal;