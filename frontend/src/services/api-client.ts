const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export interface ApiResponse<T> {
  isSuccess: boolean;
  data: T;
  errorMessage?: string;
  errors?: string[];
}

export interface PagedResponse<T> {
  items: T[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit & { requiresAuth?: boolean } = {}
): Promise<ApiResponse<T>> {
  const { requiresAuth = false, headers, ...restOptions } = options;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (requiresAuth && typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: requestHeaders,
    ...restOptions,
  });

  if (response.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    window.location.href = "/login?expired=true";
    throw new Error("Unauthorized - Session expired");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.Message || errorBody.errorMessage || `HTTP Error ${response.status}`);
  }

  return response.json();
}
