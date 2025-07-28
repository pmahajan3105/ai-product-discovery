import React from 'react';
import { useRouter } from 'next/router';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';
import FlexContainer from '../Container/FlexContainer';
import Button from '../Button/Button';
import IconButton from '../Button/IconButton';
import { NavbarItem } from './config';

interface NavItemProps {
  item: NavbarItem;
  isExpanded: boolean;
  onClick?: () => void;
  showTooltip?: boolean;
}

const StyledButton = styled(Button)<{ isActive: boolean }>`
  width: 100%;
  justify-content: flex-start;
  color: ${({ isActive }) => isActive ? Colors.primary600 : Colors.grey600} !important;
  background-color: ${({ isActive }) => isActive ? Colors.primary50 : 'transparent'} !important;
  
  &:hover {
    background-color: ${({ isActive }) => isActive ? Colors.primary100 : Colors.grey100} !important;
  }

  svg {
    fill: ${({ isActive }) => isActive ? Colors.primary600 : Colors.grey600} !important;
  }

  span {
    white-space: nowrap;
    flex-grow: 0;
    color: ${({ isActive }) => isActive ? Colors.primary600 : Colors.grey600} !important;
  }
`;

const StyledIconButton = styled(IconButton)<{ isActive: boolean }>`
  color: ${({ isActive }) => isActive ? Colors.primary600 : Colors.grey600} !important;
  background-color: ${({ isActive }) => isActive ? Colors.primary50 : 'transparent'} !important;
  border: none !important;
  
  &:hover {
    background-color: ${({ isActive }) => isActive ? Colors.primary100 : Colors.grey100} !important;
  }

  svg {
    fill: ${({ isActive }) => isActive ? Colors.primary600 : Colors.grey600} !important;
  }
`;

const NavigationItem = styled(FlexContainer)`
  transition: background-color 0.1s ease-in-out;
  border-radius: 6px;
  margin: 2px 0;

  :hover {
    background-color: transparent;
  }

  svg {
    flex-shrink: 0;
  }

  span {
    white-space: nowrap;
  }
`;

const TooltipContainer = styled.div`
  position: relative;
  
  &:hover .tooltip {
    opacity: 1;
    visibility: visible;
  }

  .tooltip {
    position: absolute;
    left: 50px;
    top: 50%;
    transform: translateY(-50%);
    background-color: ${Colors.grey800};
    color: ${Colors.white};
    padding: 6px 8px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s;

    &::before {
      content: '';
      position: absolute;
      right: 100%;
      top: 50%;
      border: 4px solid transparent;
      border-right-color: ${Colors.grey800};
      transform: translateY(-50%);
    }
  }
`;

export function NavItem({ item, isExpanded, onClick, showTooltip }: NavItemProps) {
  const router = useRouter();
  const isActiveRoute = item.route ? router.pathname === item.route : false;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (item.route) {
      router.push(item.route);
    }
  };

  const IconComponent = item.icon;
  
  if (!isExpanded) {
    const iconButton = (
      <StyledIconButton
        isActive={isActiveRoute}
        onClick={handleClick}
        variant="ghost"
        title={item.label}
      >
        <IconComponent size={20} />
      </StyledIconButton>
    );

    if (showTooltip) {
      return (
        <TooltipContainer>
          {iconButton}
          <div className="tooltip">{item.label}</div>
        </TooltipContainer>
      );
    }

    return iconButton;
  }

  return (
    <NavigationItem>
      <StyledButton
        isActive={isActiveRoute}
        onClick={handleClick}
        variant="ghost"
        fullWidth
      >
        <IconComponent size={20} />
        <span>{item.label}</span>
        {item.shortcut && (
          <span style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.7 }}>
            {item.shortcut}
          </span>
        )}
      </StyledButton>
    </NavigationItem>
  );
}