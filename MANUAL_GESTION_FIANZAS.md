# Manual de Uso — Programa de Gestión de Fianzas

---

## Índice

1. [¿Qué son las Fianzas?](#1-qué-son-las-fianzas)
2. [Activación del Módulo](#2-activación-del-módulo)
3. [Configuración de Fianzas](#3-configuración-de-fianzas)
4. [Flujo del Cliente](#4-flujo-del-cliente)
5. [Panel de Gestión de Fianzas](#5-panel-de-gestión-de-fianzas)
6. [Devolución y Retención de Fianzas](#6-devolución-y-retención-de-fianzas)
7. [Informes y Estadísticas](#7-informes-y-estadísticas)
8. [Preguntas Frecuentes](#8-preguntas-frecuentes)

---

## 1. ¿Qué son las Fianzas?

Las **fianzas** (también llamadas depósitos o señales) son un importe económico que el cliente abona en el momento de realizar la reserva como garantía. Este importe:

- **Se devuelve** automáticamente si el cliente acude a su reserva o la cancela con suficiente antelación.
- **Se retiene** (total o parcialmente) si el cliente no se presenta (*no-show*) o cancela fuera del plazo establecido.

El módulo de Fianzas está integrado con **Stripe** para el cobro y devolución seguros mediante tarjeta de crédito/débito.

---

## 2. Activación del Módulo

El módulo de Fianzas debe estar incluido en su plan de suscripción. Para verificarlo:

1. Acceda al panel del restaurante.
2. Compruebe que el módulo **Fianzas** aparece activo en su menú lateral.

Si no lo ve, contacte con soporte para ampliarlo a su plan actual.

### Requisitos previos

- Cuenta de **Stripe** activa y verificada.
- Claves API de Stripe configuradas en el entorno del servidor (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`).
- Webhook de Stripe apuntando a la URL del sistema para recibir confirmaciones de pago.

---

## 3. Configuración de Fianzas

Acceda a **Fianzas → Configuración** para establecer las reglas de cobro.

### 3.1 Importe de la Fianza

Puede configurar la fianza de dos formas:

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| **Importe fijo** | El mismo importe para todas las reservas | 10 € por reserva |
| **Por comensal** | El importe se multiplica por el número de comensales | 5 € × 4 pax = 20 € |

### 3.2 Condiciones de Aplicación

- **Mínimo de comensales** — La fianza solo se exige si la reserva supera X comensales (ej: a partir de 6 personas).
- **Turnos con fianza** — Puede activar la fianza solo para determinados turnos (ej: cenas del fin de semana).
- **Fechas especiales** — Active fianza automáticamente en fechas señaladas configuradas como excepciones.

### 3.3 Política de Cancelación con Fianza

Define en cuántas horas antes de la reserva se aplica la retención:

- **Plazo de cancelación gratuita** — Si el cliente cancela con más de X horas de antelación, la fianza se devuelve íntegramente.
- **Cancelación tardía** — Si cancela dentro del plazo, se retiene el porcentaje configurado (ej: 50% o 100%).
- **No-show** — Si el cliente no aparece, se retiene el 100% automáticamente.

---

## 4. Flujo del Cliente

### 4.1 Proceso de Reserva con Fianza

1. El cliente accede a la página de reserva del restaurante.
2. Selecciona fecha, hora, comensales y ubicación.
3. Si se cumplen las condiciones de fianza, el sistema muestra un aviso:
   > *"Esta reserva requiere una señal de X € para garantizar su plaza."*
4. El cliente introduce los datos de su tarjeta a través de la pasarela segura de Stripe.
5. Se realiza una **pre-autorización** del importe (el cargo no es definitivo aún).
6. El cliente recibe la confirmación de reserva con el detalle de la fianza.

### 4.2 Confirmación de la Reserva

Una vez el cliente paga la fianza, la reserva cambia automáticamente a estado **Confirmada** (no necesita confirmación adicional por parte del cliente).

El cliente recibe una notificación por WhatsApp con:

- Los datos de la reserva.
- El importe de la fianza abonada.
- La política de cancelación (fecha límite para cancelar sin coste).
- El enlace a su token de reserva para gestionar modificaciones o cancelación.

### 4.3 Cancelación por el Cliente

Desde su enlace de token, el cliente puede cancelar la reserva:

- **Dentro del plazo gratuito** → La fianza se devuelve automáticamente en 5–10 días hábiles.
- **Fuera del plazo** → Se aplica la política de retención configurada. El cliente es informado antes de confirmar la cancelación.

---

## 5. Panel de Gestión de Fianzas

Acceda a **Fianzas → Gestión** para ver el estado de todos los depósitos.

### 5.1 Lista de Fianzas

La tabla muestra todas las fianzas con:

| Campo | Descripción |
|-------|-------------|
| Cliente | Nombre y teléfono |
| Fecha reserva | Fecha y hora de la reserva |
| Importe | Cantidad cobrada como fianza |
| Estado | Pendiente / Cobrada / Devuelta / Retenida |
| Fecha pago | Cuándo se realizó el cargo |
| Acciones | Devolver / Retener / Ver detalles |

### 5.2 Estados de una Fianza

| Estado | Descripción |
|--------|-------------|
| **Pendiente** | El pago está pre-autorizado pero no capturado |
| **Cobrada** | El importe ha sido capturado en la tarjeta del cliente |
| **Devuelta** | Se ha procesado el reembolso al cliente |
| **Retenida** | El importe se ha quedado en el restaurante (no-show o cancelación tardía) |
| **Fallida** | El pago no pudo completarse (tarjeta rechazada, etc.) |

---

## 6. Devolución y Retención de Fianzas

### 6.1 Devolución Manual

Si desea devolver una fianza manualmente (ej: por causa mayor):

1. Localice la fianza en el panel.
2. Pulse **Devolver fianza**.
3. Confirme la acción.
4. Stripe procesa el reembolso. El cliente lo recibirá en 5–10 días hábiles según su banco.

### 6.2 Retención Manual

Si el cliente no se presenta y el sistema no lo ha detectado automáticamente:

1. Localice la fianza en el panel.
2. Pulse **Retener fianza**.
3. Seleccione el motivo (no-show, cancelación tardía, etc.).
4. Confirme. El importe queda capturado definitivamente en favor del restaurante.

### 6.3 Retención Automática por No-Show

Si el sistema tiene activo el **registro automático de no-shows**:

1. Al marcar una reserva como *No presentado* desde el Planning o Reservas Pro, el sistema detecta si tiene fianza asociada.
2. Aplica automáticamente la retención según la política configurada.
3. El cliente recibe una notificación informándole de la retención.

---

## 7. Informes y Estadísticas

Acceda a **Fianzas → Informes** para consultar:

- **Total cobrado** en un período (día, semana, mes).
- **Total devuelto** y **total retenido**.
- **Tasa de no-show** con y sin fianza (para comparar el efecto de las fianzas).
- **Fianzas pendientes** de procesar.

Estos datos le ayudan a evaluar si el sistema de fianzas está reduciendo el índice de no-shows en su restaurante.

---

## 8. Preguntas Frecuentes

**¿El cliente puede reservar sin pagar la fianza?**
No. Si la fianza es obligatoria para esa reserva, el proceso de pago se completa antes de confirmarla. Si el cliente cierra la página sin pagar, la reserva queda en estado *pendiente de pago* y expira automáticamente pasados X minutos.

**¿Qué pasa si la tarjeta del cliente es rechazada?**
El sistema informa al cliente del error y le permite intentar con otra tarjeta. La reserva no se confirma hasta que el pago sea exitoso.

**¿Puedo configurar fianza solo para grupos grandes?**
Sí. En la configuración puede establecer un mínimo de comensales a partir del cual se exige fianza (ej: solo para reservas de 8 o más personas).

**¿Las fianzas tienen comisión?**
Stripe aplica sus tarifas estándar de procesamiento de pagos. Consulte la tarifa vigente en [stripe.com/pricing](https://stripe.com/pricing).

**¿Puedo desactivar las fianzas temporalmente?**
Sí. Desde **Fianzas → Configuración** puede desactivar el módulo completo con un toggle sin perder la configuración guardada.

---

## Soporte

Para incidencias con pagos o devoluciones urgentes, contacte con soporte técnico a través del botón 🎧 del panel de restaurante o escribiendo a **soporte@quieromesa.com**.

> **Aviso legal:** Las fianzas y depósitos deben gestionarse conforme a la normativa de consumidores vigente en su territorio. Consulte con su asesor legal si tiene dudas sobre la política de retención aplicable.
