import { NextApiRequest, NextApiResponse } from 'next';

// Mock data store for demo purposes
// In production, this would be stored in a database
const mockTasks: { [key: string]: any } = {};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { taskId } = req.query;

  if (!taskId || typeof taskId !== 'string') {
    return res.status(400).json({ error: 'Task ID is required' });
  }

  try {
    // Mock progress simulation
    let task = mockTasks[taskId];
    
    if (!task) {
      // Initialize task if it doesn't exist
      task = {
        id: taskId,
        totalCount: 100, // Mock total
        currentIndex: 0,
        failedCount: 0,
        isCompleted: false,
        startedAt: Date.now(),
      };
      mockTasks[taskId] = task;
    }

    // Simulate progress
    const elapsed = Date.now() - task.startedAt;
    const progressRate = 2; // Records per second
    const expectedProgress = Math.floor(elapsed / 1000 * progressRate);
    
    task.currentIndex = Math.min(expectedProgress, task.totalCount);
    
    // Simulate some failures (5% failure rate)
    task.failedCount = Math.floor(task.currentIndex * 0.05);
    
    // Mark as completed if we've reached the end
    if (task.currentIndex >= task.totalCount) {
      task.isCompleted = true;
    }

    res.status(200).json(task);

  } catch (error: any) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to check import status' 
    });
  }
}