/**
 * db_client.js
 * Conexão simples com o PostgreSQL via pg.Pool
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/membersdb'
});

module.exports = pool;
