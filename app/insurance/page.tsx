"use client";

import { FormEvent, useState, useEffect } from "react";

// ── カラーテーマ ────────────────────────────────────────
const GOLD       = "#c9a84c";
const NAVY       = "#0a1628";
const NAVY_CARD  = "#0d1e38";
const PAGE_BG    = "#eee8e0";
const LINEN      = "#f5f0e8";

// ── 型定義 ──────────────────────────────────────────────
interface UserInfo {
  name: string;
  memberCode: string;
  email: string;
  phone: string;
}

interface LifeForm {
  memberId: string;
  name: string;
  phone: string;
  email: string;
  agency: string;
  schedule1: string;
  schedule2: string;
  schedule3: string;
  note: string;
}

interface NonLifeForm {
  memberId: string;
  name: string;
  phone: string;
  email: string;
  agency: string;
  schedule1: string;
  schedule2: string;
  schedule3: string;
  products: string[];
  note: string;
}

const emptyLife = (): LifeForm => ({
  memberId: "", name: "", phone: "", email: "", agency: "",
  schedule1: "", schedule2: "", schedule3: "", note: "",
});

const emptyNonLife = (): NonLifeForm => ({
  memberId: "", name: "", phone: "", email: "", agency: "",
  schedule1: "", schedule2: "", schedule3: "", products: [], note: "",
});

// ── デフォルト設定 ───────────────────────────────────────
const DEFAULT_NON_LIFE_PRODUCTS = ["ずっとスマイル", "安全運TEN", "わんにゃんスマイル"];

type InsuranceTab = "life" | "non_life";

export default function InsurancePage() {
  const [tab, setTab] = useState<InsuranceTab>("life");

  // 生命保険
  const [lifeForm, setLifeForm]           = useState<LifeForm>(emptyLife());
  const [lifeLoading, setLifeLoading]     = useState(false);
  const [lifeSubmitted, setLifeSubmitted] = useState(false);
  const [lifeError, setLifeError]         = useState("");

  // 損害保険
  const [nonLifeForm, setNonLifeForm]           = useState<NonLifeForm>(emptyNonLife());
  const [nonLifeLoading, setNonLifeLoading]     = useState(false);
  const [nonLifeSubmitted, setNonLifeSubmitted] = useState(false);
  const [nonLifeError, setNonLifeError]         = useState("");

  // 管理画面から取得する設定
  const [lifeSettings,    setLifeSettings]    = useState<{headline?:string; description?:string; badges?:string[]; footerNote?:string} | null>(null);
  const [nonLifeSettings, setNonLifeSettings] = useState<{headline?:string; description?:string; badges?:string[]; footerNote?:string; products?:string[]} | null>(null);
  const [userInfo, setUserInfo]               = useState<UserInfo | null>(null);

  // ── 初期データ取得 ──────────────────────────────────
  useEffect(() => {
    // プロフィール自動入力
    fetch("/api/my/profile")
      .then(r => r.json())
      .then(d => {
        if (d?.name) {
          setUserInfo(d);
          const base = { memberId: d.memberCode ?? "", name: d.name ?? "", phone: d.phone ?? "", email: d.email ?? "" };
          setLifeForm(p => ({ ...p, ...base, agency: p.agency }));
          setNonLifeForm(p => ({ ...p, ...base, agency: p.agency }));
        }
      }).catch(() => {});

    // 管理画面設定
    fetch("/api/my/welfare-plans")
      .then(r => r.json())
      .then(d => {
        if (d.lifeInsuranceSettings)    setLifeSettings(d.lifeInsuranceSettings);
        if (d.nonLifeInsuranceSettings) setNonLifeSettings(d.nonLifeInsuranceSettings);
      }).catch(() => {});
  }, []);

  const lifeHeadline    = lifeSettings?.headline    ?? "生命保険 無料相談申込";
  const lifeDescription = lifeSettings?.description ?? "下記内容をご記入の上、送信してください。\n確認後、担当より記載メールアドレスへご連絡いたします。";
  const lifeBadges      = lifeSettings?.badges      ?? ["🛡️ 安心の保障", "💰 無料相談", "📞 オンライン対応", "✅ 専門FP在籍"];
  const lifeFooterNote  = lifeSettings?.footerNote  ?? "※初回ご相談はオンラインでのご相談となります";

  const nonLifeHeadline    = nonLifeSettings?.headline    ?? "損害保険 無料相談申込";
  const nonLifeDescription = nonLifeSettings?.description ?? "下記内容をご記入の上、送信してください。\n確認後、担当より記載メールアドレスへご連絡いたします。";
  const nonLifeBadges      = nonLifeSettings?.badges      ?? ["🚗 自動車保険", "🏠 火災保険", "🐾 ペット保険", "✅ 専門FP在籍"];
  const nonLifeFooterNote  = nonLifeSettings?.footerNote  ?? "※初回ご相談はオンラインでのご相談となります";
  const nonLifeProducts    = nonLifeSettings?.products?.length ? nonLifeSettings.products : DEFAULT_NON_LIFE_PRODUCTS;

  // ── 生命保険 送信 ────────────────────────────────────
  async function onLifeSubmit(e: FormEvent) {
    e.preventDefault();
    setLifeError("");
    if (!lifeForm.schedule1.trim() || !lifeForm.schedule2.trim() || !lifeForm.schedule3.trim()) {
      setLifeError("ご相談希望日を3日程度ご入力ください"); return;
    }
    setLifeLoading(true);
    try {
      const res = await fetch("/api/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lifeForm, insuranceType: "life" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) { setLifeError(json.error ?? "送信に失敗しました"); return; }
      setLifeSubmitted(true);
    } finally {
      setLifeLoading(false);
    }
  }

  // ── 損害保険 送信 ────────────────────────────────────
  async function onNonLifeSubmit(e: FormEvent) {
    e.preventDefault();
    setNonLifeError("");
    if (!nonLifeForm.schedule1.trim() || !nonLifeForm.schedule2.trim() || !nonLifeForm.schedule3.trim()) {
      setNonLifeError("ご相談希望日を3日程度ご入力ください"); return;
    }
    setNonLifeLoading(true);
    try {
      const res = await fetch("/api/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nonLifeForm, insuranceType: "non_life" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) { setNonLifeError(json.error ?? "送信に失敗しました"); return; }
      setNonLifeSubmitted(true);
    } finally {
      setNonLifeLoading(false);
    }
  }

  // ── 損害保険 商品チェックボックス ────────────────────
  function toggleProduct(product: string) {
    setNonLifeForm(p => ({
      ...p,
      products: p.products.includes(product)
        ? p.products.filter(x => x !== product)
        : [...p.products, product],
    }));
  }

  // ── 共通スタイル ─────────────────────────────────────
  const fieldStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 12,
    border: "1px solid rgba(201,168,76,0.3)", background: "rgba(255,255,255,0.08)",
    color: "#fff", fontSize: 14, outline: "none",
    boxSizing: "border-box" as const,
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600,
    color: "rgba(201,168,76,0.9)", marginBottom: 4, letterSpacing: "0.05em",
  };

  // ── タブラベル定義 ──────────────────────────────────
  const tabs: { key: InsuranceTab; label: string; icon: string }[] = [
    { key: "life",     label: "生命保険",   icon: "🛡️" },
    { key: "non_life", label: "損害保険",   icon: "🚗" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: PAGE_BG, padding: "24px 16px 48px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>

        {/* ── ヘッダー ── */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🛡️</div>
          <h1 style={{ color: NAVY, fontSize: 22, fontWeight: 800, margin: 0 }}>保険 無料相談</h1>
          <p style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>
            生命保険・損害保険のご相談を承ります
          </p>
        </div>

        {/* ── タブ ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: "12px 8px", borderRadius: 14, border: "none",
                fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s",
                background: tab === t.key ? NAVY : "#fff",
                color: tab === t.key ? GOLD : "#6b7280",
                boxShadow: tab === t.key ? "0 4px 16px rgba(10,22,40,0.25)" : "0 1px 4px rgba(0,0,0,0.08)",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════
            生命保険タブ
        ══════════════════════════════════ */}
        {tab === "life" && (
          lifeSubmitted ? (
            <SubmittedCard
              icon="🛡️"
              title="生命保険相談のお申し込みを受け付けました"
              footerNote={lifeFooterNote}
              onReset={() => {
                setLifeSubmitted(false);
                setLifeForm(p => ({ ...p, agency: "", schedule1: "", schedule2: "", schedule3: "", note: "" }));
              }}
            />
          ) : (
            <InsuranceFormCard
              headline={lifeHeadline}
              description={lifeDescription}
              badges={lifeBadges}
              footerNote={lifeFooterNote}
              error={lifeError}
              loading={lifeLoading}
              navyCard={NAVY_CARD}
              gold={GOLD}
              linen={LINEN}
              fieldStyle={fieldStyle}
              labelStyle={labelStyle}
              onSubmit={onLifeSubmit}
              basicFields={
                <>
                  <BasicFields
                    memberId={lifeForm.memberId}
                    name={lifeForm.name}
                    phone={lifeForm.phone}
                    email={lifeForm.email}
                    onChangeMemberId={v => setLifeForm(p => ({ ...p, memberId: v }))}
                    onChangeName={v => setLifeForm(p => ({ ...p, name: v }))}
                    onChangePhone={v => setLifeForm(p => ({ ...p, phone: v }))}
                    onChangeEmail={v => setLifeForm(p => ({ ...p, email: v }))}
                    agency={lifeForm.agency}
                    onChangeAgency={v => setLifeForm(p => ({ ...p, agency: v }))}
                    fieldStyle={fieldStyle}
                    labelStyle={labelStyle}
                    userInfo={userInfo}
                  />
                </>
              }
              scheduleFields={
                <ScheduleFields
                  schedule1={lifeForm.schedule1}
                  schedule2={lifeForm.schedule2}
                  schedule3={lifeForm.schedule3}
                  note={lifeForm.note}
                  onChangeSchedule1={v => setLifeForm(p => ({ ...p, schedule1: v }))}
                  onChangeSchedule2={v => setLifeForm(p => ({ ...p, schedule2: v }))}
                  onChangeSchedule3={v => setLifeForm(p => ({ ...p, schedule3: v }))}
                  onChangeNote={v => setLifeForm(p => ({ ...p, note: v }))}
                  fieldStyle={fieldStyle}
                  labelStyle={labelStyle}
                />
              }
              extraFields={null}
            />
          )
        )}

        {/* ══════════════════════════════════
            損害保険タブ
        ══════════════════════════════════ */}
        {tab === "non_life" && (
          nonLifeSubmitted ? (
            <SubmittedCard
              icon="🚗"
              title="損害保険相談のお申し込みを受け付けました"
              footerNote={nonLifeFooterNote}
              onReset={() => {
                setNonLifeSubmitted(false);
                setNonLifeForm(p => ({ ...p, agency: "", schedule1: "", schedule2: "", schedule3: "", products: [], note: "" }));
              }}
            />
          ) : (
            <InsuranceFormCard
              headline={nonLifeHeadline}
              description={nonLifeDescription}
              badges={nonLifeBadges}
              footerNote={nonLifeFooterNote}
              error={nonLifeError}
              loading={nonLifeLoading}
              navyCard={NAVY_CARD}
              gold={GOLD}
              linen={LINEN}
              fieldStyle={fieldStyle}
              labelStyle={labelStyle}
              onSubmit={onNonLifeSubmit}
              basicFields={
                <BasicFields
                  memberId={nonLifeForm.memberId}
                  name={nonLifeForm.name}
                  phone={nonLifeForm.phone}
                  email={nonLifeForm.email}
                  onChangeMemberId={v => setNonLifeForm(p => ({ ...p, memberId: v }))}
                  onChangeName={v => setNonLifeForm(p => ({ ...p, name: v }))}
                  onChangePhone={v => setNonLifeForm(p => ({ ...p, phone: v }))}
                  onChangeEmail={v => setNonLifeForm(p => ({ ...p, email: v }))}
                  agency={nonLifeForm.agency}
                  onChangeAgency={v => setNonLifeForm(p => ({ ...p, agency: v }))}
                  fieldStyle={fieldStyle}
                  labelStyle={labelStyle}
                  userInfo={userInfo}
                />
              }
              scheduleFields={
                <ScheduleFields
                  schedule1={nonLifeForm.schedule1}
                  schedule2={nonLifeForm.schedule2}
                  schedule3={nonLifeForm.schedule3}
                  note={nonLifeForm.note}
                  onChangeSchedule1={v => setNonLifeForm(p => ({ ...p, schedule1: v }))}
                  onChangeSchedule2={v => setNonLifeForm(p => ({ ...p, schedule2: v }))}
                  onChangeSchedule3={v => setNonLifeForm(p => ({ ...p, schedule3: v }))}
                  onChangeNote={v => setNonLifeForm(p => ({ ...p, note: v }))}
                  fieldStyle={fieldStyle}
                  labelStyle={labelStyle}
                />
              }
              extraFields={
                /* ── 損害保険：希望商品チェックボックス ── */
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>ご相談希望損保</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                    {nonLifeProducts.map(product => {
                      const checked = nonLifeForm.products.includes(product);
                      return (
                        <label
                          key={product}
                          onClick={() => toggleProduct(product)}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 14px", borderRadius: 12, cursor: "pointer",
                            border: `1px solid ${checked ? GOLD : "rgba(201,168,76,0.2)"}`,
                            background: checked ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.05)",
                            transition: "all 0.2s",
                          }}
                        >
                          <div style={{
                            width: 18, height: 18, borderRadius: 4,
                            border: `2px solid ${checked ? GOLD : "rgba(201,168,76,0.4)"}`,
                            background: checked ? GOLD : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0, transition: "all 0.2s",
                          }}>
                            {checked && <span style={{ color: NAVY, fontSize: 11, fontWeight: 900 }}>✓</span>}
                          </div>
                          <span style={{ color: "#fff", fontSize: 14 }}>{product}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              }
            />
          )
        )}

      </div>
    </div>
  );
}

// ── 完了カード ──────────────────────────────────────────
function SubmittedCard({ icon, title, footerNote, onReset }: {
  icon: string; title: string; footerNote: string; onReset: () => void;
}) {
  return (
    <div style={{
      background: "#0d1e38", borderRadius: 24, padding: "40px 28px", textAlign: "center",
      boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>{title}</h2>
      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 1.7, margin: "0 0 20px" }}>
        ご登録いただいたメールアドレスへ確認メールをお送りしました。<br />
        {footerNote}
      </p>
      <button
        onClick={onReset}
        style={{
          background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.4)",
          color: "#c9a84c", borderRadius: 12, padding: "10px 24px", fontSize: 13,
          cursor: "pointer", fontWeight: 600,
        }}
      >
        別の日程で再申込
      </button>
    </div>
  );
}

// ── フォームカード本体 ────────────────────────────────
function InsuranceFormCard({ headline, description, badges, footerNote, error, loading,
  navyCard, gold, linen, fieldStyle, labelStyle, onSubmit, basicFields, scheduleFields, extraFields,
}: {
  headline: string; description: string; badges: string[]; footerNote: string;
  error: string; loading: boolean;
  navyCard: string; gold: string; linen: string;
  fieldStyle: React.CSSProperties; labelStyle: React.CSSProperties;
  onSubmit: (e: FormEvent) => void;
  basicFields: React.ReactNode;
  scheduleFields: React.ReactNode;
  extraFields: React.ReactNode | null;
}) {
  return (
    <div style={{
      background: navyCard, borderRadius: 24, overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
    }}>
      {/* バッジ帯 */}
      <div style={{ background: "rgba(201,168,76,0.12)", padding: "12px 20px", borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {badges.map((b, i) => (
            <span key={i} style={{
              background: "rgba(201,168,76,0.18)", color: gold,
              borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600,
            }}>{b}</span>
          ))}
        </div>
      </div>

      {/* ヘッダー */}
      <div style={{ padding: "24px 24px 0" }}>
        <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>{headline}</h2>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.7, margin: 0, whiteSpace: "pre-line" }}>
          {description}
        </p>
      </div>

      {/* フォーム */}
      <form onSubmit={onSubmit} style={{ padding: "20px 24px 28px" }}>
        {basicFields}
        {extraFields}
        {scheduleFields}

        {/* 注意書き */}
        <div style={{
          background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)",
          borderRadius: 12, padding: "10px 14px", marginBottom: 20,
        }}>
          <p style={{ color: "rgba(201,168,76,0.85)", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
            {footerNote}
          </p>
        </div>

        {/* エラー */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 12, padding: "10px 14px", marginBottom: 16,
            color: "#fca5a5", fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%", padding: "14px", borderRadius: 14, border: "none",
            background: loading ? "rgba(201,168,76,0.4)" : "linear-gradient(135deg,#c9a84c,#e8c96a)",
            color: "#0a1628", fontWeight: 800, fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : "0 4px 16px rgba(201,168,76,0.4)",
          }}
        >
          {loading ? "送信中..." : "申込を送信する"}
        </button>
      </form>
    </div>
  );
}

// ── 基本情報フィールド ────────────────────────────────
function BasicFields({ memberId, name, phone, email, agency, onChangeMemberId, onChangeName, onChangePhone, onChangeEmail, onChangeAgency, fieldStyle, labelStyle, userInfo }: {
  memberId: string; name: string; phone: string; email: string; agency: string;
  onChangeMemberId: (v: string) => void;
  onChangeName: (v: string) => void;
  onChangePhone: (v: string) => void;
  onChangeEmail: (v: string) => void;
  onChangeAgency: (v: string) => void;
  fieldStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  userInfo: UserInfo | null;
}) {
  return (
    <>
      {userInfo && (
        <div style={{ background: "rgba(201,168,76,0.08)", borderRadius: 10, padding: "8px 12px", marginBottom: 16 }}>
          <p style={{ color: "rgba(201,168,76,0.8)", fontSize: 11, margin: 0 }}>
            ✅ ログイン情報から自動入力されました
          </p>
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>会員ID</label>
        <input style={fieldStyle} value={memberId} onChange={e => onChangeMemberId(e.target.value)} placeholder="例: A00001" />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>お名前 <span style={{ color: "#f87171" }}>*</span></label>
        <input style={fieldStyle} required value={name} onChange={e => onChangeName(e.target.value)} placeholder="山田 太郎" />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>電話番号 <span style={{ color: "#f87171" }}>*</span></label>
        <input style={fieldStyle} required type="tel" value={phone} onChange={e => onChangePhone(e.target.value)} placeholder="090-0000-0000" />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>メールアドレス <span style={{ color: "#f87171" }}>*</span></label>
        <input style={fieldStyle} required type="email" value={email} onChange={e => onChangeEmail(e.target.value)} placeholder="example@email.com" />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>紹介代理店 <span style={{ color: "#f87171" }}>*</span></label>
        <input style={fieldStyle} required value={agency} onChange={e => onChangeAgency(e.target.value)} placeholder="例: ○○代理店" />
      </div>
    </>
  );
}

// ── 日程フィールド ────────────────────────────────────
function ScheduleFields({ schedule1, schedule2, schedule3, note,
  onChangeSchedule1, onChangeSchedule2, onChangeSchedule3, onChangeNote,
  fieldStyle, labelStyle,
}: {
  schedule1: string; schedule2: string; schedule3: string; note: string;
  onChangeSchedule1: (v: string) => void;
  onChangeSchedule2: (v: string) => void;
  onChangeSchedule3: (v: string) => void;
  onChangeNote: (v: string) => void;
  fieldStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
}) {
  return (
    <>
      {/* 日程入力ヘッダー */}
      <div style={{ marginBottom: 12 }}>
        <span style={{ ...labelStyle, display: "inline-block", marginBottom: 4 }}>
          ご相談希望日（3日程度）<span style={{ color: "#f87171" }}>*</span>
        </span>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, margin: 0, lineHeight: 1.5 }}>
          10:00〜17:00の間でご希望の日時をご入力ください
        </p>
      </div>

      {[
        { label: "第1希望", value: schedule1, onChange: onChangeSchedule1 },
        { label: "第2希望", value: schedule2, onChange: onChangeSchedule2 },
        { label: "第3希望", value: schedule3, onChange: onChangeSchedule3 },
      ].map(({ label, value, onChange }) => (
        <div key={label} style={{ marginBottom: 12 }}>
          <label style={{ ...labelStyle, fontSize: 11 }}>{label}</label>
          <input
            style={fieldStyle}
            required
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="例: 2026年5月10日（土）14:00〜"
          />
        </div>
      ))}

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>備考・ご要望（任意）</label>
        <textarea
          style={{ ...fieldStyle, resize: "none", height: 72 }}
          value={note}
          onChange={e => onChangeNote(e.target.value)}
          placeholder="ご相談内容・ご要望などをご記入ください"
        />
      </div>
    </>
  );
}
