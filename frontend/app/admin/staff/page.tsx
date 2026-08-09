"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Shield, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStaffStore, type StaffMember, type StaffRole, type StaffPermissions } from "@/lib/staff-store";

const defaultPermissions: StaffPermissions = {
  orders: false,
  products: false,
  customers: false,
  settings: false,
  staff: false,
};

type FormState = Omit<StaffMember, "id" | "createdAt" | "lastLogin">;

const emptyForm: FormState = {
  name: "",
  email: "",
  role: "Viewer",
  status: "Active",
  permissions: { ...defaultPermissions },
};

export default function AdminStaff() {
  const { staffList, addStaff, updateStaff, deleteStaff } = useStaffStore();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const openCreate = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setOpen(true);
  };

  const openEdit = (staff: StaffMember) => {
    setForm({
      name: staff.name,
      email: staff.email,
      role: staff.role,
      status: staff.status,
      permissions: { ...staff.permissions },
    });
    setEditingId(staff.id);
    setOpen(true);
  };

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const updatePermission = (key: keyof StaffPermissions, checked: boolean) => {
    setForm((f) => ({
      ...f,
      permissions: { ...f.permissions, [key]: checked },
    }));
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Name and Email are required");
      return;
    }

    if (editingId) {
      updateStaff(editingId, form);
      toast.success("Staff member updated", { description: form.name });
    } else {
      addStaff(form);
      toast.success("Staff member created", { description: form.name });
    }
    setOpen(false);
  };

  const toggleStatus = (staff: StaffMember) => {
    const nextStatus = staff.status === "Active" ? "Inactive" : "Active";
    updateStaff(staff.id, { status: nextStatus });
    toast.success(`Staff marked as ${nextStatus}`, {
      description: staff.name,
    });
  };

  const remove = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name}?`)) {
      deleteStaff(id);
      toast.success("Staff member removed");
    }
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage employee access, roles, and dashboard permissions.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" />
          Add Staff
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Access Level</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffList.map((staff) => {
              const activeCount = Object.values(staff.permissions).filter(Boolean).length;
              return (
                <TableRow key={staff.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground">{staff.name}</div>
                      <div className="text-xs text-muted-foreground">{staff.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Shield className="size-3.5 text-muted-foreground" />
                      <span className="font-medium">{staff.role}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {staff.role === "Admin" ? "Full Access" : `${activeCount} Modules`}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {staff.lastLogin || "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      onClick={() => toggleStatus(staff)}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${
                        staff.status === "Active"
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      }`}
                    >
                      {staff.status}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(staff)}
                        className="rounded-md border border-border p-2 text-foreground transition-colors hover:border-primary hover:text-primary cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(staff.id, staff.name)}
                        className="rounded-md border border-border p-2 text-foreground transition-colors hover:border-destructive hover:text-destructive cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Staff Member" : "Add New Staff"}</DialogTitle>
            <DialogDescription>
              Assign roles and specific module permissions for dashboard access.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={form.role}
                  onChange={(e) => updateField("role", e.target.value as StaffRole)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Editor">Editor</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value as "Active" | "Inactive")}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Module Permissions</Label>
                {form.role === "Admin" && (
                  <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                    Admins have full access
                  </span>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {Object.entries(form.permissions).map(([key, value]) => (
                  <label
                    key={key}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      value ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.role === "Admin" ? true : value}
                      disabled={form.role === "Admin"}
                      onChange={(e) => updatePermission(key as keyof StaffPermissions, e.target.checked)}
                      className="mt-0.5 size-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                    />
                    <div>
                      <div className="text-sm font-semibold capitalize">{key}</div>
                      <div className="text-xs text-muted-foreground">
                        Allow access to manage {key}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                <X className="mr-1 size-4" />
                Cancel
              </Button>
              <Button type="submit">
                {editingId ? "Save Changes" : "Add Staff"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
