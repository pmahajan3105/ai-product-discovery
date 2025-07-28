// Extracted and simplified from Zeda's Tag component
import React from 'react';
import styled from '@emotion/styled';
import { Colors, ColorFamily } from '../../../theme/colors';

export enum TagVariant {
  sm = 'sm',
  md = 'md',
  lg = 'lg',
}

export enum TagType {
  badge = 'badge',
  tag = 'tag',
}

export interface TagProps {
  /**
   * Type of Tag | Badge
   */
  type?: TagType;
  /**
   * Variant of Tag sm | mg | lg to select the size
   */
  variant?: TagVariant;
  /**
   * Label refers to the text to be show to the component
   */
  label: string | number;
  /**
   * Color Family to specify the color variant of label
   */
  colorFamily?: ColorFamily;
  /**
   * Click handler
   */
  onClick?: () => void;
  /**
   * Additional class name
   */
  className?: string;
  /**
   * Custom style
   */
  style?: React.CSSProperties;
}

interface StyledTagProps {
  $colorFamily: ColorFamily;
  $variant: TagVariant;
  $type: TagType;
  $clickable: boolean;
}

const getTagColors = (colorFamily: ColorFamily) => {
  switch (colorFamily) {
    case ColorFamily.success:
      return {
        bg: Colors.success100,
        text: Colors.success700,
        border: Colors.success200,
        hoverBg: Colors.success200,
      };
    case ColorFamily.warning:
      return {
        bg: Colors.warning100,
        text: Colors.warning700,
        border: Colors.warning200,
        hoverBg: Colors.warning200,
      };
    case ColorFamily.error:
      return {
        bg: Colors.error100,
        text: Colors.error700,
        border: Colors.error200,
        hoverBg: Colors.error200,
      };
    case ColorFamily.info:
      return {
        bg: Colors.info100,
        text: Colors.info700,
        border: Colors.info200,
        hoverBg: Colors.info200,
      };
    case ColorFamily.primary:
      return {
        bg: Colors.primary100,
        text: Colors.primary700,
        border: Colors.primary200,
        hoverBg: Colors.primary200,
      };
    case ColorFamily.orange:
      return {
        bg: Colors.orange100,
        text: Colors.orange700,
        border: Colors.orange200,
        hoverBg: Colors.orange200,
      };
    case ColorFamily.purple:
      return {
        bg: Colors.purple100,
        text: Colors.purple700,
        border: Colors.purple200,
        hoverBg: Colors.purple200,
      };
    case ColorFamily.grey:
    default:
      return {
        bg: Colors.grey100,
        text: Colors.grey700,
        border: Colors.grey200,
        hoverBg: Colors.grey200,
      };
  }
};

const getTagSize = (variant: TagVariant) => {
  switch (variant) {
    case TagVariant.sm:
      return {
        padding: '2px 6px',
        fontSize: '11px',
        lineHeight: '16px',
        borderRadius: '4px',
      };
    case TagVariant.lg:
      return {
        padding: '4px 10px',
        fontSize: '14px',
        lineHeight: '20px',
        borderRadius: '6px',
      };
    case TagVariant.md:
    default:
      return {
        padding: '3px 8px',
        fontSize: '12px',
        lineHeight: '18px',
        borderRadius: '4px',
      };
  }
};

const StyledTag = styled.span<StyledTagProps>`
  display: inline-flex;
  align-items: center;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.15s ease-in-out;
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  user-select: none;
  
  ${({ $colorFamily }) => {
    const colors = getTagColors($colorFamily);
    return `
      background-color: ${colors.bg};
      color: ${colors.text};
      border: 1px solid ${colors.border};
      
      ${({ $clickable }) => $clickable ? `
        &:hover {
          background-color: ${colors.hoverBg};
        }
      ` : ''}
    `;
  }}
  
  ${({ $variant }) => {
    const size = getTagSize($variant);
    return `
      padding: ${size.padding};
      font-size: ${size.fontSize};
      line-height: ${size.lineHeight};
      border-radius: ${size.borderRadius};
    `;
  }}
`;

export const Tag: React.FC<TagProps> = ({
  type = TagType.tag,
  variant = TagVariant.md,
  label,
  colorFamily = ColorFamily.grey,
  onClick,
  className,
  style,
}) => {
  const isClickable = !!onClick;

  return (
    <StyledTag
      $type={type}
      $variant={variant}
      $colorFamily={colorFamily}
      $clickable={isClickable}
      onClick={onClick}
      className={className}
      style={style}
    >
      {label}
    </StyledTag>
  );
};

export default Tag;