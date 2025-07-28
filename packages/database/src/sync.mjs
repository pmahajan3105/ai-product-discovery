/**
 * Simple database sync using Sequelize models
 * This will create all tables based on model definitions
 */

import { createDatabase, initializeModels } from '../dist/index.js';

async function syncDatabase() {
  try {
    console.log('🚀 Starting database synchronization...');
    
    // Create database connection
    const sequelize = createDatabase(process.env.DATABASE_URL);
    
    // Initialize all models
    console.log('📋 Initializing models...');
    const models = initializeModels(sequelize);
    
    // Test connection
    console.log('📡 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Sync all models (create tables)
    console.log('🏗️  Creating tables and relationships...');
    await sequelize.sync({ force: false, alter: true });
    
    console.log('✅ All tables synchronized successfully!');
    console.log('');
    console.log('📊 Database includes:');
    console.log('   • Users and Organizations');
    console.log('   • Feedback and Comments');
    console.log('   • Customers and Integrations');
    console.log('   • All indexes and relationships');
    
    await sequelize.close();
    console.log('');
    console.log('🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Database sync failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run directly
await syncDatabase();