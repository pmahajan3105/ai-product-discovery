import React, { useState } from 'react';
import styled from '@emotion/styled';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Colors } from '../../theme/colors';
import FlexContainer from '../Container/FlexContainer';
import IconButton from '../Button/IconButton';
import { NavItem } from './NavItem';
import { NavbarConfig } from './config';

const animationStyle = `
  &.full-screen {
    animation-name: contract-container;
    animation-duration: 0.4s;
    animation-timing-function: linear;
    opacity: 0;
    width: 0px;
  }
  @keyframes contract-container {
    from {
      opacity: 1;
      width: 80px;
    }
    to {
      opacity: 0;
      width: 0px;
    }
  }
`;

const SidebarContainer = styled(FlexContainer)<{ isExpanded: boolean }>`
  box-shadow: 0px 2px 4px -2px rgba(16, 24, 40, 0.06);
  width: ${({ isExpanded }) => (isExpanded ? 240 : 67)}px;
  transition: width 0.2s ease-in-out, padding 0.2s ease-in-out;
  background-color: ${Colors.white};
  border-right: 1px solid ${Colors.grey200};
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
  padding: 16px ${({ isExpanded }) => (isExpanded ? 16 : 8)}px;
  ${animationStyle}

  .toggleButton {
    z-index: 1050;
    box-shadow: none !important;
    position: absolute;
    right: ${({ isExpanded }) => (isExpanded ? -18 : -18)}px;
    top: 16px;
    background-color: ${Colors.white} !important;
    border: 1px solid ${Colors.grey300} !important;
    
    svg {
      transform: rotate(${({ isExpanded }) => (isExpanded ? 0 : 180)}deg);
      transition: transform 0.25s ease-in-out;
      width: 14px;
      height: 14px;
    }
  }
`;

const SectionTitle = styled.div<{ isExpanded: boolean }>`
  font-size: 12px;
  font-weight: 600;
  color: ${Colors.grey500};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 16px 0 8px 0;
  padding: 0 ${({ isExpanded }) => (isExpanded ? 12 : 0)}px;
  opacity: ${({ isExpanded }) => (isExpanded ? 1 : 0)};
  visibility: ${({ isExpanded }) => (isExpanded ? 'visible' : 'hidden')};
  transition: opacity 0.2s ease-in-out, visibility 0.2s ease-in-out;
  white-space: nowrap;
  overflow: hidden;
`;

const SectionContainer = styled.div`
  margin-bottom: 8px;
`;

const UserSection = styled(FlexContainer)<{ isExpanded: boolean }>`
  margin-top: auto;
  padding: 12px 0;
  border-top: 1px solid ${Colors.grey200};
`;

const UserInfo = styled(FlexContainer)<{ isExpanded: boolean }>`
  padding: 8px ${({ isExpanded }) => (isExpanded ? 12 : 8)}px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background-color: ${Colors.grey50};
  }
`;

const UserAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background-color: ${Colors.primary500};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${Colors.white};
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
`;

const UserDetails = styled.div<{ isExpanded: boolean }>`
  margin-left: 8px;
  opacity: ${({ isExpanded }) => (isExpanded ? 1 : 0)};
  visibility: ${({ isExpanded }) => (isExpanded ? 'visible' : 'hidden')};
  transition: opacity 0.2s ease-in-out, visibility 0.2s ease-in-out;
  overflow: hidden;
`;

const UserName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${Colors.grey800};
  white-space: nowrap;
`;

const UserEmail = styled.div`
  font-size: 12px;
  color: ${Colors.grey500};
  white-space: nowrap;
`;

interface SidebarProps {
  user?: {
    name: string;
    email: string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SidebarContainer
      isExpanded={isExpanded}
      direction="column"
      justify="flex-start"
      align="stretch"
    >
      <IconButton
        className="toggleButton"
        onClick={toggleSidebar}
        size="sm"
        variant="default"
      >
        {isExpanded ? <ChevronLeft /> : <ChevronRight />}
      </IconButton>

      {/* Logo/Brand */}
      <FlexContainer
        align="center"
        padding={isExpanded ? "12px" : "12px 0"}
        margin="0 0 16px 0"
      >
        <div style={{
          width: 32,
          height: 32,
          backgroundColor: Colors.primary600,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: Colors.white,
          fontWeight: 'bold',
          fontSize: 14,
        }}>
          FH
        </div>
        {isExpanded && (
          <div style={{
            marginLeft: 8,
            fontSize: 16,
            fontWeight: 600,
            color: Colors.grey800,
          }}>
            FeedbackHub
          </div>
        )}
      </FlexContainer>

      {/* Navigation Sections */}
      <FlexContainer direction="column" style={{ flex: 1, overflow: 'hidden' }}>
        {NavbarConfig.map((section, sectionIndex) => (
          <SectionContainer key={sectionIndex}>
            {section.title && (
              <SectionTitle isExpanded={isExpanded}>
                {section.title}
              </SectionTitle>
            )}
            {section.items.map((item) => (
              <NavItem
                key={item.key}
                item={item}
                isExpanded={isExpanded}
                showTooltip={!isExpanded}
              />
            ))}
          </SectionContainer>
        ))}
      </FlexContainer>

      {/* User Section */}
      {user && (
        <UserSection isExpanded={isExpanded} direction="column">
          <UserInfo isExpanded={isExpanded} align="center">
            <UserAvatar>
              {getUserInitials(user.name)}
            </UserAvatar>
            <UserDetails isExpanded={isExpanded}>
              <UserName>{user.name}</UserName>
              <UserEmail>{user.email}</UserEmail>
            </UserDetails>
          </UserInfo>
        </UserSection>
      )}
    </SidebarContainer>
  );
}