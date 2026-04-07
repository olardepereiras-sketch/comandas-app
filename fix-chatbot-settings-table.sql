-- =============================================
-- MIGRACIÓN: Tabla whatsapp_chatbot_settings
-- Ejecutar en: reservamesa_db
-- Propósito: Tabla de configuración del chatbot IA
-- =============================================

CREATE TABLE IF NOT EXISTS whatsapp_chatbot_settings (
  id VARCHAR(10) PRIMARY KEY DEFAULT 'main',
  enabled BOOLEAN DEFAULT TRUE,
  verify_token VARCHAR(255) DEFAULT 'quieromesa_webhook_token',
  welcome_message_customer TEXT DEFAULT '¡Hola! Soy el asistente de QuieroMesa 😊 Puedo ayudarte a hacer una reserva o resolver tus dudas. ¿En qué te puedo ayudar?',
  welcome_message_owner TEXT DEFAULT '¡Hola! Soy el asistente de QuieroMesa para restaurantes 🍴 ¿Te interesa conocer nuestros servicios o tienes alguna consulta?',
  auto_derive_after_messages INTEGER DEFAULT 8,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO whatsapp_chatbot_settings (id)
VALUES ('main')
ON CONFLICT (id) DO NOTHING;

SELECT 'whatsapp_chatbot_settings creada/verificada correctamente' AS resultado;
SELECT * FROM whatsapp_chatbot_settings;
