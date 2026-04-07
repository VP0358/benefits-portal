"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ViolaLogo from "@/app/components/viola-logo";

export default function MlmReferralPage() {
  const [referralCode, setReferralCode] = useState("");
  const [memberName, setMemberName] = useState("");
  const [mlmCode, setMlmCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<"url" | "code" | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const mlmRegisterUrl = referralCode ? `${baseUrl}/mlm-register?ref=${referralCode}` : "";

  useEffect(() => {
    // 会員情報取得（referralCode + MLM会員コード）
    Promise.all([
      fetch("/api/member/referral").then(r => r.json()),
      fetch("/api/my/mlm-org-chart").then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([refData, mlmData]) => {
      setReferralCode(refData.referralCode ?? "");
      setMemberName(refData.name ?? "");
      if (mlmData?.me) {
        setMlmCode(mlmData.me.mlmMemberCode ?? "");
      }
    }).finally(() => setLoading(false));
  }, []);

  async function copyText(text: string, type: "url" | "code") {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(type);
    setTimeout(() => setCopied(null), 2500);
  }

  return (
    <div className="min-h-screen bg-[#e6f2dc] py-8 px-4">
      <div className="mx-auto max-w-md space-y-5">

        {/* ヘッダー */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 text-sm">
            ← ダッシュボード
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm text-center space-y-2">
          <div className="flex justify-center mb-2">
            <ViolaLogo size="md" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">🌲 MLM会員を紹介する</h1>
          <p className="text-xs text-slate-500">
            あなたの紹介URLから登録した方は、自動的にあなたの直下（マトリックス）に配置されます。
          </p>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-10 text-center text-slate-400 shadow-sm">
            読み込み中...
          </div>
        ) : (
          <>
            {/* MLM紹介URL */}
            <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔗</span>
                <div>
                  <div className="font-bold text-slate-800">MLM登録用URL</div>
                  <div className="text-xs text-slate-500">このURLを紹介したい方に送ってください</div>
                </div>
              </div>

              {mlmRegisterUrl ? (
                <>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
                    <div className="text-xs text-slate-500 mb-1 break-all font-mono">
                      {mlmRegisterUrl}
                    </div>
                  </div>
                  <button
                    onClick={() => copyText(mlmRegisterUrl, "url")}
                    className={`w-full rounded-2xl py-3 text-sm font-bold transition ${
                      copied === "url"
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {copied === "url" ? "✅ コピーしました！" : "📋 URLをコピー"}
                  </button>
                </>
              ) : (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
                  ⚠️ 紹介コードが設定されていません。管理者にお問い合わせください。
                </div>
              )}
            </div>

            {/* 紹介コード（テキスト） */}
            {referralCode && (
              <div className="rounded-3xl bg-white p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎟️</span>
                  <div>
                    <div className="font-bold text-slate-800">紹介コード</div>
                    <div className="text-xs text-slate-500">登録フォームに手入力する場合はこちら</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-2xl bg-violet-50 border border-violet-200 py-3 px-4 text-center">
                    <span className="text-xl font-black text-violet-700 tracking-widest">
                      {referralCode}
                    </span>
                  </div>
                  <button
                    onClick={() => copyText(referralCode, "code")}
                    className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                      copied === "code"
                        ? "bg-emerald-500 text-white"
                        : "bg-violet-600 text-white hover:bg-violet-700"
                    }`}
                  >
                    {copied === "code" ? "✅" : "📋"}
                  </button>
                </div>
              </div>
            )}

            {/* MLM会員コード表示 */}
            {mlmCode && (
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500 mb-1">あなたのMLM会員コード</div>
                <div className="font-bold text-slate-700">{mlmCode}</div>
              </div>
            )}

            {/* 登録の流れ */}
            <div className="rounded-3xl bg-white p-6 shadow-sm space-y-3">
              <div className="font-bold text-slate-700 text-sm">📋 登録の流れ</div>
              <div className="space-y-3">
                {[
                  { step: "1", icon: "🔗", text: "上記URLを紹介したい方に送る" },
                  { step: "2", icon: "📝", text: "相手がURLから必要事項を入力して登録" },
                  { step: "3", icon: "📧", text: "登録完了メールが相手に自動送信される" },
                  { step: "4", icon: "🌲", text: "マトリックス組織図にあなたの直下として自動配置" },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <div className="text-sm text-slate-600">
                      <span className="mr-1">{item.icon}</span>{item.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 注意事項 */}
            <div className="rounded-3xl bg-amber-50 border border-amber-200 p-4 shadow-sm space-y-2">
              <div className="text-xs font-bold text-amber-700">⚠️ ご注意</div>
              <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                <li>マトリックス組織の直下は最大6名までです。</li>
                <li>URLの有効期限はありません。</li>
                <li>概要書面番号の入力が登録完了の必須条件です。</li>
              </ul>
            </div>

            {/* 組織図確認リンク */}
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <Link
                href="/mlm-org-chart"
                className="flex items-center justify-between text-slate-700 hover:text-violet-700 transition"
              >
                <span className="font-semibold text-sm">🌲 マトリックス組織図を確認する</span>
                <span className="text-slate-400">›</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
