export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/"))
      window.dispatchEvent(new Event("session-expired"));
    throw new HttpError(
      result.error?.message ?? "ไม่สามารถเชื่อมต่อระบบได้",
      response.status,
    );
  }
  return result.data;
}
export const send = <T>(path: string, method: string, value?: unknown) =>
  api<T>(path, {
    method,
    body: value === undefined ? undefined : JSON.stringify(value),
  });
