# Instrucciones de Despliegue - Sistema de Mesas Temporales

## Pasos para Desplegar en el VPS

1. **Subir archivos al servidor usando WinSCP**

Archivos a subir:
```
backend/db/add-temporary-tables.ts
backend/db/cleanup-temporary-tables.ts
backend/trpc/routes/reservations/create-with-split/route.ts
backend/trpc/routes/tables/list-available/route.ts
backend/trpc/routes/tables/list-for-management/route.ts
deploy-temporary-tables.sh
SISTEMA-MESAS-TEMPORALES.md
```

2. **Conectar al VPS por SSH**
```bash
ssh root@www
cd /var/www/reservamesa
```

3. **Ejecutar el script de despliegue**
```bash
chmod +x deploy-temporary-tables.sh
./deploy-temporary-tables.sh
```

4. **Verificar que la tabla se creó correctamente**
```bash
psql -U postgres -d reservamesa -c "\d temporary_tables"
```

## Lo que hace el sistema

### Para el restaurante en restaurant2/

✅ **Dividir Mesa**:
- Selecciona una mesa libre de 4+ comensales
- Define capacidad de Mesa XB (para la reserva)
- Define características de Mesa XA (capacidad restante)
- La mesa original queda ocupada
- Al terminar la reserva, XA y XB desaparecen

✅ **Agrupar Mesas**:
- Selecciona varias mesas disponibles
- Crea mesa temporal agrupada
- Las originales quedan ocupadas
- Al terminar, la agrupación desaparece

### Para el cliente en restaurant/

❌ Las mesas temporales **NO aparecen**
❌ **NO son reservables** por clientes
✅ Solo ven mesas permanentes disponibles

### Para la gestión en restaurant/tables

❌ Las mesas temporales **NO aparecen**
✅ Solo se muestran mesas permanentes
✅ Las características originales nunca cambian

## Verificación

Para verificar que el sistema funciona:

1. Ir a https://quieromesa.com/client/restaurant2/
2. Crear reserva con división de mesa
3. Verificar que se creó la reserva
4. Ir a https://quieromesa.com/restaurant/tables
5. Verificar que NO aparecen las mesas temporales
6. Cancelar la reserva
7. Verificar que las mesas temporales desaparecieron

## Troubleshooting

Si hay error "no unique or exclusion constraint":
```bash
psql -U postgres -d reservamesa -c "
  ALTER TABLE temporary_tables 
  ADD CONSTRAINT temporary_tables_pkey PRIMARY KEY (id);
"
```

Si las mesas temporales no se eliminan:
```bash
psql -U postgres -d reservamesa -c "
  DELETE FROM temporary_tables 
  WHERE reservation_id IN (
    SELECT id FROM reservations 
    WHERE status IN ('cancelled', 'completed')
  );
"
```
