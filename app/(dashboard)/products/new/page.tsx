"use client";
import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ProductForm from "@/app/Components/ProductForm";
import { createProduct } from "@/app/lib/services/products";

export default function NewProductPage() {
  return (
    <div className="p-5 sm:p-8">
      <Link href="/products" className="inline-flex items-center gap-1 text-xs font-bold text-[#5C3A1E] hover:text-[#181410] mb-4">
        <ChevronLeft size={14} />
        All products
      </Link>
      <h1 className="text-2xl font-black uppercase text-[#181410] mb-5">Add product</h1>
      <ProductForm onSubmit={createProduct} submitLabel="Create product" />
    </div>
  );
}
