/**
 * Design System Showcase
 * Demonstrates the design token system in action
 */

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { ThemeSwitcher } from '../components/Theme/ThemeSwitcher';
import { useTheme } from '../theme/ThemeProvider';
import { cssVar, token, layout, typography, component } from '../theme/utils';
import { tokens } from '../theme/tokens';
import { 
  Palette, 
  Type, 
  Layout, 
  Spacing, 
  Moon, 
  Sun, 
  Monitor,
  Copy,
  Check 
} from 'lucide-react';

const ShowcaseContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Section = styled.section`
  margin-bottom: ${cssVar.spacing('12')};
`;

const SectionTitle = styled.h2`
  ${typography.styles.heading}
  margin-bottom: ${cssVar.spacing('6')};
  padding-bottom: ${cssVar.spacing('4')};
  border-bottom: 1px solid ${cssVar.color('border-primary')};
`;

const Grid = styled.div<{ columns?: number }>`
  display: grid;
  grid-template-columns: repeat(${props => props.columns || 'auto-fit'}, minmax(200px, 1fr));
  gap: ${cssVar.spacing('4')};
  margin-bottom: ${cssVar.spacing('6')};
`;

const Card = styled.div`
  ${component.card.base}
  padding: ${cssVar.spacing('6')};
`;

const ColorSwatch = styled.div<{ color: string }>`
  width: 100%;
  height: 60px;
  background: ${props => props.color};
  border-radius: ${cssVar.radius('md')};
  margin-bottom: ${cssVar.spacing('3')};
  border: 1px solid ${cssVar.color('border-primary')};
`;

const TokenDisplay = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: ${cssVar.color('text-secondary')};
  background: ${cssVar.color('surface-secondary')};
  padding: ${cssVar.spacing('2')} ${cssVar.spacing('3')};
  border-radius: ${cssVar.radius('base')};
  margin-top: ${cssVar.spacing('2')};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${cssVar.color('surface-tertiary')};
  }
`;

const SpacingExample = styled.div<{ size: string }>`
  width: ${props => props.size};
  height: ${props => props.size};
  background: ${cssVar.color('interactive-primary')};
  border-radius: ${cssVar.radius('base')};
  margin-bottom: ${cssVar.spacing('2')};
`;

const TypographyExample = styled.div<{ variant: string }>`
  ${props => {
    switch (props.variant) {
      case 'heading': return typography.styles.heading;
      case 'subheading': return typography.styles.subheading;
      case 'body': return typography.styles.body;
      case 'caption': return typography.styles.caption;
      case 'label': return typography.styles.label;
      default: return typography.styles.body;
    }
  }}
  margin-bottom: ${cssVar.spacing('2')};
`;

const ButtonShowcase = styled.div`
  display: flex;
  gap: ${cssVar.spacing('3')};
  margin-bottom: ${cssVar.spacing('4')};
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'ghost' }>`
  ${component.button.base}
  padding: ${cssVar.spacing('3')} ${cssVar.spacing('4')};
  border-radius: ${cssVar.radius('md')};
  font-size: 14px;
  
  ${props => {
    switch (props.variant) {
      case 'primary': return component.button.primary;
      case 'secondary': return component.button.secondary;
      case 'ghost': return `
        background: ${cssVar.color('interactive-ghost')};
        color: ${cssVar.color('text-primary')};
        
        &:hover:not(:disabled) {
          background: ${cssVar.color('interactive-ghostHover')};
        }
      `;
      default: return component.button.primary;
    }
  }}
`;

const Input = styled.input`
  ${component.input.base}
  padding: ${cssVar.spacing('3')};
  border-radius: ${cssVar.radius('md')};
  font-size: 14px;
  margin-bottom: ${cssVar.spacing('4')};
`;

const StatusBadge = styled.span<{ status: 'success' | 'warning' | 'error' | 'info' }>`
  display: inline-flex;
  align-items: center;
  padding: ${cssVar.spacing('1')} ${cssVar.spacing('3')};
  border-radius: ${cssVar.radius('full')};
  font-size: 12px;
  font-weight: 500;
  
  ${props => {
    switch (props.status) {
      case 'success':
        return `
          background: ${cssVar.color('status-successBackground')};
          color: ${cssVar.color('status-success')};
          border: 1px solid ${cssVar.color('status-successBorder')};
        `;
      case 'warning':
        return `
          background: ${cssVar.color('status-warningBackground')};
          color: ${cssVar.color('status-warning')};
          border: 1px solid ${cssVar.color('status-warningBorder')};
        `;
      case 'error':
        return `
          background: ${cssVar.color('status-errorBackground')};
          color: ${cssVar.color('status-error')};
          border: 1px solid ${cssVar.color('status-errorBorder')};
        `;
      case 'info':
        return `
          background: ${cssVar.color('status-infoBackground')};
          color: ${cssVar.color('status-info')};
          border: 1px solid ${cssVar.color('status-infoBorder')};
        `;
    }
  }}
`;

export default function DesignSystemShowcase() {
  const { mode, actualMode, colors } = useTheme();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const mockUser = {
    name: 'Design System',
    email: 'tokens@feedbackhub.dev'
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const colorCategories = [
    { name: 'Background', colors: colors.background },
    { name: 'Surface', colors: colors.surface },
    { name: 'Border', colors: colors.border },
    { name: 'Text', colors: colors.text },
    { name: 'Interactive', colors: colors.interactive },
    { name: 'Status', colors: colors.status },
  ];

  const spacingSizes = [
    { name: 'XS', token: '1', size: token.spacing('1') },
    { name: 'SM', token: '2', size: token.spacing('2') },
    { name: 'MD', token: '4', size: token.spacing('4') },
    { name: 'LG', token: '6', size: token.spacing('6') },
    { name: 'XL', token: '8', size: token.spacing('8') },
    { name: '2XL', token: '10', size: token.spacing('10') },
  ];

  const typographyVariants = [
    { name: 'Heading', variant: 'heading', text: 'Page Heading' },
    { name: 'Subheading', variant: 'subheading', text: 'Section Subheading' },
    { name: 'Body', variant: 'body', text: 'Regular body text for content and descriptions.' },
    { name: 'Caption', variant: 'caption', text: 'Small caption text for metadata' },
    { name: 'Label', variant: 'label', text: 'Form Label' },
  ];

  return (
    <DashboardLayout title="Design System" user={mockUser}>
      <ShowcaseContainer>
        {/* Theme Overview */}
        <Section>
          <SectionTitle>
            <Palette style={{ marginRight: '8px', display: 'inline' }} />
            Theme Overview
          </SectionTitle>
          
          <Grid columns={3}>
            <Card>
              <h3>Current Theme</h3>
              <p>Mode: <strong>{mode}</strong></p>
              <p>Resolved: <strong>{actualMode}</strong></p>
              <div style={{ marginTop: '16px' }}>
                <ThemeSwitcher variant="dropdown" />
              </div>
            </Card>
            
            <Card>
              <h3>Theme Switching</h3>
              <ButtonShowcase>
                <ThemeSwitcher variant="toggle" />
                <ThemeSwitcher variant="icon" />
              </ButtonShowcase>
              <p style={{ fontSize: '14px', color: cssVar.color('text-secondary') }}>
                Try switching themes to see the design tokens update in real-time.
              </p>
            </Card>
            
            <Card>
              <h3>CSS Variables</h3>
              <p style={{ fontSize: '14px', color: cssVar.color('text-secondary') }}>
                All colors use CSS custom properties that automatically update with theme changes.
              </p>
              <TokenDisplay onClick={() => copyToClipboard('var(--color-text-primary)')}>
                var(--color-text-primary)
                {copiedToken === 'var(--color-text-primary)' ? <Check size={12} /> : <Copy size={12} />}
              </TokenDisplay>
            </Card>
          </Grid>
        </Section>

        {/* Color System */}
        <Section>
          <SectionTitle>
            <Palette style={{ marginRight: '8px', display: 'inline' }} />
            Color System
          </SectionTitle>
          
          {colorCategories.map(category => (
            <div key={category.name} style={{ marginBottom: '32px' }}>
              <h3 style={{ marginBottom: '16px' }}>{category.name}</h3>
              <Grid>
                {Object.entries(category.colors).map(([colorName, colorValue]) => (
                  <Card key={colorName}>
                    <ColorSwatch color={colorValue} />
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{colorName}</h4>
                    <TokenDisplay 
                      onClick={() => copyToClipboard(`cssVar.color('${category.name.toLowerCase()}-${colorName}')`)}
                    >
                      cssVar.color('{category.name.toLowerCase()}-{colorName}')
                      {copiedToken === `cssVar.color('${category.name.toLowerCase()}-${colorName}')` ? 
                        <Check size={12} /> : <Copy size={12} />}
                    </TokenDisplay>
                  </Card>
                ))}
              </Grid>
            </div>
          ))}
        </Section>

        {/* Typography */}
        <Section>
          <SectionTitle>
            <Type style={{ marginRight: '8px', display: 'inline' }} />
            Typography
          </SectionTitle>
          
          <Grid>
            {typographyVariants.map(variant => (
              <Card key={variant.name}>
                <TypographyExample variant={variant.variant}>
                  {variant.text}
                </TypographyExample>
                <TokenDisplay 
                  onClick={() => copyToClipboard(`typography.styles.${variant.variant}`)}
                >
                  typography.styles.{variant.variant}
                  {copiedToken === `typography.styles.${variant.variant}` ? 
                    <Check size={12} /> : <Copy size={12} />}
                </TokenDisplay>
              </Card>
            ))}
          </Grid>
        </Section>

        {/* Spacing */}
        <Section>
          <SectionTitle>
            <Spacing style={{ marginRight: '8px', display: 'inline' }} />
            Spacing System
          </SectionTitle>
          
          <Grid>
            {spacingSizes.map(spacing => (
              <Card key={spacing.name}>
                <SpacingExample size={spacing.size} />
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{spacing.name}</h4>
                <p style={{ fontSize: '12px', color: cssVar.color('text-secondary'), margin: '0 0 8px 0' }}>
                  {spacing.size}
                </p>
                <TokenDisplay 
                  onClick={() => copyToClipboard(`cssVar.spacing('${spacing.token}')`)}
                >
                  cssVar.spacing('{spacing.token}')
                  {copiedToken === `cssVar.spacing('${spacing.token}')` ? 
                    <Check size={12} /> : <Copy size={12} />}
                </TokenDisplay>
              </Card>
            ))}
          </Grid>
        </Section>

        {/* Components */}
        <Section>
          <SectionTitle>
            <Layout style={{ marginRight: '8px', display: 'inline' }} />
            Component Examples
          </SectionTitle>
          
          <Grid>
            <Card>
              <h3>Buttons</h3>
              <ButtonShowcase>
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
              </ButtonShowcase>
              <TokenDisplay onClick={() => copyToClipboard('component.button.primary')}>
                component.button.primary
                {copiedToken === 'component.button.primary' ? <Check size={12} /> : <Copy size={12} />}
              </TokenDisplay>
            </Card>
            
            <Card>
              <h3>Form Elements</h3>
              <Input placeholder="Input with design tokens" />
              <TokenDisplay onClick={() => copyToClipboard('component.input.base')}>
                component.input.base
                {copiedToken === 'component.input.base' ? <Check size={12} /> : <Copy size={12} />}
              </TokenDisplay>
            </Card>
            
            <Card>
              <h3>Status Badges</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                <StatusBadge status="success">Success</StatusBadge>
                <StatusBadge status="warning">Warning</StatusBadge>
                <StatusBadge status="error">Error</StatusBadge>
                <StatusBadge status="info">Info</StatusBadge>
              </div>
              <TokenDisplay onClick={() => copyToClipboard('cssVar.color(\'status-success\')')}>
                cssVar.color('status-success')
                {copiedToken === 'cssVar.color(\'status-success\')' ? <Check size={12} /> : <Copy size={12} />}
              </TokenDisplay>
            </Card>
          </Grid>
        </Section>

        {/* Usage Guidelines */}
        <Section>
          <SectionTitle>Usage Guidelines</SectionTitle>
          
          <Grid>
            <Card>
              <h3>✅ Best Practices</h3>
              <ul style={{ color: cssVar.color('text-secondary'), fontSize: '14px' }}>
                <li>Use semantic color tokens (text-primary, surface-primary)</li>
                <li>Leverage CSS custom properties for theme switching</li>
                <li>Use spacing tokens for consistent layout</li>
                <li>Apply component utilities for common patterns</li>
              </ul>
            </Card>
            
            <Card>
              <h3>❌ Avoid</h3>
              <ul style={{ color: cssVar.color('text-secondary'), fontSize: '14px' }}>
                <li>Hardcoded color values (#ffffff, rgb(255,255,255))</li>
                <li>Arbitrary spacing values (13px, 27px)</li>
                <li>Direct color palette access in components</li>
                <li>Inconsistent border radius values</li>
              </ul>
            </Card>
            
            <Card>
              <h3>🔧 Utilities</h3>
              <div style={{ fontSize: '12px', color: cssVar.color('text-secondary') }}>
                <p><code>cssVar.color('text-primary')</code> - CSS custom properties</p>
                <p><code>token.spacing('4')</code> - Direct token values</p>
                <p><code>typography.styles.heading</code> - Text styling</p>
                <p><code>component.button.primary</code> - Component styles</p>
              </div>
            </Card>
          </Grid>
        </Section>
      </ShowcaseContainer>
    </DashboardLayout>
  );
}