import styled from '@emotion/styled';

interface FlexContainerProps {
  direction?: 'row' | 'column';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  gap?: number;
  padding?: string | number;
  margin?: string | number;
  width?: string | number;
  height?: string | number;
  backgroundColor?: string;
  border?: {
    radius?: number;
    color?: string;
    all?: number;
  };
  className?: string;
}

const FlexContainer = styled.div<FlexContainerProps>`
  display: flex;
  flex-direction: ${({ direction = 'row' }) => direction};
  justify-content: ${({ justify = 'flex-start' }) => justify};
  align-items: ${({ align = 'flex-start' }) => align};
  gap: ${({ gap }) => gap ? `${gap}px` : '0'};
  padding: ${({ padding }) => 
    typeof padding === 'number' ? `${padding}px` : padding || '0'};
  margin: ${({ margin }) => 
    typeof margin === 'number' ? `${margin}px` : margin || '0'};
  width: ${({ width }) => 
    typeof width === 'number' ? `${width}px` : width || 'auto'};
  height: ${({ height }) => 
    typeof height === 'number' ? `${height}px` : height || 'auto'};
  background-color: ${({ backgroundColor }) => backgroundColor || 'transparent'};
  
  ${({ border }) => border ? `
    border-radius: ${border.radius || 0}px;
    border: ${border.all || 0}px solid ${border.color || 'transparent'};
  ` : ''}
`;

export default FlexContainer;