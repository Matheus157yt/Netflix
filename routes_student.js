/**
 * routes_student.js
 * Endpoints para student: listar cursos, módulos e marcar progresso.
 */
const express = require('express');
const pool = require('./db_client');
const router = express.Router();

// Listar cursos públicos
router.get('/courses', async (req, res) => {
  try {
    const r = await pool.query('SELECT id,title,description,image,created_at FROM courses ORDER BY created_at DESC');
    res.json({ courses: r.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao listar cursos' }); }
});

// Listar módulos de um curso com status de progresso do usuário
router.get('/courses/:courseId/modules', async (req, res) => {
  try {
    const { courseId } = req.params;
    const mods = await pool.query('SELECT * FROM modules WHERE course_id=$1 ORDER BY position', [courseId]);
    const prog = await pool.query('SELECT module_id, completed FROM progress WHERE user_id=$1 AND module_id IN (SELECT id FROM modules WHERE course_id=$2)', [req.user.id, courseId]);
    const done = {};
    prog.rows.forEach(r=> done[r.module_id] = r.completed);
    res.json({ modules: mods.rows, progress: done });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao listar módulos' }); }
});

// Marcar ou desmarcar progresso
router.post('/courses/:courseId/modules/:moduleId/progress', async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const { completed } = req.body;
    const existing = await pool.query('SELECT id FROM progress WHERE user_id=$1 AND module_id=$2', [req.user.id, moduleId]);
    if (existing.rowCount === 0) {
      await pool.query('INSERT INTO progress (user_id,module_id,completed,updated_at) VALUES ($1,$2,$3,NOW())', [req.user.id, moduleId, completed]);
    } else {
      await pool.query('UPDATE progress SET completed=$1, updated_at=NOW() WHERE user_id=$2 AND module_id=$3', [completed, req.user.id, moduleId]);
    }
    await pool.query('INSERT INTO audit_logs (admin_id, action, target_table, target_id, details) VALUES ($1,$2,$3,$4,$5)', [req.user.id,'PROGRESS','progress',moduleId, JSON_BUILD_OBJECT('completed', completed)]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao atualizar progresso' }); }
});

module.exports = router;
