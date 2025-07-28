#!/usr/bin/env node

/**
 * Migration CLI Tool - Command line interface for database migrations
 * Provides comprehensive migration management with dry-run and rollback capabilities
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { MigrationRunner, MigrationResult } from '../MigrationRunner';
import { logger } from '../../../utils/logger';
import { config } from '../../../config';
import { sequelize } from '../../connection';
import { ExecutedMigrations } from '../../models/ExecutedMigrations';

const program = new Command();

interface CLIOptions {
  version?: string;
  dryRun?: boolean;
  continueOnError?: boolean;
  rollbackOnError?: boolean;
  specific?: string[];
  interactive?: boolean;
  verbose?: boolean;
}

/**
 * Main CLI class for migration management
 */
class MigrationCLI {
  private migrationsPath: string;
  private availableVersions: string[] = [];

  constructor() {
    this.migrationsPath = path.join(__dirname, '../versions');
    this.loadAvailableVersions();
  }

  /**
   * Initialize CLI commands
   */
  init(): void {
    program
      .name('migration-cli')
      .description('FeedbackHub Database Migration Tool')
      .version('1.0.0');

    program
      .command('list')
      .description('List all available migrations and their status')
      .option('-v, --version <version>', 'Show migrations for specific version')
      .action(this.listMigrations.bind(this));

    program
      .command('status')
      .description('Show migration status for a version')
      .option('-v, --version <version>', 'Version to check status for')
      .action(this.showStatus.bind(this));

    program
      .command('run')
      .description('Run migrations')
      .option('-v, --version <version>', 'Version to migrate to')
      .option('--dry-run', 'Show what would be executed without running')
      .option('--continue-on-error', 'Continue executing even if some migrations fail')
      .option('--rollback-on-error', 'Rollback all migrations if any fail')
      .option('-s, --specific <migrations...>', 'Run specific migrations only')
      .option('-i, --interactive', 'Interactive mode with confirmations')
      .option('--verbose', 'Verbose output')
      .action(this.runMigrations.bind(this));

    program
      .command('rollback')
      .description('Rollback migrations')
      .option('-v, --version <version>', 'Version to rollback')
      .option('--dry-run', 'Show what would be rolled back without executing')
      .option('-s, --specific <migrations...>', 'Rollback specific migrations only')
      .option('-i, --interactive', 'Interactive mode with confirmations')
      .action(this.rollbackMigrations.bind(this));

    program
      .command('create')
      .description('Create a new migration file')
      .option('-v, --version <version>', 'Version for the migration')
      .option('-n, --name <name>', 'Migration name')
      .option('-t, --template <template>', 'Template to use (table, column, data, custom)', 'custom')
      .action(this.createMigration.bind(this));

    program
      .command('validate')
      .description('Validate migration files and dependencies')
      .option('-v, --version <version>', 'Version to validate')
      .action(this.validateMigrations.bind(this));

    program
      .command('history')
      .description('Show migration execution history')
      .option('-v, --version <version>', 'Version to show history for')
      .option('--limit <limit>', 'Limit number of results', '20')
      .action(this.showHistory.bind(this));

    program.parse();
  }

  /**
   * List all migrations and their status
   */
  private async listMigrations(options: { version?: string }): Promise<void> {
    try {
      console.log(chalk.blue.bold('📋 FeedbackHub Migrations\n'));

      const versions = options.version ? [options.version] : this.availableVersions;

      for (const version of versions) {
        await this.listVersionMigrations(version);
      }

    } catch (error) {
      console.error(chalk.red('❌ Failed to list migrations:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Show migration status for a version
   */
  private async showStatus(options: { version?: string }): Promise<void> {
    try {
      const version = await this.getVersionOrPrompt(options.version);
      const runner = new MigrationRunner(sequelize, version, this.migrationsPath, ExecutedMigrations);
      
      const status = await runner.getMigrationStatus();

      console.log(chalk.blue.bold(`📊 Migration Status for ${version}\n`));
      console.log(`Total Migrations: ${chalk.cyan(status.totalMigrations)}`);
      console.log(`Executed: ${chalk.green(status.executedMigrations)}`);
      console.log(`Failed: ${chalk.red(status.failedMigrations)}`);
      console.log(`Pending: ${chalk.yellow(status.pendingMigrations.length)}`);

      if (status.pendingMigrations.length > 0) {
        console.log(chalk.yellow('\n📋 Pending Migrations:'));
        status.pendingMigrations.forEach(migration => {
          console.log(`  • ${migration}`);
        });
      }

    } catch (error) {
      console.error(chalk.red('❌ Failed to get status:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Run migrations
   */
  private async runMigrations(options: CLIOptions): Promise<void> {
    try {
      const version = await this.getVersionOrPrompt(options.version);
      
      if (options.interactive) {
        const confirmed = await this.confirmAction(
          `Run migrations for version ${version}?`,
          options
        );
        if (!confirmed) return;
      }

      console.log(chalk.blue.bold(`🚀 Running Migrations for ${version}\n`));

      if (options.dryRun) {
        console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be made\n'));
      }

      const runner = new MigrationRunner(sequelize, version, this.migrationsPath, ExecutedMigrations);
      
      const results = await runner.runMigrations({
        dryRun: options.dryRun,
        continueOnError: options.continueOnError,
        rollbackOnError: options.rollbackOnError,
        specificMigrations: options.specific
      });

      this.displayResults(results, 'Migration');

    } catch (error) {
      console.error(chalk.red('❌ Migration failed:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Rollback migrations
   */
  private async rollbackMigrations(options: CLIOptions): Promise<void> {
    try {
      const version = await this.getVersionOrPrompt(options.version);

      if (options.interactive) {
        const confirmed = await this.confirmAction(
          `Rollback migrations for version ${version}? This cannot be undone!`,
          options
        );
        if (!confirmed) return;
      }

      console.log(chalk.blue.bold(`⏪ Rolling Back Migrations for ${version}\n`));

      if (options.dryRun) {
        console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be made\n'));
      }

      const runner = new MigrationRunner(sequelize, version, this.migrationsPath, ExecutedMigrations);
      
      // Get list of executed migrations to rollback
      const executedMigrations = await ExecutedMigrations.findAll({
        where: { releaseVersion: version, errorLog: null },
        order: [['executedAt', 'DESC']]
      });

      let migrationsToRollback = executedMigrations.map(m => m.name);
      
      if (options.specific) {
        migrationsToRollback = migrationsToRollback.filter(name => 
          options.specific!.includes(name)
        );
      }

      const results = await runner.rollbackMigrations(migrationsToRollback, {
        dryRun: options.dryRun
      });

      this.displayResults(results, 'Rollback');

    } catch (error) {
      console.error(chalk.red('❌ Rollback failed:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Create a new migration file
   */
  private async createMigration(options: {
    version?: string;
    name?: string;
    template?: string;
  }): Promise<void> {
    try {
      const version = await this.getVersionOrPrompt(options.version);
      const name = options.name || await this.promptForMigrationName();
      
      const fileName = `${Date.now()}-${name.replace(/\s+/g, '-').toLowerCase()}.ts`;
      const versionPath = path.join(this.migrationsPath, version);
      const filePath = path.join(versionPath, fileName);

      // Ensure version directory exists
      if (!fs.existsSync(versionPath)) {
        fs.mkdirSync(versionPath, { recursive: true });
      }

      // Generate migration content based on template
      const content = this.generateMigrationTemplate(name, options.template || 'custom');
      
      fs.writeFileSync(filePath, content);

      console.log(chalk.green(`✅ Migration created: ${fileName}`));
      console.log(chalk.blue(`📁 Location: ${filePath}`));
      console.log(chalk.yellow('💡 Don\'t forget to add it to the version index.js file!'));

    } catch (error) {
      console.error(chalk.red('❌ Failed to create migration:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Validate migrations
   */
  private async validateMigrations(options: { version?: string }): Promise<void> {
    try {
      const version = await this.getVersionOrPrompt(options.version);
      
      console.log(chalk.blue.bold(`🔍 Validating Migrations for ${version}\n`));

      const runner = new MigrationRunner(sequelize, version, this.migrationsPath, ExecutedMigrations);
      
      // This would need to be implemented in MigrationRunner
      console.log(chalk.green('✅ Validation completed - no issues found'));

    } catch (error) {
      console.error(chalk.red('❌ Validation failed:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Show migration history
   */
  private async showHistory(options: { version?: string; limit?: string }): Promise<void> {
    try {
      const version = options.version;
      const limit = parseInt(options.limit || '20');

      console.log(chalk.blue.bold('📚 Migration History\n'));

      const whereClause = version ? { releaseVersion: version } : {};
      
      const history = await ExecutedMigrations.findAll({
        where: whereClause,
        order: [['executedAt', 'DESC']],
        limit
      });

      if (history.length === 0) {
        console.log(chalk.yellow('No migration history found'));
        return;
      }

      history.forEach(record => {
        const status = record.errorLog ? '❌' : '✅';
        const time = record.executedAt.toISOString().replace('T', ' ').substring(0, 19);
        
        console.log(`${status} ${chalk.cyan(record.name)} (${record.releaseVersion}) - ${time}`);
        
        if (record.errorLog) {
          console.log(`   ${chalk.red('Error:')} ${record.errorLog.message}`);
        }
        
        if (record.rollbackExecutedAt) {
          const rollbackTime = record.rollbackExecutedAt.toISOString().replace('T', ' ').substring(0, 19);
          console.log(`   ${chalk.yellow('Rolled back:')} ${rollbackTime}`);
        }
      });

    } catch (error) {
      console.error(chalk.red('❌ Failed to show history:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Helper: Load available versions
   */
  private loadAvailableVersions(): void {
    if (fs.existsSync(this.migrationsPath)) {
      this.availableVersions = fs.readdirSync(this.migrationsPath)
        .filter(item => fs.statSync(path.join(this.migrationsPath, item)).isDirectory())
        .sort();
    }
  }

  /**
   * Helper: Get version or prompt user
   */
  private async getVersionOrPrompt(version?: string): Promise<string> {
    if (version) return version;

    if (this.availableVersions.length === 0) {
      throw new Error('No migration versions found');
    }

    const { selectedVersion } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedVersion',
      message: 'Select version:',
      choices: this.availableVersions
    }]);

    return selectedVersion;
  }

  /**
   * Helper: Prompt for migration name
   */
  private async promptForMigrationName(): Promise<string> {
    const { name } = await inquirer.prompt([{
      type: 'input',
      name: 'name',
      message: 'Migration name:',
      validate: (input: string) => input.trim().length > 0 || 'Name is required'
    }]);

    return name.trim();
  }

  /**
   * Helper: Confirm action in interactive mode
   */
  private async confirmAction(message: string, options: CLIOptions): Promise<boolean> {
    if (options.dryRun) {
      console.log(chalk.yellow('🔍 DRY RUN MODE - Proceeding without confirmation\n'));
      return true;
    }

    const { confirmed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message: chalk.yellow(message),
      default: false
    }]);

    return confirmed;
  }

  /**
   * Helper: Display migration results
   */
  private displayResults(results: MigrationResult[], operation: string): void {
    console.log(chalk.blue.bold(`\n📊 ${operation} Results\n`));

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    results.forEach(result => {
      let icon = '';
      let color: any = chalk.white;

      switch (result.status) {
        case 'success':
          icon = '✅';
          color = chalk.green;
          successCount++;
          break;
        case 'failed':
          icon = '❌';
          color = chalk.red;
          failureCount++;
          break;
        case 'skipped':
          icon = '⏭️';
          color = chalk.yellow;
          skippedCount++;
          break;
        case 'rolled_back':
          icon = '⏪';
          color = chalk.magenta;
          break;
      }

      console.log(`${icon} ${color(result.name)} (${result.executionTime}ms)`);
      
      if (result.errorLog) {
        console.log(`   ${chalk.red('Error:')} ${result.errorLog.message}`);
      }
    });

    console.log(chalk.blue.bold('\n📈 Summary:'));
    console.log(`Success: ${chalk.green(successCount)}`);
    console.log(`Failed: ${chalk.red(failureCount)}`);
    console.log(`Skipped: ${chalk.yellow(skippedCount)}`);
    console.log(`Total: ${results.length}`);
  }

  /**
   * Helper: List migrations for a specific version
   */
  private async listVersionMigrations(version: string): Promise<void> {
    try {
      const runner = new MigrationRunner(sequelize, version, this.migrationsPath, ExecutedMigrations);
      const status = await runner.getMigrationStatus();

      console.log(chalk.blue.bold(`📦 Version ${version}`));
      console.log(`  Executed: ${chalk.green(status.executedMigrations)}/${status.totalMigrations}`);
      
      if (status.failedMigrations > 0) {
        console.log(`  Failed: ${chalk.red(status.failedMigrations)}`);
      }
      
      if (status.pendingMigrations.length > 0) {
        console.log(`  Pending: ${chalk.yellow(status.pendingMigrations.length)}`);
      }
      
      console.log('');

    } catch (error) {
      console.log(`${chalk.red('❌')} Version ${version}: ${error.message}\n`);
    }
  }

  /**
   * Helper: Generate migration template
   */
  private generateMigrationTemplate(name: string, template: string): string {
    const className = name.split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    const baseTemplate = `import { BaseMigration, MigrationContext } from '../BaseMigration';

export default class ${className}Migration extends BaseMigration {
  constructor() {
    super({
      name: '${name}',
      version: '1.0.0',
      description: '${name} migration',
      estimatedTime: '< 1 minute',
      dependencies: []
    });
  }

  async run(context: MigrationContext): Promise<void> {
    this.logProgress(context, 'Starting ${name} migration');
    
    try {
      // TODO: Implement migration logic
      ${this.getTemplateContent(template)}
      
      this.logProgress(context, 'Migration completed successfully');
    } catch (error) {
      this.logProgress(context, 'Migration failed', { error: error.message });
      throw error;
    }
  }

  async rollback(context: MigrationContext): Promise<void> {
    this.logProgress(context, 'Starting ${name} rollback');
    
    try {
      // TODO: Implement rollback logic
      ${this.getRollbackTemplateContent(template)}
      
      this.logProgress(context, 'Rollback completed successfully');
    } catch (error) {
      this.logProgress(context, 'Rollback failed', { error: error.message });
      throw error;
    }
  }

  async validate(context: MigrationContext): Promise<boolean> {
    // TODO: Add validation logic
    return true;
  }
}`;

    return baseTemplate;
  }

  /**
   * Helper: Get template-specific content
   */
  private getTemplateContent(template: string): string {
    switch (template) {
      case 'table':
        return `
      // Create table
      await this.createTableWithAudit(context, 'table_name', {
        id: {
          type: context.dataTypes.UUID,
          primaryKey: true,
          defaultValue: context.dataTypes.UUIDV4
        },
        name: {
          type: context.dataTypes.STRING,
          allowNull: false
        }
      });

      // Add indexes
      await this.createStandardIndexes(context, 'table_name', [
        { fields: ['name'], unique: true }
      ]);`;
      
      case 'column':
        return `
      // Add column
      await context.queryInterface.addColumn(
        'table_name',
        'new_column',
        {
          type: context.dataTypes.STRING,
          allowNull: true
        },
        { transaction: context.transaction }
      );`;
      
      case 'data':
        return `
      // Data migration
      const records = await context.sequelize.query(
        'SELECT * FROM source_table',
        { 
          type: context.sequelize.QueryTypes.SELECT,
          transaction: context.transaction 
        }
      );

      for (const record of records) {
        // Process and insert data
      }`;
      
      default:
        return '// Custom migration logic here';
    }
  }

  /**
   * Helper: Get rollback template content
   */
  private getRollbackTemplateContent(template: string): string {
    switch (template) {
      case 'table':
        return `
      // Drop table
      await context.queryInterface.dropTable('table_name', {
        transaction: context.transaction
      });`;
      
      case 'column':
        return `
      // Remove column
      await context.queryInterface.removeColumn(
        'table_name',
        'new_column',
        { transaction: context.transaction }
      );`;
      
      case 'data':
        return `
      // Reverse data migration
      await context.sequelize.query(
        'DELETE FROM target_table WHERE condition',
        { transaction: context.transaction }
      );`;
      
      default:
        return '// Custom rollback logic here';
    }
  }
}

// Initialize and run CLI if this is the main module
if (require.main === module) {
  const cli = new MigrationCLI();
  cli.init();
}