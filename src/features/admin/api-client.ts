export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function callAdminApi<T>(
  path: string,
  adminKey: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(
      typeof data.error === "string" ? data.error : `Request failed (${res.status})`,
    );
  }
  return data as T;
}
