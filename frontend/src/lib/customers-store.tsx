"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { hashPassword, verifyPassword } from "@/lib/password";

export interface CustomerMaster {
  customerId: string;
  fullName: string;
  mobileNumber: string; // Unique business key
  email?: string;
  address: string;
  area?: string;
  district?: string;
  postalCode?: string;
  googleId?: string | null;
  googleEmail?: string | null;
  profileImage?: string | null;
  isGoogleVerified: boolean;
  hasPassword: boolean;
  passwordHash?: string | null;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "arzamart_customers_master_v1";

const initialMockCustomers: CustomerMaster[] = [];

type CustomersContextValue = {
  customers: CustomerMaster[];
  findOrCreateByPhone: (
    phone: string,
    details: {
      fullName: string;
      email?: string;
      address: string;
      area?: string;
      district?: string;
    }
  ) => CustomerMaster;
  findCustomerByGoogleId: (googleId: string) => CustomerMaster | undefined;
  findCustomerByPhone: (phone: string) => CustomerMaster | undefined;
  linkGoogleAccount: (params: {
    googleId: string;
    googleEmail: string;
    fullName: string;
    profileImage?: string;
    phone: string;
  }) => { success: boolean; customer?: CustomerMaster; message?: string };
  updateCustomerProfile: (customerId: string, data: Partial<CustomerMaster>) => void;
  setCustomerPassword: (phone: string, password: string) => Promise<boolean>;
  verifyCustomerPassword: (phone: string, password: string) => Promise<boolean>;
};

const CustomersContext = createContext<CustomersContextValue | null>(null);

export function CustomersProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setCustomers(JSON.parse(raw));
      } else {
        setCustomers(initialMockCustomers);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMockCustomers));
      }
    } catch {
      setCustomers(initialMockCustomers);
    }
  }, []);

  const saveCustomers = (newList: CustomerMaster[]) => {
    setCustomers(newList);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch (e) {
      console.warn("Quota exceeded saving customers", e);
    }
  };

  const normalizePhone = (phone: string) => phone.trim().replace(/\s+/g, "");

  const findCustomerByPhone = useCallback(
    (phone: string) => {
      const clean = normalizePhone(phone);
      return customers.find((c) => normalizePhone(c.mobileNumber) === clean);
    },
    [customers]
  );

  const findCustomerByGoogleId = useCallback(
    (googleId: string) => {
      return customers.find((c) => c.googleId === googleId);
    },
    [customers]
  );

  const findOrCreateByPhone = useCallback(
    (
      phone: string,
      details: {
        fullName: string;
        email?: string;
        address: string;
        area?: string;
        district?: string;
      }
    ): CustomerMaster => {
      const cleanPhone = normalizePhone(phone);
      const existing = customers.find((c) => normalizePhone(c.mobileNumber) === cleanPhone);

      if (existing) {
        // Update existing customer info if provided
        const updated: CustomerMaster = {
          ...existing,
          fullName: details.fullName || existing.fullName,
          email: details.email || existing.email,
          address: details.address || existing.address,
          area: details.area || existing.area,
          district: details.district || existing.district,
          updatedAt: new Date().toISOString(),
        };

        const newList = customers.map((c) => (c.customerId === existing.customerId ? updated : c));
        saveCustomers(newList);
        return updated;
      }

      // Create new Customer master record
      const newCustomer: CustomerMaster = {
        customerId: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: details.fullName,
        mobileNumber: cleanPhone,
        email: details.email,
        address: details.address,
        area: details.area,
        district: details.district,
        isGoogleVerified: false,
        hasPassword: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveCustomers([newCustomer, ...customers]);
      return newCustomer;
    },
    [customers]
  );

  const linkGoogleAccount = useCallback(
    (params: {
      googleId: string;
      googleEmail: string;
      fullName: string;
      profileImage?: string;
      phone: string;
    }) => {
      const cleanPhone = normalizePhone(params.phone);

      // Check if googleId is already linked to another customer
      const existingGoogleUser = customers.find((c) => c.googleId === params.googleId);
      if (existingGoogleUser && normalizePhone(existingGoogleUser.mobileNumber) !== cleanPhone) {
        return {
          success: false,
          message: "This Google account is already linked to a different phone number.",
        };
      }

      const existingByPhone = customers.find((c) => normalizePhone(c.mobileNumber) === cleanPhone);

      if (existingByPhone) {
        const updated: CustomerMaster = {
          ...existingByPhone,
          googleId: params.googleId,
          googleEmail: params.googleEmail,
          profileImage: params.profileImage || existingByPhone.profileImage,
          isGoogleVerified: true,
          lastLoginAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const newList = customers.map((c) =>
          c.customerId === existingByPhone.customerId ? updated : c
        );
        saveCustomers(newList);
        return { success: true, customer: updated };
      }

      // If phone does not exist yet, create a new verified Customer record
      const newCustomer: CustomerMaster = {
        customerId: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: params.fullName,
        mobileNumber: cleanPhone,
        email: params.googleEmail,
        address: "Dhaka, Bangladesh",
        googleId: params.googleId,
        googleEmail: params.googleEmail,
        profileImage: params.profileImage,
        isGoogleVerified: true,
        hasPassword: false,
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveCustomers([newCustomer, ...customers]);
      return { success: true, customer: newCustomer };
    },
    [customers]
  );

  const updateCustomerProfile = useCallback(
    (customerId: string, data: Partial<CustomerMaster>) => {
      const newList = customers.map((c) =>
        c.customerId === customerId ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
      );
      saveCustomers(newList);
      toast.success("Profile updated successfully");
    },
    [customers]
  );

  const setCustomerPassword = useCallback(
    async (phone: string, password: string): Promise<boolean> => {
      const clean = normalizePhone(phone);
      const existing = customers.find((c) => normalizePhone(c.mobileNumber) === clean);
      if (!existing) return false;

      const passwordHash = await hashPassword(password);
      const updated: CustomerMaster = {
        ...existing,
        passwordHash,
        hasPassword: true,
        updatedAt: new Date().toISOString(),
      };
      saveCustomers(customers.map((c) => (c.customerId === existing.customerId ? updated : c)));
      return true;
    },
    [customers]
  );

  const verifyCustomerPassword = useCallback(
    async (phone: string, password: string): Promise<boolean> => {
      const clean = normalizePhone(phone);
      const existing = customers.find((c) => normalizePhone(c.mobileNumber) === clean);
      if (!existing || !existing.passwordHash) return false;
      return verifyPassword(password, existing.passwordHash);
    },
    [customers]
  );

  const value = useMemo<CustomersContextValue>(
    () => ({
      customers,
      findOrCreateByPhone,
      findCustomerByGoogleId,
      findCustomerByPhone,
      linkGoogleAccount,
      updateCustomerProfile,
      setCustomerPassword,
      verifyCustomerPassword,
    }),
    [
      customers,
      findOrCreateByPhone,
      findCustomerByGoogleId,
      findCustomerByPhone,
      linkGoogleAccount,
      updateCustomerProfile,
      setCustomerPassword,
      verifyCustomerPassword,
    ]
  );

  return <CustomersContext.Provider value={value}>{children}</CustomersContext.Provider>;
}

export function useCustomers() {
  const ctx = useContext(CustomersContext);
  if (!ctx) throw new Error("useCustomers must be used inside CustomersProvider");
  return ctx;
}
