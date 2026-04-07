# Manual de Uso — Programa de Gestión de Reservas

---

## Índice

1. [Acceso al Sistema](#1-acceso-al-sistema)
2. [Planning de Hoy](#2-planning-de-hoy)
3. [Reservas Pro](#3-reservas-pro)
4. [Mesas](#4-mesas)
5. [Horarios](#5-horarios)
6. [Valoraciones + VIP](#6-valoraciones--vip)
7. [Configuración](#7-configuración)
8. [Configuración Pro](#8-configuración-pro)
9. [Juego del Chef](#9-juego-del-chef)

---

## 1. Acceso al Sistema

### Inicio de Sesión

1. Acceda a la URL de su restaurante (ej: `https://quieromesa.com/restaurant`).
2. Introduzca su correo electrónico y contraseña.
3. Pulse **Entrar**.

Una vez dentro, dispondrá del menú lateral con todos los módulos activos según su plan de suscripción.

---

## 2. Planning de Hoy

El **Planning de Hoy** es el corazón operativo del sistema. Permite visualizar en tiempo real el estado de todas las mesas para cada turno del día.

### 2.1 Navegación por Fechas

- Use las flechas **‹** y **›** situadas en la barra superior para avanzar o retroceder un día.
- Pulse el botón **Hoy** para volver al día actual.
- La fecha y el día de la semana se muestran de forma visible en todo momento.

### 2.2 Selección de Turno

- En la parte superior aparecen los turnos activos del día (ej: *Comida*, *Cena*).
- Pulse sobre un turno para visualizar su planning. El sistema selecciona automáticamente el turno más cercano a la hora actual.
- Si el restaurante está cerrado ese día, el planning indicará que no hay turnos disponibles.

### 2.3 Horarios del Turno

Debajo del selector de turno encontrará la tabla de horarios con tres columnas:

| Columna | Descripción |
|---------|-------------|
| **Máximos** | Número máximo de comensales permitidos en ese slot. Pulse sobre él para editarlo al instante. |
| **Reservas** | Comensales ya reservados para ese horario. |
| **Libres** | Plazas disponibles (Máximos − Reservas). |

**Modificar el máximo de comensales de un slot:**
1. Pulse sobre el número de *max* del horario deseado.
2. Introduzca el nuevo valor en el campo que aparece.
3. Pulse **Guardar**. El cambio queda registrado en la excepción del día.

### 2.4 Plano de Mesas

El plano muestra todas las mesas de la ubicación seleccionada con códigos de color:

| Color | Estado |
|-------|--------|
| Gris | Libre |
| Verde claro + borde verde | Confirmada |
| Verde oscuro | En Curso |
| Rosa claro + borde rosa | Valorable |
| Lila claro + borde lila | Finalizada |
| Rojo claro + borde rojo | Bloqueada |
| Naranja (texto) | Libre a partir de HH:MM (rotación pendiente) |

**Cambiar de ubicación:** Use los botones de ubicación (ej: *Comedor*, *Terraza*) para filtrar las mesas.

### 2.5 Acciones sobre Mesas

#### Mesa Libre
Al pulsar una mesa libre se abre un menú con las siguientes opciones:

- **Añadir Reserva** — Abre el formulario de reserva rápida para esa mesa, con el turno y la ubicación preseleccionados.
- **Bloquear Mesa** — Bloquea la mesa durante el tiempo que indique (en minutos). También permite crear una *reserva sin cita previa* (walk-in) indicando nombre, teléfono, número de comensales y hora.
- **Dividir Mesa** — Divide temporalmente la mesa en dos mesas A y B con capacidades personalizadas para este turno. La mesa original queda bloqueada y las dos subdivisiones aparecen en el planning.
- **Agrupar con otra Mesa** — Une esta mesa con otra(s) para crear un grupo temporal con mayor capacidad. Las mesas originales se ocultan y solo aparece el grupo.

#### Mesa con Reserva
Al pulsar una mesa con reserva se abre el **panel de detalles** con:

- Número de mesa asignada
- Nombre del cliente
- Teléfono del cliente
- Número de reserva
- Hora de la reserva
- Comensales (adultos + tronas si las hay)
- Carrito de bebé (si aplica)
- Mascotas (si aplica)
- Comentario del cliente

Desde este panel puede:

- **✏️ Cambiar la hora** — Seleccione un nuevo slot del turno actual.
- **👥 Cambiar comensales** — Modifique el número de comensales, tronas, carrito o mascotas.
- **🔀 Editar mesa** — Cambia la mesa asignada a la reserva. Solo se muestran mesas compatibles con el número de comensales. Si la mesa destino tiene ya una reserva, el sistema valida que se pueda intercambiar y que ambas reservas quepan en las mesas intercambiadas.
- **➕ Añadir Reserva (desde HH:MM)** — Visible solo si el tiempo de rotación permite alojar una segunda reserva en esa misma mesa. La hora mínima es automáticamente la hora de la reserva actual + el tiempo de rotación configurado.
- **📲 Notificar cambio al cliente** — Envía un WhatsApp al cliente con los nuevos datos de la reserva.
- **☎️ Llamar al cliente** — Abre la aplicación de teléfono con el número del cliente.
- **💬 WhatsApp** — Abre WhatsApp con el número del cliente.
- **❌ Anular reserva** — Cancela la reserva con confirmación previa.

#### Mesa Bloqueada
Al pulsar una mesa bloqueada se abre el panel de desbloqueo. Pulse **Desbloquear** para volver a poner la mesa disponible.

#### Mesa "Libre a partir de HH:MM"
Estas mesas forman parte de un grupo o reserva activa pero quedarán libres cuando pase el tiempo de rotación. Al pulsarlas, el sistema informa de la hora estimada de disponibilidad y no permite reservar hasta entonces.

### 2.6 Grupos de Mesas

- Cuando se agrupa mesa1 + mesa2, aparece en el planning la mesa de grupo (ej: *Grupo Mesa1+Mesa2*) y las mesas individuales desaparecen.
- La reserva del grupo se muestra **solo en la mesa de grupo**. Las mesas individuales absorbidas quedan ocultas.
- Si el tiempo de rotación lo permite, las mesas individuales pueden reaparecer como "Libre a partir de HH:MM" y aceptar nuevas reservas en los horarios posteriores.
- Para deshacer el grupo, pulse sobre la mesa de grupo libre y seleccione **Deshacer Grupo**.

### 2.7 Refrescar Datos

Pulse el botón **Refrescar** para forzar la recarga de todos los datos en tiempo real. El planning también se actualiza automáticamente cada 10 segundos.

---

## 3. Reservas Pro

El módulo **Reservas Pro** ofrece una vista detallada de todas las reservas con opciones avanzadas de gestión.

### 3.1 Lista de Reservas

Las reservas se muestran filtradas por fecha y ordenadas por hora. Puede buscar por nombre, teléfono o número de reserva.

**Estados de reserva:**

| Estado | Descripción |
|--------|-------------|
| Pendiente | El cliente aún no ha confirmado |
| Confirmada | Confirmada por el cliente |
| En Curso | El cliente está en el local |
| Finalizada | La reserva ha terminado |
| Valorable | Pendiente de valoración del cliente |
| Añadida | Reserva añadida por el restaurante (walk-in) |
| Anulada | Cancelada por cliente o restaurante |

### 3.2 Acciones sobre Reservas

Desde la lista puede:

- **Ver detalles** — Pulse sobre cualquier reserva para ver todos sus datos.
- **Confirmar** — Confirma manualmente una reserva pendiente.
- **Anular** — Cancela la reserva y notifica al cliente por WhatsApp.
- **Marcar como En Curso** — Indica que el cliente ya está en el local.
- **Marcar como Finalizada** — Cierra la reserva.
- **Editar** — Modifica fecha, hora, comensales, mesa o ubicación.
- **Enviar notificación** — Reenvía la confirmación al cliente.

### 3.3 Crear Reserva desde el Panel

1. Pulse **+ Nueva Reserva**.
2. Seleccione la fecha, ubicación, número de comensales y hora.
3. Introduzca el teléfono del cliente. Si ya existe, sus datos se cargan automáticamente.
4. Complete nombre, notas adicionales y requisitos especiales (tronas, carrito, mascotas).
5. Pulse **Crear Reserva**. La reserva queda confirmada automáticamente (sin pasar por estado pendiente) cuando se crea desde el panel.

### 3.4 Lista de Espera

Cuando no hay disponibilidad, los clientes pueden solicitar lista de espera. El sistema:

1. Registra la petición con los datos del cliente y la fecha deseada.
2. Envía al cliente una notificación de confirmación por WhatsApp.
3. Al cancelarse una reserva que libera plazas, el sistema notifica automáticamente al primer cliente en lista de espera para ese turno, por orden de solicitud, para que pueda confirmar su reserva.

---

## 4. Mesas

El módulo **Mesas** permite configurar la distribución permanente del salón.

### 4.1 Crear una Mesa

1. Pulse **+ Añadir Mesa**.
2. Complete:
   - **Nombre** — Identificador visible (ej: *Mesa 1*, *Barra A*).
   - **Ubicación** — Sala a la que pertenece (ej: *Comedor*, *Terraza*).
   - **Capacidad mínima** — Mínimo de comensales para reservar esta mesa.
   - **Capacidad máxima** — Máximo de comensales.
   - **Tronas disponibles** — Número de tronas que admite.
   - **Permite carrito** — Si se puede aparcar un carrito de bebé.
   - **Permite mascotas** — Si se admiten mascotas.
   - **Tiempo de rotación** — Minutos entre reservas consecutivas en la misma mesa.
   - **Prioridad de asignación** — Número del 1 al 10 (mayor número = mayor prioridad al asignar automáticamente).
3. Pulse **Guardar**.

### 4.2 Editar o Eliminar una Mesa

- Pulse sobre la mesa en la lista para editarla.
- Para eliminarla, use el botón **Eliminar** (solo si no tiene reservas activas).

### 4.3 Ordenar Mesas

Las mesas se muestran en el planning según su **orden** (número de posición). Puede arrastrar las mesas para reorganizarlas o editar el campo de orden manualmente.

### 4.4 Grupos Permanentes vs Temporales

- Los **grupos temporales** se crean desde el Planning para un turno concreto y se deshacen automáticamente cuando ese turno termina.
- Los **grupos permanentes** (si el sistema los admite) se configuran aquí en el módulo de Mesas.

---

## 5. Horarios

El módulo **Horarios** define cuándo está abierto el restaurante y qué turnos ofrece cada día.

### 5.1 Horario Semanal

Para cada día de la semana puede configurar:

- **Abierto / Cerrado** — Toggle para activar o desactivar ese día.
- **Turnos del día** — Cada turno tiene:
  - Nombre (ej: *Comida*, *Cena*).
  - Hora de inicio y fin.
  - Máximo de comensales por slot de 30 minutos.
  - Valoración mínima global y local requerida para acceder a ese turno.

### 5.2 Excepciones de Días

Las excepciones permiten modificar el horario de un día concreto (festivos, eventos especiales, etc.):

1. Pulse **+ Añadir Excepción**.
2. Seleccione la fecha.
3. Marque si el restaurante está **abierto** o **cerrado** ese día.
4. Si está abierto, configure los turnos específicos para esa fecha con sus franjas horarias y límites de comensales.
5. Pulse **Guardar**.

Las excepciones tienen prioridad sobre el horario semanal.

### 5.3 Plantillas de Turno

Las plantillas de turno son los identificadores base de cada turno (ej: *shift-comida*, *shift-cena*). Se crean automáticamente al configurar el horario y permiten que el Planning identifique a qué turno pertenece cada reserva y cada mesa temporal.

---

## 6. Valoraciones + VIP

Este módulo gestiona la reputación de los clientes y el acceso preferente a los mejores clientes.

### 6.1 Sistema de Valoraciones

Tras cada reserva completada, el restaurante puede valorar al cliente con una puntuación del 1 al 5. Las valoraciones afectan a:

- **Valoración global** — Media de todas las valoraciones del cliente en toda la plataforma.
- **Valoración local** — Media específica en su restaurante.

### 6.2 Acceso por Valoración

En la configuración de turnos puede establecer **valoraciones mínimas** (global y local) para acceder a determinados turnos. Los clientes que no alcancen ese umbral no verán esas franjas horarias al reservar.

### 6.3 Clientes VIP

Un cliente VIP es aquel con alta valoración y preferencias guardadas. El sistema:

- Muestra un indicador de corona 👑 en las tarjetas de mesa del planning.
- Asigna automáticamente las mesas preferidas del cliente VIP al crear una reserva.
- Le informa al restaurante mediante un aviso en la confirmación.

### 6.4 Clientes Bloqueados

Puede bloquear a un cliente para impedir que haga reservas en su restaurante:

1. Acceda al perfil del cliente desde **Reservas Pro** o **Planning**.
2. Active el toggle **Bloquear cliente**.
3. Añada un motivo del bloqueo (visible solo para el restaurante).

Un cliente bloqueado verá un mensaje de error al intentar reservar.

### 6.5 No-Shows

El sistema registra automáticamente los *no-show* (clientes que no se presentaron sin cancelar). Este historial influye en su visibilidad y puede usarse como criterio para bloquear el acceso.

---

## 7. Configuración

El módulo **Configuración** contiene los datos básicos de su restaurante y la configuración de comunicaciones con los clientes.

### 7.1 Datos del Restaurante

- **Nombre del restaurante**
- **Descripción** — Texto libre que se muestra en la página pública.
- **Tipo de cocina** — Categoría gastronómica.
- **Teléfono** — Visible en los mensajes de confirmación.
- **URL de Google Maps** — Enlace directo para que los clientes lleguen al restaurante.
- **Imagen principal** — Foto de portada del restaurante.
- **Acepta tronas** — Activa la opción de solicitar tronas en el proceso de reserva.
- **Acepta carritos** — Activa la opción de indicar que se viene con carrito de bebé.
- **Acepta mascotas** — Activa la opción de indicar que se viene con mascota.
- **Días de antelación máxima** — Cuántos días en el futuro puede reservar un cliente.
- **Minutos mínimos de antelación** — Cuánto tiempo antes, como mínimo, debe hacerse la reserva.
- **Minutos para modificar/cancelar** — Tiempo mínimo antes de la reserva para que el cliente pueda modificar o cancelar por su cuenta.

### 7.2 Ubicaciones

Define las distintas salas o zonas del restaurante (ej: *Comedor Interior*, *Terraza*, *Barra*). Cada ubicación tiene su propia imagen y sus propias mesas.

---

## 8. Configuración Pro

El módulo **Configuración Pro** gestiona las notificaciones automáticas por WhatsApp.

### 8.1 Conexión de WhatsApp Web

Para enviar notificaciones automáticas, debe vincular el número de WhatsApp del restaurante:

1. Acceda a **Configuración Pro**.
2. Pulse **Ver Código QR**.
3. Abra WhatsApp en su móvil → **Dispositivos vinculados** → **Vincular dispositivo**.
4. Escanee el código QR con la cámara del móvil.
5. Cuando aparezca el indicador verde de *Conectado*, el sistema está listo.

> **Importante:** Si la sesión expira o el código QR caduca, pulse **Reiniciar sesión WhatsApp**. El sistema eliminará la sesión anterior y generará un nuevo código QR para volver a vincular.

### 8.2 Envío Automático de Notificaciones

- **Envío automático** — Active este toggle para que el sistema envíe por WhatsApp:
  - Mensaje de confirmación de nueva reserva al cliente.
  - Recordatorio 24 horas antes de la reserva.
  - Recordatorio X minutos antes de la reserva (configurable).
  - Notificación de modificación o cancelación.
  - Confirmación de registro en lista de espera.
  - Aviso de mesa disponible para clientes en lista de espera.

### 8.3 Configuración de Recordatorios

- **Recordatorio 1** — Active/desactive y configure las horas de antelación (ej: 24h antes).
- **Recordatorio 2** — Configure los minutos de antelación (ej: 60 minutos antes).

### 8.4 Mensaje de Bienvenida e Información Importante

Puede añadir un mensaje de información personalizado que se incluye en todas las comunicaciones (ej: instrucciones de aparcamiento, aviso de política de cancelación, etc.).

---

## 9. Juego del Chef

El **Juego del Chef** es una funcionalidad de gamificación que incentiva a los clientes a seguir reservando.

### 9.1 ¿Cómo funciona?

Los clientes acumulan puntos o "ingredientes" por cada reserva completada. Al llegar a ciertos hitos, desbloquean logros (ej: *Maestro de los Mariscos*, *Fan del Brunch*) que se muestran en su perfil.

### 9.2 Configuración del Juego

Desde el módulo puede:

- **Activar/desactivar** el juego para su restaurante.
- Definir los **retos activos** y sus recompensas.
- Ver el **ranking de clientes** más activos.

### 9.3 Beneficios para el Restaurante

- Aumenta la fidelización: los clientes quieren completar colecciones.
- Genera reseñas y recomendaciones orgánicas.
- Los clientes con logros suelen ser más puntuales y dejan mejores valoraciones.

---

## Soporte

Si tiene dudas o incidencias, contacte con el equipo de soporte a través del botón 🎧 disponible en el panel de restaurante, o escribiendo a **soporte@quieromesa.com**.
