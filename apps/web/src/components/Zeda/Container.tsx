import React from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';
import { FlexAlignItems, FlexDirection, FlexJustify } from '../../theme/layout';

export interface ContainerProps {
  children: React.ReactNode;
  width?: string | number;
  height?: string | number;
  minWidth?: string | number;
  minHeight?: string | number;
  maxWidth?: string | number;
  maxHeight?: string | number;
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    all?: number;
  };
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    all?: number;
  };
  border?: {
    all?: number;
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    color?: keyof typeof Colors;
    radius?: number;
    style?: 'solid' | 'dashed' | 'dotted';
  };
  bgColor?: keyof typeof Colors;
  overflow?: 'visible' | 'hidden' | 'auto' | 'scroll';
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  flex?: string;
}

export interface FlexContainerProps extends ContainerProps {
  direction?: FlexDirection;
  alignItems?: FlexAlignItems;
  justify?: FlexJustify;
  gap?: number;
  columnGap?: number;
  rowGap?: number;
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
}

const getSpacing = (spacing?: {
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

const getBorder = (border?: ContainerProps['border']) => {
  if (!border) return '';
  
  const {
    all = 0,
    top = all,
    right = all,
    bottom = all,
    left = all,
    color = 'grey200',
    radius = 0,
    style = 'solid'
  } = border;
  
  const borderColor = Colors[color];
  
  return `
    border: ${all}px ${style} ${borderColor};
    ${top !== all ? `border-top-width: ${top}px;` : ''}
    ${right !== all ? `border-right-width: ${right}px;` : ''}
    ${bottom !== all ? `border-bottom-width: ${bottom}px;` : ''}
    ${left !== all ? `border-left-width: ${left}px;` : ''}
    ${radius ? `border-radius: ${radius}px;` : ''}
  `;
};

const StyledContainer = styled.div<ContainerProps>`
  ${({ width }) => width && `width: ${typeof width === 'number' ? `${width}px` : width};`}
  ${({ height }) => height && `height: ${typeof height === 'number' ? `${height}px` : height};`}
  ${({ minWidth }) => minWidth && `min-width: ${typeof minWidth === 'number' ? `${minWidth}px` : minWidth};`}
  ${({ minHeight }) => minHeight && `min-height: ${typeof minHeight === 'number' ? `${minHeight}px` : minHeight};`}
  ${({ maxWidth }) => maxWidth && `max-width: ${typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth};`}
  ${({ maxHeight }) => maxHeight && `max-height: ${typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight};`}
  ${({ padding }) => padding && `padding: ${getSpacing(padding)};`}
  ${({ margin }) => margin && `margin: ${getSpacing(margin)};`}
  ${({ border }) => getBorder(border)}
  ${({ bgColor }) => bgColor && `background-color: ${Colors[bgColor]};`}
  ${({ overflow }) => overflow && `overflow: ${overflow};`}
  ${({ position }) => position && `position: ${position};`}
  ${({ flex }) => flex && `flex: ${flex};`}
  ${({ onClick }) => onClick && 'cursor: pointer;'}
`;

const StyledFlexContainer = styled(StyledContainer)<FlexContainerProps>`
  display: flex;
  ${({ direction }) => direction && `flex-direction: ${direction};`}
  ${({ alignItems }) => alignItems && `align-items: ${alignItems};`}
  ${({ justify }) => justify && `justify-content: ${justify};`}
  ${({ gap }) => gap && `gap: ${gap}px;`}
  ${({ columnGap }) => columnGap && `column-gap: ${columnGap}px;`}
  ${({ rowGap }) => rowGap && `row-gap: ${rowGap}px;`}
  ${({ wrap }) => wrap && `flex-wrap: ${wrap};`}
`;

export const Container: React.FC<ContainerProps> = ({
  children,
  ...props
}) => {
  return (
    <StyledContainer {...props}>
      {children}
    </StyledContainer>
  );
};

export const FlexContainer: React.FC<FlexContainerProps> = ({
  children,
  direction = FlexDirection.row,
  alignItems = FlexAlignItems.stretch,
  justify = FlexJustify.flexStart,
  wrap = 'nowrap',
  ...props
}) => {
  return (
    <StyledFlexContainer
      direction={direction}
      alignItems={alignItems}
      justify={justify}
      wrap={wrap}
      {...props}
    >
      {children}
    </StyledFlexContainer>
  );
};

export default Container;