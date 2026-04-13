export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    path: process.env.DB_PATH ?? 'database.sqlite',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    twoFactorSecret:
      process.env.JWT_2FA_SECRET ?? 'change-2fa-secret-in-production',
    twoFactorExpiresIn: process.env.JWT_2FA_EXPIRES_IN ?? '5m',
  },
  twoFactor: {
    appName: process.env.TWO_FACTOR_APP_NAME ?? 'SportsFacility',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    chatId: process.env.TELEGRAM_CHAT_ID ?? '',
  },
});
