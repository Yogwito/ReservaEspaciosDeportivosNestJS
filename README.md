# Reserva Espacios Deportivos API

Backend en NestJS para gestionar usuarios, autenticación, deportes, espacios deportivos, reservas y un flujo de pago simulado.

## Estado actual

La aplicación hoy incluye:

- Autenticación con email y contraseña.
- Verificación de correo por código de 6 dígitos.
- JWT para proteger rutas privadas.
- Flujo de 2FA con TOTP y QR.
- Roles `admin` y `user`.
- CRUD de usuarios, deportes, espacios y reservas.
- Reglas de negocio para evitar reservas inválidas.
- Pago simulado con referencia generada en backend.
- Notificación opcional por Telegram al confirmar un pago.
- Envío de correos con SMTP para verificación y primer inicio de sesión.

## Stack

- NestJS 11
- TypeORM
- MySQL
- Passport + JWT
- class-validator / class-transformer
- Nodemailer
- otplib + qrcode

## Módulos principales

- `auth`: registro, login, verificación de correo, 2FA.
- `users`: gestión de usuarios.
- `sports`: deportes y franjas horarias permitidas.
- `spaces`: espacios deportivos y deportes permitidos por espacio.
- `reservations`: creación, consulta, actualización, cancelación y pago de reservas.
- `payment`: pago mock y referencia de pago.
- `mail`: envío de correos SMTP.

## Requisitos

- Node.js 18 o superior
- npm
- MySQL disponible local o remotamente

## Instalación

```bash
npm install
```

## Variables de entorno

El proyecto lee configuración desde `.env`.

Ejemplo mínimo:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_NAME=reserva_deportiva

JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=7d
JWT_2FA_SECRET=change-2fa-secret-in-production
JWT_2FA_EXPIRES_IN=5m

TWO_FACTOR_APP_NAME=SportsFacility

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=your-email@gmail.com

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

Variables usadas actualmente:

| Variable | Descripción |
| --- | --- |
| `PORT` | Puerto HTTP de la API |
| `DB_HOST` | Host de MySQL |
| `DB_PORT` | Puerto de MySQL |
| `DB_USERNAME` | Usuario de base de datos |
| `DB_PASSWORD` | Contraseña de base de datos |
| `DB_NAME` | Nombre de la base de datos |
| `JWT_SECRET` | Secreto para access tokens |
| `JWT_EXPIRES_IN` | Tiempo de expiración del JWT |
| `JWT_2FA_SECRET` | Secreto adicional para flujo 2FA |
| `JWT_2FA_EXPIRES_IN` | Tiempo de expiración del token 2FA |
| `TWO_FACTOR_APP_NAME` | Nombre mostrado en apps TOTP |
| `MAIL_HOST` | Servidor SMTP |
| `MAIL_PORT` | Puerto SMTP |
| `MAIL_USER` | Usuario SMTP |
| `MAIL_PASS` | Contraseña SMTP |
| `MAIL_FROM` | Remitente por defecto |
| `TELEGRAM_BOT_TOKEN` | Habilita validación previa de notificaciones Telegram |
| `TELEGRAM_CHAT_ID` | Chat destino para pagos confirmados |

## Ejecución

```bash
# desarrollo
npm run start:dev

# modo normal
npm run start

# compilación
npm run build

# producción
npm run start:prod
```

## Scripts útiles

```bash
npm run lint
npm run test
npm run test:watch
npm run test:cov
npm run test:e2e
```

## Configuración de base de datos

La aplicación usa `TypeOrmModule.forRootAsync(...)` con estas decisiones:

- motor: `mysql`
- `autoLoadEntities: true`
- `synchronize: true`

`synchronize: true` es cómodo en desarrollo, pero no debería usarse tal cual en producción.

## Modelo de dominio

### Usuarios

- Tienen rol `admin` o `user`.
- El correo es único.
- El password se guarda hasheado con `bcrypt`.
- Se almacena estado de verificación de correo.
- Se almacena estado y secreto de 2FA.

### Deportes

- Cada deporte define uno o más rangos horarios permitidos.
- Una reserva solo es válida si su rango está completamente contenido dentro de uno de esos slots.

### Espacios

- Tienen nombre, ubicación, capacidad y tarifa por hora por persona.
- Cada espacio define qué deportes están permitidos.

### Reservas

Cada reserva guarda:

- usuario
- espacio
- deporte
- fecha
- hora de inicio
- hora de fin
- número de personas
- precio unitario
- valor total
- estado de reserva
- estado de pago

Estados de reserva actuales:

- `pending_payment`
- `active`
- `cancelled`
- `completed`

Estados de pago actuales:

- `pending`
- `processing`
- `confirmed`
- `failed`
- `refunded`

## Reglas de negocio de reservas

Al crear o actualizar una reserva, el backend valida:

- `startTime < endTime`
- el deporte debe estar permitido en el espacio
- el horario debe estar dentro de los slots del deporte
- `numPeople` no puede exceder la capacidad del espacio
- no puede existir traslape con otra reserva del mismo espacio y fecha, excepto si la otra está cancelada

El valor total se calcula en backend:

```text
totalValue = hourlyRate * duración_en_horas * numPeople
```

## Flujo de autenticación actual

### Registro

`POST /auth/register`

- crea el usuario
- genera un código de verificación de 6 dígitos
- guarda expiración de 15 minutos
- envía correo de verificación

### Verificación de correo

`POST /auth/verify-email`

- recibe `userId` y `code`
- marca el usuario como verificado
- devuelve `accessToken`

### Login

`POST /auth/login`

- usa `LocalAuthGuard`
- valida email y contraseña
- devuelve `accessToken`
- si aplica el flujo de 2FA, devuelve `requiresTwoFactor`

### 2FA

Endpoints disponibles:

- `POST /auth/2fa/generate`
- `POST /auth/2fa/enable`
- `POST /auth/2fa/disable`
- `POST /auth/2fa/authenticate`

El endpoint de generación devuelve:

- secreto TOTP
- `otpauthUrl`
- QR en base64

## Endpoints principales

### Auth

- `POST /auth/register`
- `POST /auth/verify-email`
- `POST /auth/login`
- `POST /auth/2fa/generate`
- `POST /auth/2fa/enable`
- `POST /auth/2fa/disable`
- `POST /auth/2fa/authenticate`

### Users

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`

### Sports

- `POST /sports`
- `GET /sports`
- `GET /sports/:id`
- `PATCH /sports/:id`
- `DELETE /sports/:id`

### Spaces

- `POST /spaces`
- `GET /spaces`
- `GET /spaces/:id`
- `PATCH /spaces/:id`
- `DELETE /spaces/:id`

### Reservations

- `POST /reservations`
- `GET /reservations`
- `GET /reservations/:id`
- `PATCH /reservations/:id`
- `PATCH /reservations/:id/cancel`
- `POST /reservations/:id/pay`
- `DELETE /reservations/:id`

## Roles y permisos

- `admin` puede gestionar usuarios, deportes y espacios.
- `admin` puede ver todas las reservas.
- `user` solo puede ver y operar sobre sus propias reservas.
- Varias rutas privadas requieren `Authorization: Bearer <token>`.

## Pago simulado

El pago no se conecta a una pasarela real.

`POST /reservations/:id/pay`

- confirma el pago
- genera una referencia UUID en backend
- cambia la reserva a `active`
- si el token empieza por `fail_`, el backend simula rechazo
- intenta enviar una notificación por Telegram si está configurado

Body esperado:

```json
{
  "paymentToken": "tok_demo_ok",
  "currency": "COP"
}
```

## Correo

El módulo `mail` envía:

- correo de verificación de cuenta
- correo de primer inicio de sesión

Si el SMTP no está bien configurado, el flujo puede fallar al registrar o solo dejar un warning, según el caso.

## Postman

El repositorio incluye una colección en:

```text
postman/postman.json
```

## Estructura del proyecto

```text
src/
  auth/
  common/
  config/
  mail/
  middleware/
  payment/
  reservations/
  spaces/
  sports/
  users/
  main.ts
```

## Notas importantes

- Los IDs actuales son UUID.
- La ruta raíz `GET /` sigue devolviendo el mensaje base del starter.
- El lint del proyecto todavía tiene hallazgos pendientes fuera de la documentación.
- La documentación de Nest por defecto ya no describe el estado real de esta API; este README sí.
