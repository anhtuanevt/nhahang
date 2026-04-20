"use client";
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Modal } from "@/app/components/ui/Modal";
import { Badge } from "@/app/components/ui/Badge";

interface TableSession {
  status: string;
}

interface Table {
  id: string;
  number: number;
  name: string | null;
  status: string;
  password: string;
  qrToken: string;
  sessions: TableSession[];
}

const emptyForm = { number: "", name: "", password: "" };

export default function TablesPage() {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editTable, setEditTable] = useState<Table | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [qrTable, setQrTable] = useState<Table | null>(null);
  const [showPassId, setShowPassId] = useState<string | null>(null);

  async function fetchTables() {
    try {
      const res = await fetch("/api/admin/tables", { credentials: "include" });
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) { setError("Không thể tải danh sách bàn"); return; }
      setTables(await res.json());
    } catch {
      setError("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTables(); }, []);

  function openAdd() {
    setEditTable(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(table: Table) {
    setEditTable(table);
    setForm({ number: String(table.number), name: table.name ?? "", password: table.password });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.number || !form.password) {
      setFormError("Số bàn và mật khẩu là bắt buộc");
      return;
    }
    setSaving(true);
    try {
      const body = {
        number: Number(form.number),
        name: form.name || null,
        password: form.password,
      };

      const res = editTable
        ? await fetch(`/api/admin/tables/${editTable.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
          })
        : await fetch("/api/admin/tables", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
          });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Lỗi khi lưu bàn");
        return;
      }
      setModalOpen(false);
      await fetchTables();
    } catch {
      setFormError("Lỗi kết nối");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(table: Table) {
    if (!confirm(`Xóa bàn số ${table.number}?`)) return;
    try {
      const res = await fetch(`/api/admin/tables/${table.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Không thể xóa bàn");
        return;
      }
      await fetchTables();
    } catch {
      alert("Lỗi kết nối");
    }
  }

  function getTableStatus(table: Table): string {
    const hasActive = table.sessions?.some((s) => s.status === "active");
    if (hasActive) return "occupied";
    return "ready";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý bàn</h1>
          <p className="text-sm text-gray-500 mt-1">{tables.length} bàn</p>
        </div>
        <Button onClick={openAdd}>+ Thêm bàn</Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {tables.map((table) => {
          const status = getTableStatus(table);
          const isReady = status === "ready";
          return (
            <div key={table.id} className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xl font-bold text-gray-900">Bàn {table.number}</div>
                  {table.name && <div className="text-sm text-gray-500">{table.name}</div>}
                </div>
                <Badge status={status} />
              </div>

              {/* Password */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Mật khẩu:</span>
                <span className="font-mono">
                  {showPassId === table.id ? table.password : "••••••"}
                </span>
                <button
                  onClick={() => setShowPassId(showPassId === table.id ? null : table.id)}
                  className="text-xs text-orange-500 hover:text-orange-700 underline"
                >
                  {showPassId === table.id ? "Ẩn" : "Hiện"}
                </button>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(table)}>
                  Sửa
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setQrTable(table)}>
                  QR Code
                </Button>
                {isReady && (
                  <Button size="sm" variant="danger" onClick={() => handleDelete(table)}>
                    Xóa
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {tables.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400">
            Chưa có bàn nào. Nhấn &quot;Thêm bàn&quot; để bắt đầu.
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTable ? "Chỉnh sửa bàn" : "Thêm bàn mới"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Số bàn *"
            type="number"
            value={form.number}
            onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
            placeholder="1, 2, 3..."
            min="1"
            required
          />
          <Input
            label="Tên bàn (tuỳ chọn)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="VIP, Sân thượng..."
          />
          <Input
            label="Mật khẩu *"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Mật khẩu để khách truy cập..."
            required
          />

          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{formError}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" loading={saving}>
              {editTable ? "Lưu thay đổi" : "Thêm bàn"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        open={!!qrTable}
        onClose={() => setQrTable(null)}
        title={`QR Code - Bàn ${qrTable?.number}`}
        className="max-w-sm"
      >
        {qrTable && (
          <div className="flex flex-col items-center gap-4">
            <img
              src={`/api/admin/tables/${qrTable.id}/qr`}
              alt={`QR Code bàn ${qrTable.number}`}
              className="w-56 h-56 border border-gray-200 rounded-lg object-contain"
            />
            <p className="text-sm text-gray-500 text-center">
              Khách hàng quét mã này để vào thực đơn của bàn {qrTable.number}
            </p>
            <a
              href={`/api/admin/tables/${qrTable.id}/qr`}
              download={`qr-ban-${qrTable.number}.png`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
            >
              Tải xuống QR
            </a>
          </div>
        )}
      </Modal>
    </div>
  );
}
