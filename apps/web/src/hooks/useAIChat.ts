/**
 * AI Chat Hook
 * Manages AI chat functionality with WebSocket streaming and session management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { aiApi } from '../lib/api/aiApi';
import { ChatMessageData } from '../components/AI/ChatMessage';
import { ChatSession } from '../components/AI/ChatSidebar';
import { ChatSource } from '../components/AI/ChatSources';

interface UseAIChatOptions {
  enableStreaming?: boolean;
  autoConnect?: boolean;
}

interface UseAIChatReturn {
  // Chat state
  messages: ChatMessageData[];
  sessions: ChatSession[];
  isLoading: boolean;
  isConnected: boolean;
  isTyping: boolean;
  error: string | null;
  currentSources: ChatSource[] | null;

  // Chat actions
  sendMessage: (message: string) => Promise<void>;
  createSession: (title?: string) => Promise<string>;
  switchSession: (sessionId: string) => void;
  clearSession: (sessionId: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;

  // Connection management
  connect: () => void;
  disconnect: () => void;
}

export const useAIChat = (
  organizationId: string,
  sessionId?: string,
  options: UseAIChatOptions = {}
): UseAIChatReturn => {
  const { enableStreaming = true, autoConnect = true } = options;

  // State
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSources, setCurrentSources] = useState<ChatSource[] | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const currentMessageRef = useRef<string>('');
  const streamingMessageRef = useRef<ChatMessageData | null>(null);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (!enableStreaming) return;

    // Get auth token for socket connection
    const token = localStorage.getItem('supertokens-access-token');
    if (!token) return;

    // Create socket connection
    const socket = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}`, {
      auth: { token },
      transports: ['websocket'],
      upgrade: false
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to AI streaming service');
      setIsConnected(true);
      setError(null);

      // Join current session if available
      if (currentSessionId) {
        socket.emit('join_chat_session', { sessionId: currentSessionId });
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from AI streaming service');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setError('Failed to connect to AI service');
      setIsConnected(false);
    });

    // AI streaming events
    socket.on('ai_token', (data) => {
      if (data.sessionId === currentSessionId) {
        // Update streaming message with new token
        if (streamingMessageRef.current) {
          streamingMessageRef.current.content += data.token;
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = streamingMessageRef.current!.content;
            }
            return newMessages;
          });
        }
      }
    });

    socket.on('ai_start', (data) => {
      if (data.sessionId === currentSessionId) {
        setIsTyping(true);
        // Create new streaming message
        streamingMessageRef.current = {
          role: 'assistant',
          content: '',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, streamingMessageRef.current!]);
      }
    });

    socket.on('ai_complete', (data) => {
      if (data.sessionId === currentSessionId) {
        setIsTyping(false);
        streamingMessageRef.current = null;
      }
    });

    socket.on('ai_error', (data) => {
      if (data.sessionId === currentSessionId) {
        setIsTyping(false);
        setError(data.error);
        streamingMessageRef.current = null;
      }
    });

    socket.on('typing_indicator', (data) => {
      if (data.sessionId === currentSessionId) {
        setIsTyping(data.isTyping);
      }
    });

    socket.on('ai_response_complete', (data) => {
      if (data.sessionId === currentSessionId) {
        setCurrentSources(data.sources || null);
        streamingMessageRef.current = null;
      }
    });

    return socket;
  }, [enableStreaming, currentSessionId]);

  // Connect to socket
  const connect = useCallback(() => {
    if (!socketRef.current) {
      initializeSocket();
    }
  }, [initializeSocket]);

  // Disconnect from socket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Load chat sessions
  const loadSessions = useCallback(async () => {
    try {
      const sessions = await aiApi.listChatSessions(organizationId);
      setSessions(sessions || []);
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  }, [organizationId]);

  // Load session messages
  const loadSessionMessages = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      const session = await aiApi.getChatSession(sessionId);
      
      if (session && session.messages) {
        const formattedMessages = session.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Failed to load session messages:', error);
      setError('Failed to load conversation history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    setError(null);
    currentMessageRef.current = message;

    // Add user message immediately
    const userMessage: ChatMessageData = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      setIsLoading(true);

      // Send to API
      const response = await aiApi.sendChatMessage(organizationId, {
        message,
        sessionId: currentSessionId,
        enableStreaming: enableStreaming && isConnected
      });

      // If not streaming, add assistant response immediately
      if (!enableStreaming || !isConnected) {
        const assistantMessage: ChatMessageData = {
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
          confidence: response.confidence,
          sources: response.sources,
          suggestions: response.suggestions,
          followUpQuestions: response.followUpQuestions,
          fallbackResponse: response.fallbackResponse
        };
        setMessages(prev => [...prev, assistantMessage]);
        setCurrentSources(response.sources || null);
      }

    } catch (error: any) {
      console.error('Failed to send message:', error);
      setError(error.response?.data?.message || 'Failed to send message');
      
      // Add error message
      const errorMessage: ChatMessageData = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        error: {
          type: 'send_error',
          recoverable: true
        }
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, currentSessionId, isLoading, enableStreaming, isConnected]);

  // Create new session
  const createSession = useCallback(async (title?: string): Promise<string> => {
    try {
      const newSession = await aiApi.createChatSession(organizationId, title);
      setSessions(prev => [newSession, ...prev]);
      
      // Join the new session via socket
      if (socketRef.current) {
        socketRef.current.emit('join_chat_session', { sessionId: newSession.id });
      }
      
      return newSession.id;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }, [organizationId]);

  // Switch session
  const switchSession = useCallback((sessionId: string) => {
    // Leave current session
    if (socketRef.current && currentSessionId) {
      socketRef.current.emit('leave_chat_session', { sessionId: currentSessionId });
    }

    // Set new session
    setCurrentSessionId(sessionId);
    setMessages([]);
    setCurrentSources(null);
    setError(null);

    // Join new session
    if (socketRef.current) {
      socketRef.current.emit('join_chat_session', { sessionId });
    }

    // Load messages for new session
    loadSessionMessages(sessionId);
  }, [currentSessionId, loadSessionMessages]);

  // Clear session
  const clearSession = useCallback(async (sessionId: string) => {
    try {
      await aiApi.deleteChatSession(sessionId);
      
      // Remove from sessions list
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      // If this was the current session, clear it
      if (sessionId === currentSessionId) {
        setCurrentSessionId(undefined);
        setMessages([]);
        setCurrentSources(null);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      setError('Failed to delete conversation');
    }
  }, [currentSessionId]);

  // Retry last message
  const retryLastMessage = useCallback(async () => {
    if (currentMessageRef.current) {
      // Remove last assistant message if it was an error
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
          newMessages.pop();
        }
        return newMessages;
      });

      // Resend the message
      await sendMessage(currentMessageRef.current);
    }
  }, [sendMessage]);

  // Effects
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    loadSessions();

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect, loadSessions]);

  // Load session messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadSessionMessages(currentSessionId);
    }
  }, [currentSessionId, loadSessionMessages]);

  return {
    // State
    messages,
    sessions,
    isLoading,
    isConnected,
    isTyping,
    error,
    currentSources,

    // Actions
    sendMessage,
    createSession,
    switchSession,
    clearSession,
    retryLastMessage,

    // Connection management
    connect,
    disconnect
  };
};