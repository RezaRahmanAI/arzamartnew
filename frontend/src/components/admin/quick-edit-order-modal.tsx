"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type Order } from "@/lib/dashboard-data";
import { useSettings } from "@/context/settings-context";
import { toast } from "sonner";
import { formatBDT } from "@/lib/shop-data";
import { Check, ChevronsUpDown, Search } from "lucide-react";

const FALLBACK_SOURCES: Record<string, string[]> = {
  "Facebook Page": ["Arzamart Official FB Page"],
  "Instagram DM": ["Arzamart Main IG (@arzamart.official)"],
  "WhatsApp": ["WhatsApp Hotline 1 (01700-000000)"],
  "TikTok": ["Arzamart Official TikTok (@arzamart.bd)"],
  "Website": ["Arzamart Main Website (arzamart.com)"],
  "Phone Call": ["Hotline 1 (Sales Dept)"],
  "In-Store POS": ["Uttara Branch Outlet"],
};

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase().trim())
  );

  const searchTrim = search.trim();
  const exactMatch = options.some((o) => o.toLowerCase() === searchTrim.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-8 justify-between font-normal text-xs bg-background hover:bg-background/80 px-2.5"
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="size-3.5 opacity-50 shrink-0 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-2 bg-popover shadow-md border border-border" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or enter UTM source..."
            className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {filtered.length === 0 && !searchTrim && (
            <p className="text-xs text-muted-foreground text-center py-2">No options available</p>
          )}
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
                setSearch("");
              }}
              className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs text-left cursor-pointer transition-colors ${
                value === opt
                  ? "bg-primary/15 font-semibold text-primary"
                  : "hover:bg-secondary/60 text-foreground"
              }`}
            >
              <span className="truncate">{opt}</span>
              {value === opt && <Check className="size-3.5 text-primary shrink-0 ml-1" />}
            </button>
          ))}
          {searchTrim && !exactMatch && (
            <button
              type="button"
              onClick={() => {
                onChange(searchTrim);
                setOpen(false);
                setSearch("");
              }}
              className="flex w-full items-center gap-1 rounded px-2.5 py-1.5 text-xs text-left font-semibold text-primary hover:bg-primary/10 cursor-pointer"
            >
              <span>+ Use &ldquo;{searchTrim}&rdquo;</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function QuickEditOrderModal({
  order,
  isOpen,
  onClose,
  onSave,
}: {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Partial<Order>) => Promise<void>;
}) {
  const { settings } = useSettings();

  const socialPageMapBySource =
    settings?.socialMedia?.sources && Object.keys(settings.socialMedia.sources).length > 0
      ? settings.socialMedia.sources
      : FALLBACK_SOURCES;
  const sourcePages = Object.keys(socialPageMapBySource);

  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [sourcePage, setSourcePage] = useState("Facebook Page");
  const [utmSource, setUtmSource] = useState("");
  const [discount, setDiscount] = useState(0);
  const [delivery, setDelivery] = useState(70);
  const [paid, setPaid] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (order) {
      setCustomer(order.customer || "");
      setPhone(order.phone || "");
      setAddress(order.address || "");

      const detectedPage = order.sourcePageName || sourcePages[0] || "Facebook Page";
      setSourcePage(detectedPage);
      setUtmSource(order.socialMediaSourceName || "");
      setDiscount(Number(order.discount) || 0);
      setDelivery(order.delivery !== undefined ? Number(order.delivery) : 70);
      setPaid(Number(order.paid) || 0);
    }
  }, [order]);

  if (!order) return null;

  const currentSocialOptions = socialPageMapBySource[sourcePage] || [];

  const subTotal = (order.items || []).reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);
  const calculatedTotal = Math.max(0, subTotal + Number(delivery || 0) - Number(discount || 0));
  const calculatedDue = Math.max(0, calculatedTotal - Number(paid || 0));

  const handleSourcePageChange = (page: string) => {
    setSourcePage(page);
    const options = socialPageMapBySource[page] || [];
    setUtmSource(options[0] || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.trim()) {
      toast.error("Customer Name is required");
      return;
    }
    if (!phone.trim()) {
      toast.error("Phone Number is required");
      return;
    }
    if (!address.trim()) {
      toast.error("Address is required");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        customer: customer.trim(),
        phone: phone.trim(),
        address: address.trim(),
        sourcePageName: sourcePage.trim() || undefined,
        socialMediaSourceName: utmSource.trim() || undefined,
        discount: Number(discount) || 0,
        delivery: Number(delivery) || 0,
        paid: Number(paid) || 0,
        total: calculatedTotal,
      });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border bg-muted/40">
          <DialogTitle className="text-sm font-bold flex items-center justify-between">
            <span>Quick Edit Order</span>
            <span className="font-mono text-xs text-primary font-bold">
              #{order.id.replace(/^ORD-|^INC-/, "")}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Customer Name *</Label>
              <Input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Customer Name"
                required
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Number *</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone Number"
                required
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Address *</Label>
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full delivery address"
              rows={2}
              required
              className="text-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Page *</Label>
              <select
                value={sourcePage}
                onChange={(e) => handleSourcePageChange(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {sourcePages.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">UTM Source *</Label>
              <SearchableSelect
                options={currentSocialOptions}
                value={utmSource}
                onChange={setUtmSource}
                placeholder="Select or enter UTM Source..."
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Discount (৳) *</Label>
              <Input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="h-8 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Delivery Charge (৳) *</Label>
              <Input
                type="number"
                min="0"
                value={delivery}
                onChange={(e) => setDelivery(Number(e.target.value) || 0)}
                className="h-8 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Paid (৳) *</Label>
              <Input
                type="number"
                min="0"
                value={paid}
                onChange={(e) => setPaid(Number(e.target.value) || 0)}
                className="h-8 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
              />
            </div>
          </div>

          {/* Quick Summary Calculation Card */}
          <div className="bg-muted/40 p-2.5 rounded-lg border border-border flex items-center justify-between text-xs font-medium">
            <div>Subtotal: <span className="font-bold">{formatBDT(subTotal)}</span></div>
            <div>Total: <span className="font-bold text-primary">{formatBDT(calculatedTotal)}</span></div>
            <div>Due: <span className={`font-bold ${calculatedDue > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"}`}>{formatBDT(calculatedDue)}</span></div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-8 text-xs font-bold bg-primary text-primary-foreground"
            >
              {isSubmitting ? "Saving..." : "Update Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
