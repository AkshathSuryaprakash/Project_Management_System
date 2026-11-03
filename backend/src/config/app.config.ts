import { getEnv } from "../utils/get-env";

const appConfig = () => ({
  NODE_ENV: getEnv("NODE_ENV", "development"),
  PORT: getEnv("PORT", "8000"),
  BASE_PATH: getEnv("BASE_PATH", "/api"),
  MONGO_URI: getEnv("MONGO_URI", "mongodb://127.0.0.1:27017/project_management_saas"),

  SESSION_SECRET: getEnv("SESSION_SECRET", "default_session_secret_for_mca_project_2026"),
  SESSION_EXPIRES_IN: getEnv("SESSION_EXPIRES_IN", "1d"),

  GOOGLE_CLIENT_ID: getEnv("GOOGLE_CLIENT_ID", ""),
  GOOGLE_CLIENT_SECRET: getEnv("GOOGLE_CLIENT_SECRET", ""),
  GOOGLE_CALLBACK_URL: getEnv("GOOGLE_CALLBACK_URL", "http://localhost:8000/api/auth/google/callback"),

  FRONTEND_ORIGIN: getEnv("FRONTEND_ORIGIN", "http://localhost:3000"),
  FRONTEND_GOOGLE_CALLBACK_URL: getEnv("FRONTEND_GOOGLE_CALLBACK_URL", "http://localhost:3000"),
});

export const config = appConfig();
