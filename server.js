/**
 * server.js
 * Ponto de entrada da API. Todas as rotas e middlewares são aqui registrados.
 * Arquivos na raiz para facilitar cópia.
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');

const auth = require('./auth');
const middlewareRole = require('./middleware_role');
const routesAdmin = require('./routes_admin');
const routesStudent = require('./routes_student');
const uploads = require('./uploads');
const payments = require('./payments');
const audit = require('./audit');
const security = require('./security');

const app = express();
const PORT = process.env.PORT || 3000;

security.applyBasic(app);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(morgan('dev'));

// Serve arquivos estáticos (front-end) a partir da raiz
app.use('/', express.static(path.join(__dirname, '/')));

// Health
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date() }));

// Auth endpoints
app.post('/api/auth/register', auth.register);
app.post('/api/auth/login', auth.login);
app.post('/api/auth/refresh', auth.refresh);
app.post('/api/auth/logout', auth.logout);
app.post('/api/auth/verify-email', auth.verifyEmail); // stub

// Uploads (protected)
app.post('/api/uploads', auth.authenticateToken, uploads.uploadMiddleware.single('file'), uploads.uploadHandler);

// Payments (protected routes may be admin)
app.post('/api/payments/create-checkout', auth.authenticateToken, payments.createCheckout);
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), payments.webhookHandler);

// Student routes (requires authentication, student or admin)
app.use('/api/student', auth.authenticateToken, middlewareRole('student', true), routesStudent);

// Admin routes (requires authentication + admin)
app.use('/api/admin', auth.authenticateToken, middlewareRole('admin'), routesAdmin);

// Audit logs quick route (admin)
app.get('/api/admin/logs', auth.authenticateToken, middlewareRole('admin'), audit.getLogs);

// Fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
