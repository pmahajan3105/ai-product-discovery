import React from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';
import { cssVar } from '../../theme/utils';
import { Sidebar } from '../Sidebar/Sidebar';
import FlexContainer from '../Container/FlexContainer';
import { ThemeSwitcher } from '../Theme/ThemeSwitcher';

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: ${cssVar.color('background-secondary')};
`;

const MainContent = styled.div<{ sidebarExpanded: boolean }>`
  flex: 1;
  margin-left: ${({ sidebarExpanded }) => (sidebarExpanded ? 240 : 67)}px;
  transition: margin-left 0.2s ease-in-out;
  display: flex;
  flex-direction: column;
`;

const ContentArea = styled.div`
  flex: 1;
  padding: ${cssVar.spacing('6')};
  overflow-y: auto;
`;

const TopBar = styled(FlexContainer)`
  background-color: ${cssVar.color('surface-primary')};
  border-bottom: 1px solid ${cssVar.color('border-primary')};
  padding: ${cssVar.spacing('4')} ${cssVar.spacing('6')};
  box-shadow: ${cssVar.shadow('sm')};
`;

const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 600;
  color: ${cssVar.color('text-primary')};
  margin: 0;
`;

const TopBarActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${cssVar.spacing('3')};
`;

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  user?: {
    name: string;
    email: string;
  };
  actions?: React.ReactNode;
}

export function DashboardLayout({ children, title, user, actions }: DashboardLayoutProps) {
  return (
    <LayoutContainer>
      <Sidebar user={user} />
      <MainContent sidebarExpanded={true}>
        {title && (
          <TopBar justify="space-between" align="center">
            <PageTitle>{title}</PageTitle>
            <TopBarActions>
              {actions && <div>{actions}</div>}
              <ThemeSwitcher variant="icon" />
            </TopBarActions>
          </TopBar>
        )}
        <ContentArea>
          {children}
        </ContentArea>
      </MainContent>
    </LayoutContainer>
  );
}