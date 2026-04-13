# AGENTS.md

## Repository expectations
- This repository is a NestJS backend written in TypeScript.
- Make the minimum viable change that fixes the bug or implements the requested behavior.
- Do not refactor unrelated modules.
- Preserve public API behavior unless the task explicitly requires changing it.

## Project structure
- Application source lives in `src/`.
- Feature modules are organized under folders such as `auth/`, `users/`, `reservations/`, `spaces/`, `sports/`, `payment/`, and `mail/`.
- Shared guards, decorators, and enums belong in `src/common/`.
- Runtime configuration lives in `src/config/`.
- App-wide middleware belongs in `src/middleware/`.
- Unit tests live next to source files as `*.spec.ts`.
- End-to-end tests live in `test/` as `*.e2e-spec.ts`.
- API examples belong in `postman/postman.json`.
- Treat `dist/`, `coverage/`, and the SQLite file referenced by `DB_PATH` as generated output.

## Runbook
- Install dependencies: `npm install`
- Start development server: `npm run start:dev`
- Build application: `npm run build`
- Start production build: `npm run start:prod`
- Run lint: `npm run lint`
- Format code: `npm run format`
- Run unit tests: `npm run test`
- Run coverage: `npm run test:cov`
- Run e2e tests: `npm run test:e2e`

## Debug workflow
- First reproduce the issue before editing code.
- Read `package.json`, `tsconfig.json`, `nest-cli.json`, `src/main.ts`, and `src/app.module.ts` before making non-trivial changes.
- For dependency injection errors, inspect module `imports`, `providers`, and `exports` before changing service logic.
- For validation or request-shape bugs, inspect DTOs, pipes, guards, and controller method signatures before changing persistence code.
- Prefer fixing the root cause over adding bypasses, disabling checks, or introducing broad refactors.

## Change rules
- Keep changes small, localized, and reversible.
- Do not add dependencies unless clearly necessary.
- Do not rename environment variables without updating related documentation and usage.
- Avoid changing endpoint contracts unless the task explicitly requires it.
- When an endpoint contract changes, update `postman/postman.json` or include sample request and response payloads.

## Code style
- Use TypeScript with 2-space indentation, single quotes, and trailing commas.
- Follow NestJS naming conventions: `PascalCase` for classes, `camelCase` for methods and properties, and lowercase filenames such as `users.service.ts` and `create-user.dto.ts`.
- Keep controllers thin.
- Put business logic in services.
- Keep DTOs and entities close to their module.

## Testing expectations
- Add or update tests when changing auth, reservation, payment, or persistence behavior.
- There is no hard coverage threshold in `package.json`, so use `npm run test:cov` to catch regressions in touched modules.
- After code changes, run `npm run build` and `npm run lint`.
- Run relevant tests whenever the changed area already has test coverage or the change affects runtime behavior.

## Security and configuration
- Configuration is centralized in `src/config/configuration.ts` and loaded from `.env`.
- Never commit real JWT, mail, or Telegram secrets.
- Local defaults such as `JWT_SECRET=change-me-in-production` are placeholders only.
- The app currently uses TypeORM with `synchronize: true` and SQLite, so review schema-changing edits carefully and do not treat auto-sync as a production migration strategy.

## Output format
When asked to fix an error or implement a change:
1. State the root cause.
2. Describe the minimum fix.
3. Apply the change.
4. Report exactly which files changed.
5. Show the validation commands that were run and their results.
