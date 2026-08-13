import { apiConfig } from "./config";
import { ApiError, type ApiResponse } from "./types";

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = apiConfig.baseUrl;
  }

  private getAuthToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("arza-auth-token");
    }
    return null;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
    const token = this.getAuthToken();

    const headers: Record<string, string> = {
      ...apiConfig.headers,
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const contentType = response.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");
      const data = isJson ? await response.json() : null;

      if (!response.ok) {
        throw new ApiError(
          data?.message || `HTTP Request failed with status ${response.status}`,
          response.status,
          data
        );
      }

      // Handle standard API envelope { success: true, data: ... } or raw payload
      if (data && typeof data === "object" && "data" in data) {
        return (data as ApiResponse<T>).data;
      }

      return data as T;
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error && err.message.includes("fetch"));
      throw new ApiError(
        isNetworkError ? "Unable to reach the server. Check your connection." : err instanceof Error ? err.message : "Network error occurred",
        500,
        undefined,
        isNetworkError
      );
    }
  }

  public get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  public post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  public async uploadFile(file: File, folder: string = "products"): Promise<{ url: string }> {
    const url = `${this.baseUrl}/uploads`;
    const token = this.getAuthToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new ApiError(`Upload failed with status ${response.status}`, response.status);
    }

    const data = await response.json();
    return data;
  }
}

export const apiClient = new ApiClient();
