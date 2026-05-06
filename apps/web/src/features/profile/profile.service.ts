// Provides mock profile service methods until Supabase profile tables are connected.
import { mockUserProfile } from "@/mocks/mockUserProfile";
import type { UserProfile } from "@/types/user";

export async function getMockUserProfile(): Promise<UserProfile> {
  // TODO: Replace with Supabase profiles query.
  return mockUserProfile;
}
