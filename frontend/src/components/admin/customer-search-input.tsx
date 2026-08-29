"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Phone, User, MapPin, Check } from "lucide-react";
import { useCustomers, type CustomerMaster } from "@/lib/customers-store";

export function CustomerSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = "Phone number",
  id,
}: {
  value: string;
  onChange: (phone: string) => void;
  onSelect: (customer: CustomerMaster) => void;
  placeholder?: string;
  id?: string;
}) {
  const { customers } = useCustomers();
  const [focused, setFocused] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const normalize = (s: string) => s.trim().replace(/[\s-]/g, "");

  const matches = useMemo(() => {
    const q = normalize(value);
    if (!q) return [];
    return customers
      .filter((c) => {
        const phoneMatch = normalize(c.mobileNumber).includes(q);
        const nameMatch = (c.fullName || "").toLowerCase().includes(q.toLowerCase());
        return phoneMatch || nameMatch;
      })
      .slice(0, 8);
  }, [customers, value]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const showDropdown = focused && matches.length > 0;

  const handleSelect = (c: CustomerMaster) => {
    onChange(c.mobileNumber);
    onSelect(c);
    setFocused(false);
    setHighlighted(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" && highlighted >= 0 && matches[highlighted]) {
      e.preventDefault();
      handleSelect(matches[highlighted]);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={id}
        type="tel"
        value={value}
        onChange={(e) => {
          onChange(e.target.value.replace(/\D/g, ""));
          setHighlighted(-1);
        }}
        onFocus={() => setFocused(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required
        className="h-9 text-xs"
        autoComplete="off"
      />
      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-xl overflow-hidden">
          {matches.map((c, idx) => (
            <button
              key={c.customerId}
              type="button"
              onMouseEnter={() => setHighlighted(idx)}
              onClick={() => handleSelect(c)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer transition-colors ${
                idx === highlighted ? "bg-secondary/60" : "hover:bg-secondary/40"
              }`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground truncate">
                  {c.fullName || "Customer"}
                  {idx === highlighted && <Check className="size-3 text-primary shrink-0" />}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Phone className="size-3 shrink-0" />
                  {c.mobileNumber}
                </span>
                {c.address && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate mt-0.5">
                    <MapPin className="size-3 shrink-0" />
                    {c.address}
                    {c.area ? `, ${c.area}` : ""}
                    {c.district ? `, ${c.district}` : ""}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
