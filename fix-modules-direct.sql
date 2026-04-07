-- Script para arreglar tabla modules directamente

-- Crear tabla modules si no existe
CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Info',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  route TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insertar módulos predeterminados
INSERT INTO modules (id, name, description, icon, color, route, display_order)
VALUES 
  ('info-config', 'Información Básica', 'Configuración de información del restaurante', 'Info', '#3b82f6', '/restaurant/config', 0),
  ('config-pro', 'Configuración Avanzada', 'Opciones avanzadas y notificaciones', 'Settings', '#8b5cf6', '/restaurant/config-pro', 1),
  ('reservations', 'Gestión de Reservas', 'Administra las reservas del restaurante', 'Calendar', '#10b981', '/restaurant/reservations', 2),
  ('reservations-pro', 'Reservas Profesional', 'Vista avanzada de reservas con calendario', 'CalendarDays', '#f59e0b', '/restaurant/reservations-pro', 3),
  ('table-management', 'Gestión de Mesas', 'Administra mesas, ubicaciones y grupos', 'LayoutGrid', '#ef4444', '/restaurant/tables', 4),
  ('schedules', 'Horarios y Turnos', 'Configura horarios y plantillas de turnos', 'Clock', '#6366f1', '/restaurant/schedules', 5),
  ('client-ratings', 'Valoraciones de Clientes', 'Sistema de valoración y seguimiento de clientes', 'Heart', '#ec4899', '/restaurant/ratings', 6)
ON CONFLICT (id) DO NOTHING;

-- Verificar
SELECT id, name, display_order FROM modules ORDER BY display_order;
