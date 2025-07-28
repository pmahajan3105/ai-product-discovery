import React from 'react';
import styled from '@emotion/styled';
import { Colors, FontSize, FontWeight } from '../../theme/colors';

export interface TextProps {
  children: React.ReactNode;
  fontSize?: keyof typeof FontSize;
  fontWeight?: keyof typeof FontWeight;
  color?: keyof typeof Colors;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: string | number;
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    all?: number;
  };
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    all?: number;
  };
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  htmlTagName?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  flex?: string;
  cursor?: string;
}

const getMarginPadding = (spacing?: {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  all?: number;
}) => {
  if (!spacing) return '';
  
  if (spacing.all !== undefined) {
    return `${spacing.all}px`;
  }
  
  const top = spacing.top || 0;
  const right = spacing.right || 0;
  const bottom = spacing.bottom || 0;
  const left = spacing.left || 0;
  
  return `${top}px ${right}px ${bottom}px ${left}px`;
};

const StyledText = styled.div<TextProps>`
  ${({ fontSize }) => fontSize && `font-size: ${FontSize[fontSize]};`}
  ${({ fontWeight }) => fontWeight && `font-weight: ${FontWeight[fontWeight]};`}
  ${({ color }) => color && `color: ${Colors[color]};`}
  ${({ textAlign }) => textAlign && `text-align: ${textAlign};`}
  ${({ lineHeight }) => lineHeight && `line-height: ${lineHeight};`}
  ${({ margin }) => margin && `margin: ${getMarginPadding(margin)};`}
  ${({ padding }) => padding && `padding: ${getMarginPadding(padding)};`}
  ${({ flex }) => flex && `flex: ${flex};`}
  ${({ cursor }) => cursor && `cursor: ${cursor};`}
  ${({ onClick }) => onClick && 'cursor: pointer;'}
`;

export const Text: React.FC<TextProps> = ({
  children,
  fontSize,
  fontWeight,
  color,
  textAlign,
  lineHeight,
  margin,
  padding,
  className,
  style,
  onClick,
  htmlTagName = 'div',
  flex,
  cursor,
}) => {
  return (
    <StyledText
      as={htmlTagName}
      fontSize={fontSize}
      fontWeight={fontWeight}
      color={color}
      textAlign={textAlign}
      lineHeight={lineHeight}
      margin={margin}
      padding={padding}
      className={className}
      style={style}
      onClick={onClick}
      flex={flex}
      cursor={cursor}
    >
      {children}
    </StyledText>
  );
};

export default Text;