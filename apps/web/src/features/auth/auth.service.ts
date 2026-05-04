// Provides mock auth service methods until Supabase Auth is connected.
import type { AuthSessionState } from "@/features/auth/auth.types";

export async function getMockAuthSession(): Promise<AuthSessionState> {
  // TODO: Replace with Supabase Auth session lookup.
  return {
    user: null,
    isAuthenticated: false,
  };
}
