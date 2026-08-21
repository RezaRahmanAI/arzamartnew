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
}: {
  className?: string;
  value?: DateRange;
  onUpdate?: (range: DateRange | undefined) => void;
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
        <PopoverContent className="w-auto p-3 space-y-3" align="start">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-border">
            <span className="text-[11px] font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <Clock className="size-3" /> Presets:
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("today")}
              className="h-7 text-xs px-2 font-medium"
            >
              Today (আজকে)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("yesterday")}
              className="h-7 text-xs px-2 font-medium"
            >
              Yesterday (গতকাল)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("last7")}
              className="h-7 text-xs px-2 font-medium"
            >
              Last 7 Days
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("thisMonth")}
              className="h-7 text-xs px-2 font-medium"
            >
              This Month
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => applyPreset("all")}
              className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10 hover:text-destructive font-medium ml-auto"
            >
              <RotateCcw className="size-3 mr-1" /> All Dates
            </Button>
          </div>

          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(newDate) => {
              handleSelect(newDate);
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
