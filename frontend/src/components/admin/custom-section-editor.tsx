"use client";

import { useState } from "react";
import { Plus, Trash2, X, Image as ImageIcon } from "lucide-react";
import { LandingSection, CustomField, CustomFieldValue } from "@/lib/api/services/custom-landing-page.service";
import { ImageUploader } from "@/components/image-uploader";

interface CustomSectionEditorProps {
  section: LandingSection;
  onChange: (updated: LandingSection) => void;
}

export function CustomSectionEditor({ section, onChange }: CustomSectionEditorProps) {
  const [newImageUrl, setNewImageUrl] = useState("");

  const updateLabel = (newLabel: string) => {
    onChange({ ...section, label: newLabel });
  };

  const toggleField = (key: string) => {
    const updatedFields = (section.customFields || []).map((f) =>
      f.key === key ? { ...f, enabled: !f.enabled } : f
    );
    onChange({ ...section, customFields: updatedFields });
  };

  const updateFieldValue = (key: string, value: CustomFieldValue) => {
    const updatedFields = (section.customFields || []).map((f) =>
      f.key === key ? { ...f, value } : f
    );
    onChange({ ...section, customFields: updatedFields });
  };

  const updateFieldLabel = (key: string, label: string) => {
    const updatedFields = (section.customFields || []).map((f) =>
      f.key === key ? { ...f, label } : f
    );
    onChange({ ...section, customFields: updatedFields });
  };

  const addImageUrlToField = (key: string) => {
    if (!newImageUrl.trim()) return;
    const targetField = (section.customFields || []).find((f) => f.key === key);
    const existingList = Array.isArray(targetField?.value) ? targetField.value : [];
    updateFieldValue(key, [...existingList, newImageUrl.trim()]);
    setNewImageUrl("");
  };

  const removeImageUrlAt = (key: string, index: number) => {
    const targetField = (section.customFields || []).find((f) => f.key === key);
    const existingList = Array.isArray(targetField?.value) ? targetField.value : [];
    updateFieldValue(
      key,
      existingList.filter((_, i) => i !== index)
    );
  };

  const updateImageUrlAt = (key: string, index: number, val: string) => {
    const targetField = (section.customFields || []).find((f) => f.key === key);
    const existingList = Array.isArray(targetField?.value) ? [...targetField.value] : [];
    existingList[index] = val;
    updateFieldValue(key, existingList);
  };

  return (
    <div className="space-y-4 pt-3 text-xs">
      {/* Section Title */}
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          সেকশনের নাম
        </label>
        <input
          type="text"
          value={section.label}
          onChange={(e) => updateLabel(e.target.value)}
          className="w-full h-8 px-2.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="border-t border-border" />

      {/* Dynamic Fields List */}
      <div className="space-y-3">
        {(section.customFields || []).map((field) => (
          <div key={field.key} className="space-y-2 p-2.5 bg-muted/30 rounded-lg border border-border">
            {/* Field Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground uppercase font-mono">
                  {field.type}
                </span>
                <span className="font-semibold text-foreground">{field.label}</span>
              </div>

              <button
                type="button"
                onClick={() => toggleField(field.key)}
                className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer ${
                  field.enabled ? "bg-primary" : "bg-muted-foreground/30"
                }`}
                title={field.enabled ? "Disable Field" : "Enable Field"}
              >
                <div
                  className={`size-3 bg-white rounded-full absolute top-0.5 transition-all shadow-2xs ${
                    field.enabled ? "left-3.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Field Label Renaming */}
            <div className="space-y-0.5">
              <label className="text-[10px] text-muted-foreground">লেবেল</label>
              <input
                type="text"
                value={field.label}
                onChange={(e) => updateFieldLabel(field.key, e.target.value)}
                className="w-full h-7 px-2 bg-background border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Field Value Editor */}
            {field.enabled && (
              <div className="pt-1">
                {field.type === "text" && (
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-muted-foreground">মান (Text)</label>
                    <input
                      type="text"
                      value={typeof field.value === "string" || typeof field.value === "number" ? String(field.value) : ""}
                      onChange={(e) => updateFieldValue(field.key, e.target.value)}
                      placeholder="টেক্সট লিখুন..."
                      className="w-full h-8 px-2.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {field.type === "textarea" || field.type === "richtext" ? (
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-muted-foreground">
                      {field.key === "features" ? "ফিচার তালিকা (প্রতিটি নতুন লাইনে)" : "বিস্তারিত বর্ণনা"}
                    </label>
                    <textarea
                      rows={3}
                      value={typeof field.value === "string" || typeof field.value === "number" ? String(field.value) : ""}
                      onChange={(e) => updateFieldValue(field.key, e.target.value)}
                      placeholder={field.key === "features" ? "১০০% অরিজিনাল প্রোডাক্ট\nফ্রি রিটার্ন পলিসি\n২৪/৭ কাস্টমার সাপোর্ট" : "বিস্তারিত টেক্সট লিখুন..."}
                      className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-foreground text-xs resize-y focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                ) : null}

                {field.type === "image" && (
                  <div className="space-y-1.5">
                    <ImageUploader
                      value={typeof field.value === "string" ? field.value : ""}
                      onChange={(url) => updateFieldValue(field.key, url)}
                      label={field.label}
                      sublabel="ছবি আপলোড করুন বা লিংক দিন"
                      folder="landing-pages"
                    />
                  </div>
                )}

                {field.type === "images" && (
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted-foreground">ছবির গ্যালারি URLs</label>
                    {Array.isArray(field.value) &&
                      field.value.map((url: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <input
                            type="url"
                            value={typeof url === "string" ? url : ""}
                            onChange={(e) => updateImageUrlAt(field.key, idx, e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="flex-1 h-7 px-2 bg-background border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button
                            type="button"
                            onClick={() => removeImageUrlAt(field.key, idx)}
                            className="size-7 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded cursor-pointer transition-colors"
                            title="Remove Image"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}

                    <div className="flex items-center gap-1.5">
                      <input
                        type="url"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addImageUrlToField(field.key);
                          }
                        }}
                        placeholder="নতুন ছবির URL পেস্ট করুন..."
                        className="flex-1 h-7 px-2 bg-background border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => addImageUrlToField(field.key)}
                        className="size-7 flex items-center justify-center bg-primary text-primary-foreground rounded cursor-pointer hover:opacity-90 transition-opacity"
                        title="Add Image"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {field.type === "button" && (
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-muted-foreground">বাটন টেক্সট</label>
                    <input
                      type="text"
                      value={typeof field.value === "string" ? field.value : ""}
                      onChange={(e) => updateFieldValue(field.key, e.target.value)}
                      placeholder="বাটন লেবেল..."
                      className="w-full h-8 px-2.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
