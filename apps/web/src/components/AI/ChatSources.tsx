/**
 * Chat Sources Component
 * Displays sources and references for AI responses
 */

import React from 'react';

export interface ChatSource {
  feedbackId: string;
  title: string;
  relevanceScore: number;
  excerpt: string;
}

interface ChatSourcesProps {
  sources: ChatSource[];
  onClose: () => void;
  className?: string;
}

export const ChatSources: React.FC<ChatSourcesProps> = ({
  sources,
  onClose,
  className = ''
}) => {
  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  const getRelevanceLabel = (score: number) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className={`flex flex-col h-full bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sources
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {sources.length} reference{sources.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Close sources"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sources List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sources.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No sources available for this response
            </p>
          </div>
        ) : (
          sources.map((source, _index) => (
            <div
              key={source.feedbackId}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3"
            >
              {/* Source Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {source.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Feedback ID: {source.feedbackId}
                  </p>
                </div>

                {/* Relevance Score */}
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRelevanceColor(source.relevanceScore)}`}>
                  {getRelevanceLabel(source.relevanceScore)}
                </div>
              </div>

              {/* Source Excerpt */}
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="italic">
                  "{source.excerpt}"
                </p>
              </div>

              {/* Source Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Relevance: {Math.round(source.relevanceScore * 100)}%
                </div>
                
                <button
                  onClick={() => {
                    // Navigate to feedback detail
                    window.open(`/feedback/${source.feedbackId}`, '_blank');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline"
                >
                  View full feedback →
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p className="mb-1">
            <strong>Sources:</strong> Feedback data used to generate this response
          </p>
          <p>
            <strong>Relevance:</strong> How closely the source matches your question
          </p>
        </div>
      </div>
    </div>
  );
};