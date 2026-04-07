# Sistema de Mesas Temporales Corregido

## 🎯 Problema Resuelto

**ANTES**: El sistema creaba mesas temporales en la tabla `tables` y modificaba las propiedades de las mesas originales, afectando a todas las reservas.

**AHORA**: Las mesas temporales se guardan en una tabla separada `temporary_tables` y las mesas originales solo se bloquean sin modificar sus propiedades.

## 🏗️ Arquitectura Nueva

### 1. Tabla `temporary_tables`
Almacena mesas temporales creadas al dividir o agrupar:
- **Mesa 1A**: Mesa temporal disponible para nuevas reservas (type='split_a')
- **Mesa 1B**: Mesa temporal asignada a la reserva actual (type='split_b')
- **Grupos**: Grupos temporales de mesas (type='grouped')

### 2. Tabla `table_blocks_for_split`
Bloquea mesas originales sin modificar sus propiedades:
- Vincula `table_id` con `reservation_id`
- Se elimina automáticamente al cancelar/completar la reserva

## 📍 Ubicaciones de Mesas

### `/restaurant/tables` (Gestión de Mesas Reales)
- ✅ Solo muestra mesas reales del restaurante
- ❌ NO muestra mesas temporales
- Consulta modificada: `WHERE (is_temporary IS NULL OR is_temporary = false)`

### `/client/restaurant2/` (Reservas con División)
- ✅ Puede crear mesas temporales al dividir
- ✅ Puede listar mesas incluyendo temporales disponibles
- ✅ Mesa 1A disponible para reservas de clientes
- ❌ Mesa 1 bloqueada durante la reserva

### `/client/restaurant/` (Reservas Normales)
- ✅ Solo mesas reales disponibles
- ✅ Mesa 1A disponible si existe para esa fecha
- ❌ Mesa 1 bloqueada si está dividida

## 🔄 Flujo de División de Mesa

### Paso 1: Usuario divide Mesa 1 (6 comensales) para reserva de 2 personas

```sql
-- Se crea Mesa 1B (2 comensales) - Para la reserva actual
INSERT INTO temporary_tables (
  id: 'table-xxx-1B-res-yyy',
  reservation_id: 'res-yyy',
  original_table_id: 'table-xxx-1',
  name: 'Mesa 1B',
  capacity: 2,
  table_type: 'split_b'
)

-- Se crea Mesa 1A (4 comensales) - Disponible para otras reservas
INSERT INTO temporary_tables (
  id: 'table-xxx-1A-res-yyy',
  reservation_id: 'res-yyy',
  original_table_id: 'table-xxx-1',
  name: 'Mesa 1A',
  capacity: 4,
  table_type: 'split_a'
)

-- Se bloquea Mesa 1 original (NO se modifica)
INSERT INTO table_blocks_for_split (
  table_id: 'table-xxx-1',
  reservation_id: 'res-yyy'
)

-- La reserva se crea con Mesa 1B
INSERT INTO reservations (
  id: 'res-yyy',
  table_ids: ['table-xxx-1B-res-yyy']
)
```

### Paso 2: Cliente desde /client/restaurant/ busca mesas para 4 personas

```sql
-- Lista mesas disponibles incluyendo temporales tipo 'split_a'
SELECT * FROM tables 
WHERE NOT blocked AND capacity >= 4
UNION
SELECT * FROM temporary_tables 
WHERE table_type = 'split_a' AND capacity >= 4
-- Resultado: Mesa 1A (4 comensales) está disponible ✅
```

### Paso 3: Reserva completada o cancelada

```sql
-- Se eliminan mesas temporales automáticamente (CASCADE)
DELETE FROM temporary_tables WHERE reservation_id = 'res-yyy'
-- Resultado: Mesa 1A y Mesa 1B eliminadas ✅

-- Se elimina bloqueo
DELETE FROM table_blocks_for_split WHERE reservation_id = 'res-yyy'
-- Resultado: Mesa 1 vuelve a estar disponible ✅
```

## 🚀 Nuevos Endpoints tRPC

### `reservations.createWithTableSplit`
Crea reserva dividiendo una mesa:
```typescript
const result = await trpc.reservations.createWithTableSplit.mutate({
  restaurantId: 'rest-xxx',
  clientPhone: '+34666088708',
  clientName: 'Cliente',
  date: '2026-02-20',
  time: { hour: 21, minute: 0 },
  guests: 2,
  locationId: 'loc-xxx',
  needsHighChair: false,
  needsStroller: false,
  hasPets: false,
  splitConfig: {
    originalTableId: 'table-xxx-1',
    originalTableName: 'Mesa 1',
    splitTableBCapacity: 2,
    splitTableBHighChairs: 0,
    splitTableBAllowsStroller: false,
    splitTableBAllowsPets: false,
    splitTableACapacity: 4,
    splitTableAHighChairs: 1,
    splitTableAAllowsStroller: true,
    splitTableAAllowsPets: false,
  }
});
// Retorna: { success: true, reservationId, temporaryTables, confirmationToken }
```

### `reservations.cleanupTemporaryTables`
Limpia mesas temporales de una reserva:
```typescript
await trpc.reservations.cleanupTemporaryTables.mutate({
  reservationId: 'res-xxx'
});
// Se ejecuta automáticamente al cancelar/completar
```

### `tables.listWithTemporary`
Lista mesas incluyendo temporales disponibles:
```typescript
const tables = await trpc.tables.listWithTemporary.query({
  restaurantId: 'rest-xxx',
  locationId: 'loc-xxx',
  date: '2026-02-20',
  time: { hour: 21, minute: 0 }
});
// Retorna mesas reales + mesas temporales tipo 'split_a' disponibles
```

## ✅ Ventajas del Nuevo Sistema

1. **Separación clara**: Mesas temporales en tabla separada
2. **No contamina**: `/restaurant/tables` solo muestra mesas reales
3. **Propiedades intactas**: Mesa original nunca se modifica
4. **Múltiples divisiones**: Puede haber varias Mesa 1B para diferentes horarios
5. **Limpieza automática**: ON DELETE CASCADE elimina temporales
6. **Mesa 1A disponible**: Clientes pueden reservar la parte no ocupada
7. **Histórico limpio**: Reservas canceladas no dejan mesas huérfanas

## 📝 Para Aplicar en el Servidor

```bash
chmod +x deploy-fix-temporary-tables-final.sh
./deploy-fix-temporary-tables-final.sh
```

## 🔍 Verificar Corrección

```sql
-- Ver mesas reales (NO debe incluir temporales)
SELECT * FROM tables WHERE restaurant_id = 'tu-restaurant-id';

-- Ver mesas temporales activas
SELECT tt.*, r.status 
FROM temporary_tables tt 
JOIN reservations r ON tt.reservation_id = r.id
WHERE r.status NOT IN ('cancelled', 'completed');

-- Ver bloqueos activos
SELECT * FROM table_blocks_for_split;
```
