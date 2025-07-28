import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const StyledButton = styled.button<ButtonProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  font-family: inherit;
  
  width: ${({ fullWidth }) => fullWidth ? '100%' : 'auto'};

  /* Size variants */
  ${({ size = 'md' }) => {
    switch (size) {
      case 'sm':
        return `
          padding: 6px 12px;
          font-size: 14px;
          line-height: 20px;
        `;
      case 'lg':
        return `
          padding: 12px 20px;
          font-size: 16px;
          line-height: 24px;
        `;
      default:
        return `
          padding: 8px 16px;
          font-size: 14px;
          line-height: 20px;
        `;
    }
  }}

  /* Color variants */
  ${({ variant = 'primary', disabled }) => {
    if (disabled) {
      return `
        background-color: ${Colors.grey200};
        color: ${Colors.grey400};
        cursor: not-allowed;
      `;
    }

    switch (variant) {
      case 'secondary':
        return `
          background-color: ${Colors.white};
          color: ${Colors.grey700};
          border: 1px solid ${Colors.grey300};
          
          &:hover {
            background-color: ${Colors.grey50};
            border-color: ${Colors.grey400};
          }
        `;
      case 'ghost':
        return `
          background-color: transparent;
          color: ${Colors.grey600};
          
          &:hover {
            background-color: ${Colors.grey100};
            color: ${Colors.grey700};
          }
        `;
      default:
        return `
          background-color: ${Colors.primary600};
          color: ${Colors.white};
          
          &:hover {
            background-color: ${Colors.primary700};
          }
        `;
    }
  }}

  &:focus {
    outline: 2px solid ${Colors.primary500};
    outline-offset: 2px;
  }

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`;

export default function Button(props: ButtonProps) {
  return <StyledButton {...props}>{props.children}</StyledButton>;
}