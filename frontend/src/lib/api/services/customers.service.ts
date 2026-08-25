import { getAllCustomers, getCustomerByPhone } from "@/lib/data/customers";
import {
  createCustomerAction,
  updateCustomerProfileAction,
  setCustomerPasswordAction,
} from "@/actions/customers.actions";

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

class CustomersService {
  public async getAll(): Promise<ApiCustomer[]> {
    try {
      return await getAllCustomers();
    } catch {
      return [];
    }
  }

  public async getByPhone(phone: string): Promise<ApiCustomerProfile | null> {
    try {
      return await getCustomerByPhone(phone);
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
    try {
      const res = await createCustomerAction(params);
      if (res.success && res.id) return { id: res.id };
      return null;
    } catch {
      return null;
    }
  }

  public async login(identifier: string, _password: string): Promise<ApiCustomerResult> {
    try {
      const customer = await getCustomerByPhone(identifier);
      if (customer) {
        return { ok: true, customer };
      }
      return { ok: false, message: "Customer not found", isNetworkError: false };
    } catch (err: unknown) {
      return { ok: false, message: err instanceof Error ? err.message : "Login failed", isNetworkError: false };
    }
  }

  public async setPassword(
    phone: string,
    newPassword: string,
    _currentPassword?: string
  ): Promise<ApiCustomerResult> {
    try {
      const res = await setCustomerPasswordAction(phone, newPassword);
      if (res.success && res.customer) {
        return { ok: true, customer: res.customer };
      }
      return { ok: false, message: res.error || "Failed to set password", isNetworkError: false };
    } catch (err: unknown) {
      return { ok: false, message: err instanceof Error ? err.message : "Failed to set password", isNetworkError: false };
    }
  }

  public async updateProfile(
    id: string,
    data: ApiProfileUpdate
  ): Promise<ApiCustomerProfile | null> {
    try {
      const res = await updateCustomerProfileAction(id, data);
      if (res.success && res.customer) return res.customer;
      return null;
    } catch {
      return null;
    }
  }
}

export const customersService = new CustomersService();
