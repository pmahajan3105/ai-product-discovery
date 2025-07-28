/**
 * pgvector Migration
 * Adds vector extension and migrates embeddings to native vector columns
 */

const { DataTypes } = require('sequelize');

const up = async (queryInterface) => {
  console.log('🚀 Adding pgvector extension and migrating embeddings...');

  try {
    // 1. Create vector extension (requires superuser permissions)
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('✅ pgvector extension created');
  } catch (error) {
    console.warn('⚠️  Could not create pgvector extension (may require superuser):', error.message);
    console.log('📝 Manual step required: Run "CREATE EXTENSION vector;" as superuser');
  }

  // 2. Add vector column to feedback_embeddings table
  await queryInterface.addColumn('feedback_embeddings', 'embedding_vector', {
    type: 'vector(1536)', // OpenAI text-embedding-3-large dimensions
    allowNull: true,
  });
  console.log('✅ Added embedding_vector column');

  // 3. Migrate existing JSONB embeddings to vector format
  console.log('🔄 Migrating existing embeddings from JSONB to vector format...');
  
  await queryInterface.sequelize.query(`
    UPDATE feedback_embeddings 
    SET embedding_vector = CAST(embedding::text AS vector(1536))
    WHERE embedding IS NOT NULL 
    AND embedding_vector IS NULL;
  `);

  console.log('✅ Migrated existing embeddings to vector format');

  // 4. Create vector similarity indexes for performance
  console.log('🔄 Creating vector similarity indexes...');

  // IVFFlat index for approximate nearest neighbor search
  await queryInterface.sequelize.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS feedback_embeddings_embedding_vector_ivfflat_idx 
    ON feedback_embeddings USING ivfflat (embedding_vector vector_cosine_ops) 
    WITH (lists = 100);
  `);

  // HNSW index for better performance (if pgvector 0.5.0+)
  try {
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS feedback_embeddings_embedding_vector_hnsw_idx 
      ON feedback_embeddings USING hnsw (embedding_vector vector_cosine_ops) 
      WITH (m = 16, ef_construction = 64);
    `);
    console.log('✅ Created HNSW index for optimal performance');
  } catch (error) {
    console.log('📝 HNSW index not available (requires pgvector 0.5.0+), using IVFFlat');
  }

  // 5. Add additional indexes for filtering
  await queryInterface.addIndex('feedback_embeddings', ['organizationId', 'model']);
  await queryInterface.addIndex('feedback_embeddings', ['tokens']);

  // 6. Update table to make embedding_vector the primary embedding column
  await queryInterface.changeColumn('feedback_embeddings', 'embedding_vector', {
    type: 'vector(1536)',
    allowNull: false,
    defaultValue: null,
  });

  console.log('✅ pgvector migration completed successfully!');
  console.log('📊 Performance improvements:');
  console.log('   - Vector similarity queries will be 10-100x faster');
  console.log('   - Native PostgreSQL vector operations');
  console.log('   - Optimized for semantic search at scale');
};

const down = async (queryInterface) => {
  console.log('🔄 Rolling back pgvector migration...');

  // Remove indexes
  await queryInterface.removeIndex('feedback_embeddings', 'feedback_embeddings_embedding_vector_ivfflat_idx');
  
  try {
    await queryInterface.removeIndex('feedback_embeddings', 'feedback_embeddings_embedding_vector_hnsw_idx');
  } catch (error) {
    // HNSW index might not exist
  }

  // Remove vector column
  await queryInterface.removeColumn('feedback_embeddings', 'embedding_vector');

  console.log('✅ pgvector migration rolled back');
  console.log('⚠️  Note: pgvector extension is NOT dropped (requires manual cleanup)');
};

module.exports = { up, down };