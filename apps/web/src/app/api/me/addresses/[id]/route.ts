import { apiError, apiException, apiSuccess } from "@/app/api/_utils/api";
import {
  ADDRESS_SELECT,
  requireActiveUser,
  toPublicAddress,
  type AddressRow,
} from "@/app/api/_utils/account";
import {
  getBooleanField,
  getOptionalStringField,
  readJsonObject,
  type JsonObject,
} from "@/app/api/_utils/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AddressRouteContext = {
  params: Promise<{ id: string }>;
};

type AddressUpdatePayload = Partial<{
  recipient_name: string;
  phone: string;
  zipcode: string;
  address1: string;
  address2: string | null;
  is_default: boolean;
}>;

const ALLOWED_ADDRESS_FIELDS = new Set([
  "recipientName",
  "recipient_name",
  "phone",
  "postalCode",
  "zipcode",
  "address1",
  "address2",
  "isDefault",
  "is_default",
]);

function hasOnlyAllowedFields(body: JsonObject) {
  return Object.keys(body).every((field) => ALLOWED_ADDRESS_FIELDS.has(field));
}

function getOptionalEither(body: JsonObject, first: string, second: string) {
  if (first in body) {
    return getOptionalStringField(body, first);
  }

  if (second in body) {
    return getOptionalStringField(body, second);
  }

  return undefined;
}

function addRequiredStringUpdate(
  payload: AddressUpdatePayload,
  key: "recipient_name" | "phone" | "zipcode" | "address1",
  value: string | null | undefined,
) {
  if (value === undefined) {
    return true;
  }

  if (!value) {
    return false;
  }

  payload[key] = value;
  return true;
}

export async function PATCH(request: Request, context: AddressRouteContext) {
  try {
    const { id } = await context.params;
    const body = await readJsonObject(request);

    if (!body) {
      return apiError("Request body must be a JSON object.", "VALIDATION_ERROR", 400);
    }

    if (!hasOnlyAllowedFields(body)) {
      return apiError("Request contains unsupported address fields.", "VALIDATION_ERROR", 400);
    }

    const updatePayload: AddressUpdatePayload = {};
    const recipientName = getOptionalEither(body, "recipientName", "recipient_name");
    const phone = getOptionalStringField(body, "phone");
    const zipcode = getOptionalEither(body, "postalCode", "zipcode");
    const address1 = getOptionalStringField(body, "address1");
    const address2 = getOptionalStringField(body, "address2");
    const isDefault = getBooleanField(body, "isDefault") ?? getBooleanField(body, "is_default");

    if (
      !addRequiredStringUpdate(updatePayload, "recipient_name", recipientName) ||
      !addRequiredStringUpdate(updatePayload, "phone", phone) ||
      !addRequiredStringUpdate(updatePayload, "zipcode", zipcode) ||
      !addRequiredStringUpdate(updatePayload, "address1", address1)
    ) {
      return apiError("Address fields cannot be empty.", "VALIDATION_ERROR", 400);
    }

    if (address2 !== undefined) {
      updatePayload.address2 = address2;
    }

    if (isDefault !== undefined) {
      updatePayload.is_default = isDefault;
    }

    if (Object.keys(updatePayload).length === 0) {
      return apiError("At least one address field is required.", "VALIDATION_ERROR", 400);
    }

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

    if (updatePayload.is_default === true) {
      const { error: unsetDefaultError } = await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", auth.user.id)
        .eq("is_default", true);

      if (unsetDefaultError) {
        return apiError("Failed to update default address.", "SUPABASE_ERROR", 500);
      }
    }

    const { data: address, error: updateError } = await supabase
      .from("addresses")
      .update(updatePayload)
      .eq("id", existingAddress.id)
      .eq("user_id", auth.user.id)
      .select(ADDRESS_SELECT)
      .single<AddressRow>();

    if (updateError) {
      return apiError("Failed to update address.", "SUPABASE_ERROR", 500);
    }

    return apiSuccess({ address: toPublicAddress(address) });
  } catch (error) {
    return apiException(error, request);
  }
}

export async function DELETE(request: Request, context: AddressRouteContext) {
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

    const { error: deleteError } = await supabase
      .from("addresses")
      .delete()
      .eq("id", existingAddress.id)
      .eq("user_id", auth.user.id);

    if (deleteError) {
      return apiError("Failed to delete address.", "SUPABASE_ERROR", 500);
    }

    if (existingAddress.is_default) {
      const { data: nextDefault, error: nextDefaultError } = await supabase
        .from("addresses")
        .select(ADDRESS_SELECT)
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<AddressRow>();

      if (nextDefaultError) {
        return apiError("Failed to inspect remaining addresses.", "SUPABASE_ERROR", 500);
      }

      if (nextDefault) {
        const { error: defaultError } = await supabase
          .from("addresses")
          .update({ is_default: true })
          .eq("id", nextDefault.id)
          .eq("user_id", auth.user.id);

        if (defaultError) {
          return apiError("Failed to update default address.", "SUPABASE_ERROR", 500);
        }
      }
    }

    return apiSuccess(null);
  } catch (error) {
    return apiException(error, request);
  }
}
