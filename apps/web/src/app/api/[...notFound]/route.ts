import { apiError, logNotFound } from "@/app/api/_utils/api";

export const dynamic = "force-dynamic";

async function notFound(request: Request) {
  await logNotFound(request);
  return apiError("Not found.", "NOT_FOUND", 404);
}

export async function GET(request: Request) {
  return notFound(request);
}

export async function POST(request: Request) {
  return notFound(request);
}

export async function PATCH(request: Request) {
  return notFound(request);
}

export async function DELETE(request: Request) {
  return notFound(request);
}

export async function PUT(request: Request) {
  return notFound(request);
}
