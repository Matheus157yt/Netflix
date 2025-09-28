
// Usuário admin adicionado automaticamente
const extraAdminUser = {
    name: "Matheus Henrique Alves Rocha",
    email: "matheush5432191@gmail.cof",
    password: "f5432191",
    role: "admin"
};

/* client.js
   Simula backend completo usando localStorage.
   Namespace global: UM (User Membership)
   Persistência: localStorage keys:
     - um_users, um_courses, um_modules, um_progress, um_logs, um_session
   Segurança: este é um demo para GitHub Pages; NÃO use em produção.
*/

(function(global){
  const KEY_USERS = 'um_users_v1';
  const KEY_COURSES = 'um_courses_v1';
  const KEY_MODULES = 'um_modules_v1';
  const KEY_PROGRESS = 'um_progress_v1';
  const KEY_LOGS = 'um_logs_v1';
  const KEY_SESSION = 'um_session_v1';

  // utilidades
  function uid(){ // fallback para browsers antigos
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Math.random().toString(36).slice(2,9);
  }
  function nowISO(){ return new Date().toISOString(); }
  function read(key){ try{ return JSON.parse(localStorage.getItem(key) || '[]'); }catch(e){ return []; } }
  function write(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

  // Inicializa seed se necessário
  function ensureSeed(){
    let users = read(KEY_USERS);
    if (!users.length){
      // senha salva em texto aqui (demo). admin: admin@local / admin123
      users = [ { id: uid(), name: 'Admin', email: 'admin@local', password: 'admin123', role: 'admin', blocked: false, created_at: nowISO() } ];
      write(KEY_USERS, users);
    }
    let courses = read(KEY_COURSES);
    if (!courses.length){
      const c1 = { id: uid(), title: 'Curso Demo 1', description: 'Curso de exemplo 1', created_at: nowISO() };
      const c2 = { id: uid(), title: 'Curso Demo 2', description: 'Curso de exemplo 2', created_at: nowISO() };
      write(KEY_COURSES, [c1,c2]);
      write(KEY_MODULES, [ { id: uid(), course_id: c1.id, title: 'Módulo 1', content: 'Conteúdo do módulo 1', position:1, created_at: nowISO() } ]);
    }
    // ensure logs array exists
    if (!localStorage.getItem(KEY_LOGS)) write(KEY_LOGS, []);
    if (!localStorage.getItem(KEY_PROGRESS)) write(KEY_PROGRESS, []);
  }

  // Storage layer (CRUD)
  const storage = {
    getUsers(){ return read(KEY_USERS); },
    getUser(id){ return this.getUsers().find(u=>u.id===id); },
    getUserByEmail(email){ return this.getUsers().find(u=>u.email.toLowerCase()===email.toLowerCase()); },
    createUser({ name, email, password, role }){
      const users = this.getUsers();
      const existing = users.find(u=>u.email.toLowerCase()===email.toLowerCase());
      if (existing) throw new Error('E-mail já cadastrado');
      const u = { id: uid(), name, email, password, role: role || 'student', blocked: false, created_at: nowISO() };
      users.push(u); write(KEY_USERS, users); return u;
    },
    updateUser(id, changes){
      const users = this.getUsers();
      const i = users.findIndex(u=>u.id===id);
      if (i===-1) throw new Error('Usuário não encontrado');
      const u = users[i];
      const updated = Object.assign({}, u, changes);
      // if password undefined, don't override; if provided, set as plain text (demo)
      if (changes.password===undefined) updated.password = u.password;
      users[i] = updated; write(KEY_USERS, users); return updated;
    },
    deleteUser(id){
      let users = this.getUsers();
      users = users.filter(u=>u.id!==id);
      write(KEY_USERS, users);
    },

    // courses/modules
    getCourses(){ return read(KEY_COURSES); },
    createCourse({ title, description }){ const cs = this.getCourses(); const c = { id: uid(), title, description, created_at: nowISO() }; cs.push(c); write(KEY_COURSES, cs); return c; },
    deleteCourse(id){ let cs = this.getCourses(); cs = cs.filter(c=>c.id!==id); write(KEY_COURSES, cs); // delete modules too
      let mods = read(KEY_MODULES || KEY_MODULES); mods = mods.filter(m=>m.course_id!==id); write(KEY_MODULES, mods); },

    getModules(courseId){ return read(KEY_MODULES).filter(m=>m.course_id===courseId).sort((a,b)=> (a.position||0)-(b.position||0)); },
    createModule(courseId, { title, content, position }){ const all = read(KEY_MODULES); const m = { id: uid(), course_id: courseId, title, content, position: position||0, created_at: nowISO() }; all.push(m); write(KEY_MODULES, all); return m; },
    deleteModule(id){ let all = read(KEY_MODULES); all = all.filter(m=>m.id!==id); write(KEY_MODULES, all); },

    // progress
    getProgress(){ return read(KEY_PROGRESS); },
    getProgressForUser(userId){ const p = this.getProgress().filter(x=>x.user_id===userId); const map = {}; p.forEach(r=> map[r.module_id] = r.completed); return map; },
    setProgress(userId, moduleId, completed){
      const all = this.getProgress();
      const i = all.findIndex(x=>x.user_id===userId && x.module_id===moduleId);
      if (i===-1) { all.push({ id: uid(), user_id:userId, module_id:moduleId, completed: !!completed, updated_at: nowISO() }); }
      else { all[i].completed = !!completed; all[i].updated_at = nowISO(); }
      write(KEY_PROGRESS, all);
    },

    // helper getters
    getUserPublic(userId){ const u = this.getUser(userId); if(!u) return null; const { password, ...rest } = u; return rest; }
  };

  // Audit logs
  const audit = {
    log(adminId, action, target_table, target_id, details){
      const logs = read(KEY_LOGS);
      const entry = { id: uid(), admin_id: adminId || null, action, target_table, target_id: target_id || null, details: details || null, created_at: nowISO() };
      logs.unshift(entry); write(KEY_LOGS, logs);
      return entry;
    },
    getLogs(){ return read(KEY_LOGS); }
  };

  // Session & "auth"
  const session = {
    login(email, password){
      ensureSeed();
      const user = storage.getUserByEmail(email);
      if (!user) return { ok:false, error: 'Credenciais inválidas' };
      if (user.blocked) return { ok:false, error: 'Usuário bloqueado' };
      // password comparison in plain text (demo)
      if (user.password !== password) return { ok:false, error: 'Credenciais inválidas' };
      // set session
      const sess = { token: uid(), user: { id: user.id, name: user.name, email: user.email, role: user.role }, created_at: nowISO() };
      localStorage.setItem(KEY_SESSION, JSON.stringify(sess));
      audit.log(user.id, 'LOGIN', 'users', user.id, { email: user.email });
      return { ok:true, user: sess.user };
    },
    register({ name, email, password }){
      ensureSeed();
      try {
        const newUser = storage.createUser({ name, email, password, role: 'student' });
        audit.log(newUser.id, 'REGISTER', 'users', newUser.id, { email: newUser.email });
        return { ok:true, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } };
      } catch (err) {
        return { ok:false, error: err.message || 'Erro ao registrar' };
      }
    },
    getUser(){ const s = localStorage.getItem(KEY_SESSION); if (!s) return null; try{ return JSON.parse(s).user; }catch(e){ return null; } },
    getSession(){ const s = localStorage.getItem(KEY_SESSION); if (!s) return null; try{ return JSON.parse(s); }catch(e){ return null; } },
    logout(){ localStorage.removeItem(KEY_SESSION); },
    setSessionForUserId(userId){ // helper for admin switching to preview user (not used by default)
      const u = storage.getUser(userId);
      if (!u) return false;
      const sess = { token: uid(), user: { id: u.id, name: u.name, email: u.email, role: u.role }, created_at: nowISO() };
      localStorage.setItem(KEY_SESSION, JSON.stringify(sess)); return true;
    }
  };

  // Auth public API (for pages to call)
  const auth = {
    login: async (email, password) => { return session.login(email,password); },
    register: async ({ name, email, password }) => { return session.register({ name,email,password }); },
  };

  // Bootstrap initial data if missing
  ensureSeed();

  // Expose API
  global.UM = { storage, audit, session, auth };

})(window);

/* small helper for pages */
function showMsg(msg){
  const el = document.getElementById('msg');
  if (!el) return alert(msg);
  el.innerText = msg;
  setTimeout(()=> el.innerText = '', 3000);
}
