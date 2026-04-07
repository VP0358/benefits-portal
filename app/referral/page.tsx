"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ViolaLogo from "@/app/components/viola-logo";

export default function ReferralPage() {
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedMlm, setCopiedMlm] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const referralUrl = referralCode ? `${baseUrl}/register?ref=${referralCode}` : "";
  const mlmReferralUrl = referralCode ? `${baseUrl}/mlm-register?ref=${referralCode}` : "";

  useEffect(() => {
    fetch("/api/member/referral")
      .then(r => r.json())
      .then(d => {
        setReferralCode(d.referralCode ?? "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function copyUrl() {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = referralUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function copyMlmUrl() {
    if (!mlmReferralUrl) return;
    try {
      await navigator.clipboard.writeText(mlmReferralUrl);
      setCopiedMlm(true);
      setTimeout(() => setCopiedMlm(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = mlmReferralUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedMlm(true);
      setTimeout(() => setCopiedMlm(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-[#e6f2dc] py-8 px-4">
      <div className="mx-auto max-w-md space-y-5">

        {/* ヘッダー */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-700">
            ← 戻る
          </Link>
          <ViolaLogo size="sm" />
          <h1 className="text-xl font-bold text-slate-800">友達・知人を紹介する</h1>
        </div>

        {/* 紹介カード */}
        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-5">
          <div className="text-center space-y-2">
            <div className="text-4xl">🎁</div>
            <h2 className="text-lg font-bold text-slate-800">紹介して一緒に使おう！</h2>
            <p className="text-sm text-slate-500">
              あなたの紹介URLから友達が登録すると、<br />
              紹介者として自動で紐づけられます。
            </p>
          </div>

          {loading ? (
            <div className="text-center text-sm text-slate-400 py-4">読み込み中...</div>
          ) : (
            <>
              {/* 紹介コード */}
              <div className="rounded-2xl bg-slate-50 p-4 space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">あなたの紹介コード</div>
                <div className="text-2xl font-bold text-slate-800 tracking-widest text-center">
                  {referralCode || "—"}
                </div>
              </div>

              {/* 紹介URL */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-500">紹介URL</div>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={referralUrl}
                    className="flex-1 rounded-xl border bg-slate-50 px-3 py-3 text-xs text-slate-700 select-all"
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={copyUrl}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${
                      copied
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-900 text-white hover:bg-slate-700"
                    }`}
                  >
                    {copied ? "✅ コピー済" : "コピー"}
                  </button>
                </div>
              </div>

              {/* シェアボタン */}
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`https://line.me/R/msg/text/?${encodeURIComponent(`福利厚生ポータルに招待します！\n${referralUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#06C755] py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  <span>💬</span> LINEで送る
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent("福利厚生ポータルへの招待")}&body=${encodeURIComponent(`福利厚生ポータルに招待します！\n以下のURLから登録してください。\n\n${referralUrl}`)}`}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-slate-700 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  <span>✉️</span> メールで送る
                </a>
              </div>
            </>
          )}
        </div>

        {/* MLM紹介カード */}
        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-5 border-2 border-emerald-200">
          <div className="text-center space-y-2">
            <div className="text-4xl">🤝</div>
            <h2 className="text-lg font-bold text-slate-800">MLMビジネス会員 紹介URL</h2>
            <p className="text-sm text-slate-500">
              MLMビジネス会員として勧誘する場合はこちらのURLを使用してください。<br />
              登録者はあなたの直紹介として自動で配置されます。
            </p>
          </div>

          {loading ? (
            <div className="text-center text-sm text-slate-400 py-4">読み込み中...</div>
          ) : (
            <>
              {/* MLM紹介URL */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-emerald-700">MLMビジネス会員登録URL</div>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={mlmReferralUrl}
                    className="flex-1 rounded-xl border bg-emerald-50 px-3 py-3 text-xs text-slate-700 select-all"
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={copyMlmUrl}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${
                      copiedMlm
                        ? "bg-emerald-500 text-white"
                        : "bg-emerald-700 text-white hover:bg-emerald-600"
                    }`}
                  >
                    {copiedMlm ? "✅ コピー済" : "コピー"}
                  </button>
                </div>
              </div>

              {/* MLMシェアボタン */}
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`https://line.me/R/msg/text/?${encodeURIComponent(`CLAIRホールディングスMLMビジネス会員に招待します！\n${mlmReferralUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#06C755] py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  <span>💬</span> LINEで送る
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent("CLAIRホールディングス MLMビジネス会員へのご招待")}&body=${encodeURIComponent(`CLAIRホールディングスのMLMビジネス会員にご招待します。\n以下のURLから登録してください。\n\n${mlmReferralUrl}`)}`}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-slate-700 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  <span>✉️</span> メールで送る
                </a>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                ⚠️ MLM（連鎖販売取引）の勧誘は特定商取引法の規制を受けます。
                概要書面を必ず事前に交付し、適切な説明を行ってください。
              </div>
            </>
          )}
        </div>

        {/* 紹介の仕組み説明 */}
        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800">紹介の仕組み</h3>
          <div className="space-y-3">
            {[
              { step: "1", label: "紹介URLをコピーまたは共有" },
              { step: "2", label: "友達・知人がURLから会員登録" },
              { step: "3", label: "登録完了後、紹介者として自動で紐づけ" },
              { step: "4", label: "紹介した方の月額料金に応じてポイントを獲得" },
            ].map(item => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  {item.step}
                </div>
                <div className="text-sm text-slate-700">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
