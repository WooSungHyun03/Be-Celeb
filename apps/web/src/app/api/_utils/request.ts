export type JsonObject = Record<string, unknown>;

export async function readJsonObject(request: Request): Promise<JsonObject | null> {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return null;
    }

    return body as JsonObject;
  } catch {
    return null;
  }
}

export function getStringField(body: JsonObject, field: string) {
  const value = body[field];

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getOptionalStringField(body: JsonObject, field: string) {
  if (!(field in body)) {
    return undefined;
  }

  const value = body[field];

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getBooleanField(body: JsonObject, field: string) {
  const value = body[field];
  return typeof value === "boolean" ? value : undefined;
}
