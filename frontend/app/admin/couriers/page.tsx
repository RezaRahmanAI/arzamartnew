"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Phone,
  Mail,
  RotateCcw,
  SlidersHorizontal,
  Pencil,
  Power,
  ShieldCheck,
  TrendingUp,
  Package,
} from "lucide-react";
import { formatBDT } from "@/lib/shop-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  getCouriersAction,
  createCourierAction,
  updateCourierAction,
  toggleCourierActiveAction,
  type CourierDto,
} from "@/actions/couriers.actions";

export default function CourierManagementPage() {
  const [couriers, setCouriers] = useState<CourierDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<CourierDto | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formContactPerson, setFormContactPerson] = useState("");
  const [formApiStatus, setFormApiStatus] = useState("manual");
  const [formNotes, setFormNotes] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  // Load Couriers
  const loadCouriers = async () => {
    setIsLoading(true);
    const data = await getCouriersAction();
    setCouriers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCouriers();
  }, []);

  const openCreateModal = () => {
    setEditingCourier(null);
    setFormName("");
    setFormCode("");
    setFormPhone("");
    setFormEmail("");
    setFormWebsite("");
    setFormContactPerson("");
    setFormApiStatus("manual");
    setFormNotes("");
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (c: CourierDto) => {
    setEditingCourier(c);
    setFormName(c.name);
    setFormCode(c.code);
    setFormPhone(c.phone || "");
    setFormEmail(c.email || "");
    setFormWebsite(c.website || "");
    setFormContactPerson(c.contactPerson || "");
    setFormApiStatus(c.apiStatus || "manual");
    setFormNotes(c.notes || "");
    setFormIsActive(c.isActive);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Please enter a courier name");
      return;
    }

    setIsSaving(true);
    try {
      if (editingCourier) {
        const res = await updateCourierAction(editingCourier.id, {
          name: formName,
          code: formCode || formName,
          phone: formPhone,
          email: formEmail,
          website: formWebsite,
          contactPerson: formContactPerson,
          apiStatus: formApiStatus,
          notes: formNotes,
          isActive: formIsActive,
        });

        if (res.success) {
          toast.success("Courier updated successfully");
          setIsModalOpen(false);
          await loadCouriers();
        } else {
          toast.error(res.error || "Failed to update courier");
        }
      } else {
        const res = await createCourierAction({
          name: formName,
          code: formCode || formName,
          phone: formPhone,
          email: formEmail,
          website: formWebsite,
          contactPerson: formContactPerson,
          apiStatus: formApiStatus,
          notes: formNotes,
          isActive: formIsActive,
        });

        if (res.success) {
          toast.success("Courier created successfully");
          setIsModalOpen(false);
          await loadCouriers();
        } else {
          toast.error(res.error || "Failed to create courier");
        }
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (c: CourierDto) => {
    const nextState = !c.isActive;
    try {
      const res = await toggleCourierActiveAction(c.id, nextState);
      if (res.success) {
        toast.success(`${c.name} is now ${nextState ? "Active" : "Inactive"}`);
        setCouriers((prev) =>
          prev.map((item) => (item.id === c.id ? { ...item, isActive: nextState } : item))
        );
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Error updating status");
    }
  };

  // Filtered Couriers
  const filteredCouriers = useMemo(() => {
    return couriers.filter((c) => {
      if (statusFilter === "active" && !c.isActive) return false;
      if (statusFilter === "inactive" && c.isActive) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.contactPerson && c.contactPerson.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [couriers, searchQuery, statusFilter]);

  // Performance Aggregate Stats
  const stats = useMemo(() => {
    let totalShipments = 0;
    let delivered = 0;
    let inTransit = 0;
    let returned = 0;
    let totalValue = 0;

    couriers.forEach((c) => {
      totalShipments += c.totalShipments || 0;
      delivered += c.deliveredShipments || 0;
      inTransit += c.inTransitShipments || 0;
      returned += c.returnedShipments || 0;
      totalValue += c.totalValue || 0;
    });

    const successRate = totalShipments > 0 ? Math.round((delivered / totalShipments) * 100) : 0;

    return {
      totalCouriers: couriers.length,
      activeCouriers: couriers.filter((c) => c.isActive).length,
      totalShipments,
      delivered,
      inTransit,
      returned,
      totalValue,
      successRate,
    };
  }, [couriers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <Truck className="size-7 text-primary" /> Courier Management
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Manage Bangladesh courier services, activate/deactivate partners, and monitor delivery performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadCouriers} disabled={isLoading} className="gap-1.5 text-xs">
            <RotateCcw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={openCreateModal} className="gap-1.5 text-xs font-bold shadow-xs">
            <Plus className="size-4" /> Add Courier
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Couriers</span>
            <ShieldCheck className="size-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {stats.activeCouriers} <span className="text-xs font-normal text-muted-foreground">/ {stats.totalCouriers} Total</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Dispatches</span>
            <Package className="size-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {stats.totalShipments.toLocaleString()}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Delivered Rate</span>
            <TrendingUp className="size-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {stats.successRate}% <span className="text-xs font-normal text-muted-foreground">({stats.delivered} delivered)</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Shipped Value</span>
            <span className="text-xs font-bold text-primary">COD</span>
          </div>
          <div className="text-2xl font-black text-foreground">
            {formatBDT(stats.totalValue)}
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border p-3.5 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search courier by name, code, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/30 text-xs">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                statusFilter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({couriers.length})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                statusFilter === "active" ? "bg-background text-emerald-600 shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active ({couriers.filter((c) => c.isActive).length})
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                statusFilter === "inactive" ? "bg-background text-muted-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Inactive ({couriers.filter((c) => !c.isActive).length})
            </button>
          </div>
        </div>
      </div>

      {/* Couriers Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Courier Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Contact / Support</TableHead>
                <TableHead>Integration</TableHead>
                <TableHead className="text-center">Total Shipments</TableHead>
                <TableHead className="text-center">Delivered</TableHead>
                <TableHead className="text-center">In Transit</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCouriers.map((c) => (
                <TableRow key={c.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary text-xs shrink-0 uppercase">
                        {c.code.slice(0, 2)}
                      </div>
                      <div>
                        <span className="font-bold text-foreground text-sm block">{c.name}</span>
                        {c.website ? (
                          <a
                            href={c.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mt-0.5"
                          >
                            <span>Website</span>
                            <ExternalLink className="size-2.5" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="font-mono text-xs text-muted-foreground uppercase">{c.code}</TableCell>

                  <TableCell>
                    <div className="space-y-0.5 text-xs">
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="size-3 text-emerald-600" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="size-3 text-blue-600" />
                          <span>{c.email}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        c.apiStatus === "simulated" || c.apiStatus === "connected"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {c.apiStatus === "simulated" ? "API Ready" : c.apiStatus}
                    </span>
                  </TableCell>

                  <TableCell className="text-center font-bold text-xs">{c.totalShipments || 0}</TableCell>
                  <TableCell className="text-center font-bold text-xs text-emerald-600">{c.deliveredShipments || 0}</TableCell>
                  <TableCell className="text-center font-bold text-xs text-blue-600">{c.inTransitShipments || 0}</TableCell>

                  <TableCell className="text-center">
                    <button
                      onClick={() => handleToggleActive(c)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                        c.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {c.isActive ? (
                        <>
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="size-3.5 text-slate-400" />
                          <span>Inactive</span>
                        </>
                      )}
                    </button>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(c)}
                        className="h-7 text-xs px-2.5 gap-1 hover:bg-muted"
                      >
                        <Pencil className="size-3" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={c.isActive ? "outline" : "default"}
                        onClick={() => handleToggleActive(c)}
                        className={`h-7 text-xs px-2.5 gap-1 ${
                          c.isActive
                            ? "text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                        title={c.isActive ? "Deactivate Courier" : "Activate Courier"}
                      >
                        <Power className="size-3" /> {c.isActive ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {filteredCouriers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-16 text-center text-muted-foreground text-xs">
                    {searchQuery ? "No couriers matching your search criteria." : "No courier services registered."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create / Edit Courier Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingCourier ? "Edit Courier Partner" : "Add New Courier Partner"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure courier details, contact information, and operation status.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Courier Name *</Label>
                <Input
                  required
                  placeholder="e.g. Steadfast Courier"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Courier Code / Slug *</Label>
                <Input
                  required
                  placeholder="e.g. steadfast"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Support Phone</Label>
                <Input
                  placeholder="e.g. 09678-000000"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Support Email</Label>
                <Input
                  type="email"
                  placeholder="e.g. support@courier.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Website URL</Label>
                <Input
                  placeholder="https://..."
                  value={formWebsite}
                  onChange={(e) => setFormWebsite(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Contact Person</Label>
                <Input
                  placeholder="e.g. Merchant Desk"
                  value={formContactPerson}
                  onChange={(e) => setFormContactPerson(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notes / Pickup Instructions</Label>
              <Textarea
                rows={2}
                placeholder="Special instructions, cutoff timings, or branch details..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/20">
              <div>
                <Label className="text-xs font-bold block">Active Status</Label>
                <span className="text-[11px] text-muted-foreground">
                  Inactive couriers cannot be selected for new shipment batches.
                </span>
              </div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSaving} className="font-bold">
                {isSaving ? "Saving..." : editingCourier ? "Update Courier" : "Create Courier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
