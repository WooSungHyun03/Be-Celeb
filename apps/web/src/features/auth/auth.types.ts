// Defines auth contracts for future Supabase Auth integration.
export type AuthUser = {
  id: string;
  email: string;
  displayName?: string;
};

export type AuthSessionState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
};
