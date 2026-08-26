import {
  getCustomersAction,
  getCustomerByPhoneAction,
  createCustomerAction,
  updateCustomerProfileAction,
  setCustomerPasswordAction,
  loginCustomerAction,
  type CustomerAuthCustomer,
} from "@/actions/customers.actions";

export interface ApiCustomerProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  defaultAddress?: string;
  district?: string;
  defaultNote?: string;
  totalOrders: number;
  totalSpent: number;
  isGuest: boolean;
  createdAt: string;
  createdAtUtc?: string;
  googleId?: string | null;
  googleEmail?: string | null;
  profileImage?: string | null;
  area?: string | null;
  postalCode?: string | null;
  hasPassword?: boolean;
  lastLoginAtUtc?: string | null;
}

export type ApiCustomer = ApiCustomerProfile;

export interface ApiProfileUpdate {
  fullName?: string;
  email?: string;
  phone?: string;
  defaultAddress?: string;
  district?: string;
  defaultNote?: string;
}

class CustomersService {
  public async getAll(): Promise<ApiCustomerProfile[]> {
    try {
      return await getCustomersAction();
    } catch {
      return [];
    }
  }

  public async getByPhone(phone: string): Promise<ApiCustomerProfile | null> {
    try {
      return await getCustomerByPhoneAction(phone);
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
  }): Promise<{ id: string }> {
    const res = await createCustomerAction(params);
    if (!res.success || !res.id) {
      throw new Error(res.error || "Failed to create customer");
    }
    return { id: res.id };
  }

  public async updateProfile(id: string, data: ApiProfileUpdate): Promise<ApiCustomerProfile> {
    const res = await updateCustomerProfileAction(id, data);
    if (!res.success || !res.customer) {
      throw new Error(res.error || "Failed to update customer");
    }
    return res.customer;
  }

  public async login(
    emailOrPhone: string,
    pass: string
  ): Promise<{ ok: boolean; customer?: CustomerAuthCustomer; message?: string; isNetworkError?: boolean }> {
    try {
      return await loginCustomerAction(emailOrPhone, pass);
    } catch {
      return { ok: false, message: "Network connection failed", isNetworkError: true };
    }
  }

  public async setPassword(
    phoneOrId: string,
    newPass: string,
    currentPass?: string
  ): Promise<{ ok: boolean; customer?: CustomerAuthCustomer; message?: string; isNetworkError?: boolean }> {
    try {
      return await setCustomerPasswordAction(phoneOrId, newPass, currentPass);
    } catch {
      return { ok: false, message: "Network connection failed", isNetworkError: true };
    }
  }
}

export const customersService = new CustomersService();
