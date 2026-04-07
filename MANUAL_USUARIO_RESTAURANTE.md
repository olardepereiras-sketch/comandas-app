# 📘 Manual de Usuario - QuieroMesa

## Guía Completa de Configuración para Restaurantes

---

![Portada](https://r2-pub.rork.com/generated-images/25d39d65-558d-45cb-9df3-2689ad36b3fe.png)

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Acceso al Panel de Gestión](#acceso-al-panel-de-gestión)
3. [Configuración Básica](#configuración-básica)
4. [Gestión de Ubicaciones y Mesas](#gestión-de-ubicaciones-y-mesas)
5. [Configuración de Horarios](#configuración-de-horarios)
6. [Configuración Avanzada (Pro)](#configuración-avanzada-pro)
7. [Sistema de Fianzas](#sistema-de-fianzas)
8. [Gestión de Reservas](#gestión-de-reservas)
9. [Sistema de Valoraciones](#sistema-de-valoraciones)
10. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## 1. Introducción

### ¿Qué es QuieroMesa?

QuieroMesa es una plataforma integral de gestión de reservas para restaurantes que te permite:

✅ **Gestionar reservas en tiempo real**  
✅ **Configurar horarios y turnos flexibles**  
✅ **Administrar mesas y ubicaciones**  
✅ **Enviar notificaciones automáticas por WhatsApp y Email**  
✅ **Cobrar fianzas con Stripe**  
✅ **Valorar clientes y mejorar la calidad del servicio**

### Estructura del Sistema

El panel de gestión está organizado en módulos que te permiten controlar todos los aspectos de tu restaurante:

- **Configuración**: Datos básicos del restaurante
- **Mesas**: Gestión de ubicaciones y mesas
- **Horarios**: Configuración de turnos y disponibilidad
- **Configuración Pro**: Notificaciones, WhatsApp, recordatorios
- **Fianzas**: Sistema de cobro de depósitos
- **Reservas**: Visualización y gestión de reservas
- **Valoraciones**: Sistema de puntuación de clientes

---

## 2. Acceso al Panel de Gestión

### 🔐 Inicio de Sesión

1. Accede a tu panel en: `https://quieromesa.com/restaurant/login/[tu-slug]`
2. Introduce tu contraseña de acceso
3. Haz clic en "Acceder"

### 📱 Navegación Principal

Una vez dentro, verás el menú principal con las siguientes opciones:

- **Inicio**: Vista general de reservas
- **Reservas**: Listado de todas las reservas
- **Reservas Pro**: Vista avanzada con filtros
- **Mesas**: Gestión de ubicaciones y mesas
- **Horarios**: Configuración de turnos
- **Configuración**: Datos del restaurante
- **Config. Pro**: Opciones avanzadas
- **Fianzas**: Sistema de depósitos
- **Valoraciones**: Gestión de puntuaciones

---

## 3. Configuración Básica

![Configuración Básica](https://r2-pub.rork.com/generated-images/25d39d65-558d-45cb-9df3-2689ad36b3fe.png)

### 📝 Información del Restaurante

#### Paso 1: Accede a Configuración
- En el menú principal, selecciona **"Configuración"**

#### Paso 2: Completa los Datos Básicos

##### **Nombre del Restaurante**
- Introduce el nombre oficial de tu establecimiento
- Este nombre aparecerá en todas las reservas y confirmaciones

##### **Descripción**
- Escribe una descripción atractiva de tu restaurante
- Incluye tu especialidad culinaria y ambiente
- **Ejemplo**: *"Restaurante de cocina gallega tradicional con ambiente familiar. Especialistas en mariscos frescos y carnes a la brasa."*

##### **Foto de Portada**
📸 **Especificaciones de la imagen:**
- Tamaño recomendado: 1200x675px (formato 16:9)
- Formatos aceptados: JPG, PNG, WebP
- Tamaño máximo: 5MB
- **Importante**: Esta imagen se mostrará en la página de reservas

**Cómo subir la foto:**
1. Haz clic en "Seleccionar Foto"
2. Elige una imagen profesional de tu restaurante
3. Espera a que se complete la carga
4. Haz clic en "Guardar Cambios" para confirmar

##### **Dirección y Ubicación**
- **Dirección completa**: Calle, número, piso/local
- **Código Postal**: Código postal de 5 dígitos
- **Población**: Se asigna automáticamente según tu cuenta
- **Provincia**: Se asigna automáticamente según tu cuenta

##### **Email de Contacto**
- Introduce un email válido
- Este email se usará para:
  - Notificaciones de nuevas reservas (si lo activas)
  - Comunicaciones importantes del sistema
  - Recuperación de cuenta

### 🔗 Enlace Directo a Reservas

El sistema genera automáticamente un enlace único para tu restaurante:

```
https://quieromesa.com/client/restaurant/[tu-slug]
```

**Funciones del enlace:**
- 📋 **Copiar al portapapeles**: Haz clic en el icono de copiar
- 📱 **Compartir**: Puedes compartir este enlace en:
  - Redes sociales (Instagram, Facebook)
  - WhatsApp Business
  - Google My Business
  - Tu página web

### 💾 Guardar Cambios

⚠️ **IMPORTANTE**: Después de hacer cualquier modificación, haz clic en el botón **"Guardar Cambios"** (botón morado en la parte inferior)

---

## 4. Gestión de Ubicaciones y Mesas

![Gestión de Mesas](https://r2-pub.rork.com/generated-images/c7a80690-8844-4c44-8584-7d43d8b89ed0.png)

### 📍 Ubicaciones

Las ubicaciones representan las diferentes áreas de tu restaurante (terraza, interior, salón privado, etc.)

#### Crear una Nueva Ubicación

1. Ve a **"Mesas"** en el menú principal
2. Haz clic en el botón **"+"** junto a "Ubicaciones"
3. Introduce el nombre de la ubicación
   - **Ejemplos**: "Terraza", "Salón Principal", "Zona Interior", "Comedor Privado"
4. **(Opcional)** Sube una foto de la ubicación:
   - Primero guarda la ubicación
   - Edita la ubicación haciendo clic en el icono de lápiz
   - Selecciona una foto (1200x675px recomendado)
   - Haz clic en "Actualizar Ubicación"
5. Haz clic en **"Añadir Ubicación"**

#### Editar o Eliminar Ubicación

- **Editar**: Haz clic en el icono de lápiz (azul) junto a la ubicación
- **Eliminar**: Haz clic en el icono de papelera (rojo)
  - ⚠️ Al eliminar una ubicación, se eliminarán también todas sus mesas

### 🪑 Mesas

#### Crear una Nueva Mesa

1. Selecciona la ubicación donde quieres añadir la mesa
2. Haz clic en el botón **"+"** en la sección "Mesas"
3. Completa la información:

##### **Ubicación**
- Selecciona el área donde estará la mesa

##### **Nombre de la Mesa**
- Introduce un identificador único
- **Ejemplos**: "Mesa 1", "Mesa 2", "Mesa Terraza A", "Mesa VIP 5"

##### **Capacidad**
- **Mín. Comensales**: Número mínimo de personas (ej: 2)
- **Máx. Comensales**: Número máximo de personas (ej: 4)
- **Ejemplo**: Una mesa de 2-4 personas acepta reservas de 2, 3 o 4 comensales

##### **Opciones de la Mesa**

✅ **Admite tronas**
- Marca si la mesa puede acomodar tronas para bebés
- Si está activado, los clientes podrán solicitar tronas al reservar

✅ **Admite carritos**
- Marca si la mesa tiene espacio para carritos de bebé
- Útil para mesas amplias o en zonas espaciosas

✅ **Admite mascotas**
- Marca si se permiten mascotas en esta mesa
- Especialmente útil para mesas de terraza

##### **Prioridad de la Mesa** (1-10)
- Define qué mesas se asignan primero
- **1** = Baja prioridad (se asignan al final)
- **10** = Alta prioridad (se asignan primero)
- **Uso**: Útil para reservar primero mesas más rentables o mejor ubicadas

4. Haz clic en **"Añadir Mesa"** o **"Actualizar Mesa"**

#### Ejemplo Práctico de Configuración

```
📍 Terraza
   🪑 Mesa T1 (2-4 personas) - Tronas ✅, Carritos ✅, Mascotas ✅, Prioridad: 7
   🪑 Mesa T2 (2-4 personas) - Tronas ✅, Carritos ✅, Mascotas ✅, Prioridad: 7
   🪑 Mesa T3 (4-6 personas) - Tronas ✅, Carritos ✅, Mascotas ✅, Prioridad: 8

📍 Salón Interior
   🪑 Mesa 1 (2-2 personas) - Tronas ❌, Carritos ❌, Mascotas ❌, Prioridad: 5
   🪑 Mesa 2 (2-4 personas) - Tronas ✅, Carritos ❌, Mascotas ❌, Prioridad: 6
   🪑 Mesa VIP (6-8 personas) - Tronas ✅, Carritos ❌, Mascotas ❌, Prioridad: 10
```

### 👶 Configuración de Tronas

Las tronas son un recurso compartido del restaurante (no están asignadas a mesas específicas).

#### Configurar Tronas Disponibles

1. En la sección "Tronas Disponibles", haz clic en el icono de bebé
2. Configura:
   - **Tronas totales**: Número total de tronas disponibles en el restaurante
   - **Tiempo de rotación**: Minutos que una trona está ocupada (por defecto 120 min)
3. Haz clic en **"Guardar"**

**Funcionamiento del sistema:**
- El sistema calcula automáticamente cuántas tronas están disponibles según las reservas
- Si una mesa solicita tronas, se reservan durante el tiempo configurado
- Ejemplo: Si tienes 5 tronas y hay 2 reservas que solicitan 2 tronas cada una, quedan 1 trona disponible

### 🔗 Grupos de Mesas

Los grupos permiten combinar varias mesas para reservas de grupos grandes.

#### Crear un Grupo de Mesas

1. Haz clic en **"+"** en la sección "Grupos de Mesas"
2. Completa:
   - **Nombre del Grupo**: Ej: "Grupo Terraza Grande"
   - **Ubicación**: Selecciona la ubicación
   - **Mesas**: Selecciona las mesas que forman el grupo
   - **Capacidad Mínima**: Ej: 6 personas
   - **Capacidad Máxima**: Ej: 12 personas
   - **Prioridad**: 1-10 (igual que las mesas individuales)
3. Haz clic en **"Guardar"**

**Ejemplo de uso:**
```
Grupo: "Terraza Completa"
Mesas: Mesa T1 + Mesa T2 + Mesa T3
Capacidad: 8-12 personas
Prioridad: 9
```

Cuando un cliente reserve para 10 personas, el sistema puede asignar automáticamente este grupo si está disponible.

---

## 5. Configuración de Horarios

![Configuración de Horarios](https://r2-pub.rork.com/generated-images/b0526c9f-f571-449e-8aa3-560f4b40d1bb.png)

### ⏰ Sistema de Plantillas y Turnos

QuieroMesa usa un sistema de **plantillas de turnos** que puedes aplicar a diferentes días de la semana.

### 📋 Paso 1: Crear Plantillas de Turnos

#### ¿Qué es una Plantilla de Turno?

Una plantilla es un conjunto de horarios que defines una vez y puedes reutilizar en diferentes días.

**Ejemplos de plantillas:**
- **Comidas**: 13:00, 13:30, 14:00, 14:30, 15:00
- **Cenas**: 20:00, 20:30, 21:00, 21:30, 22:00
- **Fin de Semana**: 13:00, 13:30, 14:00, 14:30, 20:00, 20:30, 21:00, 21:30

#### Crear una Plantilla

1. Ve a **"Horarios"** en el menú principal
2. En la sección **"Plantillas de Turnos"**, haz clic en **"Crear Plantilla de Turno"**
3. Introduce el **nombre de la plantilla** (Ej: "Comidas", "Cenas")
4. Haz clic en **"Seleccionar Hora"** para añadir horarios:
   - Selecciona una hora de la lista (en intervalos de 30 minutos)
   - La hora se añadirá a la plantilla
   - Repite para añadir todos los horarios del turno
5. Haz clic en **"Crear"**

**Ejemplo de configuración:**

```
📋 Plantilla: "Comidas"
Horarios: 13:00, 13:30, 14:00, 14:30, 15:00

📋 Plantilla: "Cenas"  
Horarios: 20:00, 20:30, 21:00, 21:30, 22:00
```

#### Editar o Eliminar Plantilla

- **Editar**: Haz clic en el icono de lápiz (azul)
- **Eliminar**: Haz clic en el icono de papelera (rojo)
  - ⚠️ Solo puedes eliminar plantillas que no estén aplicadas a ningún día

### 📅 Paso 2: Configurar Días de la Semana

#### Activar/Desactivar Días

1. En la sección **"Días de la Semana"**, verás los 7 días
2. Haz clic en un día para expandirlo
3. Activa el interruptor **"Restaurante abierto"**
   - **Activado** (morado): El restaurante acepta reservas ese día
   - **Desactivado** (gris): No hay servicio ese día

#### Aplicar Plantillas a un Día

1. Expande el día que quieres configurar
2. En **"Aplicar Plantilla de Turno"**, verás todas tus plantillas
3. Haz clic en la plantilla que quieres aplicar (Ej: "Comidas")
4. Configura los parámetros del turno:

##### **Comensales Máximos**
- Número máximo de comensales que aceptas en ese horario
- **Ejemplo**: Si pones 30, aceptarás reservas hasta completar 30 comensales
- El sistema suma los comensales de todas las reservas

##### **Valoración Mínima Global**
- Valoración mínima (0.0 - 5.0) que debe tener un cliente para reservar
- **0.0**: Cualquier cliente puede reservar (incluidos nuevos)
- **3.5**: Solo clientes con valoración ≥ 3.5 estrellas
- **Uso**: Protege horarios premium para clientes fieles

##### **Valoración Mínima Local**
- Valoración mínima que debe tener el cliente **en tu restaurante**
- **0.0**: Cualquier cliente puede reservar
- **4.0**: Solo clientes que ya visitaron tu restaurante y tienen ≥ 4.0 estrellas
- **Uso**: Reserva horarios para clientes habituales

5. Haz clic en **"Aplicar Turno"**

#### Ejemplo de Configuración Completa

```
🗓️ LUNES - Cerrado

🗓️ MARTES - Abierto
   📋 Plantilla: Comidas
      ⏰ 13:00 - Comensales: 30, Val. Global: 0.0, Val. Local: 0.0
      ⏰ 13:30 - Comensales: 30, Val. Global: 0.0, Val. Local: 0.0
      ⏰ 14:00 - Comensales: 25, Val. Global: 0.0, Val. Local: 0.0
      ⏰ 14:30 - Comensales: 20, Val. Global: 0.0, Val. Local: 0.0

   📋 Plantilla: Cenas
      ⏰ 20:00 - Comensales: 35, Val. Global: 0.0, Val. Local: 0.0
      ⏰ 20:30 - Comensales: 35, Val. Global: 0.0, Val. Local: 0.0
      ⏰ 21:00 - Comensales: 30, Val. Global: 0.0, Val. Local: 0.0
      ⏰ 21:30 - Comensales: 25, Val. Global: 3.0, Val. Local: 0.0 (solo buenos clientes)

🗓️ SÁBADO - Abierto
   📋 Plantilla: Comidas
      ⏰ 13:00 - Comensales: 40, Val. Global: 0.0, Val. Local: 0.0
      ⏰ 13:30 - Comensales: 40, Val. Global: 0.0, Val. Local: 0.0
      ⏰ 14:00 - Comensales: 35, Val. Global: 0.0, Val. Local: 0.0

   📋 Plantilla: Cenas  
      ⏰ 20:00 - Comensales: 45, Val. Global: 0.0, Val. Local: 0.0
      ⏰ 21:00 - Comensales: 45, Val. Global: 0.0, Val. Local: 0.0
      ⏰ 22:00 - Comensales: 40, Val. Global: 3.5, Val. Local: 0.0 (horario premium)
```

### ✏️ Editar Configuración de Horarios

Una vez aplicada una plantilla, puedes editar cada horario individualmente:

1. Expande el día
2. Busca **"Plantillas Aplicadas"**
3. Edita directamente los valores de:
   - **Comensales**: Cambia el número
   - **Valoración Global**: Introduce un nuevo valor (0.0-5.0)
   - **Valoración Local**: Introduce un nuevo valor (0.0-5.0)
4. Los cambios se guardan automáticamente

### 🗑️ Eliminar Plantilla de un Día

Para quitar una plantilla de un día:

1. Expande el día
2. Busca la plantilla en "Plantillas Aplicadas"
3. Haz clic en **"Eliminar"** (icono de papelera)
4. Confirma la eliminación

### 🔄 Actualizar Calendario

Después de hacer cambios, haz clic en el botón **"Actualizar Calendario"** para sincronizar la configuración con el sistema de reservas.

---

## 6. Configuración Avanzada (Pro)

![Configuración Pro](https://r2-pub.rork.com/generated-images/0b1385f3-b632-46fe-bf9a-6f339a4d488f.png)

### 📞 Teléfonos de Contacto (WhatsApp)

Los números que añadas recibirán notificaciones automáticas por WhatsApp con cada nueva reserva.

#### Añadir Número de WhatsApp

1. Ve a **"Config. Pro"** en el menú principal
2. En **"Teléfonos de Contacto"**, selecciona el prefijo del país
   - Haz clic en el selector de prefijo
   - Busca tu país o código
   - Selecciona (por defecto +34 España)
3. Introduce el número de teléfono (sin espacios ni guiones)
   - **Ejemplo**: 666123456
4. Haz clic en **"Añadir"**

**Formato del mensaje que recibirás:**
```
🍽️ Nueva Reserva QuieroMesa

📅 Día: Sábado 15 de Febrero 2026
⏰ Hora: 21:00
👤 Nombre: Juan García
📞 Teléfono: +34666123456
📍 Ubicación: Terraza
🪑 Mesa: Mesa T2
👥 Comensales: 4 adultos
👶 Tronas: 1
```

#### Eliminar Número

Haz clic en la **"×"** junto al número que quieres eliminar.

### ✉️ Notificaciones por Email

#### Activar Notificaciones por Email

1. Activa el interruptor **"Activar Notificaciones por Email"**
2. **(Opcional)** Introduce un **email personalizado** donde recibir las notificaciones
   - Si lo dejas vacío, se usará el email del restaurante configurado en "Configuración"
3. Haz clic en **"Guardar Cambios"**

**Recibirás un email con cada nueva reserva** que incluye todos los datos de la reserva.

### 💬 Notificaciones WhatsApp

#### Opción 1: WhatsApp Web (Recomendado)

Esta opción te permite conectar tu propio número de WhatsApp para enviar confirmaciones automáticas a los clientes.

##### Activar WhatsApp Web

1. Activa **"Usar WhatsApp Web"**
2. Haz clic en **"Ver Código QR para Conectar"**
3. Escanea el código QR con tu WhatsApp:
   - Abre WhatsApp en tu teléfono
   - Ve a **Configuración → Dispositivos vinculados**
   - Toca **"Vincular un dispositivo"**
   - Escanea el código QR que aparece en pantalla
4. Una vez conectado, verás **"✅ WhatsApp Conectado"**
5. Activa **"Envío Automático de WhatsApp"** para enviar confirmaciones automáticas

**Mensaje que recibirá el cliente:**
```
Hola [Nombre],

Confirmamos su reserva:
📅 Día: Sábado 15 de Febrero 2026
⏰ Hora: 21:00
📍 Ubicación: Terraza
🪑 Mesa: Mesa T2
👥 4 comensales

[Tu mensaje personalizado si lo has configurado]

Para modificar o cancelar, responda a este mensaje.

Saludos,
[Nombre de tu Restaurante]
```

##### Desconectar WhatsApp Web

1. Abre el modal del código QR
2. Haz clic en **"Desconectar WhatsApp"**
3. Confirma la desconexión

#### Mensaje Personalizado WhatsApp

Puedes añadir un mensaje adicional que se incluirá en todas las confirmaciones:

**Ejemplo:**
```
Les ruego puntualidad, las reservas se cancelan a los 10 min de la hora acordada. Un saludo.
```

Este mensaje aparecerá al final de la confirmación de reserva.

### 🔔 Recordatorios de Reserva

Configura hasta 2 recordatorios automáticos por WhatsApp.

#### Recordatorio 1 (Horas antes)

1. Activa **"Envío de WhatsApp recordando la reserva 1"**
2. Configura **"Cuántas horas antes"** (por defecto 24 horas)
3. El cliente recibirá este mensaje:

```
Hola [Nombre],

Le recordamos que tiene una reserva el [día] a las [hora]. 

Si lo desea puede modificar esta reserva desde el mensaje anterior que ha recibido confirmando la reserva. 

Quedamos a su disposición para solucionar cualquier duda.

Un saludo,
[Nombre del Restaurante]
```

#### Recordatorio 2 (Minutos antes)

1. Activa **"Envío de WhatsApp recordando la reserva 2"**
2. Configura **"Cuántos minutos antes"** (por defecto 60 minutos)
3. El cliente recibirá este mensaje:

```
Hola [Nombre],

Le recordamos que tiene una reserva el [día] a las [hora]. 

Le rogamos puntualidad.

Un saludo,
[Nombre del Restaurante]
```

**Ejemplo de configuración:**
- Recordatorio 1: 24 horas antes
- Recordatorio 2: 60 minutos antes

### ⚙️ Configuración de Reservas

#### Días de Antelación para Reservas

Define con cuántos días de anticipación los clientes pueden reservar.

- **0**: Los clientes solo pueden reservar para hoy (mismo día)
- **7**: Los clientes pueden reservar hasta 7 días de antelación
- **30**: Los clientes pueden reservar hasta 30 días de antelación

**Recomendación**: 30 días para restaurantes con alta demanda, 7-14 días para restaurantes normales.

#### Tiempo de Rotación de Mesas (minutos)

Tiempo mínimo entre reservas consecutivas para la misma mesa.

- **Por defecto**: 100 minutos
- **Ejemplo**: Si hay una reserva a las 20:00, la siguiente reserva en la misma mesa puede ser a las 21:40 (20:00 + 100 min)

**Recomendación**:
- Comidas: 90-100 minutos
- Cenas: 100-120 minutos
- Cenas con menú degustación: 150-180 minutos

#### Tiempo Mínimo de Anticipación (minutos)

Tiempo mínimo con el que los clientes deben reservar.

- **0**: Pueden reservar inmediatamente (sin restricción)
- **30**: Deben reservar al menos 30 minutos antes
- **60**: Deben reservar al menos 1 hora antes

**Ejemplo**: Si pones 30 minutos y son las 20:00, los clientes NO pueden reservar para las 20:15, pero SÍ para las 20:30 o posterior.

**Recomendación**: 30-60 minutos para evitar reservas de última hora.

#### Tiempo Mínimo de Modificación/Cancelación (minutos)

Tiempo límite para que los clientes puedan modificar o cancelar su reserva desde el mensaje de confirmación.

- **Por defecto**: 180 minutos (3 horas)
- **Ejemplo**: Si la reserva es a las 21:00 y pones 180 minutos, el cliente puede modificar/cancelar hasta las 18:00. Después de las 18:00, debe contactar directamente con el restaurante.

**Recomendación**: 120-180 minutos (2-3 horas).

### 🔗 Enlaces Personalizados

Crea enlaces a tu carta, menú del día, política de cancelación, etc.

#### Añadir Enlace

1. Haz clic en **"Agregar Enlace"**
2. Completa:
   - **Nombre del Botón**: Ej: "Ver nuestra Carta"
   - **URL**: Enlace completo (debe empezar con https://)
     - Ejemplo: `https://ejemplo.com/carta.pdf`
3. Activa/desactiva el enlace con el interruptor
4. Haz clic en **"Guardar Cambios"**

**Los clientes verán estos enlaces** en la página de reservas, pudiendo acceder a tu carta, menú, etc.

**Ejemplos de enlaces útiles:**
- Carta de comida: `https://turestaurante.com/carta-comida.pdf`
- Carta de vinos: `https://turestaurante.com/carta-vinos.pdf`
- Menú del día: `https://turestaurante.com/menu-del-dia`
- Política de cancelación: `https://turestaurante.com/politica-cancelacion`

---

## 7. Sistema de Fianzas

### 💳 Configuración de Fianzas con Stripe

El sistema de fianzas permite cobrar un depósito a los clientes al hacer la reserva.

#### ⚠️ Requisitos Previos

Necesitas una cuenta de **Stripe** (plataforma de pagos online):

1. Regístrate en [Stripe](https://stripe.com)
2. Completa la verificación de tu cuenta
3. Obtén tus claves API de Stripe

#### Paso 1: Activar el Sistema

1. Ve a **"Fianzas"** en el menú principal
2. Activa **"Habilitar Fianzas"**

#### Paso 2: Configurar Stripe

Introduce tus credenciales de Stripe:

##### **ID de Cuenta de Stripe (Opcional)**
- Solo necesario si usas Stripe Connect
- Formato: `acct_xxxxxxxxxxxxx`

##### **Clave Secreta de Stripe (Secret Key)** *
- Obtén esta clave en tu panel de Stripe → API Keys
- **Modo Test**: `sk_test_xxxxxxxxxxxxx`
- **Modo Live**: `sk_live_xxxxxxxxxxxxx`
- ⚠️ **IMPORTANTE**: Usa las claves de LIVE cuando estés en producción

##### **Clave Pública de Stripe (Publishable Key)** *
- Obtén esta clave en tu panel de Stripe → API Keys
- **Modo Test**: `pk_test_xxxxxxxxxxxxx`
- **Modo Live**: `pk_live_xxxxxxxxxxxxx`

#### Paso 3: Configurar Días y Cantidades

##### Opción A: Aplicar a Todos los Días

1. Activa **"Aplicar a Todos los Días"**
2. Introduce la **Cantidad de Fianza por Comensal (€)**
   - **Ejemplo**: 10€
3. Todos los días del año requerirán esta fianza

**Ejemplo:** Si pones 10€ y un cliente reserva para 4 personas, pagará 40€ de fianza.

##### Opción B: Días Específicos

Esta opción te permite configurar fianzas diferentes para días especiales.

1. Desactiva **"Aplicar a Todos los Días"**
2. Configura la **Cantidad de Fianza por Defecto** (se usa si no hay configuración específica)
3. Haz clic en **"Agregar Día Específico"**
4. Selecciona un día en el calendario
5. Configura:
   - **Cantidad de Fianza (€)**: Ej: 20€
   - **Mensaje Personalizado** (opcional): Mensaje específico para ese día
6. Haz clic en **"Confirmar"**

**Ejemplo de uso:**
```
Por defecto: 10€/comensal

Días específicos:
- 24 Diciembre (Nochebuena): 25€/comensal
  Mensaje: "Debido al menú especial de Nochebuena, la fianza es de 25€ por comensal"
  
- 31 Diciembre (Nochevieja): 30€/comensal
  Mensaje: "Menú de Nochevieja. Fianza de 30€ por comensal"
  
- 14 Febrero (San Valentín): 20€/comensal
  Mensaje: "Menú especial de San Valentín"
```

#### Paso 4: Mensaje Personalizado

Añade un mensaje que verá el cliente al pagar la fianza:

**Ejemplo:**
```
El dinero de la fianza se descontará en la cuenta el día de su reserva. 
En caso de no presentarse o cancelar con menos de 24h de antelación, 
la fianza no será devuelta.
```

#### Paso 5: Guardar Configuración

Haz clic en **"Guardar Configuración"**

### 💰 Funcionamiento de las Fianzas

1. **Cliente hace reserva**: Al seleccionar día, hora y número de comensales
2. **Sistema calcula fianza**: Multiplica cantidad × número de comensales
3. **Cliente paga**: Se redirige a Stripe para pagar con tarjeta
4. **Reserva confirmada**: Una vez pagada, la reserva se confirma
5. **Día de la reserva**: La fianza se cobra automáticamente
6. **No show**: Si el cliente no acude, conservas la fianza

---

## 8. Gestión de Reservas

### 📋 Vista de Reservas

#### Reservas Estándar

1. Ve a **"Reservas"** en el menú principal
2. Verás un listado de todas las reservas con:
   - Fecha y hora
   - Nombre del cliente
   - Teléfono
   - Número de comensales
   - Mesa asignada
   - Estado de la reserva

#### Reservas Pro (Vista Avanzada)

1. Ve a **"Reservas Pro"** para una vista más completa
2. Filtra reservas por:
   - **Estado**: Pendiente, Confirmada, Finalizada, Cancelada, Valorable
   - **Fecha**: Selecciona rango de fechas
   - **Búsqueda**: Por nombre o teléfono

### 🎨 Estados de las Reservas

Las reservas pasan por diferentes estados identificados por colores:

#### 🟢 Confirmada (Verde)
- Reserva confirmada y válida
- Fecha/hora futura
- El cliente puede modificar o cancelar (según tu configuración)

#### 🟡 Pendiente (Amarillo)
- Reservas del día actual antes de la hora
- Aún no han llegado los clientes

#### 🟠 En Curso (Naranja)
- La hora de la reserva ya ha pasado
- Clientes en el restaurante o acaban de terminar

#### 🔴 No Show (Rojo)
- Cliente no se presentó
- Han pasado más de 15 minutos de la hora de reserva sin confirmar asistencia

#### ⭐ Valorable (Morado/Rosa)
- Reserva finalizada hace menos de 24 horas
- Puedes valorar al cliente

#### ⚫ Finalizada (Gris)
- Reserva completada hace más de 24 horas
- Ya valorada o tiempo de valoración expirado

#### 🚫 Cancelada (Gris oscuro)
- Reserva cancelada por el cliente o el restaurante

### 📞 Acciones con Reservas

Desde el listado de reservas puedes:

- **Ver detalles**: Haz clic en la reserva
- **Llamar al cliente**: Haz clic en el número de teléfono
- **Cancelar reserva**: Solo si está en estado Confirmada o Pendiente
- **Valorar cliente**: Solo si está en estado Valorable (ver sección de Valoraciones)

---

## 9. Sistema de Valoraciones

### ⭐ ¿Por Qué Valorar a los Clientes?

El sistema de valoraciones te permite:

✅ **Proteger tu negocio** de clientes problemáticos  
✅ **Priorizar clientes fieles** en horarios premium  
✅ **Identificar clientes conflictivos** (no shows, cancelaciones tardías)  
✅ **Mejorar la calidad** del servicio

### 📊 Tipos de Valoraciones

#### Valoración Global
- Promedio de todas las valoraciones de todos los restaurantes
- **Uso**: Filtrar clientes con mal historial general

#### Valoración Local
- Valoración específica en TU restaurante
- **Uso**: Identificar clientes habituales de calidad

### 🎯 Cómo Valorar Clientes

#### Método 1: Desde Reservas Pro

1. Ve a **"Reservas Pro"**
2. Busca reservas en estado **"Valorable"** (morado/rosa)
   - Estas son reservas finalizadas hace menos de 24 horas
3. Haz clic en la reserva
4. Selecciona las estrellas (1-5)
5. Haz clic en **"Enviar Valoración"**

#### Método 2: Desde la Vista de Valoraciones

1. Ve a **"Valoraciones"** en el menú principal
2. Verás todas las reservas pendientes de valorar
3. Selecciona las estrellas para cada cliente
4. Haz clic en **"Enviar Valoración"**

### ⏰ Tiempo para Valorar

- Tienes **24 horas** después de finalizar la reserva para valorar
- Pasadas las 24 horas, la reserva pasa a estado "Finalizada" y no puedes valorar
- El sistema valora automáticamente con 5 estrellas si no valoras en 24h

### ⭐ Escala de Valoración

**5 Estrellas** ⭐⭐⭐⭐⭐
- Cliente excelente
- Llegó puntual
- Comportamiento impecable
- Sin problemas

**4 Estrellas** ⭐⭐⭐⭐
- Buen cliente
- Algún retraso menor
- Sin problemas importantes

**3 Estrellas** ⭐⭐⭐
- Cliente normal
- Retraso moderado
- Alguna incidencia menor

**2 Estrellas** ⭐⭐
- Cliente problemático
- Retraso significativo
- Mal comportamiento

**1 Estrella** ⭐
- Cliente muy problemático
- No show (no se presentó)
- Cancelación de última hora
- Comportamiento inaceptable

### 🔒 Usar Valoraciones en Horarios

Puedes configurar horarios exclusivos para buenos clientes:

1. Ve a **"Horarios"**
2. Configura un turno
3. Establece:
   - **Valoración Global Mínima**: Ej: 3.5 (solo clientes con ≥3.5 estrellas globales)
   - **Valoración Local Mínima**: Ej: 4.0 (solo clientes con ≥4.0 estrellas en tu restaurante)

**Ejemplo práctico:**
```
Sábado 21:30 (horario premium):
- Comensales: 40
- Val. Global: 3.5 ⭐
- Val. Local: 0.0

Solo podrán reservar clientes con buena reputación general.
```

```
Viernes 21:00 (clientes VIP):
- Comensales: 30
- Val. Global: 4.0 ⭐
- Val. Local: 4.5 ⭐

Solo clientes excelentes que ya conoces.
```

---

## 10. Preguntas Frecuentes

### 📱 General

**P: ¿Cómo comparto mi enlace de reservas con clientes?**

R: Tu enlace es `https://quieromesa.com/client/restaurant/[tu-slug]`. Puedes:
- Copiarlo desde "Configuración"
- Compartirlo en Instagram, Facebook
- Añadirlo a Google My Business
- Incluirlo en tu web
- Enviarlo por WhatsApp

**P: ¿Los cambios se aplican inmediatamente?**

R: Sí, después de hacer clic en "Guardar" o "Guardar Cambios". En el caso de Horarios, haz clic en "Actualizar Calendario".

### 🪑 Mesas

**P: ¿Puedo cambiar la capacidad de una mesa?**

R: Sí, edita la mesa y modifica los valores de Min/Max Comensales.

**P: ¿Qué pasa si elimino una ubicación?**

R: Se eliminan también todas las mesas de esa ubicación. ⚠️ Ten cuidado.

**P: ¿Las tronas se asignan a mesas específicas?**

R: No, las tronas son un recurso compartido del restaurante. El sistema calcula disponibilidad automáticamente.

### ⏰ Horarios

**P: ¿Puedo aplicar varias plantillas al mismo día?**

R: Sí, puedes aplicar "Comidas" y "Cenas" al mismo día.

**P: ¿Puedo tener diferentes horarios según el día?**

R: Sí, configura cada día individualmente según tus necesidades.

**P: ¿Qué pasa si un cliente no cumple la valoración mínima?**

R: No verá ese horario disponible en la página de reservas.

### 💬 WhatsApp

**P: ¿Necesito un número de WhatsApp Business?**

R: No, funciona con cualquier número de WhatsApp normal o Business.

**P: ¿Puedo conectar varios números?**

R: Para recibir notificaciones sí (añade varios números en "Teléfonos de Contacto"). Para WhatsApp Web solo puedes conectar un número.

**P: ¿Qué pasa si se desconecta WhatsApp Web?**

R: Deja de enviar mensajes automáticos. Vuelve a escanear el código QR para reconectar.

### 💳 Fianzas

**P: ¿Cuándo se cobra la fianza al cliente?**

R: El día de la reserva. Se hace una "autorización" al reservar y se cobra el día de la cita.

**P: ¿Qué pasa si el cliente cancela?**

R: Depende de tu configuración en Stripe. Puedes configurar política de cancelación.

**P: ¿Necesito cuenta bancaria española?**

R: No, Stripe funciona en múltiples países. Consulta disponibilidad en stripe.com.

### ⭐ Valoraciones

**P: ¿El cliente ve mi valoración?**

R: No, las valoraciones son privadas entre restaurantes del sistema.

**P: ¿Qué pasa si no valoro en 24 horas?**

R: El sistema valora automáticamente con 5 estrellas (se asume que todo fue bien).

**P: ¿Puedo cambiar una valoración?**

R: No, una vez enviada no se puede modificar. Valora con cuidado.

---

## 📞 Soporte y Contacto

Si tienes dudas o problemas técnicos, contacta con el soporte de QuieroMesa:

- **Email de soporte**: [Configurado en tu panel de administración]
- **Documentación**: Este manual
- **Actualizaciones**: El sistema se actualiza automáticamente con nuevas funciones

---

## ✅ Checklist de Configuración Inicial

Usa esta lista para asegurarte de que todo está configurado:

### Paso 1: Configuración Básica
- [ ] Nombre del restaurante
- [ ] Descripción atractiva
- [ ] Foto de portada profesional
- [ ] Dirección completa
- [ ] Código postal
- [ ] Email de contacto

### Paso 2: Ubicaciones y Mesas
- [ ] Crear ubicaciones (mínimo 1)
- [ ] Añadir fotos a ubicaciones (opcional)
- [ ] Crear mesas en cada ubicación
- [ ] Configurar capacidades correctamente
- [ ] Configurar opciones (tronas, carritos, mascotas)
- [ ] Establecer prioridades
- [ ] Configurar tronas disponibles
- [ ] Crear grupos de mesas (si aplica)

### Paso 3: Horarios
- [ ] Crear plantilla "Comidas"
- [ ] Crear plantilla "Cenas"
- [ ] Configurar días abiertos/cerrados
- [ ] Aplicar plantillas a cada día
- [ ] Configurar comensales máximos
- [ ] Ajustar valoraciones mínimas
- [ ] Hacer clic en "Actualizar Calendario"

### Paso 4: Configuración Pro
- [ ] Añadir números de WhatsApp para notificaciones
- [ ] Configurar email de notificaciones (opcional)
- [ ] Conectar WhatsApp Web (recomendado)
- [ ] Activar envío automático de WhatsApp
- [ ] Configurar mensaje personalizado
- [ ] Configurar recordatorios (2)
- [ ] Establecer días de antelación
- [ ] Configurar tiempo de rotación
- [ ] Configurar tiempo mínimo de anticipación
- [ ] Configurar tiempo mínimo modificación/cancelación
- [ ] Añadir enlaces personalizados (carta, menú, etc.)

### Paso 5: Fianzas (Opcional)
- [ ] Crear cuenta en Stripe
- [ ] Obtener claves API
- [ ] Configurar claves en el sistema
- [ ] Establecer cantidades de fianza
- [ ] Configurar días específicos (si aplica)
- [ ] Redactar mensaje personalizado

### Paso 6: Pruebas
- [ ] Hacer una reserva de prueba desde el enlace público
- [ ] Verificar que llegan las notificaciones WhatsApp
- [ ] Verificar que llegan las notificaciones Email
- [ ] Probar modificación de reserva
- [ ] Probar cancelación de reserva
- [ ] Valorar una reserva de prueba

---

## 🎯 Consejos para Maximizar Reservas

### 📸 Imágenes de Calidad
- Usa fotos profesionales de tus platos y local
- La primera impresión es crucial
- Actualiza fotos regularmente

### ⏰ Horarios Optimizados
- Ofrece horarios flexibles
- No restrinjas demasiado con valoraciones en horas normales
- Usa valoraciones solo para horarios premium

### 💬 Comunicación Clara
- Configura mensajes personalizados claros
- Explica tu política de cancelación
- Sé amable en las confirmaciones

### 🎁 Enlaces Útiles
- Añade enlace a tu carta actualizada
- Incluye menú del día si lo ofreces
- Añade link a políticas claras

### 📊 Análisis Continuo
- Revisa qué horarios tienen más demanda
- Ajusta comensales máximos según ocupación real
- Modifica valoraciones según necesidad

---

## 🚀 Próximos Pasos

Una vez configurado todo:

1. **Comparte tu enlace** en todas tus redes sociales
2. **Monitoriza las reservas** durante la primera semana
3. **Ajusta configuración** según los resultados
4. **Valora a los clientes** consistentemente
5. **Mantén actualizada** tu información

---

**¡Felicidades! Tu restaurante está listo para recibir reservas online con QuieroMesa.**

---

*Versión del Manual: 1.0*  
*Fecha: Febrero 2026*  
*Sistema: QuieroMesa - Gestión Profesional de Reservas*
