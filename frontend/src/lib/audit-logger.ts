export type AuditActionCategory =
  | "ORDER"
  | "PRODUCT"
  | "CATEGORY"
  | "SETTINGS"
  | "COURIER"
  | "STAFF"
  | "CUSTOMER"
  | "BULK_SHIPMENT"
  | "AUTH"
  | "SYSTEM";

export interface SystemAuditLog {
  id: string;
  timestamp: string; // ISO 8601 string
  category: AuditActionCategory;
  action: string; // e.g. "Order Placed", "Status Changed", "Product Edited", "Settings Updated"
  actorName: string; // Admin / Staff / Customer / System
  actorRole: string; // Super Admin / Staff / Customer / Automated System
  actorEmailOrPhone?: string;
  targetId?: string; // Order #1001, Product SKU, etc.
  targetName?: string;
  details: string; // Full non-editable description of what occurred
  ipAddress?: string;
  changes?: Record<string, { from?: string | number | boolean | null; to?: string | number | boolean | null }>;
}

const STORAGE_KEY = "arzamart_immutable_audit_logs_v1";

/**
 * Retrieves all immutable system audit logs.
 * Sorted chronologically descending (newest first).
 */
export function getSystemAuditLogs(): SystemAuditLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialDefaultLogs();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return getInitialDefaultLogs();
  }
}

/**
 * Appends a new immutable audit log.
 * Once written, logs cannot be modified or deleted via UI.
 */
export function logSystemAction(entry: {
  category: AuditActionCategory;
  action: string;
  actorName?: string;
  actorRole?: string;
  actorEmailOrPhone?: string;
  targetId?: string;
  targetName?: string;
  details: string;
  changes?: Record<string, { from?: string | number | boolean | null; to?: string | number | boolean | null }>;
}): SystemAuditLog {
  let actorName = entry.actorName;
  let actorRole = entry.actorRole;
  let actorEmailOrPhone = entry.actorEmailOrPhone;

  // Auto-resolve current logged in staff/admin if not provided
  if (typeof window !== "undefined") {
    if (!actorName) {
      try {
        const staffRaw = localStorage.getItem("arzamart_active_staff") || localStorage.getItem("arza-auth-user");
        if (staffRaw) {
          const u = JSON.parse(staffRaw);
          actorName = u.name || u.fullName || u.email || "Admin User";
          actorRole = u.roleName || u.role || (u.email?.includes("admin") ? "Administrator" : "Staff Member");
          actorEmailOrPhone = u.email || u.phone;
        }
      } catch {
        /* ignore */
      }
    }
  }

  const newLog: SystemAuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    category: entry.category,
    action: entry.action,
    actorName: actorName || "System Administrator",
    actorRole: actorRole || "Admin",
    actorEmailOrPhone,
    targetId: entry.targetId,
    targetName: entry.targetName,
    details: entry.details,
    changes: entry.changes,
  };

  if (typeof window !== "undefined") {
    try {
      const existing = getSystemAuditLogs();
      // Keep up to 2,000 immutable history logs in local persistence
      const updated = [newLog, ...existing].slice(0, 2000);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      /* ignore quota errors */
    }
  }

  return newLog;
}

function getInitialDefaultLogs(): SystemAuditLog[] {
  return [
    {
      id: "audit_init_1",
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      category: "SYSTEM",
      action: "System Initialization",
      actorName: "System Core",
      actorRole: "Automated System",
      details: "ARZAMART e-commerce application engine loaded and database verified.",
    },
    {
      id: "audit_init_2",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      category: "SETTINGS",
      action: "Quantity Offers Configured",
      actorName: "Super Admin",
      actorRole: "Administrator",
      details: "Configured multi-tier quantity offers & free shipping triggers across store.",
    },
  ];
}
