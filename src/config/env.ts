import { z } from "zod";

const envSchema = z.object({
  APP_NAME: z.string().default("Actu Emploi"),
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_VERSION: z.string().default("0.1.0"),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/actu_emploi"),
  PUBLIC_BASE_URL: z.string().url().default("http://localhost:3000")
});

const env = envSchema.parse({
  APP_NAME: process.env.APP_NAME,
  APP_ENV: process.env.APP_ENV,
  APP_VERSION: process.env.APP_VERSION,
  DATABASE_URL: process.env.DATABASE_URL,
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL
});

export function getEnv() {
  return env;
}

export function getPublicAppInfo() {
  return {
    app: env.APP_NAME,
    env: env.APP_ENV,
    version: env.APP_VERSION
  };
}
