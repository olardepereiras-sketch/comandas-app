# Instrucciones para Agrupar y Dividir Mesas

## Cambios Implementados

Se han implementado dos nuevas funcionalidades para el panel de restaurante:

### 1. Agrupar Mesas
Permite combinar varias mesas disponibles para crear un grupo temporal con mayor capacidad.

### 2. Dividir Mesas
Permite dividir una mesa grande en dos mesas temporales más pequeñas.

## Instalación en el VPS

### Paso 1: Subir archivos al servidor
Sube los siguientes archivos usando WinSCP:
- `backend/trpc/routes/tables/create-temporary-group/route.ts`
- `backend/trpc/routes/tables/create-split-table/route.ts`
- `backend/trpc/app-router.ts`
- `app/client/restaurant2/[slug].tsx`
- `backend/migrations/add-table-grouping-splitting.sql`
- `run-table-grouping-migration.sh`

### Paso 2: Ejecutar la migración
Conecta al servidor por SSH y ejecuta:

```bash
cd /var/www/reservamesa
chmod +x run-table-grouping-migration.sh
./run-table-grouping-migration.sh
```

O manualmente:
```bash
psql -U postgres -d reservamesa -f backend/migrations/add-table-grouping-splitting.sql
pm2 restart reservamesa-backend
```

### Paso 3: Verificar que funciona
1. Accede a https://quieromesa.com/client/restaurant2/[slug]
2. Completa los pasos hasta llegar a "Número de Comensales"
3. Pulsa el botón verde "+" (ahora del mismo tamaño que los botones de comensales)
4. Verifica que aparecen las opciones "Agrupar Mesas" y "Dividir Mesa"

## Cómo Usar las Funcionalidades

### Agrupar Mesas

1. En el paso "Número de Comensales", pulsa el botón verde "+"
2. Selecciona "Agrupar Mesas"
3. Selecciona las mesas disponibles que deseas combinar
4. Ingresa el número de comensales para el grupo
5. Pulsa "Confirmar Agrupación"
6. Continúa con el proceso de reserva normal

**Ejemplo:** Si necesitas una reserva para 10 comensales y solo tienes mesas de 4 y 6 personas:
- Selecciona mesa de 4 + mesa de 6 = grupo de 10 personas
- Las dos mesas se asignarán automáticamente a esta reserva

### Dividir Mesa

1. En el paso "Número de Comensales", pulsa el botón verde "+"
2. Selecciona "Dividir Mesa"
3. Elige la mesa grande que deseas dividir (mínimo 4 comensales)
4. Ingresa el número de comensales para esta reserva
5. Configura la Mesa B (temporal):
   - Capacidad
   - Número de tronas disponibles
   - Si permite carrito de bebé
   - Si permite mascotas
6. Configura la Mesa A modificada (mientras la Mesa B esté ocupada):
   - Nueva capacidad reducida
   - Número de tronas disponibles
   - Si permite carrito de bebé
   - Si permite mascotas
7. Pulsa "Confirmar División"
8. Continúa con el proceso de reserva normal

**Ejemplo:** Mesa 1 tiene capacidad de 6 personas, pero solo queda libre para una reserva de 2:
- Se crea Mesa 1B con capacidad de 2 (para esta reserva)
- Se modifica Mesa 1 temporalmente con capacidad de 4
- Una vez que la reserva de Mesa 1B termine, Mesa 1 vuelve a su capacidad original de 6

## Comportamiento del Sistema

### Grupos Temporales
- Se crean solo para la reserva específica
- Las mesas se asignan automáticamente a la reserva
- Una vez completada la reserva, el grupo se disuelve

### Mesas Divididas
- La mesa temporal (ej: Mesa 1B) existe solo durante la reserva
- La mesa original (ej: Mesa 1) tiene características modificadas temporalmente
- Al finalizar la reserva de la mesa temporal, la mesa original recupera sus características originales

## Solución de Problemas

### El botón "+" no aparece
- Verifica que has seleccionado fecha, ubicación y hora
- Comprueba que estás usando el panel de restaurante (/client/restaurant2/)

### No aparecen mesas para agrupar/dividir
- Verifica que hay mesas disponibles en la fecha y hora seleccionadas
- Para dividir, la mesa debe tener capacidad mínima de 4 comensales

### Error al confirmar agrupación/división
- Verifica que la migración SQL se ejecutó correctamente
- Revisa los logs del servidor: `pm2 logs reservamesa-backend`
- Verifica la conexión a la base de datos

### Los cambios no se reflejan
- Asegúrate de subir todos los archivos mencionados
- Reinicia el servidor backend: `pm2 restart reservamesa-backend`
- Limpia la caché del navegador o prueba en modo incógnito

## Notas Importantes

1. **Base de Datos:** La migración SQL añade las columnas y tablas necesarias sin afectar datos existentes
2. **Compatibilidad:** Las funcionalidades son compatibles con el sistema actual de reservas
3. **Automatización:** Las mesas temporales y grupos se limpian automáticamente al finalizar las reservas
4. **Restauración:** Las mesas divididas recuperan automáticamente su configuración original

## Verificación Post-Instalación

Ejecuta estos comandos para verificar que todo funciona:

```bash
# Verificar que las columnas se agregaron
psql -U postgres -d reservamesa -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'tables' AND column_name IN ('is_temporary', 'original_table_id', 'linked_reservation_id');"

# Verificar que la tabla se creó
psql -U postgres -d reservamesa -c "SELECT table_name FROM information_schema.tables WHERE table_name = 'table_modifications';"

# Ver logs del servidor
pm2 logs reservamesa-backend --lines 50
```

Si todo está correcto, deberías ver las columnas y la tabla listadas.
