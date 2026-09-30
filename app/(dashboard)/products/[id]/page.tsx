"use client";
import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useApiData } from "@/app/lib/useApiData";
import ProductForm from "@/app/Components/ProductForm";
import { deleteProduct, getProduct, updateProduct } from "@/app/lib/services/products";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const state = useApiData(() => getProduct(params.id), `product-${params.id}`);

  return (
    <div className="p-5 sm:p-8">
      <Link href="/products" className="inline-flex items-center gap-1 text-xs font-bold text-[#5C3A1E] hover:text-[#181410] mb-4">
        <ChevronLeft size={14} />
        All products
      </Link>

      {state.status === "loading" && <div className="h-80 max-w-2xl rounded-2xl bg-white border border-[#EDD9C0] shimmer" />}

      {state.status === "error" && (
        <div className="bg-[#FDE8EF] text-[#B00B44] text-sm font-bold rounded-2xl p-6 flex items-center justify-between max-w-2xl">
          <span>{state.message}</span>
          <button onClick={state.reload} className="underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <h1 className="text-2xl font-black uppercase text-[#181410] mb-5">Edit {state.data.name}</h1>
          <ProductForm
            initial={state.data}
            submitLabel="Save changes"
            onSubmit={(input) => updateProduct(params.id, input)}
            onDelete={() => deleteProduct(params.id)}
          />
        </>
      )}
    </div>
  );
}
