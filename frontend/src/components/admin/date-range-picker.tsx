"use client";

import { useState, useEffect } from "react";
import { format, isSameDay, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from "date-fns";
import { Calendar as CalendarIcon, X, RotateCcw, Clock } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DateRangePicker({
  className,
  value,
  onUpdate,
  numberOfMonths = 1,
}: {
  className?: string;
  value?: DateRange;
  onUpdate?: (range: DateRange | undefined) => void;
  numberOfMonths?: number;
}) {
  const [date, setDate] = useState<DateRange | undefined>(value);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setDate(value);
  }, [value]);

  const handleSelect = (newDate: DateRange | undefined) => {
    setDate(newDate);
    onUpdate?.(newDate);
  };

  const applyPreset = (preset: "today" | "yesterday" | "last7" | "thisMonth" | "all") => {
    const now = new Date();
    if (preset === "today") {
      const range = { from: startOfDay(now), to: endOfDay(now) };
      handleSelect(range);
    } else if (preset === "yesterday") {
      const yesterday = subDays(now, 1);
      const range = { from: startOfDay(yesterday), to: endOfDay(yesterday) };
      handleSelect(range);
    } else if (preset === "last7") {
      const range = { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
      handleSelect(range);
    } else if (preset === "thisMonth") {
      const range = { from: startOfMonth(now), to: endOfMonth(now) };
      handleSelect(range);
    } else if (preset === "all") {
      handleSelect(undefined);
    }
    setOpen(false);
  };

  const getLabel = () => {
    if (!date?.from) return "All Dates (সব সময়)";
    const now = new Date();
    const isToday = isSameDay(date.from, now) && (!date.to || isSameDay(date.to, now));
    if (isToday) return `Today (${format(date.from, "dd MMM")})`;

    const yesterday = subDays(now, 1);
    const isYesterday = isSameDay(date.from, yesterday) && (!date.to || isSameDay(date.to, yesterday));
    if (isYesterday) return `Yesterday (${format(date.from, "dd MMM")})`;

    if (date.to && !isSameDay(date.from, date.to)) {
      return `${format(date.from, "dd MMM")} - ${format(date.to, "dd MMM, yyyy")}`;
    }
    return format(date.from, "dd MMM, yyyy");
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={date?.from ? "default" : "outline"}
            className={cn(
              "w-[260px] justify-start text-left font-medium text-xs h-9 transition-colors",
              date?.from
                ? "bg-primary/10 text-primary border-primary/40 hover:bg-primary/20 hover:text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">{getLabel()}</span>
            {date?.from && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(undefined);
                }}
                className="ml-auto p-0.5 rounded hover:bg-primary/20 text-muted-foreground hover:text-foreground"
                title="Clear date filter"
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 shadow-xl border border-border overflow-hidden" align="start">
          <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border">
            {/* Calendar */}
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from || new Date()}
                selected={date}
                onSelect={(newDate) => {
                  handleSelect(newDate);
                }}
                numberOfMonths={numberOfMonths}
              />
            </div>

            {/* Quick Presets on the Right Side */}
            <div className="flex flex-col justify-between p-3 bg-muted/20 sm:w-[155px] shrink-0">
              <div className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5 px-2 pt-1">
                  <Clock className="size-3 text-primary" />
                  <span>ফিল্টার</span>
                </div>
                <button
                  type="button"
                  onClick={() => applyPreset("today")}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-primary/10 hover:text-primary cursor-pointer",
                    date?.from && isSameDay(date.from, new Date()) && (!date.to || isSameDay(date.to, new Date()))
                      ? "bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground"
                      : "text-foreground"
                  )}
                >
                  Today (আজকে)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("yesterday")}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-primary/10 hover:text-primary cursor-pointer",
                    date?.from && isSameDay(date.from, subDays(new Date(), 1)) && (!date.to || isSameDay(date.to, subDays(new Date(), 1)))
                      ? "bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground"
                      : "text-foreground"
                  )}
                >
                  Yesterday (গতকাল)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("last7")}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-primary/10 hover:text-primary text-foreground cursor-pointer"
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("thisMonth")}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-primary/10 hover:text-primary text-foreground cursor-pointer"
                >
                  This Month
                </button>
              </div>

              <div className="pt-2 mt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => applyPreset("all")}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                  <RotateCcw className="size-3" />
                  All Dates (সব সময়)
                </button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
