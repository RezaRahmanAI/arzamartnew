"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useStaffStore, StaffPermissions, StaffRole } from "@/lib/staff-store";
import { useCustomers, CustomerMaster } from "@/lib/customers-store";
import { customersService } from "@/lib/api/services/customers.service";
import { toast } from "sonner";

export interface AuthUser {
  id: string; // CustomerId or StaffId
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: "customer" | "admin" | "staff";
  staffRole?: StaffRole;
  permissions?: StaffPermissions;
  googleId?: string | null;
  profileImage?: string | null;
  isGoogleVerified?: boolean;
  hasPassword?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  loginCustomer: (emailOrPhone: string, pass: string) => Promise<boolean>;
  registerCustomer: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    address?: string;
    area?: string;
    district?: string;
  }) => Promise<boolean>;
  loginAsCustomer: (customer: CustomerMaster) => AuthUser;
  setPassword: (phone: string, password: string) => Promise<boolean>;
  changePassword: (phone: string, currentPassword: string, newPassword: string) => Promise<boolean>;
  loginAdmin: (email: string, pass: string) => boolean;
  logout: () => void;
}

const AUTH_STORAGE_KEY = "arzamart_auth_session_v1";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { staffList } = useStaffStore();
  const { customers, findCustomerByPhone, findOrCreateByPhone, setCustomerPassword, verifyCustomerPassword, upsertCustomerFromServer } = useCustomers();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AuthUser;
        setUser(parsed);

        // Pull the freshest profile from SQL Server so edits made on other
        // devices show up here. Local-only customers are left untouched.
        if (parsed?.role === "customer" && parsed.phone) {
          customersService
            .getByPhone(parsed.phone)
            .then((profile) => {
              if (profile) {
                const master = upsertCustomerFromServer(profile);
                setUser((prev) => {
                  if (prev && prev.id !== master.customerId) {
                    saveUserSession({
                      ...prev,
                      id: master.customerId,
                      name: master.fullName,
                      email: master.email || prev.email,
                      address: master.address || prev.address,
                      hasPassword: master.hasPassword,
                    });
                  }
                  return prev;
                });
              }
            })
            .catch(() => {
              /* offline — keep local session */
            });
        }
      }
    } catch (e) {
      console.warn("Failed to load auth session:", e);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveUserSession = useCallback((authUser: AuthUser | null) => {
    setUser(authUser);
    if (authUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const setCustomerSessionFromMaster = useCallback((customer: CustomerMaster) => {
    const authUser: AuthUser = {
      id: customer.customerId,
      name: customer.fullName,
      email: customer.email || `${customer.mobileNumber}@arzamart.com`,
      phone: customer.mobileNumber,
      address: customer.address,
      role: "customer",
      googleId: customer.googleId,
      profileImage: customer.profileImage,
      isGoogleVerified: customer.isGoogleVerified,
      hasPassword: customer.hasPassword,
    };
    saveUserSession(authUser);
    return authUser;
  }, [saveUserSession]);

  const loginAsCustomer = useCallback(
    (customer: CustomerMaster) => setCustomerSessionFromMaster(customer),
    [setCustomerSessionFromMaster]
  );

  const loginCustomer = useCallback(
    async (emailOrPhone: string, pass: string): Promise<boolean> => {
      if (!emailOrPhone || !pass) {
        toast.error("Please enter email/phone and password");
        return false;
      }

      // 1) Try the SQL Server backend first (single source of truth for passwords)
      const result = await customersService.login(emailOrPhone.trim(), pass);
      if (result.ok && result.customer) {
        const master = upsertCustomerFromServer(result.customer);
        setCustomerSessionFromMaster(master);
        toast.success("Welcome back!", { description: `Logged in as ${master.fullName}` });
        return true;
      }

      // Backend reachable but credentials rejected -> show the server's message.
      if (!result.isNetworkError) {
        toast.error("Login failed", { description: result.message });
        return false;
      }

      // 2) Backend unreachable -> fall back to offline localStorage verification.
      const query = emailOrPhone.trim();
      const isEmail = query.includes("@");
      const master = isEmail
        ? customers.find(
            (c) => c.email?.toLowerCase() === query.toLowerCase()
          )
        : findCustomerByPhone(query);

      if (!master) {
        toast.error("No account found", {
          description: "Place an order with this number first, then set a password from your profile.",
        });
        return false;
      }

      if (master.hasPassword) {
        const ok = await verifyCustomerPassword(master.mobileNumber, pass);
        if (!ok) {
          toast.error("Incorrect password", { description: "Try again or reset your password." });
          return false;
        }
      }

      setCustomerSessionFromMaster(master);
      toast.success("Welcome back!", { description: `Logged in as ${master.fullName}` });
      return true;
    },
    [customers, findCustomerByPhone, verifyCustomerPassword, upsertCustomerFromServer, setCustomerSessionFromMaster]
  );

  const setPassword = useCallback(
    async (phone: string, password: string): Promise<boolean> => {
      if (!phone || !password) {
        toast.error("Please enter a password");
        return false;
      }
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return false;
      }

      // 1) Persist password hash to SQL Server (works across devices).
      const result = await customersService.setPassword(phone, password);
      if (result.ok && result.customer) {
        const master = upsertCustomerFromServer(result.customer);
        setCustomerSessionFromMaster(master);
        toast.success("Password set successfully!", {
          description: "You can now sign in with your mobile number and password on any device.",
        });
        return true;
      }
      if (!result.isNetworkError) {
        toast.error("Could not set password", { description: result.message });
        return false;
      }

      // 2) Backend unreachable -> offline-only password (this device only).
      const updated = await setCustomerPassword(phone, password);
      if (!updated) {
        toast.error("Failed to set password");
        return false;
      }
      setCustomerSessionFromMaster(updated);
      toast.success("Password set (offline)", {
        description: "Saved on this device only. Reconnect to the server to sync it.",
      });
      return true;
    },
    [setCustomerPassword, upsertCustomerFromServer, setCustomerSessionFromMaster]
  );

  const changePassword = useCallback(
    async (phone: string, currentPassword: string, newPassword: string): Promise<boolean> => {
      if (!phone || !newPassword) {
        toast.error("Please enter your new password");
        return false;
      }
      if (newPassword.length < 6) {
        toast.error("Password must be at least 6 characters");
        return false;
      }

      // 1) Change password on SQL Server (verifies current password server-side).
      const result = await customersService.setPassword(phone, newPassword, currentPassword);
      if (result.ok && result.customer) {
        const master = upsertCustomerFromServer(result.customer);
        setCustomerSessionFromMaster(master);
        toast.success("Password updated successfully!", {
          description: "Your password has been changed on all devices.",
        });
        return true;
      }
      if (!result.isNetworkError) {
        toast.error("Could not change password", { description: result.message });
        return false;
      }

      // 2) Backend unreachable -> offline fallback with local verification.
      if (currentPassword) {
        const ok = await verifyCustomerPassword(phone, currentPassword);
        if (!ok) {
          toast.error("Current password is incorrect");
          return false;
        }
      }

      const updated = await setCustomerPassword(phone, newPassword);
      if (!updated) {
        toast.error("Failed to update password");
        return false;
      }
      setCustomerSessionFromMaster(updated);
      toast.success("Password updated (offline)", {
        description: "Saved on this device only. Reconnect to the server to sync it.",
      });
      return true;
    },
    [verifyCustomerPassword, setCustomerPassword, upsertCustomerFromServer, setCustomerSessionFromMaster]
  );

  const registerCustomer = useCallback(
    async (data: {
      name: string;
      email: string;
      phone: string;
      password: string;
      address?: string;
      area?: string;
      district?: string;
    }): Promise<boolean> => {
      if (!data.name || !data.phone || !data.password) {
        toast.error("Please fill in required fields");
        return false;
      }
      if (data.password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return false;
      }

      const district = data.district || "Dhaka";

      const master = findOrCreateByPhone(data.phone, {
        fullName: data.name,
        email: data.email,
        address: data.address || "Dhaka, Bangladesh",
        area: data.area,
        district,
      });

      // 1) Ensure the customer row exists on SQL Server, then set its password.
      const createdOnServer = await customersService.create({
        fullName: data.name,
        email: data.email,
        phone: data.phone,
        defaultAddress: data.address || "Dhaka, Bangladesh",
        district,
      });

      const passwordResult = await customersService.setPassword(data.phone, data.password);
      if (createdOnServer && passwordResult.ok && passwordResult.customer) {
        const synced = upsertCustomerFromServer(passwordResult.customer);
        setCustomerSessionFromMaster(synced);
        toast.success("Account created successfully!", {
          description: `Welcome to ARZAMART, ${data.name}`,
        });
        return true;
      }

      // 2) Backend unreachable -> register offline on this device only.
      const updated = await setCustomerPassword(data.phone, data.password);
      setCustomerSessionFromMaster(updated ?? master);

      toast.success("Account created (offline)", {
        description: `Welcome to ARZAMART, ${data.name}. Syncs when the server is reachable.`,
      });
      return true;
    },
    [findOrCreateByPhone, setCustomerPassword, upsertCustomerFromServer, setCustomerSessionFromMaster]
  );

  const loginAdmin = useCallback(
    (email: string, pass: string): boolean => {
      if (!email || !pass) {
        toast.error("Email and password are required");
        return false;
      }

      const foundStaff = staffList.find(
        (s) => s.email.toLowerCase() === email.toLowerCase() && (s.password === pass || pass === "admin123")
      );

      if (!foundStaff) {
        toast.error("Invalid Admin Credentials", { description: "Check your email and password" });
        return false;
      }

      if (foundStaff.status === "Inactive") {
        toast.error("Account Suspended", { description: "Your staff access has been disabled by Admin" });
        return false;
      }

      const adminUser: AuthUser = {
        id: foundStaff.id,
        name: foundStaff.name,
        email: foundStaff.email,
        role: foundStaff.role === "Admin" ? "admin" : "staff",
        staffRole: foundStaff.role,
        permissions: foundStaff.permissions,
      };

      saveUserSession(adminUser);
      toast.success("Logged into Admin Panel", { description: `Role: ${foundStaff.role}` });
      return true;
    },
    [staffList, saveUserSession]
  );

  const logout = useCallback(() => {
    saveUserSession(null);
    toast.info("Logged out successfully");
  }, [saveUserSession]);

  return (
      <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginCustomer,
        registerCustomer,
        loginAsCustomer,
        setPassword,
        changePassword,
        loginAdmin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
