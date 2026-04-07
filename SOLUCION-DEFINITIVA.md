# SOLUCIÓN DEFINITIVA - Módulos y Botones Eliminar

## Ejecuta esto en tu servidor:

```bash
cd /var/www/reservamesa

# 1. Arreglar tabla modules
DATABASE_URL="postgresql://quieromesa_user:Navaja2017@localhost:5432/quieromesa_db" bun backend/db/fix-modules-table-urgente.ts

# 2. Verificar que funcionó
PGPASSWORD='Navaja2017' psql -h localhost -U quieromesa_user -d quieromesa_db -c "SELECT COUNT(*) FROM modules;"
PGPASSWORD='Navaja2017' psql -h localhost -U quieromesa_user -d quieromesa_db -c "SELECT id, name FROM modules ORDER BY display_order;"

# 3. Reiniciar servidor
pkill -f "bun.*backend/server.ts"
sleep 2
nohup bun backend/server.ts > /tmp/backend.log 2>&1 &

# 4. Verificar que está corriendo
sleep 3
pgrep -f "bun.*backend/server.ts"
```

## ¿Qué hace esto?

1. **Arregla la tabla modules**: Añade las columnas faltantes (icon, color, route, etc.) e inserta los 7 módulos correctos
2. **Verifica los datos**: Muestra cuántos módulos hay
3. **Reinicia el backend**: Para que tome los cambios
4. **Verifica que funciona**: Comprueba que el proceso está corriendo

## Después de ejecutar:

- Ve a https://quieromesa.com/admin/modules
- Deberías ver los 7 módulos en los planes de suscripción
- Los botones de eliminar funcionarán correctamente

## Si algo falla:

```bash
# Ver logs del backend
tail -f /tmp/backend.log

# Ver si el servidor está corriendo
ps aux | grep "bun.*backend"
```
