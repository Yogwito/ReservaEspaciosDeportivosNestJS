# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run start:dev       # Watch mode (recommended for development)
npm run start:debug     # Debug + watch mode

# Build & production
npm run build
npm run start:prod

# Testing
npm run test            # Unit tests (Jest, rootDir: src, matches *.spec.ts)
npm run test:watch      # Watch mode
npm run test:cov        # Coverage report
npm run test:e2e        # E2E tests (test/jest-e2e.json config)

# Run a single test file
npx jest src/path/to/file.spec.ts

# Code quality
npm run lint            # ESLint with auto-fix
npm run format          # Prettier
```

## Environment Variables

The app reads from `.env` via `@nestjs/config`. Key variables (defaults in `src/config/configuration.ts`):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | 3000 | HTTP port |
| `DB_HOST/PORT/USERNAME/PASSWORD/NAME` | localhost/3306/root/`""`/reserva_deportiva | MySQL connection |
| `JWT_SECRET` | change-me-in-production | Access token signing |
| `JWT_EXPIRES_IN` | 7d | Access token TTL |
| `JWT_2FA_SECRET` | change-2fa-secret-in-production | Pre-2FA token signing |
| `JWT_2FA_EXPIRES_IN` | 5m | Pre-2FA token TTL |
| `TWO_FACTOR_APP_NAME` | SportsFacility | TOTP issuer name |
| `TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID` | `""` | Payment notifications (optional) |
| `MAIL_USER / MAIL_PASS` | `""` | Nodemailer credentials (optional) |

## Architecture

NestJS 11 + TypeORM (MySQL, `synchronize: true` in dev) + Passport/JWT auth.

### Module map

```
AppModule
├── ConfigModule (global)
├── TypeOrmModule (MySQL, auto-loads all *.entity.ts)
├── AuthModule       → /auth/*
├── UsersModule      → /users/*
├── SportsModule     → /sports/*
├── SpacesModule     → /spaces/*
├── ReservationsModule → /reservations/*
├── PaymentModule    (no controller — service injected into ReservationsModule)
└── MailModule       (nodemailer, injected into AuthModule)
```

`LoggerMiddleware` is applied globally via `AppModule.configure()`.

### Auth flow

Two Passport strategies are registered:

- **LocalStrategy** (`passport-local`) — validates email/password, used by `POST /auth/login` via `LocalAuthGuard`.
- **JwtStrategy** (`passport-jwt`) — validates Bearer token, used by `JwtAuthGuard` on all protected routes.

**2FA flow**: After a successful password login, if `isTwoFactorEnabled` is true and `firstLoginDone` is false, a short-lived pre-2FA JWT is issued. The client calls `POST /auth/2fa/authenticate` with the TOTP token to exchange it for a full JWT. Once `firstLoginDone` is set, subsequent logins skip 2FA.

`@CurrentUser()` decorator extracts the authenticated `User` from `req.user`.

Role-based access uses `@Roles(UserRole.ADMIN)` + `RolesGuard` (applies on top of `JwtAuthGuard`).

### Domain model

- **Sport** — has `allowedTimeSlots: TimeSlot[]` (stored as `simple-json`). A reservation's time window must be **fully contained** within one slot.
- **Space** — has `allowedSports: Sport[]` (ManyToMany via `space_sports` join table) and `hourlyRate`.
- **Reservation** — links User + Space + Sport. Starts in `PENDING_PAYMENT`. After `POST /reservations/:id/pay` succeeds → `ACTIVE`. Business rules enforced in `ReservationsService`: start < end, sport allowed in space, time within sport slots, capacity check, no overlap with non-cancelled reservations. `totalValue = hourlyRate * durationHours * numPeople`.
- **PaymentService** — mock gateway. Tokens starting with `fail_` are always declined; everything else succeeds. Replace with a real provider (Stripe, PayU, etc.) when needed.
- **TelegramService** — sends a Telegram message on successful payment (only fires if `TELEGRAM_BOT_TOKEN` is set).

### Serialization

`ClassSerializerInterceptor` is applied at the controller level on auth and reservation controllers. `@Exclude()` on `User.password` and `User.twoFactorSecret` ensures they are never returned in responses.

### Circular dependency resolution

`User.reservations` and `Space.reservations` use lazy string references (`@OneToMany('Reservation', 'user')`) instead of direct class imports to avoid circular dependency issues.
