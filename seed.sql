-- seed.sql
-- Cria admin padrão e 2 cursos com módulos
INSERT INTO users (id, name, email, password, role, blocked, created_at)
SELECT gen_random_uuid(), 'Admin Teste', 'admin@local', crypt('admin123', gen_salt('bf')), 'admin', false, now()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='admin@local');

-- Cursos
INSERT INTO courses (id, title, description, image, created_at)
SELECT gen_random_uuid(), 'Curso de Exemplo 1', 'Descrição do curso 1', '', now()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title='Curso de Exemplo 1');

INSERT INTO courses (id, title, description, image, created_at)
SELECT gen_random_uuid(), 'Curso de Exemplo 2', 'Descrição do curso 2', '', now()
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title='Curso de Exemplo 2');

-- Módulos (associa aos cursos existentes)
WITH c AS (SELECT id FROM courses LIMIT 2)
INSERT INTO modules (id, course_id, title, content, position, created_at)
SELECT gen_random_uuid(), c.id, 'Módulo 1', 'Conteúdo do módulo 1', 1, now()
FROM c WHERE NOT EXISTS (SELECT 1 FROM modules WHERE title='Módulo 1' AND course_id=c.id);

