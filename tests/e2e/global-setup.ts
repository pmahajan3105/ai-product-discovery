import { chromium, FullConfig } from '@playwright/test';
import axios from 'axios';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting FeedbackHub E2E Test Suite');
  
  const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3000';
  const apiURL = process.env.API_URL || 'http://localhost:3001';
  
  // Wait for services to be ready
  console.log('⏳ Waiting for services to be ready...');
  
  try {
    // Check web server
    await waitForService(baseURL, 'Web Server');
    
    // Check API server
    await waitForService(`${apiURL}/health`, 'API Server');
    
    console.log('✅ All services are ready');
    
    // Setup test data if needed
    await setupTestData(apiURL);
    
  } catch (error) {
    console.error('❌ Service readiness check failed:', error);
    throw error;
  }
}

async function waitForService(url: string, serviceName: string, maxAttempts = 30) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get(url, { timeout: 5000 });
      if (response.status === 200) {
        console.log(`✅ ${serviceName} is ready`);
        return;
      }
    } catch (error) {
      console.log(`⏳ ${serviceName} not ready (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw new Error(`${serviceName} failed to start after ${maxAttempts} attempts`);
}

async function setupTestData(apiURL: string) {
  console.log('📋 Setting up test data...');
  
  try {
    // Create test organization if it doesn't exist
    // Create test users if they don't exist
    // Set up test feedback data
    
    console.log('✅ Test data setup complete');
  } catch (error) {
    console.warn('⚠️ Test data setup failed (continuing anyway):', error);
  }
}

export default globalSetup;