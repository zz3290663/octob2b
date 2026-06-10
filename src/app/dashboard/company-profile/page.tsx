"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

interface CompanyProfile {
  company_name_en: string;
  company_name_cn: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  payment_terms: string;
  delivery_days: number;
  validity_days: number;
  bank_info: string;
  logo_url: string;
}

const DEFAULT: CompanyProfile = {
  company_name_en: "",
  company_name_cn: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  payment_terms: "T/T 30% deposit, 70% before shipment",
  delivery_days: 30,
  validity_days: 30,
  bank_info: "",
  logo_url: "",
};

export default function CompanyProfilePage() {
  const [form, setForm] = useState<CompanyProfile>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/company-profile")
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setForm({
            company_name_en: data.company_name_en ?? "",
            company_name_cn: data.company_name_cn ?? "",
            address: data.address ?? "",
            phone: data.phone ?? "",
            email: data.email ?? "",
            website: data.website ?? "",
            payment_terms: data.payment_terms ?? DEFAULT.payment_terms,
            delivery_days: data.delivery_days ?? 30,
            validity_days: data.validity_days ?? 30,
            bank_info: data.bank_info ?? "",
            logo_url: data.logo_url ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof CompanyProfile, value: string | number) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/company-profile/logo", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) { setUploadError(data.error); return; }
      setForm(f => ({ ...f, logo_url: data.url }));
    } catch {
      setUploadError("上传失败，请重试");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/company-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="text-sm text-gray-400">加载中...</div>
    </main>
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">← 返回会员中心</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">公司信息配置</h1>
        <p className="text-sm text-gray-500 mt-1">配置后将自动出现在你的报价单抬头中</p>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-5">

        {/* Logo 上传 */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">公司 Logo</p>
          <div className="flex items-center gap-4">
            {/* 预览 */}
            <div
              className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center bg-gray-50 flex-shrink-0 cursor-pointer hover:border-blue-300 transition-colors overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {form.logo_url ? (
                <Image
                  src={form.logo_url}
                  alt="Logo"
                  width={96}
                  height={96}
                  className="object-contain w-full h-full p-1"
                  unoptimized
                />
              ) : (
                <div className="text-center">
                  <div className="text-2xl text-gray-300">🖼</div>
                  <p className="text-xs text-gray-400 mt-1">点击上传</p>
                </div>
              )}
            </div>

            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoUpload(f);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {uploading ? "上传中..." : form.logo_url ? "重新上传" : "选择图片"}
              </button>
              {form.logo_url && (
                <button
                  onClick={() => setForm(f => ({ ...f, logo_url: "" }))}
                  className="ml-2 px-3 py-2 text-sm text-red-400 hover:text-red-600"
                >
                  删除
                </button>
              )}
              <p className="text-xs text-gray-400 mt-2">支持 PNG、JPG、SVG · 建议尺寸 400×150px 以内</p>
              {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
            </div>
          </div>
        </div>

        <div className="border-t" />

        {/* 公司名称 */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">公司名称</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">英文名称</label>
              <input
                value={form.company_name_en}
                onChange={e => set("company_name_en", e.target.value)}
                placeholder="如：Omni Valve Co., Ltd."
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">中文名称（可选）</label>
              <input
                value={form.company_name_cn}
                onChange={e => set("company_name_cn", e.target.value)}
                placeholder="如：奥姆阀门有限公司"
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* 联系方式 */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">联系方式</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">地址</label>
              <input
                value={form.address}
                onChange={e => set("address", e.target.value)}
                placeholder="如：No. 88 Industrial Road, Wenzhou, Zhejiang, China"
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">电话 / WhatsApp</label>
                <input
                  value={form.phone}
                  onChange={e => set("phone", e.target.value)}
                  placeholder="+86 138 0000 0000"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">邮箱</label>
                <input
                  value={form.email}
                  onChange={e => set("email", e.target.value)}
                  placeholder="sales@yourcompany.com"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">网址</label>
              <input
                value={form.website}
                onChange={e => set("website", e.target.value)}
                placeholder="www.yourcompany.com"
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* 报价默认设置 */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">报价默认设置</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">付款条件</label>
              <input
                value={form.payment_terms}
                onChange={e => set("payment_terms", e.target.value)}
                placeholder="T/T 30% deposit, 70% before shipment"
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">默认交货期（天）</label>
                <input
                  type="number"
                  min={1}
                  value={form.delivery_days}
                  onChange={e => set("delivery_days", Number(e.target.value))}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">报价有效期（天）</label>
                <input
                  type="number"
                  min={1}
                  value={form.validity_days}
                  onChange={e => set("validity_days", Number(e.target.value))}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 银行信息 */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1">银行信息（可选）</p>
          <p className="text-xs text-gray-400 mb-2">如需在报价单底部显示收款信息可填写</p>
          <textarea
            value={form.bank_info}
            onChange={e => set("bank_info", e.target.value)}
            rows={3}
            placeholder={"Bank: HSBC Hong Kong\nAccount Name: Omni Valve Co., Ltd.\nAccount No.: 123-456789-001\nSWIFT: HSBCHKHHHKH"}
            className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {saving ? "保存中..." : saved ? "✓ 已保存" : "保存设置"}
        </button>
      </div>
    </main>
  );
}
