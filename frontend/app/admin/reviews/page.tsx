"use client";

import { useState } from "react";
import { Plus, Trash2, X, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { products } from "@/lib/shop-data";
import { useReviews, type Review } from "@/lib/reviews";

export default function AdminReviews() {
  const { reviews, addReview, deleteReview } = useReviews();
  const [open, setOpen] = useState(false);
  
  // Form State
  const [productSlug, setProductSlug] = useState(products[0]?.slug || "");
  const [customerName, setCustomerName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const handleCreateReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!comment.trim()) {
      toast.error("Review comment is required");
      return;
    }

    const selectedProduct = products.find((p) => p.slug === productSlug);
    if (!selectedProduct) {
      toast.error("Invalid product selected");
      return;
    }

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      productSlug,
      productName: selectedProduct.name,
      customerName: customerName.trim(),
      rating,
      comment: comment.trim(),
      date: new Date().toISOString().split("T")[0]!,
    };

    addReview(newReview);
    toast.success("Review created successfully!");
    
    // Reset Form
    setCustomerName("");
    setRating(5);
    setComment("");
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this review?")) {
      deleteReview(id);
      toast.success("Review deleted");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <Button onClick={() => setOpen(true)} className="gap-2 cursor-pointer">
          <Plus className="size-4" />
          Add Review
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No reviews found.
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.productName}</TableCell>
                  <TableCell>{r.customerName}</TableCell>
                  <TableCell>
                    <div className="flex text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`size-3.5 ${
                            i < r.rating ? "fill-current" : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={r.comment}>
                    {r.comment}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.date}</TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="rounded-md border border-border p-2 text-foreground transition-colors hover:border-destructive hover:text-destructive cursor-pointer"
                      aria-label="Delete review"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Customer Review</DialogTitle>
            <DialogDescription>
              Select a product and write a review on behalf of a customer.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateReview} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="product">Select Product</Label>
              <select
                id="product"
                value={productSlug}
                onChange={(e) => setProductSlug(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
              >
                {products.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Tanvir Rahman"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Rating</Label>
              <div className="flex gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => {
                  const stars = i + 1;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(stars)}
                      className="text-amber-500 hover:scale-110 transition-transform cursor-pointer"
                      aria-label={`Rate ${stars} stars`}
                    >
                      <Star className={`size-6 ${stars <= rating ? "fill-amber-500 text-amber-500" : "text-muted"}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comment">Review Comment</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write review here..."
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                <X className="mr-1 size-4" />
                Cancel
              </Button>
              <Button type="submit">
                Add Review
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
