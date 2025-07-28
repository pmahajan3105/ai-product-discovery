// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import supertokens from "supertokens-node";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { middleware, errorHandler, SessionRequest } from "supertokens-node/framework/express";
import { getWebsiteDomain, SuperTokensConfig } from "./config/supertokens";
import { db } from './services/database';
import organizationRoutes from './routes/organization';
import feedbackRoutes from './routes/feedback';
import userRoutes from './routes/user';
import customerRoutes from './routes/customer';
import authRoutes from './routes/auth';
import { customFieldsRouter } from './routes/customFields';
import { customerProfileRouter } from './routes/customerProfile';
import { oauthRouter } from './routes/oauth';
import webhookRoutes from './routes/webhooks';
import integrationSyncRoutes from './routes/integrationSync';
import integrationHealthRoutes from './routes/integrationHealth';
import filterPresetRoutes from './routes/filterPresets';
import aiRoutes from './routes/ai';
import searchRoutes from './routes/search';
import { ensureUserProfile, trackUserActivity } from './middleware/authMiddleware';
import { AIStreamingService } from './services/ai/streamingService';

// Initialize SuperTokens
supertokens.init(SuperTokensConfig);

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: getWebsiteDomain(),
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.API_PORT || 3001;

// Initialize AI Streaming Service
const aiStreamingService = new AIStreamingService(io);

// Make streaming service available globally
declare global {
  // eslint-disable-next-line no-var
  var aiStreamingService: AIStreamingService;
}
global.aiStreamingService = aiStreamingService;

// Middleware
app.use(helmet());
app.use(cors({
  origin: getWebsiteDomain(),
  allowedHeaders: ["content-type", ...supertokens.getAllCORSHeaders()],
  methods: ["GET", "PUT", "POST", "DELETE"],
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SuperTokens middleware - this exposes all the APIs from SuperTokens to the client
app.use(middleware());

// Auth middleware for all API routes (except public ones)
app.use('/api/users', ensureUserProfile, trackUserActivity);
app.use('/api/organizations', ensureUserProfile, trackUserActivity);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/organizations', customerRoutes);
app.use('/api', feedbackRoutes);
app.use('/api', customFieldsRouter);
app.use('/api', customerProfileRouter);
app.use('/api', oauthRouter);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/integrations', integrationSyncRoutes);
app.use('/api/health', integrationHealthRoutes);
app.use('/api', filterPresetRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/search', ensureUserProfile, trackUserActivity, searchRoutes);

// Protected route example
app.get("/sessioninfo", verifySession(), async (req: SessionRequest, res) => {
  const session = req.session;
  res.send({
    sessionHandle: session!.getHandle(),
    userId: session!.getUserId(),
    accessTokenPayload: session!.getAccessTokenPayload(),
  });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await db.healthCheck();
    res.json({ 
      status: dbHealth.connected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'feedbackhub-api',
      version: '0.1.0',
      database: dbHealth
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'feedbackhub-api',
      version: '0.1.0',
      database: { status: 'error', connected: false, models: 0 },
      error: 'Database health check failed'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// SuperTokens error handler - handles session related errors
app.use(errorHandler());

// General error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server with database connection
async function startServer() {
  try {
    // Connect to database
    await db.connect();
    
    // Start HTTP server with Socket.IO
    server.listen(PORT, () => {
      console.log(`🚀 FeedbackHub API server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 SuperTokens Auth: http://localhost:${PORT}/auth/*`);
      console.log(`🔗 Auth Bridge API: http://localhost:${PORT}/api/auth`);
      console.log(`👤 User API: http://localhost:${PORT}/api/users`);
      console.log(`📊 Organization API: http://localhost:${PORT}/api/organizations`);
      console.log(`👥 Customer API: http://localhost:${PORT}/api/organizations/:id/customers`);
      console.log(`💬 Feedback API: http://localhost:${PORT}/api/organizations/:id/feedback`);
      console.log(`⚙️  Custom Fields API: http://localhost:${PORT}/api/organizations/:id/custom-fields`);
      console.log(`👤 Customer Profile API: http://localhost:${PORT}/api/organizations/:id/customers`);
      console.log(`🔗 OAuth Integrations API: http://localhost:${PORT}/api/organizations/:id/oauth`);
      console.log(`🪝 Webhook Endpoints: http://localhost:${PORT}/api/webhooks/*`);
      console.log(`🔄 Integration Sync API: http://localhost:${PORT}/api/integrations/:id/config`);
      console.log(`🏥 Integration Health API: http://localhost:${PORT}/api/health/*`);
      console.log(`🤖 AI Services API: http://localhost:${PORT}/api/ai/*`);
      console.log(`🔍 Enhanced Search API: http://localhost:${PORT}/api/search/*`);
      console.log(`📡 Socket.IO Streaming: ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  await db.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully');
  await db.disconnect();
  process.exit(0);
});

// Start the server
startServer();

// Export app for testing
export { app };