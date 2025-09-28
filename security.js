/**
 * security.js
 * Aplica helmet, CORS e rate-limiter básicos.
 */
require('dotenv').config();
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

function applyBasic(app) {
  app.use(helmet());
  app.use(cors({
    origin: true,
    credentials: true
  }));
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 120
  });
  app.use(limiter);
}

module.exports = { applyBasic };
