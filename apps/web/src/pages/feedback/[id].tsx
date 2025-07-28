/**
 * Feedback Detail Route
 * Dynamic route for individual feedback items
 */

import React from 'react';
import { useRouter } from 'next/router';
import { FeedbackDetailPage } from '../../components/Feedback/FeedbackDetailPage';

export default function FeedbackDetail() {
  const router = useRouter();
  const { id } = router.query;

  if (!id || typeof id !== 'string') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Invalid feedback ID</h2>
      </div>
    );
  }

  const handleBack = () => {
    router.push('/feedback');
  };

  return (
    <FeedbackDetailPage 
      feedbackId={id} 
      onBack={handleBack}
    />
  );
}