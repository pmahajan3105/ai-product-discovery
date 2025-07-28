/**
 * Chat Sidebar Component
 * Displays chat sessions and session management
 */

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

export interface ChatSession {
  id: string;
  title?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>;
  lastMessageAt?: Date;
  isActive: boolean;
  createdAt: Date;
}

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: (title?: string) => void;
  onDeleteSession: (sessionId: string) => void;
  className?: string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  className = ''
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Get session preview (last user message)
  const getSessionPreview = (session: ChatSession): string => {
    const lastUserMessage = session.messages
      .filter(m => m.role === 'user')
      .pop();
    
    if (!lastUserMessage) return 'New conversation';
    
    return lastUserMessage.content.length > 50 
      ? lastUserMessage.content.substring(0, 50) + '...'
      : lastUserMessage.content;
  };

  // Get session title
  const getSessionTitle = (session: ChatSession): string => {
    if (session.title) return session.title;
    
    const firstUserMessage = session.messages.find(m => m.role === 'user');
    if (!firstUserMessage) return 'New conversation';
    
    return firstUserMessage.content.length > 30
      ? firstUserMessage.content.substring(0, 30) + '...'
      : firstUserMessage.content;
  };

  const handleDeleteSession = (sessionId: string) => {
    onDeleteSession(sessionId);
    setShowDeleteConfirm(null);
  };

  // Sort sessions by last activity
  const sortedSessions = [...sessions].sort((a, b) => {
    const aTime = a.lastMessageAt || a.createdAt;
    const bTime = b.lastMessageAt || b.createdAt;
    return bTime.getTime() - aTime.getTime();
  });

  return (
    <div className={`flex flex-col h-full bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Conversations
          </h3>
          <button
            onClick={() => onNewSession()}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="New conversation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {sortedSessions.length === 0 ? (
          <div className="p-4 text-center">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">No conversations yet</p>
            </div>
            <button
              onClick={() => onNewSession()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Start your first conversation
            </button>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {sortedSessions.map((session) => (
              <div
                key={session.id}
                className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                  currentSessionId === session.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => onSessionSelect(session.id)}
              >
                {/* Session Content */}
                <div className="min-w-0">
                  <div className="flex items-start justify-between">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate pr-2">
                      {getSessionTitle(session)}
                    </h4>
                    
                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
                      title="Delete conversation"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 truncate">
                    {getSessionPreview(session)}
                  </p>
                  
                  <div className="mt-2 flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {session.messages.length} message{session.messages.length !== 1 ? 's' : ''}
                    </span>
                    <span>
                      {formatDistanceToNow(session.lastMessageAt || session.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {showDeleteConfirm === session.id && (
                  <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700 p-3 z-10" onClick={(e) => e.stopPropagation()}>
                    <p className="text-sm text-gray-900 dark:text-white mb-3">
                      Delete this conversation?
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(null);
                        }}
                        className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          <p>🤖 AI-powered feedback insights</p>
          <p className="mt-1">Ask me anything about your feedback data</p>
        </div>
      </div>
    </div>
  );
};