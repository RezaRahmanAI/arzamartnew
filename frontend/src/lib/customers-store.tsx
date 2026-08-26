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
import { customersService } from "@/lib/api/services/customers.service";

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
  defaultNote?: string;
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
  findCustomerByPhone: (phone: string) => CustomerMaster | undefined;
  updateCustomerProfile: (customerId: string, data: Partial<CustomerMaster>) => CustomerMaster | null;
  upsertCustomerFromServer: (profile: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    googleId?: string | null;
    googleEmail?: string | null;
    profileImage?: string | null;
    defaultAddress?: string | null;
    area?: string | null;
    district?: string;
    postalCode?: string | null;
    defaultNote?: string | null;
    isGuest?: boolean;
    hasPassword?: boolean;
  }) => CustomerMaster;
  setCustomerPassword: (phone: string, password: string) => Promise<CustomerMaster | null>;
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

  // Sync the full customer list from the server so admin search/autofill works
  // even for customers who only exist in the database (e.g. checkout customers).
  useEffect(() => {
    customersService.getAll().then((list) => {
      if (!list || list.length === 0) return;
      setCustomers((prev) => {
        const map = new Map<string, CustomerMaster>(prev.map((c) => [c.customerId, c]));
        for (const c of list) {
          const clean = c.phone.trim().replace(/\s+/g, "");
          const existing = prev.find((x) => x.mobileNumber === clean);
          map.set(existing ? existing.customerId : c.id, {
            customerId: existing ? existing.customerId : c.id,
            fullName: c.fullName,
            mobileNumber: clean,
            email: c.email,
            address: c.defaultAddress || "",
            area: undefined,
            district: c.district || "Dhaka",
            isGoogleVerified: false,
            hasPassword: false,
            createdAt: existing ? existing.createdAt : (c.createdAt || c.createdAtUtc || new Date().toISOString()),
            updatedAt: new Date().toISOString(),
          });
        }
        const merged = Array.from(map.values());
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {
          /* ignore */
        }
        return merged;
      });
    });
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

  const updateCustomerProfile = useCallback(
    (customerId: string, data: Partial<CustomerMaster>): CustomerMaster | null => {
      let updatedRecord: CustomerMaster | null = null;
      const newList = customers.map((c) => {
        if (c.customerId !== customerId) return c;
        updatedRecord = { ...c, ...data, updatedAt: new Date().toISOString() };
        return updatedRecord;
      });
      saveCustomers(newList);
      return updatedRecord;
    },
    [customers]
  );

  const upsertCustomerFromServer = useCallback(
    (profile: {
      id: string;
      fullName: string;
      email: string;
      phone: string;
      googleId?: string | null;
      googleEmail?: string | null;
      profileImage?: string | null;
      defaultAddress?: string | null;
      area?: string | null;
      district?: string;
      postalCode?: string | null;
      defaultNote?: string | null;
      isGuest?: boolean;
      hasPassword?: boolean;
    }): CustomerMaster => {
      const cleanPhone = normalizePhone(profile.phone);
      const existing = customers.find((c) => normalizePhone(c.mobileNumber) === cleanPhone);
      const now = new Date().toISOString();

      if (existing) {
        const updated: CustomerMaster = {
          ...existing,
          fullName: profile.fullName || existing.fullName,
          email: profile.email || existing.email,
          address: profile.defaultAddress ?? existing.address,
          area: profile.area ?? existing.area,
          district: profile.district ?? existing.district,
          postalCode: profile.postalCode ?? existing.postalCode,
          googleId: profile.googleId ?? existing.googleId,
          googleEmail: profile.googleEmail ?? existing.googleEmail,
          profileImage: profile.profileImage ?? existing.profileImage,
          defaultNote: profile.defaultNote ?? existing.defaultNote,
          hasPassword: profile.hasPassword ?? existing.hasPassword,
          updatedAt: now,
        };
        const newList = customers.map((c) => (c.customerId === existing.customerId ? updated : c));
        saveCustomers(newList);
        return updated;
      }

      const newCustomer: CustomerMaster = {
        customerId: profile.id,
        fullName: profile.fullName,
        mobileNumber: cleanPhone,
        email: profile.email,
        address: profile.defaultAddress ?? "",
        area: profile.area ?? undefined,
        district: profile.district ?? "Dhaka",
        postalCode: profile.postalCode ?? undefined,
        googleId: profile.googleId,
        googleEmail: profile.googleEmail,
        profileImage: profile.profileImage,
        isGoogleVerified: !!profile.googleId,
        hasPassword: !!profile.hasPassword,
        defaultNote: profile.defaultNote ?? undefined,
        createdAt: now,
        updatedAt: now,
      };
      saveCustomers([newCustomer, ...customers]);
      return newCustomer;
    },
    [customers]
  );

  const setCustomerPassword = useCallback(
    async (phone: string, password: string): Promise<CustomerMaster | null> => {
      const clean = normalizePhone(phone);
      const existing = customers.find((c) => normalizePhone(c.mobileNumber) === clean);
      if (!existing) return null;

      const passwordHash = await hashPassword(password);
      const updated: CustomerMaster = {
        ...existing,
        passwordHash,
        hasPassword: true,
        updatedAt: new Date().toISOString(),
      };
      saveCustomers(customers.map((c) => (c.customerId === existing.customerId ? updated : c)));
      return updated;
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
      findCustomerByPhone,
      updateCustomerProfile,
      upsertCustomerFromServer,
      setCustomerPassword,
      verifyCustomerPassword,
    }),
    [
      customers,
      findOrCreateByPhone,
      findCustomerByPhone,
      updateCustomerProfile,
      upsertCustomerFromServer,
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
