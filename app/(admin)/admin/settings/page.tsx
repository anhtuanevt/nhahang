"use client";
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";

interface Settings {
  restaurantName?: string;
  [key: string]: string | undefined;
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [restaurantName, setRestaurantName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState("");

  async function fetchSettings() {
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) { setError("Không thể tải cài đặt"); return; }
      const data: Settings = await res.json();
      setSettings(data);
      setRestaurantName(data.restaurantName ?? "");
    } catch {
      setError("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSettings(); }, []);

  async function handleSaveName(e: FormEvent) {
    e.preventDefault();
    setNameError("");
    setNameSaved(false);
    setSavingName(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key: "restaurantName", value: restaurantName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNameError(data.error || "Lỗi khi lưu");
        return;
      }
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 3000);
    } catch {
      setNameError("Lỗi kết nối");
    } finally {
      setSavingName(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt</h1>
        <p className="text-sm text-gray-500 mt-1">Quản lý thông tin nhà hàng</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">{error}</div>
      )}

      {/* Restaurant info */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Thông tin nhà hàng</h2>
        <form onSubmit={handleSaveName} className="space-y-4">
          <Input
            label="Tên nhà hàng"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            placeholder="Nhà Hàng ABC..."
          />

          {nameError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{nameError}</div>
          )}
          {nameSaved && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              Đã lưu thành công!
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={savingName}>
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </div>

      {/* Server password info */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Mật khẩu quản trị</h2>
        <p className="text-sm text-gray-500 mb-3">
          Mật khẩu admin được cấu hình qua biến môi trường <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">ADMIN_PASSWORD</code> trong file <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">.env</code>.
        </p>
        <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-700 border border-gray-200">
          ADMIN_PASSWORD=your_new_password
        </div>
        <p className="text-xs text-gray-400 mt-2">Khởi động lại server sau khi thay đổi.</p>
      </div>

      {/* Server staff password info */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Mật khẩu nhân viên phục vụ</h2>
        <p className="text-sm text-gray-500 mb-3">
          Mật khẩu nhân viên được cấu hình qua biến môi trường <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">SERVER_PASSWORD</code> trong file <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">.env</code>.
        </p>
        <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-700 border border-gray-200">
          SERVER_PASSWORD=your_server_password
        </div>
        <p className="text-xs text-gray-400 mt-2">Khởi động lại server sau khi thay đổi.</p>
      </div>
    </div>
  );
}
