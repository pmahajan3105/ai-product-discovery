/**
 * Database Migration Runner
 * Handles running and tracking database migrations
 */

const { Sequelize } = require('sequelize');
const { createDatabase } = require('../dist/index');
const path = require('path');
const fs = require('fs');

class MigrationRunner {
  constructor(databaseUrl) {
    this.sequelize = createDatabase(databaseUrl);
    this.queryInterface = this.sequelize.getQueryInterface();
    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  /**
   * Create migrations tracking table
   */
  async createMigrationsTable() {
    const [results] = await this.sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'SequelizeMeta'
      )
    `);

    const tableExists = results[0].exists;

    if (!tableExists) {
      await this.queryInterface.createTable('SequelizeMeta', {
        name: {
          type: 'VARCHAR(255)',
          allowNull: false,
          primaryKey: true,
        },
      });
      console.log('📋 Created migrations tracking table');
    }
  }

  /**
   * Get list of completed migrations
   */
  async getCompletedMigrations() {
    try {
      const [results] = await this.sequelize.query(
        'SELECT name FROM "SequelizeMeta" ORDER BY name'
      );
      return results.map(row => row.name);
    } catch (error) {
      return [];
    }
  }

  /**
   * Mark migration as completed
   */
  async markMigrationCompleted(migrationName) {
    await this.sequelize.query(
      'INSERT INTO "SequelizeMeta" (name) VALUES (?)',
      {
        replacements: [migrationName],
      }
    );
  }

  /**
   * Remove migration from completed list
   */
  async markMigrationReverted(migrationName) {
    await this.sequelize.query(
      'DELETE FROM "SequelizeMeta" WHERE name = ?',
      {
        replacements: [migrationName],
      }
    );
  }

  /**
   * Load all migration files
   */
  async loadMigrations() {
    const migrationFiles = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
      .sort();

    const migrations = [];

    for (const file of migrationFiles) {
      const filePath = path.join(this.migrationsPath, file);
      const migration = require(filePath);
      
      if (migration.up && migration.down) {
        migrations.push({
          file: file.replace(/\.(ts|js)$/, ''),
          up: migration.up,
          down: migration.down,
        });
      } else {
        console.warn(`⚠️  Migration ${file} is missing up() or down() function`);
      }
    }

    return migrations;
  }

  /**
   * Run pending migrations
   */
  async migrate() {
    console.log('🚀 Starting database migrations...');

    try {
      // Test database connection
      await this.sequelize.authenticate();
      console.log('✅ Database connection established');

      // Create migrations table
      await this.createMigrationsTable();

      // Get completed migrations
      const completedMigrations = await this.getCompletedMigrations();
      console.log(`📋 Found ${completedMigrations.length} completed migrations`);

      // Load all migrations
      const allMigrations = await this.loadMigrations();
      console.log(`📁 Found ${allMigrations.length} migration files`);

      // Find pending migrations
      const pendingMigrations = allMigrations.filter(
        migration => !completedMigrations.includes(migration.file)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations found. Database is up to date!');
        return;
      }

      console.log(`⏳ Running ${pendingMigrations.length} pending migrations...`);

      // Run each pending migration
      for (const migration of pendingMigrations) {
        console.log(`🔄 Running migration: ${migration.file}`);
        
        try {
          await migration.up(this.queryInterface);
          await this.markMigrationCompleted(migration.file);
          console.log(`✅ Completed migration: ${migration.file}`);
        } catch (error) {
          console.error(`❌ Failed migration: ${migration.file}`);
          console.error(error);
          throw error;
        }
      }

      console.log('🎉 All migrations completed successfully!');

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await this.sequelize.close();
    }
  }

  /**
   * Rollback the last migration
   */
  async rollback() {
    console.log('🔄 Rolling back last migration...');

    try {
      await this.sequelize.authenticate();
      await this.createMigrationsTable();

      const completedMigrations = await this.getCompletedMigrations();
      
      if (completedMigrations.length === 0) {
        console.log('📋 No migrations to rollback');
        return;
      }

      const lastMigration = completedMigrations[completedMigrations.length - 1];
      console.log(`⏪ Rolling back migration: ${lastMigration}`);

      const allMigrations = await this.loadMigrations();
      const migrationToRollback = allMigrations.find(m => m.file === lastMigration);

      if (!migrationToRollback) {
        throw new Error(`Migration file not found: ${lastMigration}`);
      }

      await migrationToRollback.down(this.queryInterface);
      await this.markMigrationReverted(lastMigration);

      console.log(`✅ Successfully rolled back: ${lastMigration}`);

    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    } finally {
      await this.sequelize.close();
    }
  }

  /**
   * Check migration status
   */
  async status() {
    try {
      await this.sequelize.authenticate();
      await this.createMigrationsTable();

      const completedMigrations = await this.getCompletedMigrations();
      const allMigrations = await this.loadMigrations();

      console.log('\n📊 Migration Status:');
      console.log('==================');

      for (const migration of allMigrations) {
        const status = completedMigrations.includes(migration.file) ? '✅ up' : '⏳ down';
        console.log(`${status} ${migration.file}`);
      }

      const pendingCount = allMigrations.length - completedMigrations.length;
      console.log(`\n📈 Total: ${allMigrations.length} migrations`);
      console.log(`✅ Completed: ${completedMigrations.length}`);
      console.log(`⏳ Pending: ${pendingCount}`);

    } catch (error) {
      console.error('❌ Status check failed:', error);
      throw error;
    } finally {
      await this.sequelize.close();
    }
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const runner = new MigrationRunner();

  switch (command) {
    case 'up':
    case 'migrate':
      runner.migrate()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    
    case 'down':
    case 'rollback':
      runner.rollback()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    
    case 'status':
      runner.status()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    
    default:
      console.log('📖 Usage:');
      console.log('  npm run db:migrate     # Run pending migrations');
      console.log('  npm run db:rollback    # Roll back last migration');
      console.log('  npm run db:status      # Check migration status');
      process.exit(1);
  }
}

module.exports = { MigrationRunner };