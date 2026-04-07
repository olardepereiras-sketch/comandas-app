# 🚨 INSTRUCCIONES CRÍTICAS - RESTAURACIÓN COMPLETA DEL SISTEMA

## ⚠️ SITUACIÓN ACTUAL
Tu servidor VPS perdió PostgreSQL y parte de los archivos. He restaurado el proyecto en `/var/www/reservamesa/` pero necesitas reinstalar PostgreSQL.

## 📋 LO QUE YA ESTÁ HECHO
✅ Proyecto copiado a `/var/www/reservamesa/`
✅ Archivo `.env` configurado correctamente
✅ Frontend compilado (carpeta `dist/`)
✅ Todas las dependencias instaladas

## ❌ LO QUE FALTA
❌ PostgreSQL no está instalado
❌ Base de datos necesita ser recreada o restaurada

---

## 🔧 PASOS PARA COMPLETAR LA RESTAURACIÓN

### PASO 1: Instalar PostgreSQL
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl status postgresql
```

### PASO 2: Crear usuario y base de datos
```bash
sudo -u postgres psql << 'SQL'
CREATE USER reservamesa_user WITH PASSWORD 'MiContrasenaSegura666';
CREATE DATABASE reservamesa_db OWNER reservamesa_user;
GRANT ALL PRIVILEGES ON DATABASE reservamesa_db TO reservamesa_user;
ALTER DATABASE reservamesa_db OWNER TO reservamesa_user;
\c reservamesa_db
GRANT ALL PRIVILEGES ON SCHEMA public TO reservamesa_user;
ALTER SCHEMA public OWNER TO reservamesa_user;
\q
SQL
```

### PASO 3A: SI TIENES BACKUP - Restaurar datos
```bash
# Si tienes un archivo backup.sql o similar
sudo -u postgres psql -d reservamesa_db < /ruta/a/tu/backup.sql
```

### PASO 3B: SI NO TIENES BACKUP - Inicialización limpia
```bash
# El sistema creará las tablas automáticamente
# ADVERTENCIA: Empezarás sin datos históricos
cd /var/www/reservamesa
bun backend/server.ts
# Las tablas se crearán automáticamente
```

### PASO 4: Iniciar el servidor en producción
```bash
cd /var/www/reservamesa
pkill -f "bun.*backend"
pkill -f "chrome"
nohup bun backend/server.ts > backend.log 2>&1 &
```

### PASO 5: Verificar que funciona
```bash
# Ver logs
tail -f /var/www/reservamesa/backend.log

# Probar API
curl http://localhost:3000/api/health

# Verificar sitio web
curl http://localhost:3000
```

### PASO 6: Recargar nginx
```bash
sudo systemctl reload nginx
sudo systemctl status nginx
```

---

## 📁 UBICACIONES IMPORTANTES

- **Proyecto:** `/var/www/reservamesa/`
- **Variables entorno:** `/var/www/reservamesa/.env`
- **Frontend:** `/var/www/reservamesa/dist/`
- **Backend:** `/var/www/reservamesa/backend/`
- **Logs:** `/var/www/reservamesa/backend.log`

---

## 🔐 CREDENCIALES DE BASE DE DATOS

```
Usuario: reservamesa_user
Contraseña: MiContrasenaSegura666
Base de datos: reservamesa_db
Host: localhost
Puerto: 5432
```

---

## ✅ VERIFICACIÓN FINAL

Después de completar todos los pasos, verifica:

1. **PostgreSQL corriendo:**
   ```bash
   sudo systemctl status postgresql
   ```

2. **Servidor backend corriendo:**
   ```bash
   ps aux | grep "bun.*backend"
   ```

3. **API responde:**
   ```bash
   curl http://localhost:3000/api/health
   ```

4. **Sitio accesible:**
   Abre en navegador: `https://quieromesa.com`

---

## 🆘 SI ALGO FALLA

### Error: "password authentication failed"
```bash
sudo -u postgres psql -c "ALTER USER reservamesa_user WITH PASSWORD 'MiContrasenaSegura666';"
```

### Error: "database does not exist"
```bash
sudo -u postgres createdb -O reservamesa_user reservamesa_db
```

### Error: "port 3000 already in use"
```bash
pkill -f "bun.*backend"
lsof -i :3000
kill -9 <PID>
```

### PostgreSQL no inicia
```bash
sudo journalctl -u postgresql -n 50
sudo pg_ctlcluster 14 main start
```

---

## 🔄 CONFIGURAR BACKUPS AUTOMÁTICOS (RECOMENDADO)

Después de restaurar, configura backups diarios:

```bash
sudo mkdir -p /var/backups/reservamesa
sudo chown postgres:postgres /var/backups/reservamesa

# Crear script de backup
cat > /usr/local/bin/backup-reservamesa.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="/var/backups/reservamesa"
DATE=$(date +%Y%m%d_%H%M%S)
sudo -u postgres pg_dump reservamesa_db > "$BACKUP_DIR/backup_$DATE.sql"
find "$BACKUP_DIR" -name "backup_*.sql" -mtime +7 -delete
SCRIPT

sudo chmod +x /usr/local/bin/backup-reservamesa.sh

# Agregar a crontab (backup diario a las 3 AM)
(sudo crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/backup-reservamesa.sh") | sudo crontab -
```

---

## 📞 RESUMEN EJECUTIVO

1. ✅ Proyecto restaurado en `/var/www/reservamesa/`
2. ⏳ **ACCIÓN REQUERIDA:** Instalar PostgreSQL (PASO 1 y 2)
3. ⏳ **ACCIÓN REQUERIDA:** Restaurar datos si tienes backup (PASO 3A) o iniciar limpio (PASO 3B)
4. ⏳ **ACCIÓN REQUERIDA:** Iniciar servidor (PASO 4)
5. ⏳ **ACCIÓN REQUERIDA:** Verificar (PASO 5 y 6)

**Tiempo estimado:** 10-15 minutos

---

*Creado: 2026-02-08*
*Ubicación del proyecto: /var/www/reservamesa/*
