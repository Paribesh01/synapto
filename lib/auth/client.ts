import { createAuthClient } from "better-auth/react";

export const {
  signIn,
  signOut,
  signUp,
  useSession,
} = createAuthClient({
  baseURL: process.env.NODE_ENV === "production" 
    ? process.env.BETTER_AUTH_BASE_URL 
    : "http://localhost:3000",
});
