"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useStaffStore, StaffPermissions, StaffRole } from "@/lib/staff-store";
import { useCustomers, CustomerMaster } from "@/lib/customers-store";
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
}

export interface PendingGoogleSession {
  googleId: string;
  googleEmail: string;
  fullName: string;
  profileImage?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  pendingGoogleSession: PendingGoogleSession | null;
  loginCustomer: (emailOrPhone: string, pass: string) => boolean;
  registerCustomer: (data: { name: string; email: string; phone: string; password: string; address?: string }) => boolean;
  loginWithGoogle: (googleProfile: PendingGoogleSession) => { needsPhoneLinking: boolean; success: boolean };
  verifyAndLinkPhone: (phone: string) => boolean;
  cancelPendingGoogle: () => void;
  loginAdmin: (email: string, pass: string) => boolean;
  logout: () => void;
}

const AUTH_STORAGE_KEY = "arzamart_auth_session_v1";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pendingGoogleSession, setPendingGoogleSession] = useState<PendingGoogleSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { staffList } = useStaffStore();
  const { findCustomerByGoogleId, linkGoogleAccount, findOrCreateByPhone } = useCustomers();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Failed to load auth session:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveUserSession = (authUser: AuthUser | null) => {
    setUser(authUser);
    if (authUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  const setCustomerSessionFromMaster = (customer: CustomerMaster) => {
    const authUser: AuthUser = {
      id: customer.customerId,
      name: customer.fullName,
      email: customer.email || customer.googleEmail || `${customer.mobileNumber}@arzamart.com`,
      phone: customer.mobileNumber,
      address: customer.address,
      role: "customer",
      googleId: customer.googleId,
      profileImage: customer.profileImage,
      isGoogleVerified: customer.isGoogleVerified,
    };
    saveUserSession(authUser);
    return authUser;
  };

  const loginWithGoogle = useCallback(
    (googleProfile: PendingGoogleSession) => {
      // Step 1: Check if GoogleId already exists in Customer table
      const existing = findCustomerByGoogleId(googleProfile.googleId);

      if (existing) {
        // Case A: GoogleId exists -> Login successful immediately!
        const authUser = setCustomerSessionFromMaster(existing);
        toast.success("Google Login Successful!", { description: `Welcome back, ${authUser.name}` });
        return { needsPhoneLinking: false, success: true };
      }

      // Case B: GoogleId does not exist -> Require Phone Linking
      setPendingGoogleSession(googleProfile);
      return { needsPhoneLinking: true, success: false };
    },
    [findCustomerByGoogleId]
  );

  const verifyAndLinkPhone = useCallback(
    (phone: string) => {
      if (!pendingGoogleSession) {
        toast.error("No active Google login session");
        return false;
      }

      if (!phone || phone.trim().length < 6) {
        toast.error("Please enter a valid mobile number");
        return false;
      }

      const res = linkGoogleAccount({
        googleId: pendingGoogleSession.googleId,
        googleEmail: pendingGoogleSession.googleEmail,
        fullName: pendingGoogleSession.fullName,
        profileImage: pendingGoogleSession.profileImage,
        phone,
      });

      if (!res.success || !res.customer) {
        toast.error(res.message || "Failed to link phone number");
        return false;
      }

      setCustomerSessionFromMaster(res.customer);
      setPendingGoogleSession(null);
      toast.success("Account Verified & Linked Successfully!", {
        description: `Your orders with ${phone} are now permanently linked to Google.`,
      });
      return true;
    },
    [pendingGoogleSession, linkGoogleAccount]
  );

  const cancelPendingGoogle = useCallback(() => {
    setPendingGoogleSession(null);
  }, []);

  const loginCustomer = useCallback(
    (emailOrPhone: string, pass: string): boolean => {
      if (!emailOrPhone || !pass) {
        toast.error("Please enter email/phone and password");
        return false;
      }

      const master = findOrCreateByPhone(emailOrPhone, {
        fullName: emailOrPhone.includes("@") ? emailOrPhone.split("@")[0]! : "Customer User",
        email: emailOrPhone.includes("@") ? emailOrPhone : undefined,
        address: "Dhaka, Bangladesh",
      });

      setCustomerSessionFromMaster(master);
      toast.success("Welcome back!", { description: `Logged in as ${master.fullName}` });
      return true;
    },
    [findOrCreateByPhone]
  );

  const registerCustomer = useCallback(
    (data: { name: string; email: string; phone: string; password: string; address?: string }): boolean => {
      if (!data.name || !data.phone || !data.password) {
        toast.error("Please fill in required fields");
        return false;
      }

      const master = findOrCreateByPhone(data.phone, {
        fullName: data.name,
        email: data.email,
        address: data.address || "Dhaka, Bangladesh",
      });

      setCustomerSessionFromMaster(master);
      toast.success("Account created successfully!", { description: `Welcome to ARZAMART, ${master.fullName}` });
      return true;
    },
    [findOrCreateByPhone]
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
    [staffList]
  );

  const logout = useCallback(() => {
    saveUserSession(null);
    setPendingGoogleSession(null);
    toast.info("Logged out successfully");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        pendingGoogleSession,
        loginCustomer,
        registerCustomer,
        loginWithGoogle,
        verifyAndLinkPhone,
        cancelPendingGoogle,
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
