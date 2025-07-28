import React from 'react';
import styled from '@emotion/styled';
import { Colors, ColorFamily } from '../../theme/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  colorTheme?: ColorFamily;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  width?: string | number;
  className?: string;
  style?: React.CSSProperties;
  flex?: string;
}

const buttonSizes = {
  sm: { height: 32, padding: '0 12px', fontSize: '14px' },
  md: { height: 40, padding: '0 16px', fontSize: '14px' },
  lg: { height: 48, padding: '0 20px', fontSize: '16px' },
};

const getColorByTheme = (theme: ColorFamily, gradient: number): string => {
  // Simplified color mapping - in real implementation, this would use the full theme system
  const colorMap: { [key in ColorFamily]: { [key: number]: string } } = {
    [ColorFamily.primary]: {
      50: Colors.primary25,
      100: Colors.primary100,
      200: Colors.primary200,
      300: Colors.primary300,
      600: Colors.primary600,
      700: Colors.primary700,
      900: Colors.primary900,
    },
    [ColorFamily.grey]: {
      50: Colors.grey50,
      100: Colors.grey100,
      200: Colors.grey200,
      300: Colors.grey300,
      600: Colors.grey600,
      700: Colors.grey700,
      900: Colors.grey900,
    },
    [ColorFamily.error]: {
      50: Colors.error25,
      100: Colors.error100,
      200: Colors.error200,
      300: Colors.error300,
      600: Colors.error600,
      700: Colors.error700,
      900: Colors.error900,
    },
    [ColorFamily.success]: {
      50: Colors.success25,
      100: Colors.success100,
      200: Colors.success200,
      300: Colors.success300,
      600: Colors.success600,
      700: Colors.success700,
      900: Colors.success900,
    },
    [ColorFamily.warning]: {
      50: Colors.warning25,
      100: Colors.warning100,
      200: Colors.warning200,
      300: Colors.warning300,
      600: Colors.warning600,
      700: Colors.warning700,
      900: Colors.warning900,
    },
    [ColorFamily.info]: {
      50: Colors.info25,
      100: Colors.info100,
      200: Colors.info200,
      300: Colors.info300,
      600: Colors.info600,
      700: Colors.info700,
      900: Colors.info900,
    },
  };

  return colorMap[theme]?.[gradient] || Colors.primary600;
};

const getButtonStyles = (variant: ButtonVariant, theme: ColorFamily): string => {
  switch (variant) {
    case 'primary':
      return `
        border: 1px solid transparent;
        background-color: ${getColorByTheme(theme, 600)};
        color: ${Colors.white};

        &:hover:not(:disabled) {
          background-color: ${getColorByTheme(theme, 700)};
        }

        &:focus {
          background-color: ${getColorByTheme(theme, 700)};
          box-shadow: 0 0 0 4px ${getColorByTheme(theme, 100)};
        }

        &:disabled {
          background-color: ${getColorByTheme(theme, 300)};
          cursor: not-allowed;
          opacity: 0.6;
        }
      `;
    case 'secondary':
      return `
        border: 1px solid ${getColorByTheme(theme, 300)};
        background-color: ${Colors.white};
        color: ${getColorByTheme(theme, 700)};

        &:hover:not(:disabled) {
          background-color: ${getColorByTheme(theme, 50)};
          color: ${getColorByTheme(theme, 900)};
        }

        &:focus {
          background-color: ${getColorByTheme(theme, 50)};
          box-shadow: 0 0 0 4px ${getColorByTheme(theme, 100)};
        }

        &:disabled {
          color: ${getColorByTheme(theme, 300)};
          cursor: not-allowed;
          opacity: 0.6;
        }
      `;
    case 'tertiary':
      return `
        border: 1px solid transparent;
        background-color: transparent;
        color: ${getColorByTheme(theme, 700)};

        &:hover:not(:disabled) {
          background-color: ${getColorByTheme(theme, 50)};
          color: ${getColorByTheme(theme, 900)};
        }

        &:focus {
          background-color: transparent;
          box-shadow: 0 0 0 4px ${getColorByTheme(theme, 100)};
        }

        &:disabled {
          color: ${getColorByTheme(theme, 300)};
          cursor: not-allowed;
          opacity: 0.6;
        }
      `;
    default:
      return '';
  }
};

const StyledButton = styled.button<{
  variant: ButtonVariant;
  size: ButtonSize;
  colorTheme: ColorFamily;
  width?: string | number;
  flex?: string;
}>`
  outline: none;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s ease-in-out;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  ${({ size }) => `
    height: ${buttonSizes[size].height}px;
    padding: ${buttonSizes[size].padding};
    font-size: ${buttonSizes[size].fontSize};
  `}
  
  ${({ variant, colorTheme }) => getButtonStyles(variant, colorTheme)}
  
  ${({ width }) => width && `width: ${typeof width === 'number' ? `${width}px` : width};`}
  ${({ flex }) => flex && `flex: ${flex};`}
`;

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  colorTheme = ColorFamily.primary,
  disabled = false,
  onClick,
  children,
  type = 'button',
  width,
  className,
  style,
  flex,
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      colorTheme={colorTheme}
      disabled={disabled}
      onClick={onClick}
      type={type}
      width={width}
      className={className}
      style={style}
      flex={flex}
    >
      {children}
    </StyledButton>
  );
};

export default Button;