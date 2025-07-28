/**
 * AI Chat Interface Component Tests
 * Tests for the main AI chat interface component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIChatInterface } from '../AIChatInterface';
import { useAIChat } from '../../../hooks/useAIChat';

// Mock the useAIChat hook
jest.mock('../../../hooks/useAIChat');
const mockUseAIChat = useAIChat as jest.MockedFunction<typeof useAIChat>;

// Mock the sub-components
jest.mock('../ChatMessage', () => ({
  ChatMessage: ({ message }: { message: any }) => (
    <div data-testid="chat-message">
      <span>{message.role}:</span>
      <span>{message.content}</span>
    </div>
  )
}));

jest.mock('../ChatInput', () => ({
  ChatInput: ({ onSendMessage, disabled, placeholder }: any) => (
    <div data-testid="chat-input">
      <input
        data-testid="message-input"
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === 'test message') {
            onSendMessage('test message');
          }
        }}
      />
    </div>
  )
}));

jest.mock('../ChatSidebar', () => ({
  ChatSidebar: ({ sessions, onSessionSelect, onNewSession }: any) => (
    <div data-testid="chat-sidebar">
      <button data-testid="new-session-btn" onClick={() => onNewSession()}>
        New Session
      </button>
      {sessions.map((session: any) => (
        <div
          key={session.id}
          data-testid={`session-${session.id}`}
          onClick={() => onSessionSelect(session.id)}
        >
          {session.title || 'Untitled'}
        </div>
      ))}
    </div>
  )
}));

jest.mock('../TypingIndicator', () => ({
  TypingIndicator: () => <div data-testid="typing-indicator">AI is typing...</div>
}));

jest.mock('../ChatSources', () => ({
  ChatSources: ({ sources, onClose }: any) => (
    <div data-testid="chat-sources">
      <button data-testid="close-sources" onClick={onClose}>
        Close
      </button>
      <div>Sources: {sources.length}</div>
    </div>
  )
}));

describe('AIChatInterface', () => {
  const defaultProps = {
    organizationId: 'test-org-123'
  };

  const mockChatHook = {
    messages: [],
    sessions: [],
    isLoading: false,
    isConnected: true,
    isTyping: false,
    error: null,
    currentSources: null,
    sendMessage: jest.fn(),
    createSession: jest.fn(),
    switchSession: jest.fn(),
    clearSession: jest.fn(),
    retryLastMessage: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAIChat.mockReturnValue(mockChatHook);
  });

  it('renders the chat interface correctly', () => {
    render(<AIChatInterface {...defaultProps} />);

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Ask questions about your feedback data')).toBeInTheDocument();
    expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });

  it('displays connection status', () => {
    render(<AIChatInterface {...defaultProps} />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('shows disconnected status when not connected', () => {
    mockUseAIChat.mockReturnValue({
      ...mockChatHook,
      isConnected: false
    });

    render(<AIChatInterface {...defaultProps} />);

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('renders chat messages', () => {
    const messages = [
      {
        id: '1',
        role: 'user' as const,
        content: 'Hello AI',
        timestamp: new Date()
      },
      {
        id: '2',
        role: 'assistant' as const,
        content: 'Hello! How can I help you?',
        timestamp: new Date()
      }
    ];

    mockUseAIChat.mockReturnValue({
      ...mockChatHook,
      messages
    });

    render(<AIChatInterface {...defaultProps} />);

    expect(screen.getAllByTestId('chat-message')).toHaveLength(2);
    expect(screen.getByText('user:')).toBeInTheDocument();
    expect(screen.getByText('Hello AI')).toBeInTheDocument();
    expect(screen.getByText('assistant:')).toBeInTheDocument();
    expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
  });

  it('shows typing indicator when AI is typing', () => {
    mockUseAIChat.mockReturnValue({
      ...mockChatHook,
      isTyping: true
    });

    render(<AIChatInterface {...defaultProps} />);

    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
  });

  it('displays error messages', () => {
    mockUseAIChat.mockReturnValue({
      ...mockChatHook,
      error: 'Something went wrong'
    });

    render(<AIChatInterface {...defaultProps} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('shows sources panel when sources are available', () => {
    const sources = [
      {
        feedbackId: 'feedback-1',
        title: 'Test Feedback',
        relevanceScore: 0.9,
        excerpt: 'This is test feedback content...'
      }
    ];

    mockUseAIChat.mockReturnValue({
      ...mockChatHook,
      currentSources: sources
    });

    render(<AIChatInterface {...defaultProps} />);

    // Sources button should be visible
    expect(screen.getByText('Sources (1)')).toBeInTheDocument();

    // Click to show sources panel
    fireEvent.click(screen.getByText('Sources (1)'));

    expect(screen.getByTestId('chat-sources')).toBeInTheDocument();
  });

  it('handles sending messages', async () => {
    const mockSendMessage = jest.fn();
    mockUseAIChat.mockReturnValue({
      ...mockChatHook,
      sendMessage: mockSendMessage
    });

    render(<AIChatInterface {...defaultProps} />);

    // Simulate typing and sending a message
    const input = screen.getByTestId('message-input');
    fireEvent.change(input, { target: { value: 'test message' } });

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('test message');
    });
  });

  it('handles creating new sessions', async () => {
    const mockCreateSession = jest.fn().mockResolvedValue('new-session-id');
    const mockOnNewSession = jest.fn();
    
    mockUseAIChat.mockReturnValue({
      ...mockChatHook,
      createSession: mockCreateSession
    });

    render(<AIChatInterface {...defaultProps} onNewSession={mockOnNewSession} />);

    // Click new session button
    fireEvent.click(screen.getByTestId('new-session-btn'));

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalled();
      expect(mockOnNewSession).toHaveBeenCalledWith('new-session-id');
    });
  });

  it('handles session switching', () => {
    const sessions = [
      {
        id: 'session-1',
        title: 'Test Session 1',
        messages: [],
        isActive: true,
        createdAt: new Date(),
        organizationId: 'test-org',
        userId: 'test-user'
      }
    ];

    const mockSwitchSession = jest.fn();
    
    mockUseAIChat.mockReturnValue({
      ...mockChatHook,
      sessions,
      switchSession: mockSwitchSession
    });

    render(<AIChatInterface {...defaultProps} />);

    // Click on session
    fireEvent.click(screen.getByTestId('session-session-1'));

    expect(mockSwitchSession).toHaveBeenCalledWith('session-1');
  });

  it('shows empty state when no messages', () => {
    render(<AIChatInterface {...defaultProps} />);

    // Should show the welcome empty state (mocked in EmptyStates)
    // The actual empty state rendering depends on the EmptyStates component
    expect(screen.queryByTestId('chat-message')).not.toBeInTheDocument();
  });

  it('disables input when loading or disconnected', () => {
    mockUseAIChat.mockReturnValue({
      ...mockChatHook,
      isLoading: true,
      isConnected: false
    });

    render(<AIChatInterface {...defaultProps} />);

    const input = screen.getByTestId('message-input');
    expect(input).toBeDisabled();
  });

  it('handles retry functionality', () => {
    const mockRetryLastMessage = jest.fn();
    
    mockUseAIChat.mockReturnValue({
      ...mockChatHook,
      error: 'Test error',
      retryLastMessage: mockRetryLastMessage
    });

    render(<AIChatInterface {...defaultProps} />);

    // Click retry button
    fireEvent.click(screen.getByText('Try again'));

    expect(mockRetryLastMessage).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<AIChatInterface {...defaultProps} className="custom-class" />);

    // The component should have the custom class applied
    // This test depends on the actual DOM structure
    const container = screen.getByTestId('chat-sidebar').closest('.custom-class');
    expect(container).toBeInTheDocument();
  });
});

// Test the integration with different prop combinations
describe('AIChatInterface Integration', () => {
  it('works with existing session ID', () => {
    const mockChatHook = {
      messages: [
        {
          id: '1',
          role: 'user' as const,
          content: 'Previous message',
          timestamp: new Date()
        }
      ],
      sessions: [],
      isLoading: false,
      isConnected: true,
      isTyping: false,
      error: null,
      currentSources: null,
      sendMessage: jest.fn(),
      createSession: jest.fn(),
      switchSession: jest.fn(),
      clearSession: jest.fn(),
      retryLastMessage: jest.fn()
    };

    mockUseAIChat.mockReturnValue(mockChatHook);

    render(
      <AIChatInterface
        organizationId="test-org"
        sessionId="existing-session"
      />
    );

    expect(screen.getByText('Previous message')).toBeInTheDocument();
    expect(mockUseAIChat).toHaveBeenCalledWith('test-org', 'existing-session');
  });
});