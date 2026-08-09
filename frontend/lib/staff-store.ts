import { create } from "zustand";

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
  role: StaffRole;
  status: "Active" | "Inactive";
  permissions: StaffPermissions;
  lastLogin?: string;
  createdAt: string;
}

interface StaffStore {
  staffList: StaffMember[];
  addStaff: (staff: Omit<StaffMember, "id" | "createdAt">) => void;
  updateStaff: (id: string, staff: Partial<StaffMember>) => void;
  deleteStaff: (id: string) => void;
}

const mockStaff: StaffMember[] = [
  {
    id: "st-101",
    name: "Admin User",
    email: "admin@alzeena.com",
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
    email: "sales@alzeena.com",
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
    email: "editor@alzeena.com",
    role: "Editor",
    status: "Inactive",
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

export const useStaffStore = create<StaffStore>((set) => ({
  staffList: mockStaff,
  addStaff: (staff) =>
    set((state) => {
      const newStaff: StaffMember = {
        ...staff,
        id: `st-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString(),
      };
      return { staffList: [newStaff, ...state.staffList] };
    }),
  updateStaff: (id, updatedData) =>
    set((state) => ({
      staffList: state.staffList.map((staff) =>
        staff.id === id ? { ...staff, ...updatedData } : staff
      ),
    })),
  deleteStaff: (id) =>
    set((state) => ({
      staffList: state.staffList.filter((staff) => staff.id !== id),
    })),
}));
