/**
 * middleware_role.js
 * Checa se usuário tem role requerida.
 * Pode permitir admin override com flag allowAdminOverride.
 */
module.exports = function(requiredRole, allowAdminOverride = false) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
    if (req.user.role === requiredRole) return next();
    if (allowAdminOverride && req.user.role === 'admin') return next();
    return res.status(403).json({ error: 'Acesso negado: role insuficiente' });
  };
};
