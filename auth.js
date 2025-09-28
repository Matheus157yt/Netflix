/**
 * auth.js
 * Autenticação JWT (access + refresh), registro, login, logout, refresh com rotação.
 * Usa refresh_tokens no DB para invalidar e rota de refresh rotativo.
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('./db_client');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access_dev_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_dev_secret';
const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '7d';

function generateAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}
function generateRefreshToken(user) {
  return jwt.sign({ sub: user.id }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

// Middleware: autentica access token e popula req.user
function authenticateToken(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token de acesso não fornecido' });
  jwt.verify(token, ACCESS_SECRET, (err, payload) => {
    if (err) return res.status(401).json({ error: 'Token inválido ou expirado' });
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  });
}

// Register
async function register(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Campos obrigatórios: name, email, password' });
  try {
    const client = await pool.connect();
    const existing = await client.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rowCount > 0) { client.release(); return res.status(409).json({ error: 'E-mail já cadastrado' }); }
    const hash = await bcrypt.hash(password, 12);
    const result = await client.query('INSERT INTO users (name,email,password,role,blocked,created_at) VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING id,name,email,role', [name,email,hash,'student',false]);
    await client.query('INSERT INTO audit_logs (admin_id, action, target_table, target_id, details) VALUES ($1,$2,$3,$4,$5)', [null,'REGISTER','users',result.rows[0].id, JSON_BUILD_OBJECT('email', email)]);
    client.release();
    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error('register', err);
    res.status(500).json({ error: 'Erro ao registrar' });
  }
}

// Login
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Campos obrigatórios' });
  try {
    const client = await pool.connect();
    const r = await client.query('SELECT id, name, email, password, role, blocked FROM users WHERE email=$1', [email]);
    if (r.rowCount === 0) { client.release(); return res.status(401).json({ error: 'Credenciais inválidas' }); }
    const user = r.rows[0];
    if (user.blocked) { client.release(); return res.status(403).json({ error: 'Conta bloqueada' }); }
    const match = await bcrypt.compare(password, user.password);
    if (!match) { client.release(); return res.status(401).json({ error: 'Credenciais inválidas' }); }
    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });
    const expiresAt = new Date(Date.now() + 7*24*60*60*1000);
    await client.query('INSERT INTO refresh_tokens (token, user_id, expires_at, created_at) VALUES ($1,$2,$3,NOW())', [refreshToken, user.id, expiresAt.toISOString()]);
    await client.query('INSERT INTO audit_logs (admin_id, action, target_table, target_id, details) VALUES ($1,$2,$3,$4,$5)', [user.id,'LOGIN','users',user.id, JSON_BUILD_OBJECT('email', user.email)]);
    client.release();
    res.json({ accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('login', err);
    res.status(500).json({ error: 'Erro ao logar' });
  }
}

// Refresh with rotation
async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken obrigatório' });
  try {
    const client = await pool.connect();
    const db = await client.query('SELECT token, user_id, expires_at FROM refresh_tokens WHERE token=$1', [refreshToken]);
    if (db.rowCount === 0) { client.release(); return res.status(403).json({ error: 'Refresh token inválido' }); }
    const row = db.rows[0];
    if (new Date(row.expires_at) < new Date()) {
      await client.query('DELETE FROM refresh_tokens WHERE token=$1', [refreshToken]);
      client.release();
      return res.status(403).json({ error: 'Refresh token expirado' });
    }
    jwt.verify(refreshToken, REFRESH_SECRET, async (err, payload) => {
      if (err) { await client.query('DELETE FROM refresh_tokens WHERE token=$1', [refreshToken]); client.release(); return res.status(403).json({ error: 'Refresh token inválido' }); }
      const userId = payload.sub;
      await client.query('DELETE FROM refresh_tokens WHERE token=$1', [refreshToken]);
      const newRefresh = generateRefreshToken({ id: userId });
      const expiresAt = new Date(Date.now() + 7*24*60*60*1000);
      await client.query('INSERT INTO refresh_tokens (token, user_id, expires_at, created_at) VALUES ($1,$2,$3,NOW())', [newRefresh, userId, expiresAt.toISOString()]);
      const userRow = await client.query('SELECT id, email, role FROM users WHERE id=$1', [userId]);
      if (userRow.rowCount === 0) { client.release(); return res.status(404).json({ error: 'Usuário não encontrado' }); }
      const user = userRow.rows[0];
      const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
      await client.query('INSERT INTO audit_logs (admin_id, action, target_table, target_id, details) VALUES ($1,$2,$3,$4,$5)', [user.id,'REFRESH','refresh_tokens',null, JSON_BUILD_OBJECT('info','token_rotated')]);
      client.release();
      res.json({ accessToken, refreshToken: newRefresh });
    });
  } catch (err) {
    console.error('refresh', err);
    res.status(500).json({ error: 'Erro ao renovar token' });
  }
}

// Logout: deletar refresh token
async function logout(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken obrigatório' });
  try {
    const client = await pool.connect();
    await client.query('DELETE FROM refresh_tokens WHERE token=$1', [refreshToken]);
    await client.query('INSERT INTO audit_logs (admin_id, action, target_table, target_id, details) VALUES ($1,$2,$3,$4,$5)', [null,'LOGOUT','refresh_tokens',null, JSON_BUILD_OBJECT('token', refreshToken)]);
    client.release();
    res.json({ ok: true });
  } catch (err) {
    console.error('logout', err);
    res.status(500).json({ error: 'Erro ao deslogar' });
  }
}

// Verify email (stub)
async function verifyEmail(req, res) {
  res.json({ ok: true, info: 'Endpoint de verificação - stub' });
}

module.exports = { authenticateToken, register, login, refresh, logout, verifyEmail, generateAccessToken, generateRefreshToken };
