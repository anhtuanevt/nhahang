"use client";
import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98]";
  const variants = {
    primary: "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-sm hover:shadow-md focus:ring-orange-400",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-300",
    danger: "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-sm focus:ring-red-400",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-300",
    success: "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-sm focus:ring-green-400",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs min-h-[32px]",
    md: "px-4 py-2.5 text-sm min-h-[40px]",
    lg: "px-6 py-3.5 text-base min-h-[48px]",
  };
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}
