const pool = require('../../db');

const initPostgres = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      status BOOLEAN DEFAULT false,
      priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(createTableQuery);
    console.log('📋 Tasks table ready');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
    throw error;
  }
};

module.exports = { initPostgres };
