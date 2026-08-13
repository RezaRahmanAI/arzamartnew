import { apiClient } from "../client";
import { apiConfig } from "../config";

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

class CustomersService {
  public async getAll(): Promise<ApiCustomer[]> {
    if (apiConfig.useMockData) return [];
    try {
      return await apiClient.get<ApiCustomer[]>("/customer");
    } catch {
      return [];
    }
  }
}

export const customersService = new CustomersService();
