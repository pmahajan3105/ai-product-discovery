/**
 * Migration Configuration for Version 1.0.0
 * Initial database setup and core table creation
 */

module.exports = {
    // Files to execute in order
    filesToIncludeForAutoExec: [
        '001-create-organizations-table.js',
        '002-create-users-table.js',
        '003-create-customers-table.js',
        '004-create-feedback-table.js',
        '005-create-custom-fields-table.js',
        '006-create-integrations-table.js',
        '007-create-executed-migrations-table.js',
        '008-add-indexes-and-constraints.js'
    ],
    
    // Migration dependencies
    dependentMigrations: {
        '002-create-users-table.js': ['001-create-organizations-table.js'],
        '003-create-customers-table.js': ['001-create-organizations-table.js'],
        '004-create-feedback-table.js': ['001-create-organizations-table.js', '003-create-customers-table.js'],
        '005-create-custom-fields-table.js': ['001-create-organizations-table.js'],
        '006-create-integrations-table.js': ['001-create-organizations-table.js'],
        '007-create-executed-migrations-table.js': [],
        '008-add-indexes-and-constraints.js': [
            '001-create-organizations-table.js',
            '002-create-users-table.js',
            '003-create-customers-table.js',
            '004-create-feedback-table.js',
            '005-create-custom-fields-table.js',
            '006-create-integrations-table.js'
        ]
    },
    
    // Rollback order (reverse of execution)
    rollbackOrder: [
        '008-add-indexes-and-constraints.js',
        '007-create-executed-migrations-table.js',
        '006-create-integrations-table.js',
        '005-create-custom-fields-table.js',
        '004-create-feedback-table.js',
        '003-create-customers-table.js',
        '002-create-users-table.js',
        '001-create-organizations-table.js'
    ],
    
    // Configuration options
    skipOnError: false,
    transactionMode: 'individual',
    
    // Version metadata
    version: '1.0.0',
    description: 'Initial database setup - core tables and relationships',
    estimatedTime: '5-10 minutes',
    breaking: false,
    
    // Tags for categorization
    tags: ['initial', 'schema', 'core-tables']
};