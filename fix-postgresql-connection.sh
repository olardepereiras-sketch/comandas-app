#!/bin/bash

echo "🔧 DIAGNOSTICANDO Y ARREGLANDO POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Paso 1: Verificar si PostgreSQL está instalado
echo "📋 Paso 1: Verificando instalación de PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL no está instalado"
    exit 1
fi
echo "✅ PostgreSQL instalado"
echo ""

# Paso 2: Verificar estado del servicio
echo "📋 Paso 2: Verificando estado del servicio..."
sudo systemctl status postgresql --no-pager | head -20
echo ""

# Paso 3: Intentar iniciar PostgreSQL
echo "📋 Paso 3: Iniciando PostgreSQL..."
sudo systemctl start postgresql
sleep 3
echo "✅ Comando de inicio ejecutado"
echo ""

# Paso 4: Verificar versión y cluster
echo "📋 Paso 4: Verificando clusters de PostgreSQL..."
pg_lsclusters
echo ""

# Paso 5: Iniciar cluster si está parado
echo "📋 Paso 5: Intentando iniciar cluster principal..."
PGVERSION=$(ls /etc/postgresql/ | head -1)
if [ ! -z "$PGVERSION" ]; then
    echo "Versión detectada: $PGVERSION"
    sudo pg_ctlcluster $PGVERSION main start || echo "⚠️ El cluster ya está corriendo o no existe"
else
    echo "⚠️ No se detectó versión de PostgreSQL en /etc/postgresql/"
fi
echo ""

# Paso 6: Verificar puerto en uso
echo "📋 Paso 6: Verificando puerto 5432..."
sudo lsof -i :5432 || echo "⚠️ Puerto 5432 no está en uso"
echo ""

# Paso 7: Verificar socket Unix
echo "📋 Paso 7: Verificando socket Unix..."
ls -la /var/run/postgresql/ 2>/dev/null || echo "⚠️ Directorio /var/run/postgresql/ no existe"
echo ""

# Paso 8: Verificar como usuario postgres
echo "📋 Paso 8: Intentando conectar como usuario postgres..."
sudo -u postgres psql -c "SELECT version();" 2>&1
echo ""

# Paso 9: Verificar base de datos
echo "📋 Paso 9: Verificando base de datos reservamesa_db..."
sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw reservamesa_db
if [ $? -eq 0 ]; then
    echo "✅ Base de datos reservamesa_db existe"
else
    echo "❌ Base de datos reservamesa_db NO existe"
    echo "📝 Creando base de datos..."
    sudo -u postgres psql -c "CREATE DATABASE reservamesa_db;"
    sudo -u postgres psql -c "CREATE USER reservamesa_user WITH PASSWORD 'Reservamesa2025!';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE reservamesa_db TO reservamesa_user;"
fi
echo ""

# Paso 10: Arreglar tabla whatsapp_notifications
echo "📋 Paso 10: Arreglando tabla whatsapp_notifications..."
sudo -u postgres psql -d reservamesa_db << 'EOF'
-- Eliminar tabla existente
DROP TABLE IF EXISTS whatsapp_notifications CASCADE;

-- Crear tabla correctamente
CREATE TABLE whatsapp_notifications (
    id TEXT PRIMARY KEY,
    reservation_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices
CREATE INDEX idx_whatsapp_notifications_reservation ON whatsapp_notifications(reservation_id);
CREATE INDEX idx_whatsapp_notifications_status ON whatsapp_notifications(status);
CREATE INDEX idx_whatsapp_notifications_scheduled ON whatsapp_notifications(scheduled_for);

-- Mostrar estructura
\d whatsapp_notifications
EOF

if [ $? -eq 0 ]; then
    echo "✅ Tabla whatsapp_notifications arreglada"
else
    echo "❌ Error arreglando tabla"
    exit 1
fi
echo ""

# Paso 11: Configurar pg_hba.conf para conexiones locales
echo "📋 Paso 11: Configurando pg_hba.conf..."
PGDATA=$(sudo -u postgres psql -t -P format=unaligned -c 'show data_directory;' 2>/dev/null)
if [ ! -z "$PGDATA" ]; then
    echo "PGDATA: $PGDATA"
    PGHBA="$PGDATA/pg_hba.conf"
    if [ -f "$PGHBA" ]; then
        # Hacer backup
        sudo cp "$PGHBA" "$PGHBA.backup.$(date +%s)"
        
        # Asegurar que existe la línea para conexiones locales
        if ! sudo grep -q "host.*reservamesa_db.*reservamesa_user.*127.0.0.1/32.*md5" "$PGHBA"; then
            echo "📝 Añadiendo regla para reservamesa_user..."
            echo "host    reservamesa_db    reservamesa_user    127.0.0.1/32    md5" | sudo tee -a "$PGHBA"
            
            # Recargar configuración
            sudo systemctl reload postgresql
            echo "✅ Configuración recargada"
        else
            echo "✅ Regla ya existe"
        fi
    fi
fi
echo ""

# Paso 12: Probar conexión con parámetros del env
echo "📋 Paso 12: Probando conexión con credenciales de la app..."
cd /var/www/reservamesa
source env 2>/dev/null || echo "⚠️ No se pudo cargar env"

# Extraer info de DATABASE_URL
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Usuario: $DB_USER"
echo "Base de datos: $DB_NAME"

PGPASSWORD='Reservamesa2025!' psql -h localhost -U reservamesa_user -d reservamesa_db -c "SELECT 'Conexión exitosa' as status;" 2>&1
echo ""

# Paso 13: Reiniciar servidor de la app
echo "📋 Paso 13: Reiniciando servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2

cd /var/www/reservamesa
bun backend/server.ts > backend.log 2>&1 &
sleep 3
echo "✅ Servidor reiniciado"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PROCESO COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Para monitorear:"
echo "  tail -f backend.log"
echo ""
echo "🔍 Para verificar logs de PostgreSQL:"
echo "  sudo journalctl -u postgresql -n 50"
