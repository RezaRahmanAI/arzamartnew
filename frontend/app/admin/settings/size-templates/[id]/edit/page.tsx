"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Ruler, RefreshCw } from "lucide-react";
import { SizeTemplateForm, BOTTOMWEAR_PRESET_COLUMNS } from "@/components/admin/settings/size-template-form";
import {
  getSizeTemplateByIdAction,
  SizeTemplateDto,
} from "@/actions/size-templates.actions";
import { isBottomwearTemplate } from "@/components/admin/settings/size-templates-tab";

export default function EditSizeTemplatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [template, setTemplate] = useState<SizeTemplateDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const data = await getSizeTemplateByIdAction(id);
        if (cancelled) return;
        if (!data) {
          setError("Size template not found");
        } else {
          setTemplate(data);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load template");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 shadow-xs text-center text-muted-foreground text-xs">
        <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" /> Loading template...
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 shadow-xs text-center text-destructive text-sm">
        {error || "Template not found"}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => router.push("/admin/settings?tab=sizeTemplates")}
            className="text-xs underline"
          >
            Back to templates
          </button>
        </div>
      </div>
    );
  }

  const initialType = isBottomwearTemplate(template) ? "bottomwear" : "topwear";
  // The type is only used to seed defaults when creating — when editing we always
  // start with the loaded template's data, so initialType is just a hint.
  void BOTTOMWEAR_PRESET_COLUMNS; // ensure tree-shake doesn't drop import

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card shadow-xs">
        <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
          <Ruler className="size-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">Edit Size Template</h3>
          <p className="text-xs text-muted-foreground">
            Editing &quot;{template.name}&quot;. You can rename, add, remove, or reorder columns.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <SizeTemplateForm initialTemplate={template} initialType={initialType} />
      </div>
    </div>
  );
}
