# Sistema de Mesas Temporales

## Descripción

Sistema para gestionar mesas temporales que solo existen durante el tiempo de una reserva específica. Estas mesas NO aparecen en la gestión de mesas del restaurante ni están disponibles para reservas de clientes.

## Casos de Uso

### 1. División de Mesa

Cuando el restaurante divide una mesa (ejemplo: Mesa 1 de 6 comensales):

- **Mesa 1B**: Mesa temporal para la reserva actual (ej: 2 comensales)
- **Mesa 1A**: Mesa temporal con capacidad restante (ej: 4 comensales)
- **Mesa 1 Original**: Se marca como ocupada durante la reserva

Cuando termina la reserva:
- Se eliminan las mesas 1A y 1B
- La Mesa 1 vuelve a estar disponible con sus características originales

### 2. Agrupación de Mesas

Cuando el restaurante agrupa varias mesas:

- Se crea una mesa temporal agrupada con la suma de capacidades
- Las mesas originales se marcan como ocupadas
- Al terminar la reserva, se elimina la mesa agrupada y las originales quedan disponibles

## Implementación Técnica

### Base de Datos

Tabla `temporary_tables`:
- `id`: ID de la mesa temporal
- `reservation_id`: ID de la reserva asociada (CASCADE DELETE)
- `original_table_id`: ID de la mesa original (null para agrupaciones)
- `type`: 'split_a', 'split_b', o 'grouped'
- Características: capacity, high_chairs, allows_stroller, allows_pets

### Rutas API

1. **createWithSplit**: Crea reserva con división de mesa
2. **listAvailable**: Lista mesas disponibles (excluye temporales por defecto)
3. **listForManagement**: Lista solo mesas permanentes para gestión

### Limpieza Automática

Las mesas temporales se eliminan automáticamente cuando:
- La reserva se cancela (CASCADE DELETE)
- La reserva se completa (trigger de limpieza)

## Despliegue

```bash
./deploy-temporary-tables.sh
```

Este script:
1. Crea la tabla `temporary_tables`
2. Crea índices necesarios
3. Reinicia el servidor

## Restricciones Importantes

✅ Las mesas temporales:
- Solo existen durante la reserva
- NO aparecen en https://quieromesa.com/restaurant/tables
- NO son reservables desde https://quieromesa.com/client/restaurant/
- Solo están disponibles en https://quieromesa.com/client/restaurant2/

❌ Las mesas temporales NO deben:
- Modificar las características de las mesas originales permanentemente
- Aparecer en listados de gestión de mesas
- Estar disponibles para nuevas reservas de clientes
