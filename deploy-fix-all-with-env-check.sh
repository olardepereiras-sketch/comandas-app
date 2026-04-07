#!/bin/bash

echo "🚀 DESPLEGANDO CORRECCIONES COMPLETAS CON VERIFICACIÓN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar variables de entorno
check_env_vars() {
    echo "🔍 Verificando variables de entorno..."
    
    local ENV_FILE="/var/www/reservamesa/env"
    
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}❌ Error: Archivo env no encontrado en $ENV_FILE${NC}"
        return 1
    fi
    
    # Variables requeridas
    local REQUIRED_VARS=(
        "DATABASE_URL"
        "NODE_ENV"
        "EXPO_PUBLIC_RORK_API_BASE_URL"
    )
    
    local MISSING_VARS=()
    
    for VAR in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^${VAR}=" "$ENV_FILE"; then
            MISSING_VARS+=("$VAR")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        echo -e "${RED}❌ Variables de entorno faltantes:${NC}"
        for VAR in "${MISSING_VARS[@]}"; do
            echo -e "  - ${RED}$VAR${NC}"
        done
        return 1
    fi
    
    # Verificar que DATABASE_URL tenga el formato correcto
    local DB_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d'=' -f2-)
    if [[ ! "$DB_URL" =~ ^postgresql:// ]]; then
        echo -e "${YELLOW}⚠️  Advertencia: DATABASE_URL no parece ser una URL de PostgreSQL${NC}"
    fi
    
    # Mostrar variables configuradas
    echo -e "${GREEN}✅ Variables requeridas encontradas:${NC}"
    echo "  - DATABASE_URL: $(grep '^DATABASE_URL=' "$ENV_FILE" | cut -d'=' -f2- | cut -c1-50)..."
    echo "  - NODE_ENV: $(grep '^NODE_ENV=' "$ENV_FILE" | cut -d'=' -f2-)"
    echo "  - EXPO_PUBLIC_RORK_API_BASE_URL: $(grep '^EXPO_PUBLIC_RORK_API_BASE_URL=' "$ENV_FILE" | cut -d'=' -f2-)"
    
    echo -e "${GREEN}✅ Variables de entorno verificadas${NC}"
    echo ""
    return 0
}

# Función para sincronizar credenciales de PostgreSQL
sync_postgres_credentials() {
    echo "🔐 Sincronizando credenciales de PostgreSQL..."
    
    local PASSWORD="MiContrasenaSegura666"
    
    # Resetear contraseña de PostgreSQL
    sudo -u postgres psql -c "ALTER USER reservamesa_user WITH PASSWORD '$PASSWORD';" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Contraseña de PostgreSQL actualizada${NC}"
    else
        echo -e "${RED}❌ Error actualizando contraseña de PostgreSQL${NC}"
        return 1
    fi
    
    # Actualizar archivo .env
    local ENV_FILE="/var/www/reservamesa/env"
    local DB_URL="postgresql://reservamesa_user:${PASSWORD}@localhost:5432/reservamesa_db"
    
    if grep -q "^DATABASE_URL=" "$ENV_FILE"; then
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$DB_URL|" "$ENV_FILE"
    else
        echo "DATABASE_URL=$DB_URL" >> "$ENV_FILE"
    fi
    
    echo -e "${GREEN}✅ Archivo env actualizado${NC}"
    echo ""
    return 0
}

# Función para matar procesos del backend
kill_backend_processes() {
    echo "🔄 Deteniendo procesos del backend..."
    
    pkill -f "bun.*backend/server.ts" 2>/dev/null
    pkill -f "node.*backend/server" 2>/dev/null
    sleep 2
    
    echo -e "${GREEN}✅ Procesos del backend detenidos${NC}"
    echo ""
}

# Función para iniciar el servidor
start_backend() {
    echo "🚀 Iniciando servidor backend..."
    
    cd /var/www/reservamesa
    
    # Cargar variables de entorno y iniciar
    nohup bun run backend/server.ts > /var/www/reservamesa/backend.log 2>&1 &
    local PID=$!
    
    if ps -p $PID > /dev/null; then
        echo -e "${GREEN}✅ Servidor iniciado con PID: $PID${NC}"
        
        # Esperar a que el servidor inicie
        echo "⏳ Esperando a que el servidor inicie (10 segundos)..."
        sleep 10
        
        # Verificar que sigue corriendo
        if ps -p $PID > /dev/null; then
            echo -e "${GREEN}✅ Servidor corriendo correctamente${NC}"
            
            # Mostrar últimas líneas del log
            echo ""
            echo "📋 Últimas líneas del log del servidor:"
            tail -n 20 /var/www/reservamesa/backend.log
            echo ""
            
            return 0
        else
            echo -e "${RED}❌ El servidor se detuvo inesperadamente${NC}"
            echo "📋 Log del servidor:"
            tail -n 50 /var/www/reservamesa/backend.log
            return 1
        fi
    else
        echo -e "${RED}❌ Error al iniciar el servidor${NC}"
        return 1
    fi
}

# Función para verificar conectividad de la base de datos
check_database_connection() {
    echo "🔍 Verificando conexión a la base de datos..."
    
    if sudo -u postgres psql -d reservamesa -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Conexión a PostgreSQL exitosa${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}❌ No se pudo conectar a PostgreSQL${NC}"
        return 1
    fi
}

# Función principal
main() {
    echo "📋 Paso 1: Verificando variables de entorno..."
    if ! check_env_vars; then
        echo -e "${RED}❌ Error en verificación de variables de entorno${NC}"
        exit 1
    fi
    
    echo "📋 Paso 2: Sincronizando credenciales de PostgreSQL..."
    if ! sync_postgres_credentials; then
        echo -e "${RED}❌ Error sincronizando credenciales${NC}"
        exit 1
    fi
    
    echo "📋 Paso 3: Verificando conexión a la base de datos..."
    if ! check_database_connection; then
        echo -e "${RED}❌ Error en conexión a la base de datos${NC}"
        exit 1
    fi
    
    echo "📋 Paso 4: Deteniendo procesos del backend..."
    kill_backend_processes
    
    echo "📋 Paso 5: Iniciando servidor backend..."
    if ! start_backend; then
        echo -e "${RED}❌ Error iniciando servidor${NC}"
        exit 1
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}✅ DESPLIEGUE COMPLETADO EXITOSAMENTE${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📊 Estado del sistema:"
    echo "  - Variables de entorno: ✓ Verificadas"
    echo "  - Base de datos: ✓ Conectada"
    echo "  - Servidor backend: ✓ Corriendo"
    echo ""
    echo "🌐 Aplicación disponible en:"
    echo "  - Frontend: https://quieromesa.com"
    echo "  - API: https://quieromesa.com/api"
    echo ""
    echo "📝 Para ver logs en tiempo real:"
    echo "  tail -f /var/www/reservamesa/backend.log"
    echo ""
}

# Ejecutar función principal
main
