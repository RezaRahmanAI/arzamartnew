"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PackageCheck,
  Search,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Truck,
  Layers,
  ArrowRight,
  Calendar,
  Phone,
  MapPin,
  ExternalLink,
  Plus,
  TrendingUp,
} from "lucide-react";
import { formatBDT } from "@/lib/shop-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  getEligibleOrdersForShipmentAction,
  createBulkShipmentBatchAction,
  getShipmentBatchesAction,
  type EligibleOrderDto,
  type ShipmentBatchDto,
} from "@/actions/shipments.actions";
import {
  getActiveCouriersAction,
} from "@/actions/couriers.actions";

export default function BulkShipmentPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"orders" | "batches">("orders");

  // Orders State
  const [eligibleOrders, setEligibleOrders] = useState<EligibleOrderDto[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  // Batches State
  const [batches, setBatches] = useState<ShipmentBatchDto[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);

  // Active Couriers
  const [activeCouriers, setActiveCouriers] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string>("");
  const [batchNotes, setBatchNotes] = useState("");
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadData = async () => {
    setIsLoadingOrders(true);
    setIsLoadingBatches(true);

    const [ordersData, batchesData, couriersData] = await Promise.all([
      getEligibleOrdersForShipmentAction(),
      getShipmentBatchesAction(),
      getActiveCouriersAction(),
    ]);

    setEligibleOrders(ordersData);
    setBatches(batchesData);
    setActiveCouriers(couriersData);

    if (couriersData.length > 0 && !selectedCourierId) {
      setSelectedCourierId(couriersData[0].id);
    }

    setIsLoadingOrders(false);
    setIsLoadingBatches(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return eligibleOrders.filter((o) => {
      if (statusFilter !== "all" && o.orderStatusLabel !== statusFilter) return false;
      if (districtFilter !== "all" && o.district !== districtFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.phone.toLowerCase().includes(q) ||
          o.address.toLowerCase().includes(q) ||
          o.district.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [eligibleOrders, searchQuery, districtFilter, statusFilter]);

  // Unique Districts for Filtering
  const availableDistricts = useMemo(() => {
    const dSet = new Set<string>();
    eligibleOrders.forEach((o) => {
      if (o.district) dSet.add(o.district);
    });
    return Array.from(dSet).sort();
  }, [eligibleOrders]);

  // Toggle Single Order Selection
  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle All Filtered Orders
  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  // Selected Orders Value Summary
  const selectedSummary = useMemo(() => {
    const selectedList = eligibleOrders.filter((o) => selectedOrderIds.includes(o.id));
    const totalVal = selectedList.reduce((sum, o) => sum + o.totalAmount, 0);
    return {
      count: selectedList.length,
      totalVal,
    };
  }, [eligibleOrders, selectedOrderIds]);

  // Create Bulk Shipment Batch
  const handleCreateBatch = async () => {
    if (selectedOrderIds.length === 0) {
      toast.error("Please select at least one order to create a shipment batch");
      return;
    }
    if (!selectedCourierId) {
      toast.error("Please select an active courier partner");
      return;
    }

    setIsCreatingBatch(true);
    try {
      const res = await createBulkShipmentBatchAction({
        orderIds: selectedOrderIds,
        courierId: selectedCourierId,
        notes: batchNotes,
      });

      if (res.success && res.batchId) {
        toast.success(`Shipment Batch ${res.batchNumber} created successfully!`);
        setSelectedOrderIds([]);
        setBatchNotes("");
        await loadData();
        router.push(`/admin/bulk-shipment/${res.batchId}`);
      } else {
        toast.error(res.error || "Failed to create shipment batch");
      }
    } catch {
      toast.error("An error occurred while creating shipment batch");
    } finally {
      setIsCreatingBatch(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <PackageCheck className="size-7 text-primary" /> Bulk Shipment & Dispatch
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Group orders into carrier batches, assign to active couriers, generate tracking, and monitor dispatches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5 text-xs">
            <RotateCcw className={`size-3.5 ${isLoadingOrders ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
            <Link href="/admin/couriers">
              <Truck className="size-3.5 text-primary" /> Manage Couriers
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold transition-all ${
            activeTab === "orders"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Layers className="size-4" /> Eligible Orders ({eligibleOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("batches")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold transition-all ${
            activeTab === "batches"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <PackageCheck className="size-4" /> Shipment Batches ({batches.length})
        </button>
      </div>

      {/* TAB 1: ELIGIBLE ORDERS TO DISPATCH */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Top Operational Dispatch Bar */}
          <div className="bg-card border-2 border-primary/40 rounded-xl p-4 sm:p-5 shadow-sm bg-gradient-to-r from-primary/5 via-card to-card">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Selected for Dispatch:
                  </span>
                  <span className="text-lg font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg">
                    {selectedSummary.count} Orders
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    Total Value: <span className="font-black text-emerald-600">{formatBDT(selectedSummary.totalVal)}</span>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select orders below, choose an active courier partner, and click Create Batch.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="w-48 sm:w-56">
                  <Select value={selectedCourierId} onValueChange={setSelectedCourierId}>
                    <SelectTrigger className="h-10 text-xs font-bold">
                      <SelectValue placeholder="Select Active Courier" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCouriers.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                          🚚 {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleCreateBatch}
                  disabled={isCreatingBatch || selectedSummary.count === 0}
                  className="h-10 px-5 text-xs font-black gap-2 shadow-sm cursor-pointer"
                >
                  <Plus className="size-4" />
                  {isCreatingBatch ? "Creating Batch..." : `Create Shipment Batch (${selectedSummary.count})`}
                </Button>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border p-3.5 rounded-xl shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by order #, phone, customer, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="w-36">
                <Select value={districtFilter} onValueChange={setDistrictFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Districts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Districts</SelectItem>
                    {availableDistricts.map((d) => (
                      <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-36">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                    <SelectItem value="confirmed" className="text-xs">Confirmed</SelectItem>
                    <SelectItem value="processing" className="text-xs">Processing</SelectItem>
                    <SelectItem value="packed" className="text-xs">Packed</SelectItem>
                    <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={selectedOrderIds.length > 0 && selectedOrderIds.length === filteredOrders.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Order No.</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address / District</TableHead>
                    <TableHead>Order Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-center">Shipment Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((o) => {
                    const isSelected = selectedOrderIds.includes(o.id);
                    return (
                      <TableRow
                        key={o.id}
                        className={`group transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectOrder(o.id)}
                            aria-label={`Select ${o.orderNumber}`}
                          />
                        </TableCell>

                        <TableCell className="font-mono text-xs font-bold text-foreground">
                          #{o.orderNumber}
                        </TableCell>

                        <TableCell className="font-medium text-xs text-foreground max-w-[120px] truncate">
                          {o.customerName}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {o.phone}
                        </TableCell>

                        <TableCell className="max-w-[200px]">
                          <div className="text-xs text-foreground truncate" title={o.address}>
                            {o.address}
                          </div>
                          <span className="inline-block mt-0.5 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                            {o.district} {o.area ? `• ${o.area}` : ""}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded-md border bg-muted/40">
                            {o.orderStatusLabel}
                          </span>
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {o.paymentMethod}
                        </TableCell>

                        <TableCell className="text-right font-bold text-xs text-foreground">
                          {formatBDT(o.totalAmount)}
                        </TableCell>

                        <TableCell className="text-center">
                          {o.hasExistingShipment ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                              <Truck className="size-3" /> {o.courierName} ({o.shipmentStatus})
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              Unassigned
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {filteredOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-16 text-center text-muted-foreground text-xs">
                        {searchQuery || districtFilter !== "all" || statusFilter !== "all"
                          ? "No orders matching current filter criteria."
                          : "No eligible orders waiting for shipment dispatch."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SHIPMENT BATCHES LIST */}
      {activeTab === "batches" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Courier Partner</TableHead>
                    <TableHead className="text-center">Orders Count</TableHead>
                    <TableHead className="text-right">Total Shipment Value</TableHead>
                    <TableHead className="text-center">Delivered</TableHead>
                    <TableHead className="text-center">In Transit</TableHead>
                    <TableHead className="text-center">Returned / Failed</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => (
                    <TableRow key={b.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-foreground">
                            {b.batchNumber}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-[10px] shrink-0 uppercase">
                            {b.courierCode.slice(0, 2)}
                          </div>
                          <span className="font-bold text-xs text-foreground">{b.courierName}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-center font-bold text-xs">
                        {b.totalOrders}
                      </TableCell>

                      <TableCell className="text-right font-black text-xs text-foreground">
                        {formatBDT(b.totalShipmentValue)}
                      </TableCell>

                      <TableCell className="text-center">
                        <span className="font-bold text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200">
                          {b.deliveredCount}
                        </span>
                      </TableCell>

                      <TableCell className="text-center">
                        <span className="font-bold text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200">
                          {b.inTransitCount}
                        </span>
                      </TableCell>

                      <TableCell className="text-center">
                        <span className="font-bold text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200">
                          {b.returnedCount}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline" className="h-7 text-xs px-2.5 gap-1">
                          <Link href={`/admin/bulk-shipment/${b.id}`}>
                            <span>View Batch</span>
                            <ArrowRight className="size-3" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {batches.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-16 text-center text-muted-foreground text-xs">
                        No shipment batches created yet. Go to "Eligible Orders" tab to create one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
