import { apiClient } from "../client";
import { apiConfig } from "../config";
import { ApiError } from "../types";

export interface ApiCustomer {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  district: string;
  defaultAddress: string | null;
  isGuest: boolean;
  createdAtUtc: string;
  orderCount: number;
  totalSpent: number;
}

export interface ApiCustomerProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  googleId: string | null;
  googleEmail: string | null;
  profileImage: string | null;
  defaultAddress: string | null;
  area: string | null;
  district: string;
  postalCode: string | null;
  defaultNote: string | null;
  isGuest: boolean;
  hasPassword: boolean;
  lastLoginAtUtc: string | null;
  createdAtUtc: string;
}

export interface ApiProfileUpdate {
  fullName?: string;
  phone?: string;
  email?: string;
  defaultAddress?: string;
  area?: string;
  district?: string;
  postalCode?: string;
  defaultNote?: string;
}

export type ApiCustomerResult =
  | { ok: true; customer: ApiCustomerProfile }
  | { ok: false; message: string; isNetworkError: boolean };

const toErrorResult = (err: unknown): { message: string; isNetworkError: boolean } => {
  if (err instanceof ApiError) {
    return { message: err.message, isNetworkError: err.isNetworkError };
  }
  return {
    message: err instanceof Error ? err.message : "Request failed",
    isNetworkError: true,
  };
};

class CustomersService {
  public async getAll(): Promise<ApiCustomer[]> {
    if (apiConfig.useMockData) return [];
    try {
      return await apiClient.get<ApiCustomer[]>("/customer");
    } catch {
      return [];
    }
  }

  public async getByPhone(phone: string): Promise<ApiCustomerProfile | null> {
    if (apiConfig.useMockData) return null;
    try {
      return await apiClient.get<ApiCustomerProfile>(
        `/customer/by-phone/${encodeURIComponent(phone.trim())}`
      );
    } catch {
      return null;
    }
  }

  public async create(params: {
    fullName: string;
    email: string;
    phone: string;
    defaultAddress?: string;
    district?: string;
  }): Promise<{ id: string } | null> {
    if (apiConfig.useMockData) return null;
    try {
      // Backend POST /customer returns Result<CustomerDto> envelope; apiClient unwraps .data.
      const customer = await apiClient.post<{ id: string; fullName: string; phone: string }>(
        "/customer",
        { ...params, isGuest: false }
      );
      return { id: customer.id };
    } catch {
      return null;
    }
  }

  public async linkGoogle(
    customerId: string,
    googleId: string,
    googleEmail: string
  ): Promise<boolean> {
    if (apiConfig.useMockData) return false;
    try {
      await apiClient.post<boolean>("/customer/link-google", {
        customerId,
        googleId,
        googleEmail,
      });
      return true;
    } catch {
      return false;
    }
  }

  public async login(identifier: string, password: string): Promise<ApiCustomerResult> {
    if (apiConfig.useMockData) return { ok: false, message: "Mock mode", isNetworkError: false };
    try {
      const customer = await apiClient.post<ApiCustomerProfile>("/customer/login", {
        identifier,
        password,
      });
      return { ok: true, customer };
    } catch (err) {
      const { message, isNetworkError } = toErrorResult(err);
      return { ok: false, message, isNetworkError };
    }
  }

  public async setPassword(
    phone: string,
    newPassword: string,
    currentPassword?: string
  ): Promise<ApiCustomerResult> {
    if (apiConfig.useMockData) return { ok: false, message: "Mock mode", isNetworkError: false };
    try {
      const customer = await apiClient.post<ApiCustomerProfile>("/customer/set-password", {
        phone,
        currentPassword,
        newPassword,
      });
      return { ok: true, customer };
    } catch (err) {
      const { message, isNetworkError } = toErrorResult(err);
      return { ok: false, message, isNetworkError };
    }
  }

  public async updateProfile(
    id: string,
    data: ApiProfileUpdate
  ): Promise<ApiCustomerProfile | null> {
    if (apiConfig.useMockData) return null;
    try {
      return await apiClient.put<ApiCustomerProfile>(`/customer/${id}`, data);
    } catch {
      return null;
    }
  }
}

export const customersService = new CustomersService();
