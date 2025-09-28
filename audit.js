/**
 * audit.js
 * Pequena interface para logs de auditoria.
 */
const pool = require('./db_client');

async function getLogs(req, res) {
  try {
    const r = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500');
    res.json({ logs: r.rows });
  } catch (err) {
    console.error('getLogs', err);
    res.status(500).json({ error: 'Erro ao buscar logs' });
  }
}

module.exports = { getLogs };
