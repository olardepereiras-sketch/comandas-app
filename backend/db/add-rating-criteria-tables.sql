-- Tabla para criterios de valoración
CREATE TABLE IF NOT EXISTS rating_criteria (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  default_value INTEGER NOT NULL DEFAULT 4,
  is_special_criteria BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_num INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla para configuración de criterios especiales (No Shows)
CREATE TABLE IF NOT EXISTS no_show_config (
  id TEXT PRIMARY KEY,
  occurrence INTEGER NOT NULL UNIQUE,
  block_days INTEGER NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insertar criterios predeterminados
INSERT INTO rating_criteria (id, name, description, default_value, is_special_criteria, is_active, order_num, created_at, updated_at)
VALUES 
  ('criteria-punctuality', 'Puntualidad', 'Puntualidad del cliente al llegar a la reserva', 4, false, true, 1, NOW(), NOW()),
  ('criteria-behavior', 'Conducta', 'Comportamiento del cliente durante la estancia', 4, false, true, 2, NOW(), NOW()),
  ('criteria-kindness', 'Amabilidad', 'Amabilidad y trato hacia el personal', 4, false, true, 3, NOW(), NOW()),
  ('criteria-education', 'Educación', 'Educación y modales del cliente', 4, false, true, 4, NOW(), NOW()),
  ('criteria-tip', 'Propina', 'Propina dejada por el cliente', 4, false, true, 5, NOW(), NOW()),
  ('criteria-no-show', 'No Shows', 'Cliente no se presentó a la reserva', 0, true, true, 6, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insertar configuración de No Shows predeterminada
INSERT INTO no_show_config (id, occurrence, block_days, message, created_at, updated_at)
VALUES 
  ('no-show-1', 1, 7, 'Este usuario está bloqueado por no presentarse a una reserva. Es la primera vez y tendrá un bloqueo semanal. En futuras ocasiones el bloqueo será muy superior.', NOW(), NOW()),
  ('no-show-2', 2, 30, 'Este usuario está bloqueado por no presentarse a una reserva. Es la segunda vez y tendrá un bloqueo mensual. En futuras ocasiones el bloqueo será muy superior.', NOW(), NOW()),
  ('no-show-3', 3, 365, 'Este usuario está bloqueado por no presentarse a una reserva. Ya ha sufrido varios bloqueos y no podrá utilizar esta plataforma durante un año.', NOW(), NOW())
ON CONFLICT (occurrence) DO NOTHING;
