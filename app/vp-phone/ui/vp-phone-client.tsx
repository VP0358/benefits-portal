"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

type ApplicationData = {
  id: string;
  nameKanji: string;
  nameKana: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: string;
  lineId: string;
  lineDisplayName: string;
  desiredPlan: string;
  status: string;
  adminNote: string;
  contractedAt: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, { label: string; cls: string; icon: string }> = {
  pending:    { label: "審査待ち",       cls: "bg-yellow-50 text-yellow-800 border-yellow-300", icon: "⏳" },
  reviewing:  { label: "審査中",         cls: "bg-blue-50 text-blue-800 border-blue-300",       icon: "🔍" },
  contracted: { label: "契約済み",       cls: "bg-emerald-50 text-emerald-800 border-emerald-300", icon: "✅" },
  rejected:   { label: "審査不可",       cls: "bg-red-50 text-red-800 border-red-300",          icon: "❌" },
  canceled:   { label: "キャンセル済み", cls: "bg-gray-50 text-gray-700 border-gray-300",        icon: "🚫" },
};

const PLANS = [
  "プラン未定（相談したい）",
  "VP未来phone ベーシック",
  "VP未来phone スタンダード",
  "VP未来phone プレミアム",
];

export default function VpPhoneClient({
  defaultName,
  defaultNameKana,
  defaultEmail,
  defaultPhone,
  existingApplication,
}: {
  defaultName: string;
  defaultNameKana: string;
  defaultEmail: string;
  defaultPhone: string;
  existingApplication: ApplicationData | null;
}) {
  const [form, setForm] = useState({
    nameKanji:       defaultName,
    nameKana:        defaultNameKana,
    email:           defaultEmail,
    phone:           defaultPhone,
    birthDate:       "",
    gender:          "male",
    lineId:          "",
    lineDisplayName: "",
    desiredPlan:     PLANS[0],
  });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [agreed, setAgreed]   = useState(false);

  const app = existingApplication;
  const statusInfo = app ? (STATUS_LABEL[app.status] ?? STATUS_LABEL.pending) : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agreed) { setError("個人情報の取扱への同意が必要です"); return; }
    setSaving(true);
    setError("");

    const res = await fetch("/api/my/vp-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "申し込みに失敗しました。");
      return;
    }

    setSubmitted(true);
  }

  const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition";
  const labelClass = "block text-xs font-bold text-gray-600 mb-1.5";

  return (
    <div className="min-h-screen bg-[#e6f2dc] pb-16">

      {/* ヘッダー */}
      <header className="sticky top-0 z-30 bg-white shadow-sm flex items-center gap-3 px-4 py-3">
        <Link href="/dashboard" className="text-gray-500 text-lg hover:text-gray-700">←</Link>
        <div className="flex items-center gap-2">
          <span className="text-xl">📱</span>
          <div>
            <h1 className="font-bold text-green-800 text-sm leading-none">VP未来phone 申し込み</h1>
            <p className="text-[10px] text-gray-500 mt-0.5">VP未来phone申し込みフォーム</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5 space-y-4">

        {/* 既存申し込みがある場合 */}
        {app && !submitted && (
          <div className={`rounded-2xl border-2 p-5 shadow-sm ${statusInfo?.cls ?? ""}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{statusInfo?.icon}</span>
              <div>
                <p className="font-bold text-sm">申し込み状況</p>
                <p className="text-xs mt-0.5">{statusInfo?.label}</p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">申し込み日</span>
                <span className="font-semibold">{new Date(app.createdAt).toLocaleDateString("ja-JP")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">お名前</span>
                <span className="font-semibold">{app.nameKanji}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">希望プラン</span>
                <span className="font-semibold">{app.desiredPlan || "未選択"}</span>
              </div>
              {app.contractedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">契約完了日</span>
                  <span className="font-bold text-emerald-700">{new Date(app.contractedAt).toLocaleDateString("ja-JP")}</span>
                </div>
              )}
            </div>

            {app.adminNote && (
              <div className="mt-3 bg-white/60 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-700 mb-1">📝 担当者からのメモ</p>
                <p className="text-xs text-gray-800">{app.adminNote}</p>
              </div>
            )}

            {/* 契約済みの場合 */}
            {app.status === "contracted" && (
              <div className="mt-3 bg-emerald-100 rounded-xl p-3 text-center">
                <p className="text-xs font-bold text-emerald-800">🎉 VP未来phone の契約が完了しました！</p>
                <p className="text-[10px] text-emerald-700 mt-1">ご契約ありがとうございます。</p>
              </div>
            )}

            {/* 審査不可の場合は再申し込み可能 */}
            {(app.status === "rejected" || app.status === "canceled") && (
              <div className="mt-3">
                <p className="text-xs text-gray-600 mb-2">再度お申し込みいただけます。</p>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full rounded-xl bg-green-600 text-white py-2.5 text-sm font-bold hover:bg-green-700 transition"
                >
                  再申し込みする
                </button>
              </div>
            )}
          </div>
        )}

        {/* 申し込み完了メッセージ */}
        {submitted && (
          <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-6 text-center shadow">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-lg font-bold text-emerald-800 mb-2">申し込みが完了しました！</h2>
            <p className="text-sm text-emerald-700 mb-4">
              VP未来phone のお申し込みを受け付けました。<br />
              担当者より順次ご連絡いたします。<br />
              しばらくお待ちください。
            </p>
            <Link href="/dashboard"
              className="inline-block rounded-xl bg-green-600 text-white px-6 py-2.5 text-sm font-bold hover:bg-green-700 transition">
              ホームに戻る
            </Link>
          </div>
        )}

        {/* 申し込みフォーム（申し込みがない場合 or 審査不可/キャンセル後） */}
        {(!app || app.status === "rejected" || app.status === "canceled") && !submitted && (
          <>
            {/* 説明カード */}
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-2xl">📱</div>
                <div>
                  <h2 className="font-bold text-gray-800">VP未来phone 申し込み</h2>
                  <p className="text-xs text-gray-500 mt-0.5">お得なスマートフォン回線サービス</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-gray-700">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>申し込み後、担当者より順次ご連絡いたします</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>ご紹介いただいた方に紹介ポイントが付与されます</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>お手続きは担当者がサポートします</span>
                </div>
              </div>
            </div>

            {/* フォーム */}
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 text-sm mb-4 pb-2 border-b border-gray-100">👤 申込者情報</h3>
                <div className="space-y-4">

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>お名前（漢字）<span className="text-red-500 ml-1">*</span></label>
                      <input
                        required
                        className={inputClass}
                        placeholder="山田 太郎"
                        value={form.nameKanji}
                        onChange={e => setForm({ ...form, nameKanji: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>お名前（かな）<span className="text-red-500 ml-1">*</span></label>
                      <input
                        required
                        className={inputClass}
                        placeholder="やまだ たろう"
                        value={form.nameKana}
                        onChange={e => setForm({ ...form, nameKana: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>メールアドレス<span className="text-red-500 ml-1">*</span></label>
                    <input
                      required
                      type="email"
                      className={inputClass}
                      placeholder="example@email.com"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>電話番号<span className="text-red-500 ml-1">*</span></label>
                    <input
                      required
                      type="tel"
                      className={inputClass}
                      placeholder="090-1234-5678"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>生年月日<span className="text-red-500 ml-1">*</span></label>
                    <input
                      required
                      type="date"
                      className={inputClass}
                      value={form.birthDate}
                      onChange={e => setForm({ ...form, birthDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>性別<span className="text-red-500 ml-1">*</span></label>
                    <div className="flex gap-4">
                      {[
                        { value: "male",   label: "男性" },
                        { value: "female", label: "女性" },
                        { value: "other",  label: "その他" },
                      ].map(opt => (
                        <label key={opt.value} className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                          <input
                            type="radio"
                            name="gender"
                            value={opt.value}
                            checked={form.gender === opt.value}
                            onChange={() => setForm({ ...form, gender: opt.value })}
                            className="w-4 h-4 text-green-600"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 text-sm mb-4 pb-2 border-b border-gray-100">💬 LINE情報（任意）</h3>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>LINE ID</label>
                    <input
                      className={inputClass}
                      placeholder="例: yamada_taro"
                      value={form.lineId}
                      onChange={e => setForm({ ...form, lineId: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>LINE表示名</label>
                    <input
                      className={inputClass}
                      placeholder="例: 山田太郎"
                      value={form.lineDisplayName}
                      onChange={e => setForm({ ...form, lineDisplayName: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 text-sm mb-4 pb-2 border-b border-gray-100">📋 希望プラン</h3>
                <div>
                  <label className={labelClass}>ご希望のプラン</label>
                  <select
                    className={inputClass}
                    value={form.desiredPlan}
                    onChange={e => setForm({ ...form, desiredPlan: e.target.value })}
                  >
                    {PLANS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-2">
                    ※ 担当者がご要望に合わせた最適なプランをご提案します
                  </p>
                </div>
              </div>

              {/* 同意 */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded text-green-600"
                  />
                  <span className="text-xs text-gray-700 font-medium leading-relaxed">
                    入力した個人情報は、VP未来phone のお申し込み処理・ご連絡のみに使用します。
                    <br />
                    <span className="text-gray-500">個人情報の取扱いに同意する</span>
                  </span>
                </label>
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving || !agreed}
                className="w-full rounded-2xl py-4 text-base font-bold text-white transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #16a34a, #4ade80)" }}
              >
                {saving ? "送信中..." : "📱 VP未来phone を申し込む"}
              </button>

              <p className="text-center text-xs text-gray-500 pb-4">
                申し込み後、担当者より順次ご連絡いたします
              </p>
            </form>
          </>
        )}

      </main>
    </div>
  );
}
