"use client";

import { Ruler } from "lucide-react";
import { SizeTemplateForm } from "@/components/admin/settings/size-template-form";

export default function NewSizeTemplatePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card shadow-xs">
        <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
          <Ruler className="size-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">Create Size Template</h3>
          <p className="text-xs text-muted-foreground">
            Define size measurements (in inches). You can rename, add, remove, or reorder columns freely.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <SizeTemplateForm initialType="topwear" />
      </div>
    </div>
  );
}
