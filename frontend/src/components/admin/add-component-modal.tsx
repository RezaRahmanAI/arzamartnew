"use client";

import { useState } from "react";
import {
  X,
  Image as ImageIcon,
  FileText,
  LayoutGrid,
  LayoutDashboard,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Star,
  Info,
  Gift,
  Tag,
  ShoppingBag,
  Clock,
  Heart,
  Truck,
} from "lucide-react";
import {
  LAYOUT_TYPES,
  LayoutType,
  LandingSection,
  createDefaultFields,
} from "@/lib/api/services/custom-landing-page.service";

interface AddComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSection: (section: LandingSection) => void;
}

const AVAILABLE_ICONS = [
  { name: "Sparkles", Icon: Sparkles },
  { name: "Image", Icon: ImageIcon },
  { name: "FileText", Icon: FileText },
  { name: "LayoutGrid", Icon: LayoutGrid },
  { name: "LayoutDashboard", Icon: LayoutDashboard },
  { name: "ShieldCheck", Icon: ShieldCheck },
  { name: "Star", Icon: Star },
  { name: "Info", Icon: Info },
  { name: "Gift", Icon: Gift },
  { name: "Tag", Icon: Tag },
  { name: "ShoppingBag", Icon: ShoppingBag },
  { name: "Clock", Icon: Clock },
  { name: "Heart", Icon: Heart },
  { name: "Truck", Icon: Truck },
];

export function AddComponentModal({ isOpen, onClose, onAddSection }: AddComponentModalProps) {
  const [step, setStep] = useState<"setup" | "layout">("setup");
  const [componentName, setComponentName] = useState("");
  const [componentIcon, setComponentIcon] = useState("Sparkles");
  const [isVisible, setIsVisible] = useState(true);
  const [selectedLayoutType, setSelectedLayoutType] = useState<LayoutType>("A");

  if (!isOpen) return null;

  const resetAndClose = () => {
    setStep("setup");
    setComponentName("");
    setComponentIcon("Sparkles");
    setIsVisible(true);
    setSelectedLayoutType("A");
    onClose();
  };

  const handleCreateComponent = () => {
    if (!componentName.trim()) return;

    const newSection: LandingSection = {
      id: `custom-${Date.now()}`,
      type: "custom",
      label: componentName.trim(),
      visible: isVisible,
      icon: componentIcon,
      settings: {
        layoutType: selectedLayoutType,
      },
      customFields: createDefaultFields(selectedLayoutType),
    };

    onAddSection(newSection);
    resetAndClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={resetAndClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl animate-in zoom-in-95 max-h-[85vh] flex flex-col overflow-hidden text-card-foreground">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-bold text-foreground">
            {step === "setup" ? "নতুন কম্পোনেন্ট তৈরি করুন" : "লেআউট টাইপ নির্বাচন করুন"}
          </h2>
          <button
            onClick={resetAndClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {step === "setup" ? (
            <>
              {/* Component Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  কম্পোনেন্টের নাম *
                </label>
                <input
                  type="text"
                  value={componentName}
                  onChange={(e) => setComponentName(e.target.value)}
                  placeholder="যেমন: আমাদের বিশেষত্ব, ব্যবহারের নিয়মাবলী..."
                  className="w-full h-11 px-3.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  autoFocus
                />
              </div>

              {/* Icon Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  আইকন নির্বাচন করুন
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {AVAILABLE_ICONS.map(({ name, Icon }) => {
                    const isSelected = componentIcon === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setComponentIcon(name)}
                        className={`size-10 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                            : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                        title={name}
                      >
                        <Icon className="size-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visibility Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border">
                <span className="text-sm font-medium text-foreground">পাবলিকে দেখাবে (Visible)</span>
                <button
                  type="button"
                  onClick={() => setIsVisible(!isVisible)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    isVisible ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <div
                    className={`size-4 bg-white rounded-full absolute top-1 transition-all shadow-xs ${
                      isVisible ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {LAYOUT_TYPES.map((layout) => {
                const isSelected = selectedLayoutType === layout.type;
                return (
                  <button
                    key={layout.type}
                    type="button"
                    onClick={() => setSelectedLayoutType(layout.type)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {layout.icon === "Image" && <ImageIcon className="size-5" />}
                        {layout.icon === "FileText" && <FileText className="size-5" />}
                        {layout.icon === "LayoutGrid" && <LayoutGrid className="size-5" />}
                        {layout.icon === "LayoutDashboard" && <LayoutDashboard className="size-5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-foreground">{layout.name}</p>
                          {isSelected && <CheckCircle2 className="size-4 text-primary shrink-0 ml-2" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {layout.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {layout.defaultFields.map((field) => (
                            <span
                              key={field.key}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground font-medium"
                            >
                              {field.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border flex-shrink-0 bg-muted/20">
          {step === "layout" && (
            <button
              type="button"
              onClick={() => setStep("setup")}
              className="h-10 px-4 bg-background border border-border text-foreground rounded-lg text-sm font-semibold hover:bg-muted transition-colors cursor-pointer"
            >
              পূর্ববর্তী
            </button>
          )}

          <div className="flex-1" />

          {step === "setup" ? (
            <button
              type="button"
              onClick={() => setStep("layout")}
              disabled={!componentName.trim()}
              className="h-10 px-6 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              পরবর্তী ধাপ
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreateComponent}
              className="h-10 px-6 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:opacity-90 transition-all cursor-pointer shadow-sm"
            >
              কম্পোনেন্ট যুক্ত করুন
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
