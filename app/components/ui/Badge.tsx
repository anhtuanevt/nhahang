import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ready: { label: "Sẵn sàng", className: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" },
  occupied: { label: "Đang dùng", className: "bg-blue-100 text-blue-700 ring-1 ring-blue-200" },
  payment_requested: { label: "Yêu cầu TT", className: "bg-amber-100 text-amber-700 ring-1 ring-amber-200" },
  pending: { label: "Đang chờ", className: "bg-orange-100 text-orange-700 ring-1 ring-orange-200" },
  done: { label: "Xong", className: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" },
  cancelled: { label: "Đã hủy", className: "bg-red-100 text-red-600 ring-1 ring-red-200" },
  active: { label: "Đang hoạt động", className: "bg-blue-100 text-blue-700 ring-1 ring-blue-200" },
  paid: { label: "Đã thanh toán", className: "bg-gray-100 text-gray-600 ring-1 ring-gray-200" },
};

export function Badge({ status, className }: { status: string; className?: string }) {
  const config = STATUS_CONFIG[status] || { label: status, className: "bg-gray-100 text-gray-600 ring-1 ring-gray-200" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
