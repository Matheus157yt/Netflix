/**
 * utils.js
 * Funções utilitárias: escape, simple logger, id.
 */
const crypto = require('crypto');

function id() { return crypto.randomUUID(); }

function simpleLog(tag, ...args) {
  console.log(new Date().toISOString(), `[${tag}]`, ...args);
}

module.exports = { id, simpleLog };
