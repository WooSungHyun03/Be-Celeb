import { apiError, apiException, apiSuccess } from "@/app/api/_utils/api";
import {
  ADDRESS_SELECT,
  requireActiveUser,
  toPublicAddress,
  type AddressRow,
} from "@/app/api/_utils/account";
import { getBooleanField, getStringField, readJsonObject } from "@/app/api/_utils/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const auth = await requireActiveUser(supabase);

    if (auth.response || !auth.user) {
      return auth.response;
    }

    const { data, error } = await supabase
      .from("addresses")
      .select(ADDRESS_SELECT)
      .eq("user_id", auth.user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<AddressRow[]>();

    if (error) {
      return apiError("Failed to load addresses.", "SUPABASE_ERROR", 500);
    }

    return apiSuccess({ addresses: data.map(toPublicAddress) });
  } catch (error) {
    return apiException(error, request);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);

    if (!body) {
      return apiError("Request body must be a JSON object.", "VALIDATION_ERROR", 400);
    }

    const recipientName = getStringField(body, "recipientName") ?? getStringField(body, "recipient_name");
    const phone = getStringField(body, "phone");
    const zipcode = getStringField(body, "postalCode") ?? getStringField(body, "zipcode");
    const address1 = getStringField(body, "address1");
    const address2 = getStringField(body, "address2");
    const requestedDefault = getBooleanField(body, "isDefault") ?? getBooleanField(body, "is_default") ?? false;

    if (!recipientName || !phone || !zipcode || !address1) {
      return apiError("Recipient, phone, postal code, and address1 are required.", "VALIDATION_ERROR", 400);
    }

    const supabase = await createSupabaseServerClient();
    const auth = await requireActiveUser(supabase);

    if (auth.response || !auth.user) {
      return auth.response;
    }

    const { count, error: countError } = await supabase
      .from("addresses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.user.id);

    if (countError) {
      return apiError("Failed to inspect addresses.", "SUPABASE_ERROR", 500);
    }

    const shouldBeDefault = requestedDefault || count === 0;

    if (shouldBeDefault) {
      const { error: unsetDefaultError } = await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", auth.user.id)
        .eq("is_default", true);

      if (unsetDefaultError) {
        return apiError("Failed to update default address.", "SUPABASE_ERROR", 500);
      }
    }

    const { data: address, error: insertError } = await supabase
      .from("addresses")
      .insert({
        user_id: auth.user.id,
        recipient_name: recipientName,
        phone,
        zipcode,
        address1,
        address2,
        is_default: shouldBeDefault,
      })
      .select(ADDRESS_SELECT)
      .single<AddressRow>();

    if (insertError) {
      return apiError("Failed to create address.", "SUPABASE_ERROR", 500);
    }

    return apiSuccess({ address: toPublicAddress(address) }, 201);
  } catch (error) {
    return apiException(error, request);
  }
}
