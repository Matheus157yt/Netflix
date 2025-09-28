/**
 * uploads.js
 * Uploads via multer (memory storage) para evitar criar pastas.
 * Retorna informações do arquivo; para produção integrar S3 (presigned URLs).
 */
const multer = require('multer');
const pool = require('./db_client');

const storage = multer.memoryStorage();
const uploadMiddleware = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

async function uploadHandler(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });
    const meta = {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    };
    res.json({ ok: true, meta });
  } catch (err) {
    console.error('uploadHandler', err);
    res.status(500).json({ error: 'Erro no upload' });
  }
}

module.exports = { uploadMiddleware, uploadHandler };
