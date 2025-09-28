/**
 * routes_admin.js
 * CRUD completo: users, courses, modules; logs de auditoria consultáveis.
 */
const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('./db_client');
const router = express.Router();

// USERS
router.get('/users', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, name, email, role, blocked, created_at FROM users ORDER BY created_at DESC');
    res.json({ users: r.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao listar usuários' }); }
});

router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Campos obrigatórios' });
    const hash = await bcrypt.hash(password, 12);
    const r = await pool.query('INSERT INTO users (name,email,password,role,blocked,created_at) VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING id,name,email,role', [name,email,hash,role||'student',false]);
    await pool.query('INSERT INTO audit_logs (admin_id, action, target_table, target_id, details) VALUES ($1,$2,$3,$4,$5)', [req.user.id,'CREATE_USER','users',r.rows[0].id, JSON_BUILD_OBJECT('email', email)]);
    res.json({ user: r.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao criar usuário' }); }
});

router.put('/users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, email, role, blocked, password } = req.body;
    const updates = [];
    const vals = [];
    let idx = 1;
    if (name!==undefined){ updates.push(`name=$${idx++}`); vals.push(name); }
    if (email!==undefined){ updates.push(`email=$${idx++}`); vals.push(email); }
    if (role!==undefined){ updates.push(`role=$${idx++}`); vals.push(role); }
    if (blocked!==undefined){ updates.push(`blocked=$${idx++}`); vals.push(blocked); }
    if (password!==undefined){ const h = await bcrypt.hash(password,12); updates.push(`password=$${idx++}`); vals.push(h); }
    if (updates.length===0) return res.status(400).json({ error: 'Nada para atualizar' });
    vals.push(id);
    const q = `UPDATE users SET ${updates.join(', ')} WHERE id=$${idx} RETURNING id,name,email,role,blocked`;
    const r = await pool.query(q, vals);
    await pool.query('INSERT INTO audit_logs (admin_id, action, target_table, target_id, details) VALUES ($1,$2,$3,$4,$5)', [req.user.id,'UPDATE_USER','users',id, JSON_BUILD_OBJECT('updates', req.body)]);
    res.json({ user: r.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao atualizar usuário' }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const r = await pool.query('DELETE FROM users WHERE id=$1 RETURNING id,email', [id]);
    await pool.query('INSERT INTO audit_logs (admin_id, action, target_table, target_id, details) VALUES ($1,$2,$3,$4,$5)', [req.user.id,'DELETE_USER','users',id, JSON_BUILD_OBJECT('email', r.rows[0].email)]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao deletar usuário' }); }
});

// COURSES
router.get('/courses', async (req, res) => {
  try { const r = await pool.query('SELECT * FROM courses ORDER BY created_at DESC'); res.json({ courses: r.rows }); }
  catch (err){ console.error(err); res.status(500).json({ error: 'Erro ao listar cursos' }); }
});

router.post('/courses', async (req, res) => {
  try {
    const { title, description, image } = req.body;
    const r = await pool.query('INSERT INTO courses (title,description,image,created_at) VALUES ($1,$2,$3,NOW()) RETURNING *', [title,description,image||'']);
    await pool.query('INSERT INTO audit_logs (admin_id, action, target_table, target_id, details) VALUES ($1,$2,$3,$4,$5)', [req.user.id,'CREATE_COURSE','courses',r.rows[0].id, JSON_BUILD_OBJECT('title', title)]);
    res.json({ course: r.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao criar curso' }); }
});

router.put('/courses/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { title, description, image } = req.body;
    await pool.query('UPDATE courses SET title=$1, description=$2, image=$3 WHERE id=$4', [title,description,image,id]);
    await pool.query('INSERT INTO audit_logs (admin_id, action, target_table, target_id, details) VALUES ($1,$2,$3,$4,$5)', [req.user.id,'UPDATE_COURSE','courses',id, JSON_BUILD_OBJECT('title', title)]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao atualizar curso' }); }
});

router.delete('/courses/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query('DELETE FROM modules WHERE course_id=$1', [id]);
    await pool.query('DELETE FROM courses WHERE id=$1', [id]);
    await pool.query('INSERT INTO audit_logs (admin_id, action, target_table, target_id, details) VALUES ($1,$2,$3,$4,$5)', [req.user.id,'DELETE_COURSE','courses',id, JSON_BUILD_OBJECT('id', id)]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao deletar curso' }); }
});

// MODULES
router.get('/modules', async (req, res) => {
  try { const r = await pool.query('SELECT m.*, c.title as course_title FROM modules m LEFT JOIN courses c ON c.id=m.course_id ORDER BY m.position'); res.json({ modules: r.rows }); }
  catch (err){ console.error(err); res.status(500).json({ error: 'Erro ao listar módulos' }); }
});

router.post('/courses/:courseId/modules', async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const { title, content, position } = req.body;
    const r = await pool.query('INSERT INTO modules (course_id,title,content,position,created_at) VALUES ($1,$2,$3,$4,NOW()) RETURNING *', [courseId,title,content,position||0]);
    await pool.query('INSERT INTO audit_logs (admin_id, action, target_table, target_id, details) VALUES ($1,$2,$3,$4,$5)', [req.user.id,'CREATE_MODULE','modules',r.rows[0].id, JSON_BUILD_OBJECT('title', title)]);
    res.json({ module: r.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao criar módulo' }); }
});

router.put('/modules/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { title, content, position } = req.body;
    await pool.query('UPDATE modules SET title=$1, content=$2, position=$3 WHERE id=$4', [title,content,position||0,id]);
    await pool.query('INSERT INTO audit_logs (admin_id, action, target_table, target_id, details) VALUES ($1,$2,$3,$4,$5)', [req.user.id,'UPDATE_MODULE','modules',id, JSON_BUILD_OBJECT('title', title)]);
    res.json({ ok: true });
  } catch(err){ console.error(err); res.status(500).json({ error: 'Erro ao atualizar módulo' }); }
});

router.delete('/modules/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query('DELETE FROM modules WHERE id=$1', [id]);
    await pool.query('INSERT INTO audit_logs (admin_id, action, target_table, target_id, details) VALUES ($1,$2,$3,$4,$5)', [req.user.id,'DELETE_MODULE','modules',id, JSON_BUILD_OBJECT('id', id)]);
    res.json({ ok: true });
  } catch(err){ console.error(err); res.status(500).json({ error: 'Erro ao deletar módulo' }); }
});

module.exports = router;
