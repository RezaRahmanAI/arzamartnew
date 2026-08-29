import { useState, useEffect } from "react";

export type StaffRole = "Admin" | "Manager" | "Editor" | "Viewer";

export interface StaffPermissions {
  orders: boolean;
  products: boolean;
  customers: boolean;
  settings: boolean;
  staff: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: StaffRole;
  status: "Active" | "Inactive";
  permissions: StaffPermissions;
  lastLogin?: string;
  createdAt: string;
}

const STORAGE_KEY = "arzamart_staff_members_v1";

const defaultStaffList: StaffMember[] = [
  {
    id: "st-100",
    name: "Admin User",
    email: "admin@arza.com",
    password: "Admin@123456",
    role: "Admin",
    status: "Active",
    permissions: {
      orders: true,
      products: true,
      customers: true,
      settings: true,
      staff: true,
    },
    lastLogin: "Just now",
    createdAt: "2023-01-01T10:00:00Z",
  },
  {
    id: "st-101",
    name: "Admin User",
    email: "admin@arzamart.com",
    password: "admin123",
    role: "Admin",
    status: "Active",
    permissions: {
      orders: true,
      products: true,
      customers: true,
      settings: true,
      staff: true,
    },
    lastLogin: "Just now",
    createdAt: "2023-01-15T10:00:00Z",
  },
  {
    id: "st-102",
    name: "Sales Manager",
    email: "sales@arzamart.com",
    password: "sales123",
    role: "Manager",
    status: "Active",
    permissions: {
      orders: true,
      products: true,
      customers: true,
      settings: false,
      staff: false,
    },
    lastLogin: "2 hours ago",
    createdAt: "2023-03-20T14:30:00Z",
  },
  {
    id: "st-103",
    name: "Content Editor",
    email: "editor@arzamart.com",
    password: "editor123",
    role: "Editor",
    status: "Active",
    permissions: {
      orders: false,
      products: true,
      customers: false,
      settings: false,
      staff: false,
    },
    lastLogin: "5 days ago",
    createdAt: "2023-05-10T09:15:00Z",
  }
];

function getStoredStaffList(): StaffMember[] {
  if (typeof window === "undefined") return defaultStaffList;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStaffList;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return defaultStaffList;
  } catch {
    return defaultStaffList;
  }
}

function persistStaffList(list: StaffMember[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Failed to persist staff list:", err);
  }
}

let staffListState: StaffMember[] = defaultStaffList;
let isInitialized = false;

function ensureInitialized() {
  if (!isInitialized && typeof window !== "undefined") {
    staffListState = getStoredStaffList();
    isInitialized = true;
  }
}

const listeners = new Set<() => void>();

function notify() {
  persistStaffList(staffListState);
  listeners.forEach((l) => l());
}

export function useStaffStore() {
  ensureInitialized();
  const [list, setList] = useState<StaffMember[]>(staffListState);

  useEffect(() => {
    ensureInitialized();
    setList([...staffListState]);
    const handler = () => setList([...staffListState]);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return {
    staffList: list,
    addStaff: (staff: Omit<StaffMember, "id" | "createdAt">) => {
      ensureInitialized();
      const newStaff: StaffMember = {
        ...staff,
        password: staff.password || "123456",
        id: `st-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString(),
      };
      staffListState = [newStaff, ...staffListState];
      notify();
    },
    updateStaff: (id: string, updatedData: Partial<StaffMember>) => {
      ensureInitialized();
      staffListState = staffListState.map((staff) =>
        staff.id === id ? { ...staff, ...updatedData } : staff
      );
      notify();
    },
    deleteStaff: (id: string) => {
      ensureInitialized();
      staffListState = staffListState.filter((staff) => staff.id !== id);
      notify();
    },
  };
}

