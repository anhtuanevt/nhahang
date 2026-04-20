import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, {label: string, className: string}> = {
  ready: { label: "Sẵn sàng", className: "bg-green-100 text-green-800" },
  occupied: { label: "Đang dùng", className: "bg-blue-100 text-blue-800" },
  payment_requested: { label: "Yêu cầu TT", className: "bg-yellow-100 text-yellow-800" },
  pending: { label: "Đang chờ", className: "bg-orange-100 text-orange-800" },
  done: { label: "Xong", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Đã hủy", className: "bg-red-100 text-red-800" },
  active: { label: "Đang hoạt động", className: "bg-blue-100 text-blue-800" },
  paid: { label: "Đã thanh toán", className: "bg-gray-100 text-gray-800" },
};

export function Badge({ status, className }: { status: string; className?: string }) {
  const config = STATUS_CONFIG[status] || { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", config.className, className)}>
      {config.label}
    </span>
  );
}
