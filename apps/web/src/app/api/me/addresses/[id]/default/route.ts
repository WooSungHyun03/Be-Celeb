import { apiError, apiException, apiSuccess } from "@/app/api/_utils/api";
import {
  ADDRESS_SELECT,
  requireActiveUser,
  toPublicAddress,
  type AddressRow,
} from "@/app/api/_utils/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DefaultAddressRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: DefaultAddressRouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const auth = await requireActiveUser(supabase);

    if (auth.response || !auth.user) {
      return auth.response;
    }

    const { data: existingAddress, error: lookupError } = await supabase
      .from("addresses")
      .select(ADDRESS_SELECT)
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle<AddressRow>();

    if (lookupError) {
      return apiError("Failed to load address.", "SUPABASE_ERROR", 500);
    }

    if (!existingAddress) {
      return apiError("Address not found.", "NOT_FOUND", 404);
    }

    const { error: unsetDefaultError } = await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", auth.user.id)
      .eq("is_default", true);

    if (unsetDefaultError) {
      return apiError("Failed to update default address.", "SUPABASE_ERROR", 500);
    }

    const { data: address, error: updateError } = await supabase
      .from("addresses")
      .update({ is_default: true })
      .eq("id", existingAddress.id)
      .eq("user_id", auth.user.id)
      .select(ADDRESS_SELECT)
      .single<AddressRow>();

    if (updateError) {
      return apiError("Failed to update default address.", "SUPABASE_ERROR", 500);
    }

    return apiSuccess({ address: toPublicAddress(address) });
  } catch (error) {
    return apiException(error, request);
  }
}
