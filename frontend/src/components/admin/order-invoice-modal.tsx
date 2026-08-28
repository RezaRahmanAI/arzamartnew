"use client";

import { useEffect, useState } from "react";
import { Printer, X, Image as ImageIcon } from "lucide-react";
import { Order } from "@/lib/dashboard-data";
import { useSettings } from "@/context/settings-context";
import { format } from "date-fns";

// A simple deterministic barcode SVG generator for visual simulation
function BarcodePlaceholder({ value }: { value: string }) {
  // Generate random-looking but deterministic widths based on the string
  const bars = Array.from({ length: 45 }).map((_, i) => {
    const charCode = value.charCodeAt(i % value.length);
    const width = ((charCode * (i + 1)) % 4) + 1; // 1 to 4 px wide
    return width;
  });

  return (
    <div className="flex h-12 w-48 items-center bg-white border border-gray-100 rounded-sm overflow-hidden">
      {bars.map((w, i) => (
        <div 
          key={i} 
          className="h-full bg-black shrink-0" 
          style={{ 
            width: `${w}px`, 
            marginRight: `${(i % 3 === 0) ? 2 : 1}px`,
            opacity: i % 7 === 0 ? 0 : 1 // Some gaps
          }}
        />
      ))}
    </div>
  );
}

import { getSavedNotesStore } from "@/components/admin/order-notes-modal";

import { useProducts } from "@/lib/products-store";
import { getImageUrl } from "@/lib/utils";

export function OrderInvoiceModal({
  order,
  isOpen,
  onClose,
}: {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { settings } = useSettings();
  const { products } = useProducts();
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentDate(new Date());
    }
  }, [isOpen]);

  if (!order || !isOpen) return null;

  // Extract Customer / Delivery Note (excluding purely internal notes)
  const storeNotes = getSavedNotesStore()[order.id] || [];
  const customerDeliveryNotesList = storeNotes
    .filter((n) => n.noteType === "Customer / Delivery Note")
    .map((n) => n.text);

  if (customerDeliveryNotesList.length === 0 && order.note) {
    const parts = order.note.split(" | ").filter((p) => {
      const lower = p.toLowerCase();
      return (
        !lower.includes("internal") &&
        !lower.startsWith("source:") &&
        !lower.startsWith("social:") &&
        !lower.startsWith("area:") &&
        !lower.startsWith("expected dispatch:") &&
        p !== "[PRE-ORDER]"
      );
    });
    if (parts.length > 0) {
      customerDeliveryNotesList.push(...parts);
    }
  }

  const customerNoteDisplay = customerDeliveryNotesList.join(" | ");

  const handlePrint = () => {
    window.print();
  };

  // Build website name and contact phone with robust fallbacks
  const websiteName = settings?.general?.websiteName || "ArzaMart";
  const contactPhone =
    settings?.contact?.supportPhone ||
    settings?.contact?.whatsAppNumber ||
    settings?.contact?.salesPhone ||
    "+880 1800 000000";
  const deliveryPartner = "Standard Courier";

  // Construct full customer address
  const fullCustomerAddress = [
    order.address && order.address !== order.city ? order.address : "",
    order.area && order.address && !order.address.toLowerCase().includes(order.area.toLowerCase()) ? order.area : "",
    order.city || "",
  ]
    .filter(Boolean)
    .join(", ") || order.address || order.city || "Dhaka";

  // Extract order source and page name matching the orders table exactly
  let socialMedia = order.socialMediaSourceName || "";
  let pageName = order.sourcePageName || "";

  if (!socialMedia || !pageName) {
    const fullText = `${order.note || ""} ${order.address || ""}`;
    const sourceMatch = fullText.match(/Source:\s*([^|\n,]+)/i);
    const socialMatch = fullText.match(/Social:\s*([^|\n,]+)/i);

    if (socialMatch && socialMatch[1]) {
      socialMedia = socialMatch[1].trim();
    }
    if (sourceMatch && sourceMatch[1]) {
      pageName = sourceMatch[1].trim();
    }
  }

  // Display specific page name or social channel name if present
  const displayPageName =
    pageName && pageName.toLowerCase() !== "website" && pageName !== "-"
      ? pageName
      : socialMedia && socialMedia.toLowerCase() !== "website" && socialMedia !== "-"
      ? socialMedia
      : "";
  
  const totalQty = order.items.reduce((sum, item) => sum + item.qty, 0);
  const subTotal = order.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  // Real delivery, discount, paid & due from order
  const shippingCost = order.delivery !== undefined ? order.delivery : (order.total > subTotal ? order.total - subTotal : 0);
  const discount = order.discount !== undefined ? order.discount : Math.max(0, subTotal + shippingCost - order.total);
  const paidAmount = Number(order.paid) || 0;
  const dueAmount = Math.max(0, order.total - paidAmount);

  return (
    // Backdrop - hidden on print
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden"
      onClick={onClose}
    >
      {/* Modal Shell */}
      <div 
        className="bg-background border border-border rounded-xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col print:border-none print:shadow-none print:max-w-none print:h-auto print:overflow-visible print:bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar - hidden on print */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30 print:hidden">
          <span className="text-muted-foreground font-bold text-sm">Invoice Preview</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-all shadow cursor-pointer"
            >
              <Printer className="size-3.5" /> Print Invoice
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-card flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors cursor-pointer border border-border"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Scrollable preview area */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-6 print:p-0 print:bg-white print:overflow-visible custom-scrollbar">
          
          {/* INVOICE PAPER matching exact ArzaMart screenshot */}
          <div 
            id="invoice-paper" 
            className="bg-white mx-auto shadow-md print:shadow-none p-6 text-black font-sans" 
            style={{ width: "780px", boxSizing: "border-box" }}
          >
            
            {/* Section 1: Header + Customer Info */}
            <div className="flex justify-between items-start mb-3">
              {/* Top Left Info & Barcode */}
              <div>
                <div className="text-[13px] text-black leading-snug font-medium">Phone: {contactPhone}</div>
                <div className="text-[13px] text-black leading-snug font-medium">Web: https://{websiteName.toLowerCase().replace(/\s+/g, '')}.com/</div>
                <div className="mt-1.5">
                  <BarcodePlaceholder value={order.id} />
                  <div className="text-[15px] font-extrabold text-black mt-0.5">{order.id}</div>
                </div>
              </div>

              {/* Top Right Customer Info Box */}
              <div>
                <div className="text-center font-bold text-[14px] text-black mb-1">Customar info</div>
                <div className="border-[1.5px] border-black px-3.5 py-2.5 w-[360px] text-[13px] leading-relaxed text-black box-border">
                  <div><strong className="font-bold">Order ID:</strong> {order.id}</div>
                  <div><strong className="font-bold">Order Date:</strong> {order.date}</div>
                  <div><strong className="font-bold">Name:</strong> {order.customer}</div>
                  <div><strong className="font-bold">Address:</strong> {fullCustomerAddress}</div>
                  <div><strong className="font-bold">Phone:</strong> {order.phone}</div>
                  {customerNoteDisplay && (
                    <div className="mt-1 pt-1 border-t border-black/40 text-[12px] text-rose-800 font-semibold leading-tight">
                      <strong className="font-bold text-black">Delivery Note:</strong> {customerNoteDisplay}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Products Table */}
            <table className="w-full border-collapse mb-3 text-[12px] border border-[#555]">
              <thead>
                <tr className="border-b border-[#555] bg-white text-black">
                  <th className="border border-[#555] px-2 py-1.5 w-[60px] text-center font-bold">Product</th>
                  <th className="border border-[#555] px-2 py-1.5 text-left font-bold">Item Name</th>
                  <th className="border border-[#555] px-2 py-1.5 w-[50px] text-center font-bold">Size</th>
                  <th className="border border-[#555] px-2 py-1.5 w-[75px] text-left font-bold">Unit Cost</th>
                  <th className="border border-[#555] px-2 py-1.5 w-[65px] text-left font-bold">Discount</th>
                  <th className="border border-[#555] px-2 py-1.5 w-[45px] text-center font-bold">Qty</th>
                  <th className="border border-[#555] px-2 py-1.5 w-[75px] text-left font-bold">Total</th>
                </tr>
              </thead>
              <tbody className="text-black">
                {order.items.map((item, idx) => {
                  const matchedProd = products.find(
                    (p) => p.slug === item.slug || p.name.toLowerCase() === item.name.toLowerCase()
                  );
                  const prodImage = matchedProd?.images?.[0] || matchedProd?.image;

                  return (
                    <tr key={idx} className="border-b border-[#555]">
                      <td className="border border-[#555] p-1 text-center align-middle">
                        <div className="w-[38px] h-[38px] bg-gray-50 flex items-center justify-center mx-auto rounded-sm border border-gray-200 overflow-hidden text-gray-400">
                          {prodImage ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={getImageUrl(prodImage, "thumb")}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="size-4" />
                          )}
                        </div>
                      </td>
                      <td className="border border-[#555] px-2 py-1.5 align-middle font-medium">{item.name}</td>
                      <td className="border border-[#555] px-2 py-1.5 text-center align-middle">{item.size || 'N/A'}</td>
                      <td className="border border-[#555] px-2 py-1.5 text-left align-middle">{item.price}</td>
                      <td className="border border-[#555] px-2 py-1.5 text-left align-middle">0</td>
                      <td className="border border-[#555] px-2 py-1.5 text-center align-middle font-semibold">{item.qty}</td>
                      <td className="border border-[#555] px-2 py-1.5 text-left align-middle font-semibold">{item.price * item.qty}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Section 3: Bottom Barcode + Breakdown Table */}
            <div className="flex justify-between items-start mb-3.5">
              {/* Bottom Left Meta & Barcode */}
              <div>
                <div className="mb-1">
                  <BarcodePlaceholder value={order.id} />
                  <div className="text-[15px] font-extrabold text-black mt-0.5">{order.id}</div>
                </div>
                <div className="text-[13px] text-black leading-relaxed">Delivery Partner: {deliveryPartner}</div>
                {displayPageName && (
                  <div className="text-[13px] text-black leading-relaxed">Page Name : {displayPageName}</div>
                )}
                <div className="text-[13px] text-black leading-relaxed">
                  Print : {currentDate ? format(currentDate, "dd/MM/yyyy, HH:mm:ss") : ""}
                </div>
              </div>

              {/* Bottom Right Breakdown Table */}
              <table className="w-[360px] border-collapse text-[12px] border border-[#555] text-black">
                <tbody>
                  <tr className="border-b border-[#555]">
                    <td className="border border-[#555] px-2 py-1 font-semibold uppercase">TOTAL QTY:</td>
                    <td className="border border-[#555] px-2 py-1 text-rose-600 font-extrabold text-[13px]">{totalQty}</td>
                  </tr>
                  <tr className="border-b border-[#555]">
                    <td className="border border-[#555] px-2 py-1 font-semibold uppercase">SUB TOTAL:</td>
                    <td className="border border-[#555] px-2 py-1">{subTotal}</td>
                  </tr>
                  <tr className="border-b border-[#555]">
                    <td className="border border-[#555] px-2 py-1 font-semibold uppercase">DELIVERY Charge:</td>
                    <td className="border border-[#555] px-2 py-1 text-purple-600 font-extrabold text-[13px]">{shippingCost}</td>
                  </tr>
                  <tr className="border-b border-[#555]">
                    <td className="border border-[#555] px-2 py-1 font-semibold uppercase">Discount:</td>
                    <td className="border border-[#555] px-2 py-1">{discount}</td>
                  </tr>
                  <tr className="border-b border-[#555]">
                    <td className="border border-[#555] px-2 py-1 font-bold uppercase">TOTAL:</td>
                    <td className="border border-[#555] px-2 py-1 font-extrabold text-[13px]">{order.total}</td>
                  </tr>
                  <tr className="border-b border-[#555]">
                    <td className="border border-[#555] px-2 py-1 font-semibold uppercase">PAID:</td>
                    <td className="border border-[#555] px-2 py-1">{paidAmount}</td>
                  </tr>
                  <tr>
                    <td className="border border-[#555] px-2 py-1 font-bold uppercase">DUE:</td>
                    <td className="border border-[#555] px-2 py-1 font-extrabold text-[13px]">{dueAmount}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 4: Footer Bengali Review Note Box */}
            <div className="border-[1.5px] border-black px-3.5 py-2 text-center italic font-bold text-[13px] text-black tracking-wide">
              প্রোডাক্ট ভাল লাগলে অবশ্যই আমাদের পেজে রিভিউ দিবেন। ধন্যবাদ।।
            </div>

          </div>
        </div>
      </div>
      
      {/* Global Print Styles Injection */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #invoice-paper, #invoice-paper * {
              visibility: visible;
            }
            #invoice-paper {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
            }
          }
        `
      }} />
    </div>
  );
}
