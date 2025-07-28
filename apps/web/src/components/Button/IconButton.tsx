import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';

interface IconButtonProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  title?: string;
}

const StyledIconButton = styled.button<IconButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  font-family: inherit;

  /* Size variants */
  ${({ size = 'md' }) => {
    switch (size) {
      case 'sm':
        return `
          width: 28px;
          height: 28px;
        `;
      case 'lg':
        return `
          width: 44px;
          height: 44px;
        `;
      default:
        return `
          width: 36px;
          height: 36px;
        `;
    }
  }}

  /* Color variants */
  ${({ variant = 'default', disabled }) => {
    if (disabled) {
      return `
        background-color: ${Colors.grey200};
        color: ${Colors.grey400};
        cursor: not-allowed;
      `;
    }

    switch (variant) {
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
          background-color: ${Colors.white};
          color: ${Colors.grey600};
          border: 1px solid ${Colors.grey300};
          
          &:hover {
            background-color: ${Colors.grey50};
            border-color: ${Colors.grey400};
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

export default function IconButton(props: IconButtonProps) {
  return <StyledIconButton {...props}>{props.children}</StyledIconButton>;
}