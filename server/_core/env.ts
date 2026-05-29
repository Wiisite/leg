export const ENV = {
  appId: process.env.VITE_APP_ID || "leg-app",
  cookieSecret: process.env.JWT_SECRET || process.env.AUTH_SECRET || "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

if (ENV.isProduction && !ENV.cookieSecret) {
  throw new Error("JWT_SECRET or AUTH_SECRET must be configured in production");
}
