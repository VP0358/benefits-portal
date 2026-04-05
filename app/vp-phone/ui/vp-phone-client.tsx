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
  contractType: string;
  desiredPlan: string;
  referrerCode: string;
  referrerName: string;
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

// 音声回線プラン
const VOICE_PLANS = [
  "VP未来phone 音声通話ライトプラン（3GB）",
  "VP未来phone 音声通話スタンダードプラン（10GB）",
  "VP未来phone 音声通話プレミアムプラン（20GB）",
  "VP未来phone 音声通話無制限プラン",
  "プラン未定（担当者に相談したい）",
];

// 大容量データ回線プラン
const DATA_PLANS = [
  "VP未来phone データライトプラン（30GB）",
  "VP未来phone データスタンダードプラン（50GB）",
  "VP未来phone データプレミアムプラン（100GB）",
  "VP未来phone データ無制限プラン",
  "VP未来Wi-Fi モバイルルータープラン",
  "プラン未定（担当者に相談したい）",
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
  const [contractType, setContractType] = useState<"voice" | "data" | "">("");
  const [form, setForm] = useState({
    nameKanji:       defaultName,
    nameKana:        defaultNameKana,
    email:           defaultEmail,
    password:        "",
    passwordConfirm: "",
    phone:           defaultPhone,
    birthDate:       "",
    gender:          "male",
    lineId:          "",
    lineDisplayName: "",
    referrerCode:    "",
    referrerName:    "",
    desiredPlan:     "",
  });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [agreed, setAgreed]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const plans = contractType === "voice" ? VOICE_PLANS : contractType === "data" ? DATA_PLANS : [];

  const app = existingApplication;
  const statusInfo = app ? (STATUS_LABEL[app.status] ?? STATUS_LABEL.pending) : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!contractType) { setError("契約種別を選択してください"); return; }
    if (!agreed) { setError("個人情報の取扱いへの同意が必要です"); return; }
    if (form.password && form.password !== form.passwordConfirm) {
      setError("パスワードが一致しません");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      nameKanji:       form.nameKanji,
      nameKana:        form.nameKana,
      email:           form.email,
      password:        form.password || undefined,
      phone:           form.phone,
      birthDate:       form.birthDate,
      gender:          form.gender,
      lineId:          form.lineId || undefined,
      lineDisplayName: form.lineDisplayName || undefined,
      referrerCode:    form.referrerCode || undefined,
      referrerName:    form.referrerName || undefined,
      contractType,
      desiredPlan:     form.desiredPlan || undefined,
    };

    const res = await fetch("/api/my/vp-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
                <span className="text-gray-600">契約種別</span>
                <span className="font-semibold">
                  {app.contractType === "voice" ? "音声回線契約" : app.contractType === "data" ? "大容量データ回線契約" : "未選択"}
                </span>
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

            {app.status === "contracted" && (
              <div className="mt-3 bg-emerald-100 rounded-xl p-3 text-center">
                <p className="text-xs font-bold text-emerald-800">🎉 VP未来phone の契約が完了しました！</p>
                <p className="text-[10px] text-emerald-700 mt-1">ご契約ありがとうございます。</p>
              </div>
            )}

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
              VP未来phone 申し込みを受け付けました。<br />
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
            {/* サービス説明カード */}
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

              {/* 規約・重要事項リンク */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-2">
                <Link href="/vp-phone/terms"
                  className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-100 px-4 py-2.5 hover:bg-blue-100 transition">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📄</span>
                    <span className="text-xs font-semibold text-blue-800">利用規約・重要事項説明を確認する</span>
                  </div>
                  <span className="text-blue-500 text-sm">›</span>
                </Link>
                <Link href="/vp-phone/privacy"
                  className="flex items-center justify-between rounded-xl bg-green-50 border border-green-100 px-4 py-2.5 hover:bg-green-100 transition">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔒</span>
                    <span className="text-xs font-semibold text-green-800">個人情報の取扱いについて</span>
                  </div>
                  <span className="text-green-500 text-sm">›</span>
                </Link>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">

              {/* ① 契約種別選択 */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 text-sm mb-4 pb-2 border-b border-gray-100">📋 契約種別の選択</h3>
                <p className="text-xs text-gray-500 mb-3">ご希望の契約種別をお選びください。</p>
                <div className="grid grid-cols-1 gap-3">
                  {/* 音声回線 */}
                  <button
                    type="button"
                    onClick={() => { setContractType("voice"); setForm(f => ({ ...f, desiredPlan: "" })); }}
                    className={`rounded-2xl border-2 p-4 text-left transition-all ${
                      contractType === "voice"
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                        contractType === "voice" ? "bg-green-200" : "bg-gray-100"
                      }`}>📱</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-800">音声回線契約</p>
                          {contractType === "voice" && (
                            <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">選択中</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">通話・SMS・データ通信ができるSIM</p>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-600 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-green-600">✓</span> 音声通話・SMS対応
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-green-600">✓</span> 国内データ通信
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-green-600">✓</span> かけ放題オプション追加可能
                      </div>
                    </div>
                  </button>

                  {/* 大容量データ回線 */}
                  <button
                    type="button"
                    onClick={() => { setContractType("data"); setForm(f => ({ ...f, desiredPlan: "" })); }}
                    className={`rounded-2xl border-2 p-4 text-left transition-all ${
                      contractType === "data"
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                        contractType === "data" ? "bg-purple-200" : "bg-gray-100"
                      }`}>📶</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-800">大容量データ回線契約</p>
                          {contractType === "data" && (
                            <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">選択中</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">大容量データ通信に特化したSIM・Wi-Fi</p>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-600 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-purple-600">✓</span> 大容量・高速データ通信
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-purple-600">✓</span> タブレット・Wi-Fiルーター対応
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-purple-600">✓</span> VP未来Wi-Fi プランも選択可能
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* ② 希望プラン（契約種別選択後に表示） */}
              {contractType && (
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <h3 className="font-bold text-gray-800 text-sm mb-4 pb-2 border-b border-gray-100">
                    {contractType === "voice" ? "📱 音声回線プラン選択" : "📶 データ回線プラン選択"}
                  </h3>
                  <div className="space-y-2">
                    {plans.map(p => (
                      <label
                        key={p}
                        className={`flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-all ${
                          form.desiredPlan === p
                            ? contractType === "voice"
                              ? "border-green-400 bg-green-50"
                              : "border-purple-400 bg-purple-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="desiredPlan"
                          value={p}
                          checked={form.desiredPlan === p}
                          onChange={() => setForm({ ...form, desiredPlan: p })}
                          className={`w-4 h-4 ${contractType === "voice" ? "text-green-600" : "text-purple-600"}`}
                        />
                        <span className="text-xs font-medium text-gray-800">{p}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">
                    ※ 担当者がご要望に合わせた最適なプランをご提案します
                  </p>

                  {/* 利用規約確認リンク */}
                  <Link href="/vp-phone/terms"
                    className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 underline">
                    <span>📄</span>
                    {contractType === "voice"
                      ? "VP未来phone 利用規約・重要事項説明を確認する →"
                      : "VP未来Wi-Fi 契約約款・重要事項説明を確認する →"
                    }
                  </Link>
                </div>
              )}

              {/* ③ 申込者情報 */}
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
                    <label className={labelClass}>パスワード（任意）</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className={inputClass}
                        placeholder="VP未来phone申し込み用パスワード（任意）"
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                      >
                        {showPassword ? "隠す" : "表示"}
                      </button>
                    </div>
                    {form.password && (
                      <div className="mt-2">
                        <label className={labelClass}>パスワード（確認）</label>
                        <input
                          type={showPassword ? "text" : "password"}
                          className={inputClass}
                          placeholder="パスワードをもう一度入力"
                          value={form.passwordConfirm}
                          onChange={e => setForm({ ...form, passwordConfirm: e.target.value })}
                          autoComplete="new-password"
                        />
                        {form.passwordConfirm && form.password !== form.passwordConfirm && (
                          <p className="text-xs text-red-600 mt-1">パスワードが一致しません</p>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-gray-500 mt-1">
                      ※ 担当者が外部サービスへ申請する際に使用します
                    </p>
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

              {/* ④ 紹介者情報 */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 text-sm mb-4 pb-2 border-b border-gray-100">👥 紹介者情報（任意）</h3>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>紹介者コード（会員コード）</label>
                    <input
                      className={inputClass}
                      placeholder="例: M0001"
                      value={form.referrerCode}
                      onChange={e => setForm({ ...form, referrerCode: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>紹介者名</label>
                    <input
                      className={inputClass}
                      placeholder="例: 山田 花子"
                      value={form.referrerName}
                      onChange={e => setForm({ ...form, referrerName: e.target.value })}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500">
                    ※ 紹介者がいる場合はご入力ください。紹介者に紹介ポイントが付与されます。
                  </p>
                </div>
              </div>

              {/* ⑤ LINE情報 */}
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

              {/* ⑥ 同意 */}
              <div className="rounded-2xl bg-white p-5 shadow-sm space-y-3">
                <h3 className="font-bold text-gray-800 text-sm mb-2 pb-2 border-b border-gray-100">✅ 規約への同意</h3>

                {/* 利用規約リンク */}
                <Link href="/vp-phone/terms"
                  className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 hover:bg-gray-100 transition">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📄</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">利用規約・重要事項説明</p>
                      <p className="text-[10px] text-gray-500">VP未来phone / VP未来Wi-Fi</p>
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm">›</span>
                </Link>

                {/* 個人情報ポリシーリンク */}
                <Link href="/vp-phone/privacy"
                  className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 hover:bg-gray-100 transition">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔒</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">個人情報の取扱いについて</p>
                      <p className="text-[10px] text-gray-500">プライバシーポリシー</p>
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm">›</span>
                </Link>

                {/* 同意チェックボックス */}
                <label className="flex items-start gap-3 cursor-pointer rounded-xl border-2 border-green-200 bg-green-50 p-3">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded text-green-600"
                  />
                  <span className="text-xs text-gray-700 font-medium leading-relaxed">
                    上記の利用規約・重要事項説明および個人情報の取扱いについて確認し、同意します。
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
                disabled={saving || !agreed || !contractType}
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
