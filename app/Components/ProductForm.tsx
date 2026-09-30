"use client";
import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload } from "lucide-react";
import { Field, FormMessage, primaryButton } from "./Field";
import { ServiceError } from "../lib/services/storage";
import { uploadProductImage, type AdminProduct, type ProductInput } from "../lib/services/products";

export default function ProductForm({
  initial,
  onSubmit,
  onDelete,
  submitLabel,
}: {
  initial?: AdminProduct;
  onSubmit: (input: ProductInput) => Promise<unknown>;
  onDelete?: () => Promise<void>;
  submitLabel: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [image, setImage] = useState(initial?.image ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [originalPrice, setOriginalPrice] = useState(String(initial?.originalPrice ?? ""));
  const [weight, setWeight] = useState(initial?.weight ?? "30g");
  const [stock, setStock] = useState(String(initial?.stock ?? 8));
  const [badge, setBadge] = useState(initial?.badge ?? "");
  const [isSale, setIsSale] = useState(initial?.isSale ?? false);
  const [isComingSoon, setIsComingSoon] = useState(initial?.isComingSoon ?? false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setImage(url);
    } catch (err) {
      setUploadError(err instanceof ServiceError ? err.message : "Couldn't upload the image.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const priceNum = Number(price);
    const mrpNum = Number(originalPrice);
    const stockNum = Number(stock);
    if (!name.trim() || !category.trim() || !image.trim() || !description.trim()) {
      setError("Fill in name, category, image and description.");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0 || !Number.isFinite(mrpNum) || mrpNum < 0) {
      setError("Enter valid prices.");
      return;
    }
    if (!Number.isFinite(stockNum) || stockNum < 0) {
      setError("Enter a valid stock cap.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        category: category.trim(),
        image: image.trim(),
        description: description.trim(),
        price: priceNum,
        originalPrice: mrpNum,
        weight: weight.trim(),
        stock: stockNum,
        badge: badge.trim(),
        isSale,
        isComingSoon,
        offerEndsAt: initial?.offerEndsAt ?? null,
        order: initial?.order ?? 0,
      });
      router.push("/products");
    } catch (err) {
      setError(err instanceof ServiceError ? err.message : "Couldn't save the product.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await onDelete();
      router.push("/products");
    } catch (err) {
      setError(err instanceof ServiceError ? err.message : "Couldn't delete the product.");
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 max-w-2xl">
      {error && <FormMessage kind="error">{error}</FormMessage>}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Name" value={name} onChange={setName} disabled={submitting} />
        <Field label="Category" value={category} onChange={setCategory} disabled={submitting} />
      </div>

      <div>
        <div className="flex items-start gap-3">
          {image && (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-[#EDD9C0] shrink-0 bg-[#F5EAD8]">
              <Image src={image} alt="" fill className="object-cover" unoptimized />
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-2">
            <Field
              label="Image path or URL"
              value={image}
              onChange={setImage}
              disabled={submitting}
              placeholder="/images/newMango.jpeg or a pasted URL"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || submitting}
              className="flex items-center gap-1.5 text-xs font-bold text-[#8B3A1A] hover:underline disabled:opacity-50 cursor-pointer"
            >
              <Upload size={13} />
              {uploading ? "Uploading..." : "Upload an image"}
            </button>
            {uploadError && <p className="text-xs font-bold text-[#B00B44]">{uploadError}</p>}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-black uppercase tracking-wider text-[#5C3A1E] mb-1.5">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          rows={3}
          className="w-full bg-white border-2 border-[#EDD9C0] rounded-xl py-2.5 px-3.5 text-sm text-[#181410] focus:outline-none focus:border-[#FFC300] disabled:opacity-60"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="Price (₹)" value={price} onChange={setPrice} disabled={submitting} />
        <Field label="MRP (₹)" value={originalPrice} onChange={setOriginalPrice} disabled={submitting} />
        <Field label="Weight" value={weight} onChange={setWeight} disabled={submitting} />
        <Field label="Stock cap" value={stock} onChange={setStock} disabled={submitting} />
      </div>

      <Field label="Badge (optional, e.g. Best Seller)" value={badge} onChange={setBadge} disabled={submitting} />

      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-xs font-bold text-[#5C3A1E] cursor-pointer">
          <input type="checkbox" checked={isSale} onChange={(e) => setIsSale(e.target.checked)} disabled={submitting} />
          On sale (shows a discount badge)
        </label>
        <label className="flex items-center gap-2 text-xs font-bold text-[#5C3A1E] cursor-pointer">
          <input
            type="checkbox"
            checked={isComingSoon}
            onChange={(e) => setIsComingSoon(e.target.checked)}
            disabled={submitting}
          />
          Coming soon (not orderable yet)
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={submitting} className={`${primaryButton} w-auto px-8`}>
          {submitting ? "Saving..." : submitLabel}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || submitting}
            className="text-xs font-black uppercase text-[#B00B44] hover:underline disabled:opacity-50 cursor-pointer"
          >
            {deleting ? "Deleting..." : "Delete product"}
          </button>
        )}
      </div>
    </form>
  );
}
