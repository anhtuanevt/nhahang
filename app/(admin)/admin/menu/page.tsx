"use client";
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Modal } from "@/app/components/ui/Modal";
import { Badge } from "@/app/components/ui/Badge";
import { formatPrice } from "@/lib/utils";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  available: boolean;
  imageUrl: string | null;
}

const CATEGORIES = ["Tất cả", "Đồ uống", "Khai vị", "Món chính", "Tráng miệng", "Khác"];
const FORM_CATEGORIES = ["Đồ uống", "Khai vị", "Món chính", "Tráng miệng", "Khác"];

const emptyForm = {
  name: "",
  description: "",
  price: "",
  category: "Món chính",
  available: true,
  imageUrls: [""],
};

export default function MenuPage() {
  const router = useRouter();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tất cả");

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function fetchItems() {
    try {
      const res = await fetch("/api/admin/menu", { credentials: "include" });
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) { setError("Không thể tải thực đơn"); return; }
      setItems(await res.json());
    } catch {
      setError("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchItems(); }, []);

  function openAdd() {
    setEditItem(null);
    setForm({ ...emptyForm, imageUrls: [""] });
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(item: MenuItem) {
    setEditItem(item);
    const urls = item.imageUrl ? item.imageUrl.split("|").filter(Boolean) : [];
    setForm({
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      category: item.category,
      available: item.available,
      imageUrls: urls.length > 0 ? urls : [""],
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.name || !form.price || !form.category) {
      setFormError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    setSaving(true);
    try {
      const validUrls = form.imageUrls.filter((u) => u.trim() !== "");
      const body = {
        name: form.name,
        description: form.description || null,
        price: Number(form.price),
        category: form.category,
        available: form.available,
        imageUrl: validUrls.length > 0 ? validUrls.join("|") : null,
      };

      const res = editItem
        ? await fetch(`/api/admin/menu/${editItem.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
          })
        : await fetch("/api/admin/menu", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
          });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Lỗi khi lưu món ăn");
        return;
      }
      setModalOpen(false);
      await fetchItems();
    } catch {
      setFormError("Lỗi kết nối");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: MenuItem) {
    if (!confirm(`Xóa món "${item.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/menu/${item.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Không thể xóa món");
        return;
      }
      await fetchItems();
    } catch {
      alert("Lỗi kết nối");
    }
  }

  async function handleToggleAvailable(item: MenuItem) {
    try {
      await fetch(`/api/admin/menu/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ available: !item.available }),
      });
      await fetchItems();
    } catch {
      alert("Lỗi kết nối");
    }
  }

  const filtered = categoryFilter === "Tất cả"
    ? items
    : items.filter((i) => i.category === categoryFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thực đơn</h1>
          <p className="text-sm text-gray-400 mt-1 font-medium">{items.length} món</p>
        </div>
        <Button onClick={openAdd}>+ Thêm món</Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">{error}</div>
      )}

      {/* Category filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 min-h-[36px] ${
              categoryFilter === cat
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm shadow-orange-100"
                : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 font-medium text-gray-600">Tên món</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Danh mục</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Giá</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Trạng thái</th>
              <th className="text-right px-6 py-3 font-medium text-gray-600">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                  Không có món nào
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-gray-600">{item.category}</td>
                  <td className="px-4 py-4 text-right font-medium text-gray-900">{formatPrice(item.price)}</td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => handleToggleAvailable(item)}
                      title="Nhấn để thay đổi"
                    >
                      <Badge status={item.available ? "active" : "cancelled"} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                        Sửa
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(item)}>
                        Xóa
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? "Chỉnh sửa món" : "Thêm món mới"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tên món *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Phở bò, Cơm tấm..."
            required
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Mô tả</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
              rows={2}
              placeholder="Mô tả ngắn gọn..."
            />
          </div>
          <Input
            label="Giá (VNĐ) *"
            type="number"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            placeholder="50000"
            min="0"
            required
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Danh mục *</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {FORM_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {/* Image URLs — up to 5 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Ảnh món ({form.imageUrls.filter((u) => u.trim()).length}/5)
              </label>
              {form.imageUrls.length < 5 && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, ""] }))}
                  className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                >
                  + Thêm ảnh
                </button>
              )}
            </div>
            {form.imageUrls.map((url, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setForm((f) => {
                    const urls = [...f.imageUrls];
                    urls[idx] = e.target.value;
                    return { ...f, imageUrls: urls };
                  })}
                  placeholder={`URL ảnh ${idx + 1}`}
                  className="flex-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                {form.imageUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, imageUrls: f.imageUrls.filter((_, i) => i !== idx) }))}
                    className="text-gray-400 hover:text-red-500 px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {/* Preview thumbnails */}
            {form.imageUrls.some((u) => u.trim()) && (
              <div className="flex gap-2 flex-wrap mt-1">
                {form.imageUrls.filter((u) => u.trim()).map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt=""
                    className="h-12 w-12 object-cover rounded-lg border border-gray-200"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))}
              className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">Đang phục vụ</span>
          </label>

          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{formError}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" loading={saving}>
              {editItem ? "Lưu thay đổi" : "Thêm món"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
