/**
 * payments.js
 * Esqueleto de integração com Stripe (checkout + webhook).
 * Se STRIPE_SECRET não estiver configurado, os endpoints retornam mensagem.
 */
require('dotenv').config();
const stripeSecret = process.env.STRIPE_SECRET || '';
const pool = require('./db_client');

async function createCheckout(req, res) {
  if (!stripeSecret) return res.status(501).json({ error: 'Stripe não configurado. Configure STRIPE_SECRET.' });
  res.json({ url: 'https://checkout.stripe.example/session' });
}

async function webhookHandler(req, res) {
  res.json({ ok: true });
}

module.exports = { createCheckout, webhookHandler };
