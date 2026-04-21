"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { formatDate } from "@/lib/utils";

interface Feedback {
  id: string;
  tableNumber: number;
  sessionId: string | null;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
}

type FilterStatus = "all" | "unread" | "read" | "resolved";

const FILTER_TABS: { label: string; value: FilterStatus }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Chưa đọc", value: "unread" },
  { label: "Đã đọc", value: "read" },
  { label: "Đã xử lý", value: "resolved" },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5 text-base leading-none">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? "text-orange-400" : "text-gray-300"}>
          {i < rating ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    unread: { label: "Chưa đọc", className: "bg-red-100 text-red-700" },
    read: { label: "Đã đọc", className: "bg-blue-100 text-blue-700" },
    resolved: { label: "Đã xử lý", className: "bg-green-100 text-green-700" },
  };
  const { label, className } = config[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export default function FeedbackPage() {
  const router = useRouter();
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<Feedback | null>(null);

  const fetchFeedback = useCallback(
    async (status: FilterStatus = filter) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/feedback?status=${status}`, {
          credentials: "include",
        });
        if (res.status === 401) {
          router.push("/admin/login");
          return;
        }
        if (!res.ok) {
          setError("Không thể tải danh sách feedback");
          return;
        }
        setFeedbackList(await res.json());
      } catch {
        setError("Lỗi kết nối");
      } finally {
        setLoading(false);
      }
    },
    [filter, router]
  );

  useEffect(() => {
    fetchFeedback(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleUpdateStatus(id: string, status: "read" | "resolved") {
    setActionLoading(id + status);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        alert("Không thể cập nhật trạng thái");
        return;
      }
      await fetchFeedback(filter);
    } catch {
      alert("Lỗi kết nối");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(feedback: Feedback) {
    setConfirmDelete(null);
    setActionLoading(feedback.id + "delete");
    try {
      const res = await fetch(`/api/admin/feedback/${feedback.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        alert("Không thể xóa feedback");
        return;
      }
      await fetchFeedback(filter);
    } catch {
      alert("Lỗi kết nối");
    } finally {
      setActionLoading(null);
    }
  }

  const unreadCount = feedbackList.filter((f) => f.status === "unread").length;
  const allUnreadCount =
    filter === "all"
      ? unreadCount
      : feedbackList.filter((f) => f.status === "unread").length;

  const avgRating =
    feedbackList.length > 0
      ? (feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length).toFixed(1)
      : null;

  if (loading && feedbackList.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Feedback</h1>
        {allUnreadCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1.5 text-sm font-bold text-red-700 ring-1 ring-red-200">
            {allUnreadCount} chưa đọc
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 min-h-[36px] ${
              filter === tab.value
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm shadow-orange-100"
                : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats row — only for "all" tab */}
      {filter === "all" && !loading && feedbackList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
              💬
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng feedback</p>
              <p className="text-2xl font-bold text-gray-900">{feedbackList.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center text-xl">
              ⭐
            </div>
            <div>
              <p className="text-sm text-gray-500">Đánh giá trung bình</p>
              <p className="text-2xl font-bold text-gray-900">
                {avgRating} <span className="text-lg">⭐</span>
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-xl">
              🔔
            </div>
            <div>
              <p className="text-sm text-gray-500">Chưa đọc</p>
              <p className="text-2xl font-bold text-gray-900">{unreadCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay while re-fetching */}
      {loading && feedbackList.length > 0 && (
        <div className="flex justify-center mb-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      )}

      {/* Empty state */}
      {!loading && feedbackList.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4">📭</span>
          <p className="text-lg font-medium text-gray-600">Chưa có feedback nào</p>
          <p className="text-sm text-gray-400 mt-1">
            {filter === "all"
              ? "Hệ thống chưa nhận được đánh giá nào từ khách hàng."
              : filter === "unread"
              ? "Không có feedback chưa đọc."
              : filter === "read"
              ? "Không có feedback đã đọc."
              : "Không có feedback đã xử lý."}
          </p>
        </div>
      )}

      {/* Feedback cards */}
      {feedbackList.length > 0 && (
        <div className="space-y-4">
          {feedbackList.map((fb) => (
            <div
              key={fb.id}
              className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 ${
                fb.status === "unread" ? "border-orange-200 ring-1 ring-orange-100" : "border-gray-100"
              }`}
            >
              <div className="p-5">
                {/* Top row */}
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="font-semibold text-gray-900">Bàn {fb.tableNumber}</span>
                  <StarRating rating={fb.rating} />
                  <StatusBadge status={fb.status} />
                  <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(fb.createdAt)}
                  </span>
                </div>

                {/* Comment */}
                {fb.comment ? (
                  <p className="text-sm text-gray-700 mb-4">{fb.comment}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic mb-4">Không có nhận xét</p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 flex-wrap">
                  {fb.status === "unread" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={actionLoading === fb.id + "read"}
                      disabled={actionLoading !== null}
                      onClick={() => handleUpdateStatus(fb.id, "read")}
                    >
                      Đánh dấu đã đọc
                    </Button>
                  )}
                  {fb.status !== "resolved" && (
                    <Button
                      size="sm"
                      variant="success"
                      loading={actionLoading === fb.id + "resolved"}
                      disabled={actionLoading !== null}
                      onClick={() => handleUpdateStatus(fb.id, "resolved")}
                    >
                      Đã xử lý
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    loading={actionLoading === fb.id + "delete"}
                    disabled={actionLoading !== null}
                    onClick={() => setConfirmDelete(fb)}
                  >
                    Xóa
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Xác nhận xóa"
      >
        <p className="text-sm text-gray-600 mb-6">
          Bạn có chắc muốn xóa feedback của{" "}
          <span className="font-semibold text-gray-900">Bàn {confirmDelete?.tableNumber}</span>?
          Hành động này không thể hoàn tác.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
            Hủy
          </Button>
          <Button
            variant="danger"
            onClick={() => confirmDelete && handleDelete(confirmDelete)}
          >
            Xóa
          </Button>
        </div>
      </Modal>
    </div>
  );
}
