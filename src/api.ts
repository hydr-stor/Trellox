import { useCallback, useEffect, useState } from "react";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const isForm = data instanceof FormData;
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: !isForm && data ? { "Content-Type": "application/json" } : {},
    ...(data ? { body: isForm ? data : JSON.stringify(data) } : {}),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("تعذر الاتصال بالخادم. حاول مجدداً.");
  }
  if (!response.ok)
    throw new ApiError(
      (result as { error?: string })?.error || "تعذر إكمال العملية",
      response.status,
    );
  return result as T;
}
export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setError("");
    try {
      setData(await api<T>(path));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    setData(null);
    setLoading(true);
    void reload();
  }, [reload]);
  return { data, error, loading, reload };
}
