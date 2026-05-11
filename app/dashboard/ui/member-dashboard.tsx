"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Link from "next/link";

interface User { id:string; name:string; memberCode:string; email:string; phone:string; availablePoints:number; }
interface DashboardPoints {
  mlmLastMonthPoints: number;
  mlmCurrentMonthPoints: number;
  savingsBonusPoints: number;
}
interface Announcement { id:string; title:string; content:string; tag:string; isPublished:boolean; publishedAt:string|null; }
interface Menu { id:string; title:string; subtitle?:string|null; iconType?:string|null; menuType?:string|null; linkUrl?:string; contentData?:string|null; }
type SkinShop = { name:string; area:string; address:string; phone:string; url?:string; websiteUrl?:string; photos?:string[]; prefecture?:string; shopType?:string; };

// ── 都道府県リスト（北海道→沖縄順）──
const PREFECTURES = [
  "北海道",
  "青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県",
  "岐阜県","静岡県","愛知県","三重県",
  "滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",
  "鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県",
  "福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];

// ── 店舗種別定義 ──
const SHOP_TYPE_CONFIG: Record<string, { label:string; badge:string; color:string; bgColor:string; borderColor:string; sortOrder:number }> = {
  hq:         { label:"本部",       badge:"🏢 本部",       color:"#7c3aed", bgColor:"rgba(124,58,237,0.12)",  borderColor:"rgba(124,58,237,0.30)",  sortOrder:0 },
  direct:     { label:"直営",       badge:"🏪 直営",       color:"#2563eb", bgColor:"rgba(37,99,235,0.12)",   borderColor:"rgba(37,99,235,0.30)",   sortOrder:1 },
  nationwide: { label:"全国",       badge:"🗾 全国対応",   color:"#059669", bgColor:"rgba(5,150,105,0.12)",   borderColor:"rgba(5,150,105,0.30)",   sortOrder:2 },
  authorized: { label:"正規代理店", badge:"✅ 正規代理店", color:"#d97706", bgColor:"rgba(217,119,6,0.12)",   borderColor:"rgba(217,119,6,0.30)",   sortOrder:3 },
  agent:      { label:"代理店",     badge:"📍 代理店",     color:"#6b7280", bgColor:"rgba(107,114,128,0.12)", borderColor:"rgba(107,114,128,0.30)", sortOrder:4 },
};

// ── エリア定義（都道府県 → エリア名のマッピング）──
const AREA_GROUPS: { label: string; prefs: string[] }[] = [
  { label: "北海道・東北エリア", prefs: ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県"] },
  { label: "関東エリア",         prefs: ["茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県"] },
  { label: "北陸エリア",         prefs: ["新潟県","富山県","石川県","福井県","山梨県","長野県"] },
  { label: "東海エリア",         prefs: ["岐阜県","静岡県","愛知県","三重県"] },
  { label: "近畿エリア",         prefs: ["滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県"] },
  { label: "中国エリア",         prefs: ["鳥取県","島根県","岡山県","広島県","山口県"] },
  { label: "四国エリア",         prefs: ["徳島県","香川県","愛媛県","高知県"] },
  { label: "九州・沖縄エリア",   prefs: ["福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"] },
];
function getPrefArea(pref: string): string {
  return AREA_GROUPS.find(a => a.prefs.includes(pref))?.label ?? "その他";
}

// ── デザイントークン（参考画像：ライトベージュ×深紺ゴールドサロンUI） ──
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const GOLD_DARK  = "#a88830";
const ORANGE     = "#d4703a";
const NAVY       = "#0a1628";
const NAVY_CARD  = "#0d1e38";
const NAVY_CARD2 = "#122444";
const NAVY_CARD3 = "#162c50";
const PAGE_BG    = "#eee8e0";
const LINEN      = "#f5f0e8";
const WARM_GRAY  = "#c8bfb0";

// ── タグスタイル ──
const TAG_STYLE: Record<string,string> = {
  important: "bg-red-600 text-white",
  campaign:  "text-white",
  new:       "text-white",
  notice:    "",
};
const TAG_LABEL: Record<string,string> = {
  important:"重要", campaign:"キャンペーン", new:"新機能", notice:"お知らせ"
};

const AVATAR_OPTIONS = ["😊","😎","🦁","🐯","🐼","🦊","🐸","🌸","⭐","🔥","💎","🎯"];

const TRAVEL_FEES: Record<"early"|"standard", Record<number, number>> = {
  early:    { 0: 3500, 1: 2000, 2: 1700, 3: 1500, 4: 1200, 5: 1000 },
  standard: { 0: 3500, 1: 3000, 2: 2700, 3: 2500, 4: 2000, 5: 1500 },
};

// ── 福利厚生アイコン（白ベースフラットSVG） ──
const WELFARE_ICONS: Record<string, { path: string; color: string }> = {
  smartphone: {
    path: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",
    color: "#6ee7b7"
  },
  plane: {
    path: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
    color: "#93c5fd"
  },
  smile: {
    path: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    color: GOLD_LIGHT
  },
  cart: {
    path: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
    color: "#fdba74"
  },
  message: {
    path: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    color: "#c4b5fd"
  },
  jar: {
    path: "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
    color: GOLD_LIGHT
  },
  gift: {
    path: "M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4 2 2 0 010 4zm14 0a2 2 0 110-4 2 2 0 010 4z",
    color: "#fda4af"
  },
  star: {
    path: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
    color: "#fde68a"
  },
  heart: {
    path: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    color: "#fca5a5"
  },
  home: {
    path: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    color: "#86efac"
  },
};

// ────────── VpPhoneButton ──────────
type VpAppData = { id:string; status:string; contractType?:string; adminNote?:string; contractedAt?:string|null; createdAt?:string };

function VpPhoneButton() {
  const [appData, setAppData] = useState<VpAppData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/my/vp-phone").then(r=>r.json()).then(d=>{
      setAppData(d.application ? { id:d.application.id, status:d.application.status, contractType:d.application.contractType??"", adminNote:d.application.adminNote??"", contractedAt:d.application.contractedAt??null, createdAt:d.application.createdAt??"" } : null);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);
  const STATUS_INFO: Record<string,{label:string;dot:string}> = {
    pending:{label:"審査待ち",dot:"bg-amber-400"}, reviewing:{label:"審査中",dot:"bg-sky-400"},
    contracted:{label:"契約済み",dot:"bg-emerald-400"}, rejected:{label:"審査不可",dot:"bg-red-400"}, canceled:{label:"取消済み",dot:"bg-gray-400"},
  };
  if(loading) return (
    <NavyCard className="p-4 flex items-center gap-3">
      <NavyIconBox color={GOLD_LIGHT}><PhoneIcon /></NavyIconBox>
      <div className="flex-1"><p className="font-jp font-semibold text-sm text-white">VP未来phone</p><p className="text-xs mt-0.5 animate-pulse" style={{color:`${GOLD}80`}}>読み込み中...</p></div>
    </NavyCard>
  );
  if(!appData) return (
    <Link href="/vp-phone" className="block">
      <NavyCard className="p-4 flex items-center justify-between hover:border-opacity-60 transition">
        <div className="flex items-center gap-3">
          <NavyIconBox color="#6ee7b7"><PhoneIcon /></NavyIconBox>
          <div><p className="font-jp font-semibold text-sm text-white">VP未来phone</p><p className="text-xs mt-0.5" style={{color:GOLD}}>お得なスマートフォン回線</p></div>
        </div>
        <GoldChip>未申込</GoldChip>
      </NavyCard>
    </Link>
  );
  const info = STATUS_INFO[appData.status]??STATUS_INFO.pending;
  const contractTypeLabel = appData.contractType==="voice"?"音声回線":appData.contractType==="data"?"データ回線":"";
  const hasActiveApp = !["rejected","canceled"].includes(appData.status);
  return (
    <Link href="/vp-phone" className="block">
      <NavyCard className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <NavyIconBox color="#6ee7b7"><PhoneIcon /></NavyIconBox>
            <div>
              <p className="font-jp font-semibold text-sm text-white">{hasActiveApp?"申し込み内容変更":"VP未来phone 再申し込み"}</p>
              {contractTypeLabel&&<p className="text-xs mt-0.5" style={{color:GOLD}}>{contractTypeLabel}</p>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-white/60"><span className={`w-2 h-2 rounded-full ${info.dot}`}/>{info.label}</span>
            <span className="text-xs" style={{color:`${GOLD}80`}}>確認する →</span>
          </div>
        </div>
        {appData.status==="contracted"&&<div className="mt-2 rounded-xl px-3 py-2 text-xs font-semibold" style={{background:"rgba(16,185,129,0.15)",color:"#6ee7b7",border:"1px solid rgba(52,211,153,0.25)"}}>✓ 契約完了済み</div>}
        {(appData.status==="pending"||appData.status==="reviewing")&&(
          <div className="mt-3">
            <div className="flex justify-between text-[10px] mb-1.5" style={{color:`${GOLD}50`}}><span>申込完了</span><span>審査中</span><span>契約完了</span></div>
            <div className="w-full rounded-full h-1" style={{background:"rgba(255,255,255,0.08)"}}>
              <div className="h-1 rounded-full transition-all duration-700" style={{width:appData.status==="reviewing"?"66%":"33%",background:`linear-gradient(90deg,${GOLD},${GOLD_LIGHT})`}}/>
            </div>
          </div>
        )}
      </NavyCard>
    </Link>
  );
}

// ────────── TravelSubButton ──────────
type TravelSubData = { id?:string; displayStatus:"active"|"inactive"|"none"; sub:{level:number;planName:string;monthlyFee:number;status:string;forceStatus:string;startedAt?:string|null;confirmedAt?:string|null}|null };

// ステータス設定（インラインカラー対応）
const TRAVEL_STATUS_CFG:Record<string,{label:string;color:string;bg:string;border:string}>={
  active:         {label:"アクティブ",    color:"#6ee7b7", bg:"rgba(16,185,129,0.12)",  border:"rgba(52,211,153,0.30)"},
  forced_active:  {label:"特別アクティブ",color:"#67e8f9", bg:"rgba(6,182,212,0.10)",   border:"rgba(6,182,212,0.30)"},
  forced_inactive:{label:"一時停止中",    color:"#fdba74", bg:"rgba(249,115,22,0.10)",  border:"rgba(249,115,22,0.28)"},
  inactive:       {label:"非アクティブ",  color:"rgba(255,255,255,0.30)",bg:"rgba(255,255,255,0.04)",border:"rgba(255,255,255,0.10)"},
  pending:        {label:"申込中",        color:GOLD_LIGHT,bg:`${GOLD}10`,             border:`${GOLD}30`},
  suspended:      {label:"支払い待ち",    color:GOLD_LIGHT,bg:`${GOLD}10`,             border:`${GOLD}30`},
  canceled:       {label:"退会済み",      color:"#fca5a5", bg:"rgba(239,68,68,0.08)",  border:"rgba(239,68,68,0.22)"},
  none:           {label:"未登録",        color:"rgba(255,255,255,0.25)",bg:"rgba(255,255,255,0.03)",border:"rgba(255,255,255,0.08)"},
};

const TravelSubButton = forwardRef<{openModal:()=>void}>(function TravelSubButton(_,ref){
  const [travelSub,setTravelSub]=useState<TravelSubData|null>(null);
  const [showModal,setShowModal]=useState(false);
  useImperativeHandle(ref,()=>({openModal:()=>setShowModal(true)}));
  const [form,setForm]=useState({memberCode:"",name:"",phone:"",email:"",level:1});
  const [formError,setFormError]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);

  useEffect(()=>{
    fetch("/api/my/travel-subscription").then(r=>r.json())
      .then(d=>setTravelSub(d))
      .catch(()=>setTravelSub({displayStatus:"none",sub:null}));
  },[]);

  async function handleSubmit(e:React.FormEvent){
    e.preventDefault();
    if(!form.memberCode||!form.name||!form.phone||!form.email){setFormError("会員ID・氏名・電話番号・メールアドレスは必須です");return;}
    setSubmitting(true);setFormError("");
    try{
      const content=`【格安旅行申込】\n会員コード: ${form.memberCode}\n氏名: ${form.name}\n電話番号: ${form.phone}\nメール: ${form.email}\n現在レベル: Lv${form.level}（¥${TRAVEL_FEES.standard[form.level].toLocaleString()}/月）\n\n※支払日：毎月15日\n※お支払い方法：紹介代理店へ`;
      const res=await fetch("/api/contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:form.name,phone:form.phone,email:form.email,content,menuTitle:"格安旅行申込"})});
      if(res.ok){setSubmitted(true);}
      else{const d=await res.json().catch(()=>null);setFormError(d?.error||"申込に失敗しました。");}
    }catch{setFormError("通信エラーが発生しました。");}
    setSubmitting(false);
  }

  function closeModal(){setShowModal(false);setSubmitted(false);setFormError("");}

  // ローディング中
  if(!travelSub) return (
    <NavyCard className="p-4 flex items-center gap-3">
      <NavyIconBox color="#93c5fd"><PlaneIcon/></NavyIconBox>
      <div className="flex-1">
        <p className="font-jp font-semibold text-sm text-white">格安旅行</p>
        <p className="text-xs mt-0.5 animate-pulse" style={{color:`${GOLD}80`}}>読み込み中...</p>
      </div>
    </NavyCard>
  );

  const {sub}=travelSub;
  const lv=sub?.level??1;

  // ステータス決定
  let statusKey=travelSub.displayStatus==="active"?"active":travelSub.displayStatus==="inactive"?"inactive":"none";
  if(sub){
    if(sub.forceStatus==="forced_active")statusKey="forced_active";
    else if(sub.forceStatus==="forced_inactive")statusKey="forced_inactive";
    else statusKey=sub.status;
  }
  const statusCfg=TRAVEL_STATUS_CFG[statusKey]??TRAVEL_STATUS_CFG.none;

  // サービスカードのボタン部分
  const cardInner=(
    <NavyCard className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NavyIconBox color="#93c5fd"><PlaneIcon/></NavyIconBox>
          <div>
            <p className="font-jp font-semibold text-sm text-white">格安旅行</p>
            {sub
              ?<p className="text-xs mt-0.5 font-jp" style={{color:GOLD}}>{sub.planName} · ¥{sub.monthlyFee.toLocaleString()}/月</p>
              :<p className="text-xs mt-0.5 font-jp" style={{color:`${GOLD}70`}}>タップして詳細・申込</p>
            }
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {sub&&(
            <span className="rounded-full text-[10px] font-bold px-2.5 py-0.5 font-label"
              style={{background:`${GOLD}22`,color:GOLD_LIGHT,border:`1px solid ${GOLD}40`}}>
              Lv{lv}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[11px] font-medium"
            style={{color:statusCfg.color}}>
            <span className="w-2 h-2 rounded-full flex-shrink-0"
              style={{background:statusCfg.color}}/>
            {statusCfg.label}
          </span>
        </div>
      </div>
      {/* 契約済みの場合: プログレスバー的アクセント */}
      {sub&&statusKey==="active"&&(
        <div className="mt-3 pt-3" style={{borderTop:`1px solid ${GOLD}15`}}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-label tracking-widest" style={{color:`${GOLD}60`}}>ACTIVE PLAN</p>
            <p className="text-[10px] font-jp" style={{color:"rgba(110,231,183,0.70)"}}>✓ アクティブ</p>
          </div>
          <div className="mt-1.5 w-full h-1 rounded-full" style={{background:"rgba(255,255,255,0.06)"}}>
            <div className="h-1 rounded-full" style={{width:`${Math.min(lv*20,100)}%`,background:`linear-gradient(90deg,#6ee7b7,#34d399)`}}/>
          </div>
        </div>
      )}
    </NavyCard>
  );

  return(
    <>
      <button type="button" onClick={()=>setShowModal(true)} className="w-full text-left transition-all hover:scale-[1.01] active:scale-95">
        {cardInner}
      </button>

      {/* ━━━ モーダル ━━━ */}
      {showModal&&(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{background:"rgba(10,22,40,0.92)",backdropFilter:"blur(8px)"}}
          onClick={closeModal}>
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
            style={{
              background:`linear-gradient(160deg,${NAVY} 0%,${NAVY_CARD} 30%,${NAVY_CARD2} 70%,${NAVY_CARD3} 100%)`,
              border:`1px solid ${GOLD}40`,
              boxShadow:`0 -12px 60px rgba(10,22,40,0.50),0 0 0 1px ${GOLD}15 inset`,
              maxHeight:"92vh"
            }}
            onClick={e=>e.stopPropagation()}>

            {/* トップゴールドライン */}
            <div className="h-0.5 flex-shrink-0"
              style={{background:`linear-gradient(90deg,transparent,${GOLD}90 20%,${GOLD_LIGHT} 50%,${GOLD}90 80%,transparent)`}}/>

            {/* ヘッダー */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{borderBottom:`1px solid rgba(201,168,76,0.15)`}}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{background:"rgba(147,197,253,0.10)",border:"1px solid rgba(147,197,253,0.22)"}}>
                  <span className="w-5 h-5" style={{color:"#7dd3fc"}}><PlaneIcon/></span>
                </div>
                <div>
                  <p className="text-[8px] font-label tracking-[0.26em] font-bold" style={{color:`${GOLD}60`}}>TRAVEL SERVICE</p>
                  <h2 className="font-jp font-bold text-white text-sm leading-tight">格安旅行サービス</h2>
                </div>
              </div>
              <button onClick={closeModal}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition"
                style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.10)",color:"rgba(255,255,255,0.45)"}}>✕</button>
            </div>

            {/* コンテンツ */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 pb-10">

              {/* 申込完了画面 */}
              {submitted&&(
                <div className="rounded-2xl p-6 text-center"
                  style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(52,211,153,0.22)"}}>
                  <div className="text-4xl mb-3">🎉</div>
                  <p className="font-bold text-base font-jp mb-2" style={{color:"#6ee7b7"}}>申し込みを受け付けました！</p>
                  <p className="text-xs font-jp mb-5" style={{color:"rgba(52,211,153,0.65)"}}>
                    担当者より銀行振込先などの<br/>ご案内をお送りします。
                  </p>
                  <button onClick={closeModal}
                    className="rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-all hover:scale-[1.02]"
                    style={{background:"linear-gradient(135deg,#10b981,#34d399)"}}>
                    閉じる
                  </button>
                </div>
              )}

              {!submitted&&(
                <>
                  {/* 現在のプラン（契約済みの場合） */}
                  {sub&&(
                    <div className="rounded-2xl overflow-hidden"
                      style={{border:`1px solid ${GOLD}28`}}>
                      <div className="h-0.5" style={{background:`linear-gradient(90deg,transparent,${GOLD}70,transparent)`}}/>
                      <div className="p-4" style={{background:`linear-gradient(155deg,${GOLD}08,rgba(201,168,76,0.04))`}}>
                        <p className="text-[8px] font-label tracking-[0.24em] mb-3 font-bold" style={{color:`${GOLD}65`}}>CURRENT PLAN</p>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-white font-jp text-sm">{sub.planName}</p>
                            <p className="text-base font-black mt-1" style={{color:GOLD}}>¥{sub.monthlyFee.toLocaleString()}<span className="text-xs font-normal ml-1" style={{color:`${GOLD}60`}}>/月</span></p>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span className="rounded-full px-3 py-1 text-xs font-black font-label"
                              style={{background:`${GOLD}25`,color:GOLD_LIGHT,border:`1px solid ${GOLD}45`}}>
                              Lv{lv}
                            </span>
                            <span className="flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2.5 py-1"
                              style={{background:statusCfg.bg,border:`1px solid ${statusCfg.border}`,color:statusCfg.color}}>
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:statusCfg.color}}/>
                              {statusCfg.label}
                            </span>
                          </div>
                        </div>
                        {sub.confirmedAt&&(
                          <p className="mt-3 text-[10px] font-jp pt-3" style={{borderTop:`1px solid ${GOLD}15`,color:"rgba(255,255,255,0.40)"}}>
                            確認日: {new Date(sub.confirmedAt).toLocaleDateString("ja-JP")}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 料金プランテーブル */}
                  <div className="rounded-2xl overflow-hidden"
                    style={{background:NAVY_CARD2,border:`1px solid ${GOLD}18`}}>
                    <div className="px-4 pt-4 pb-2">
                      <p className="text-[8px] font-label tracking-[0.24em] font-bold" style={{color:GOLD}}>PRICE PLAN</p>
                      <p className="text-xs font-jp mt-0.5" style={{color:"rgba(255,255,255,0.40)"}}>月額料金（税込）</p>
                    </div>
                    <div className="px-4 pb-4">
                      {/* ヘッダー行 */}
                      <div className="grid grid-cols-2 gap-0 text-[9px] font-bold font-label pb-2 mb-1"
                        style={{borderBottom:`1px solid rgba(255,255,255,0.06)`}}>
                        <span style={{color:`${GOLD}60`}}>レベル</span>
                        <span className="text-right" style={{color:"#93c5fd"}}>月額利用料（税込）</span>
                      </div>
                      {[0,1,2,3,4,5].map(l=>(
                        <div key={l}
                          className="grid grid-cols-2 gap-0 py-1.5 text-xs"
                          style={{borderBottom:l<5?`1px solid rgba(255,255,255,0.04)`:"none",
                            background:sub?.level===l?`${GOLD}07`:"transparent"}}>
                          <span className={`font-label font-black ${sub?.level===l?"":"opacity-60"}`}
                            style={{color:sub?.level===l?GOLD:"rgba(255,255,255,0.50)"}}>
                            {sub?.level===l&&<span className="mr-1">▶</span>}Lv{l}
                          </span>
                          <span className="text-right font-semibold"
                            style={{color:sub?.level===l?"#93c5fd":"rgba(255,255,255,0.55)"}}>
                            ¥{TRAVEL_FEES.standard[l].toLocaleString()}
                          </span>
                        </div>
                      ))}
                      <p className="text-[9px] mt-3 font-jp" style={{color:"rgba(255,255,255,0.28)"}}>
                        ※支払日：毎月15日　※お支払い方法：紹介代理店へ
                      </p>
                    </div>
                  </div>

                  {/* 申込フォーム（未契約の場合のみ） */}
                  {!sub&&(
                    <div className="rounded-2xl overflow-hidden"
                      style={{background:NAVY_CARD2,border:`1px solid ${GOLD}18`}}>
                      <div className="h-0.5" style={{background:`linear-gradient(90deg,transparent,${GOLD}60,transparent)`}}/>
                      <div className="px-4 pt-4 pb-2">
                        <p className="text-[8px] font-label tracking-[0.24em] font-bold" style={{color:`${GOLD}65`}}>APPLICATION FORM</p>
                        <p className="text-sm font-jp font-bold mt-1 text-white">格安旅行に申し込む</p>
                        <p className="text-[10px] font-jp mt-0.5" style={{color:"rgba(255,255,255,0.40)"}}>
                          ※新規申込は下記フォームからのみ受け付けています
                        </p>
                      </div>
                      <div className="px-4 pb-4">
                        <form onSubmit={handleSubmit} className="space-y-3">
                          {[
                            {label:"会員ID",type:"text",key:"memberCode",placeholder:"例: M0001",required:true},
                            {label:"氏名",type:"text",key:"name",placeholder:"山田 太郎",required:true},
                            {label:"電話番号",type:"tel",key:"phone",placeholder:"090-1234-5678",required:true},
                            {label:"メールアドレス",type:"email",key:"email",placeholder:"example@email.com",required:true},
                          ].map(f=>(
                            <div key={f.key}>
                              <label className="block text-[11px] font-bold mb-1.5" style={{color:`${GOLD}75`}}>
                                {f.label}
                                {f.required
                                  ?<span className="text-red-400 ml-1">*</span>
                                  :<span className="ml-1 font-normal" style={{color:"rgba(255,255,255,0.30)"}}>（任意）</span>
                                }
                              </label>
                              <input required={f.required} type={f.type}
                                className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none border"
                                style={{background:"rgba(255,255,255,0.05)",borderColor:`${GOLD}22`}}
                                placeholder={f.placeholder}
                                value={(form as Record<string,string|number>)[f.key] as string}
                                onChange={e=>setForm({...form,[f.key]:e.target.value})}/>
                            </div>
                          ))}

                          {/* レベル選択 */}
                          <div>
                            <label className="block text-[11px] font-bold mb-2" style={{color:`${GOLD}75`}}>
                              レベルを選択<span className="text-red-400 ml-1">*</span>
                            </label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[0,1,2,3,4,5].map(l=>(
                                <button key={l} type="button"
                                  onClick={()=>setForm({...form,level:l})}
                                  className="rounded-xl py-2.5 text-center transition-all"
                                  style={form.level===l
                                    ?{border:`1.5px solid ${GOLD}`,background:`${GOLD}18`,color:"white"}
                                    :{border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.03)",color:"rgba(255,255,255,0.35)"}}>
                                  <div className="text-[11px] font-black font-label" style={form.level===l?{color:GOLD_LIGHT}:{}}>Lv{l}</div>
                                  <div className="text-[8px] mt-0.5" style={form.level===l?{color:`${GOLD}80`}:{}}>
                                    ¥{(TRAVEL_FEES.standard[l]/1000).toFixed(1)}k
                                  </div>
                                </button>
                              ))}
                            </div>
                            <p className="text-[9px] mt-1.5 font-jp" style={{color:`${GOLD}50`}}>
                              選択中: Lv{form.level} → ¥{TRAVEL_FEES.standard[form.level].toLocaleString()}/月
                            </p>
                          </div>

                          {formError&&(
                            <div className="rounded-xl px-3 py-2.5 text-xs font-jp font-medium"
                              style={{background:"rgba(239,68,68,0.10)",border:"1px solid rgba(239,68,68,0.25)",color:"#fca5a5"}}>
                              ⚠ {formError}
                            </div>
                          )}

                          <button type="submit" disabled={submitting}
                            className="w-full rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-95"
                            style={{background:`linear-gradient(135deg,${GOLD_DARK},${GOLD},${GOLD_LIGHT})`}}>
                            {submitting?"申込中...":"✈️ 格安旅行に申し込む"}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* 既に契約中の場合の案内 */}
                  {sub&&(
                    <div className="rounded-2xl p-4 text-center"
                      style={{background:"rgba(147,197,253,0.06)",border:"1px solid rgba(147,197,253,0.15)"}}>
                      <p className="text-xs font-jp" style={{color:"rgba(147,197,253,0.70)"}}>
                        ✈ ご契約中です。変更・解約は担当者にお問い合わせください。
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

// ────────── MLM会員状況ボタン ──────────
function MlmStatusButton({status}:{status:string|null}){
  const cfg:Record<string,{label:string;dot:string;text:string;bg:string;border:string}>={
    active:{label:"アクティブ",dot:"#34d399",text:"#6ee7b7",bg:"rgba(16,185,129,0.10)",border:"rgba(52,211,153,0.25)"},
    inactive:{label:"非アクティブ",dot:"#6b7280",text:"#9ca3af",bg:"rgba(75,85,99,0.08)",border:"rgba(107,114,128,0.20)"},
    pending:{label:"支払い待ち",dot:GOLD,text:GOLD_LIGHT,bg:`${GOLD}12`,border:`${GOLD}30`},
    suspended:{label:"活動停止",dot:"#f97316",text:"#fb923c",bg:"rgba(249,115,22,0.08)",border:"rgba(249,115,22,0.22)"},
    canceled:{label:"退会",dot:"#f87171",text:"#fca5a5",bg:"rgba(239,68,68,0.08)",border:"rgba(248,113,113,0.22)"},
  };
  if(!status) return (
    <NavyCard className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <NavyIconBox color={GOLD_LIGHT}><UserIcon/></NavyIconBox>
        <div><p className="text-[9px] font-label mb-0.5" style={{color:`${GOLD}60`}}>MLM STATUS</p><p className="text-sm font-jp font-semibold text-white">未登録</p></div>
      </div>
      <Link href="/mlm/register" className="px-4 py-2 text-xs font-semibold rounded-lg text-white font-jp" style={{background:`linear-gradient(135deg,${GOLD},${ORANGE})`}}>登録する</Link>
    </NavyCard>
  );
  const c=cfg[status]??cfg.inactive;
  return (
    <Link href="/mlm-status" className="block rounded-2xl p-4 transition-all hover:scale-[1.01] active:scale-95" style={{background:c.bg,border:`1px solid ${c.border}`}}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{background:"rgba(255,255,255,0.07)"}}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color:c.text}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div><p className="text-[9px] font-label mb-0.5" style={{color:`${GOLD}60`}}>MLM STATUS</p><p className="text-base font-jp font-semibold" style={{color:c.text}}>{c.label}</p></div>
        </div>
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:c.dot}}/><span className="text-white/25 text-xl">›</span></div>
      </div>
    </Link>
  );
}

// ── 肌診断 店舗カード ──────────────────────────────────────────────────
function SkinShopCard({
  shop, gold, goldLight, navyCard2, onPhotoClick
}:{
  shop: SkinShop;
  gold: string;
  goldLight: string;
  navyCard2: string;
  onPhotoClick: (photos: string[], idx: number) => void;
}) {
  const typeCfg = SHOP_TYPE_CONFIG[shop.shopType ?? "agent"] ?? SHOP_TYPE_CONFIG.agent;
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{background:navyCard2,border:`1px solid ${gold}20`}}>
      <div className="h-0.5" style={{background:`linear-gradient(90deg,transparent,${gold}55,transparent)`}}/>
      <div className="p-4">
        {/* 店名・種別バッジ */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="font-jp font-bold text-white text-sm leading-snug">{shop.name}</p>
          <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{background:typeCfg.bgColor,color:typeCfg.color,border:`1px solid ${typeCfg.borderColor}`}}>
            {typeCfg.badge}
          </span>
        </div>
        {/* エリア */}
        {shop.area && (
          <p className="text-[10px] mb-1.5" style={{color:`${gold}70`}}>📍 {shop.area}</p>
        )}
        {/* 住所 */}
        {shop.address && (
          <a href={`https://maps.google.com/?q=${encodeURIComponent(shop.address)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 mb-1.5 group">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color:`${gold}70`}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span className="text-xs font-jp group-hover:underline" style={{color:"rgba(255,255,255,0.55)"}}>{shop.address}</span>
          </a>
        )}
        {/* 電話番号 */}
        {shop.phone && (
          <a href={`tel:${shop.phone}`} className="flex items-center gap-1.5 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color:`${gold}70`}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
            <span className="text-xs font-jp" style={{color:"rgba(255,255,255,0.55)"}}>{shop.phone}</span>
          </a>
        )}
        {/* 写真ギャラリー */}
        {shop.photos && shop.photos.length > 0 && (
          <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
            {shop.photos.map((photo, pi) => (
              <button key={pi} type="button"
                onClick={() => onPhotoClick(shop.photos!, pi)}
                className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border transition hover:scale-105"
                style={{borderColor:`${gold}30`}}>
                <img src={photo} alt={`${shop.name} 写真${pi+1}`} className="w-full h-full object-cover"/>
              </button>
            ))}
          </div>
        )}
        {/* 予約URLボタン */}
        {shop.url && (
          <a href={shop.url} target="_blank" rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-1.5 w-full rounded-xl py-2 text-xs font-jp font-semibold transition hover:opacity-80"
            style={{background:`${gold}18`,color:goldLight,border:`1px solid ${gold}35`}}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            ご予約はこちら
          </a>
        )}
        {/* ウェブサイトURLボタン */}
        {shop.websiteUrl && (
          <a href={shop.websiteUrl} target="_blank" rel="noopener noreferrer"
            className="mt-2 flex items-center justify-center gap-1.5 w-full rounded-xl py-2 text-xs font-jp font-semibold transition hover:opacity-80"
            style={{background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.55)",border:"1px solid rgba(255,255,255,0.15)"}}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
            ウェブサイトを見る
          </a>
        )}
      </div>
    </div>
  );
}

// ── 共通UI部品 ──

/**
 * 深紺カード（サロンUI用メインカード）
 */
function NavyCard({children,className="",accent=GOLD}:{children:React.ReactNode;className?:string;accent?:string}){
  return(
    <div className={`rounded-2xl overflow-hidden relative ${className}`}
      style={{
        background:`linear-gradient(155deg,${NAVY_CARD} 0%,${NAVY_CARD2} 55%,${NAVY_CARD3} 100%)`,
        border:`1px solid ${accent}30`,
        boxShadow:`0 8px 32px rgba(10,22,40,0.25),0 1px 0 ${accent}18 inset`
      }}>
      {children}
    </div>
  );
}

/**
 * アイコンボックス（深紺カード内用）
 */
function NavyIconBox({children,color,size="md"}:{children:React.ReactNode;color:string;size?:"sm"|"md"|"lg"}){
  const s=size==="sm"?"w-8 h-8 rounded-lg":size==="lg"?"w-13 h-13 rounded-2xl":"w-11 h-11 rounded-xl";
  const ic=size==="sm"?"w-4 h-4":size==="lg"?"w-6 h-6":"w-5 h-5";
  return(
    <div className={`${s} flex items-center justify-center flex-shrink-0`}
      style={{background:"rgba(255,255,255,0.07)",border:`1px solid ${color}35`}}>
      <span className={ic} style={{color}}>{children}</span>
    </div>
  );
}

/**
 * ライト系カード（ベージュ背景上で使う白系カード）
 */
function LinenCard({children,className=""}:{children:React.ReactNode;className?:string}){
  return(
    <div className={`rounded-2xl overflow-hidden ${className}`}
      style={{
        background:LINEN,
        border:`1px solid rgba(201,168,76,0.22)`,
        boxShadow:`0 4px 20px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset`
      }}>
      {children}
    </div>
  );
}

function GoldChip({children}:{children:React.ReactNode}){
  return <span className="rounded-full px-3 py-1 text-xs font-semibold font-label" style={{background:`${GOLD}18`,color:GOLD,border:`1px solid ${GOLD}35`}}>{children}</span>;
}

// ── SVGアイコン ──
function PhoneIcon(){return <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>}
function PlaneIcon(){return <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>}
function UserIcon(){return <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
function BellIcon(){return <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>}
function MenuIcon(){return <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16"/></svg>}
function HomeIcon(){return <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>}
function CoinIcon(){return <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
function ProfileIcon(){return <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
function ChevronRightIcon(){return <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>}

// ── セクションヘッダー（ライト系背景用） ──
function SectionHeader({en,ja,accent=NAVY}:{en:string;ja:string;accent?:string}){
  return(
    <div className="flex items-center gap-3 mb-4">
      <div className="w-0.5 h-8 rounded-full flex-shrink-0" style={{background:`linear-gradient(180deg,${GOLD},${GOLD}40)`}}/>
      <div>
        <p className="font-label text-[9px] tracking-[0.28em]" style={{color:`${GOLD_DARK}90`}}>{en}</p>
        <p className="font-jp text-sm font-semibold leading-tight" style={{color:accent}}>{ja}</p>
      </div>
      <div className="flex-1 h-px" style={{background:`linear-gradient(90deg,${GOLD}35,transparent)`}}/>
    </div>
  );
}

// ────────── メインダッシュボード ──────────
export default function MemberDashboard({
  user, mlmStatus, vpPhoneStatus, travelSubStatus, announcements, menus
}: {
  user: User;
  mlmStatus: string | null;
  vpPhoneStatus: string | null;
  travelSubStatus: string | null;
  announcements: Announcement[];
  menus: Menu[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [unreadCount, setUnreadCount] = useState(announcements.length);
  const [avatar, setAvatar] = useState("😊");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const slideRef = useRef(0);
  const [dashboardPoints, setDashboardPoints] = useState<DashboardPoints>({
    mlmLastMonthPoints: 0, mlmCurrentMonthPoints: 0, savingsBonusPoints: 0,
  });
  const travelSubRef = useRef<{openModal:()=>void}>(null);
  // 肌診断モーダル状態
  const [skinModal, setSkinModal] = useState<{ menuId:string; title:string; shops:SkinShop[] } | null>(null);
  const [skinPhotoViewer, setSkinPhotoViewer] = useState<{ photos:string[]; index:number } | null>(null);
  // 肌診断エリアジャンプ用ref
  const skinAreaRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const skinScrollRef = useRef<HTMLDivElement | null>(null);
  function jumpToArea(label: string) {
    const el = skinAreaRefs.current[label];
    const container = skinScrollRef.current;
    if (el && container) {
      const top = el.offsetTop - 8;
      container.scrollTo({ top, behavior: "smooth" });
    }
  }

  useEffect(()=>{
    fetch("/api/my/dashboard-points").then(r=>r.json()).then(d=>{if(!d.error)setDashboardPoints(d);}).catch(()=>{});
  },[]);
  useEffect(()=>{
    fetch("/api/my/avatar").then(r=>r.json()).then(d=>{
      if(d.avatarUrl){setProfileAvatarUrl(d.avatarUrl);localStorage.setItem("profileAvatarUrl",d.avatarUrl);}
      else{setProfileAvatarUrl(null);const saved=localStorage.getItem("userAvatar");if(saved)setAvatar(saved);}
    }).catch(()=>{const saved=localStorage.getItem("userAvatar");if(saved)setAvatar(saved);const url=localStorage.getItem("profileAvatarUrl");if(url)setProfileAvatarUrl(url);});
    const onUpdate=()=>{const url=localStorage.getItem("profileAvatarUrl");setProfileAvatarUrl(url??null);};
    window.addEventListener("avatarUpdated",onUpdate);
    return()=>window.removeEventListener("avatarUpdated",onUpdate);
  },[]);
  useEffect(()=>{
    if(announcements.length<=1)return;
    const t=setInterval(()=>{slideRef.current=(slideRef.current+1)%announcements.length;setSlide(slideRef.current);},4000);
    return()=>clearInterval(t);
  },[announcements.length]);
  useEffect(()=>{
    if(!menuOpen)return;
    const c=()=>setMenuOpen(false);
    document.addEventListener("click",c);return()=>document.removeEventListener("click",c);
  },[menuOpen]);
  useEffect(()=>{
    const check=()=>{const stored=localStorage.getItem("readAnnouncements");const read:string[]=stored?JSON.parse(stored):[];setUnreadCount(announcements.filter(a=>!read.includes(a.id)).length);};
    check();window.addEventListener("announcementsRead",check);return()=>window.removeEventListener("announcementsRead",check);
  },[announcements]);

  const activeAnn = announcements[slide];

  const mlmMenuItems = [
    {href:"/mlm-registration",    d:"M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",              label:"登録情報",       color:"#fde68a"},
    {href:"/mlm-bonus-history",   d:"M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", label:"ボーナス\n履歴",  color:"#fdba74"},
    {href:"/mlm-purchase-history",d:"M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z", label:"購入履歴",       color:"#93c5fd"},
    {href:"/mlm-autoship",        d:"M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",label:"オートシップ\n確認",color:"#6ee7b7"},
    {href:"/orders/checkout",     d:"M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",                                          label:"商品注文",       color:"#fda4af"},
    {href:"/mlm-org-chart",       d:"M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z", label:"MLM組織図",     color:"#34d399"},
    {href:"/mlm-status",          d:"M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",label:"状況",          color:"#c4b5fd"},
    {href:"/mlm-referrer-list",   d:"M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",label:"紹介者\n一覧", color:"#a5b4fc"},
    {href:"/referral",            d:"M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4 2 2 0 010 4zm14 0a2 2 0 110-4 2 2 0 010 4z",label:"お友達\n紹介",  color:"#fdba74"},
    {href:"/points/history",      d:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", label:"ポイント\n履歴",  color:"#fbbf24"},
  ];

  const drawerItems = [
    {href:"/dashboard",      label:"ホーム",            d:"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"},
    {href:"/referral",       label:"お友達紹介",        d:"M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4 2 2 0 010 4zm14 0a2 2 0 110-4 2 2 0 010 4z"},
    {href:"/announcements",  label:"お知らせ",          d:"M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"},
    {href:"/mlm-registration",label:"MLM登録情報",      d:"M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"},
    {href:"#mlm-menu",       label:"MLMメニュー",       d:"M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"},
    {href:"/mlm-org-chart",  label:"MLM組織図",         d:"M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"},
    {href:"#menu",           label:"福利厚生メニュー",  d:"M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"},
    {href:"/vp-phone",       label:"VP未来phone\n登録状況確認",d:"M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"},
    {href:"/travel-referrals",label:"格安旅行\n登録状況確認",d:"M12 19l9 2-9-18-9 18 9-2zm0 0v-8"},
    {href:"/points/use",     label:"ポイントを使う",    d:"M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"},
    {href:"/points/history", label:"ポイント履歴",      d:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"},
  ];

  return (
    <div className="min-h-screen pb-28 bg-linen-texture" style={{background:PAGE_BG}}>

      {/* ── 背景装飾：ライト系グロー ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full opacity-[0.18]"
          style={{background:`radial-gradient(circle,${GOLD}55,transparent 70%)`}}/>
        <div className="absolute bottom-20 -left-20 w-64 h-64 rounded-full opacity-[0.10]"
          style={{background:`radial-gradient(circle,${NAVY}33,transparent 70%)`}}/>
        <div className="absolute top-1/2 right-0 w-48 h-48 rounded-full opacity-[0.08]"
          style={{background:`radial-gradient(circle,${ORANGE}44,transparent 70%)`}}/>
      </div>

      {/* ── ヘッダー（ライト系サロンUI） ── */}
      <header className="sticky top-0 z-30"
        style={{
          background:"rgba(245,240,232,0.95)",
          backdropFilter:"blur(20px) saturate(160%)",
          borderBottom:`1px solid rgba(201,168,76,0.25)`,
          boxShadow:`0 2px 20px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset`
        }}>
        <div className="max-w-md mx-auto flex items-center justify-between px-5 py-3">

          {/* ── ハンバーガーメニュー（左） ── */}
          <button onClick={e=>{e.stopPropagation();setMenuOpen(!menuOpen);}}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition"
            style={{background:"rgba(10,22,40,0.06)",border:"1px solid rgba(10,22,40,0.10)"}}>
            <span className="w-5 h-5" style={{color:NAVY}}><MenuIcon/></span>
          </button>

          {/* ── センターロゴ（参考画像スタイル） ── */}
          <div className="flex flex-col items-center">
            <p className="font-display font-semibold italic leading-none tracking-wide" style={{color:NAVY,fontSize:"22px",letterSpacing:"0.06em"}}>Viola Pure</p>
            <p className="font-label leading-none mt-0.5" style={{color:GOLD_DARK,fontSize:"8px",letterSpacing:"0.30em"}}>MEMBERS PORTAL</p>
          </div>

          {/* ── 右：ベル通知 ── */}
          <Link href="/announcements"
            className="relative w-9 h-9 rounded-xl flex items-center justify-center transition"
            style={{background:"rgba(10,22,40,0.06)",border:"1px solid rgba(10,22,40,0.10)"}}>
            <span className="w-[18px] h-[18px]" style={{color:NAVY}}><BellIcon/></span>
            {unreadCount>0&&(
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {unreadCount>9?"9+":unreadCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* ── ドロワーメニュー（ライト系） ── */}
      {menuOpen&&(
        <div className="fixed inset-0 z-40 backdrop-blur-sm" style={{background:"rgba(10,22,40,0.55)"}} onClick={()=>setMenuOpen(false)}>
          <div className="absolute left-0 top-0 h-full w-72 flex flex-col"
            style={{background:LINEN,borderRight:`1px solid ${GOLD}22`,boxShadow:"4px 0 32px rgba(10,22,40,0.15)"}}
            onClick={e=>e.stopPropagation()}>
            {/* ドロワーヘッダー */}
            <div className="flex items-center justify-between px-6 py-5" style={{borderBottom:`1px solid ${GOLD}18`}}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:`linear-gradient(135deg,${GOLD},${ORANGE})`}}>
                  <span className="font-display italic font-semibold text-white text-sm">V</span>
                </div>
                <div>
                  <p className="font-display font-semibold italic leading-none" style={{color:NAVY,fontSize:"15px"}}>Viola Pure</p>
                  <p className="font-label text-[8px] leading-none mt-0.5" style={{color:GOLD_DARK,letterSpacing:"0.20em"}}>MENU</p>
                </div>
              </div>
              <button onClick={()=>setMenuOpen(false)} style={{color:"rgba(10,22,40,0.40)"}}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <nav className="flex flex-col flex-1 px-3 py-3 overflow-y-auto">
              {drawerItems.map(item=>(
                <Link key={item.href} href={item.href} onClick={()=>setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-jp font-medium transition hover:bg-black/5"
                  style={{color:"rgba(10,22,40,0.65)"}}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color:GOLD_DARK}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.d}/>
                  </svg>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="px-3 pb-6 pt-2" style={{borderTop:"1px solid rgba(10,22,40,0.08)"}}>
              <button onClick={async()=>{const {signOut}=await import("next-auth/react");signOut({callbackUrl:"/login"});}}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-jp font-medium text-red-500 hover:bg-red-50 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto px-4 pt-5 space-y-6 relative">

        {/* ── ウェルカムカード（深紺×ゴールド ハイライト） ── */}
        <div className="rounded-3xl overflow-hidden relative"
          style={{
            background:`linear-gradient(150deg,${NAVY} 0%,${NAVY_CARD} 45%,${NAVY_CARD2} 100%)`,
            border:`1px solid ${GOLD}35`,
            boxShadow:`0 16px 48px rgba(10,22,40,0.30),0 0 0 1px ${GOLD}12 inset`
          }}>
          {/* 上部ゴールドライン */}
          <div className="h-px" style={{background:`linear-gradient(90deg,transparent,${GOLD}90 30%,${GOLD_LIGHT} 50%,${GOLD}90 70%,transparent)`}}/>
          {/* 右上グロー */}
          <div className="absolute top-0 right-0 w-48 h-48 opacity-[0.12] pointer-events-none"
            style={{background:`radial-gradient(circle at 100% 0%,${GOLD_LIGHT},transparent 70%)`}}/>

          <div className="px-5 pt-5 pb-5">
            {/* ユーザー情報 */}
            <div className="flex items-center gap-4 mb-5">
              <button onClick={()=>setShowAvatarPicker(!showAvatarPicker)}
                className="relative w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center text-2xl flex-shrink-0 transition"
                style={{
                  background:`linear-gradient(135deg,rgba(201,168,76,0.20),rgba(212,112,58,0.12))`,
                  border:`2px solid ${GOLD}45`,
                  boxShadow:`0 0 20px ${GOLD}20`
                }}>
                {profileAvatarUrl?<img src={profileAvatarUrl} alt="アバター" className="w-full h-full object-cover"/>:avatar}
                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition flex items-center justify-center" style={{background:"rgba(0,0,0,0.45)"}}>
                  <span className="text-xs text-white font-jp">変更</span>
                </div>
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-label text-[9px] tracking-[0.22em] mb-0.5" style={{color:`${GOLD}80`}}>WELCOME BACK</p>
                <p className="text-white text-xl font-jp font-semibold leading-tight truncate">
                  {user.name}
                  <span className="font-display italic font-normal text-lg ml-1" style={{color:GOLD_LIGHT}}>さん</span>
                </p>
                <p className="text-xs mt-1 font-label tracking-wider" style={{color:`${GOLD}45`}}># {user.memberCode}</p>
              </div>
              <Link href="/profile"
                className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 transition"
                style={{border:`1px solid ${GOLD}25`,color:`${GOLD}55`}}>
                <div className="w-4 h-4"><ChevronRightIcon/></div>
              </Link>
            </div>

            {/* アバター選択 */}
            {showAvatarPicker&&(
              <div className="rounded-2xl p-3 mb-4" style={{background:"rgba(201,168,76,0.07)",border:`1px solid ${GOLD}18`}}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-label text-[9px] tracking-widest" style={{color:`${GOLD}70`}}>CHOOSE AVATAR</p>
                  <Link href="/profile#avatar" className="text-[10px] font-jp font-semibold" style={{color:GOLD}} onClick={()=>setShowAvatarPicker(false)}>写真に変更 →</Link>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_OPTIONS.map(em=>(
                    <button key={em} onClick={()=>{setAvatar(em);setProfileAvatarUrl(null);localStorage.setItem("userAvatar",em);localStorage.removeItem("profileAvatarUrl");setShowAvatarPicker(false);}} className="text-2xl hover:scale-125 transition">{em}</button>
                  ))}
                </div>
              </div>
            )}

            {/* ポイントバー群 */}
            <div className="flex flex-col gap-2.5">
              {[
                {label:"先月ポイント",sub:"MLM",value:dashboardPoints.mlmLastMonthPoints,unit:"VPpt",from:GOLD,to:GOLD_LIGHT},
                {label:"今月ポイント",sub:"MLM",value:dashboardPoints.mlmCurrentMonthPoints,unit:"VPpt",from:ORANGE,to:"#f4a060"},
                {label:"貯金ボーナス",sub:"SAV",value:dashboardPoints.savingsBonusPoints,unit:"SAV",from:"#34d399",to:"#6ee7b7"},
              ].map(item=>(
                <div key={item.label} className="rounded-xl px-4 py-3 flex items-center gap-4"
                  style={{background:"rgba(255,255,255,0.07)",border:`1px solid ${item.from}30`}}>
                  {/* 左: サブ+ラベル */}
                  <div className="flex-shrink-0 w-28">
                    <p className="font-label text-[10px] font-bold tracking-[0.20em] mb-0.5" style={{color:item.from}}>{item.sub}</p>
                    <p className="font-jp text-sm font-semibold" style={{color:"rgba(255,255,255,0.82)"}}>{item.label}</p>
                  </div>
                  {/* 右: 値+プログレスバー */}
                  <div className="flex-1">
                    <div className="flex items-baseline gap-1 mb-1.5">
                      <span className="text-2xl font-black" style={{color:"rgba(255,255,255,0.97)"}}>{item.value.toLocaleString()}</span>
                      <span className="text-xs font-bold" style={{color:item.from}}>{item.unit}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{background:"rgba(255,255,255,0.10)"}}>
                      <div className="h-1.5 rounded-full transition-all duration-700" style={{width:`${Math.min((item.value/10000)*100,100)}%`,background:`linear-gradient(90deg,${item.from},${item.to})`}}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="h-px" style={{background:`linear-gradient(90deg,transparent,${GOLD}30,transparent)`}}/>
        </div>

        {/* ── MLM会員状況 ── */}
        <MlmStatusButton status={mlmStatus}/>

        {/* ── お知らせスライダー ── */}
        <section id="news">
          <SectionHeader en="ANNOUNCEMENTS" ja="お知らせ"/>
          {announcements.length===0?(
            <LinenCard className="p-5 text-center">
              <p className="text-sm font-jp" style={{color:"rgba(10,22,40,0.35)"}}>現在お知らせはありません</p>
            </LinenCard>
          ):(
            <Link href="/announcements" className="block rounded-2xl overflow-hidden transition hover:shadow-lg"
              style={{
                background:`linear-gradient(145deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`,
                border:`1px solid ${GOLD}28`,
                boxShadow:`0 8px 28px rgba(10,22,40,0.20)`
              }}>
              <div className="h-px" style={{background:`linear-gradient(90deg,${GOLD}70,${GOLD_LIGHT}80,${GOLD}70)`}}/>
              <div className="p-5 min-h-[100px]">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-jp font-semibold ${TAG_STYLE[activeAnn?.tag]??""}`}
                    style={!TAG_STYLE[activeAnn?.tag]||activeAnn?.tag==="notice"?{background:`${GOLD}22`,color:GOLD_LIGHT,border:`1px solid ${GOLD}35`}:{background:activeAnn?.tag==="campaign"?ORANGE:GOLD,color:"white"}}>
                    {TAG_LABEL[activeAnn?.tag]??"お知らせ"}
                  </span>
                  <span className="text-xs font-label tracking-wider" style={{color:"rgba(255,255,255,0.28)"}}>
                    {activeAnn?.publishedAt?new Date(activeAnn.publishedAt).toLocaleDateString("ja-JP"):""}
                  </span>
                </div>
                <p className="font-jp font-semibold text-white text-sm leading-snug">{activeAnn?.title}</p>
                <p className="font-jp text-xs mt-1.5 line-clamp-2" style={{color:"rgba(255,255,255,0.45)"}}>{activeAnn?.content}</p>
              </div>
              {announcements.length>1&&(
                <div className="flex justify-center gap-1.5 pb-3">
                  {announcements.map((_,i)=>(
                    <button key={i} onClick={e=>{e.preventDefault();slideRef.current=i;setSlide(i);}} className="h-1 rounded-full transition-all duration-300"
                      style={i===slide?{width:"20px",background:GOLD}:{width:"6px",background:"rgba(255,255,255,0.15)"}}/>
                  ))}
                </div>
              )}
            </Link>
          )}
        </section>

        {/* ── MLMメニュー（深紺グリッド） ── */}
        <section id="mlm-menu">
          <SectionHeader en="MLM MENU" ja="MLM メニュー"/>
          <div className="grid grid-cols-3 gap-2.5">
            {mlmMenuItems.map((item,idx)=>(
              <Link key={idx} href={item.href}
                className="group rounded-2xl overflow-hidden transition-all hover:scale-[1.03] active:scale-95"
                style={{
                  background:`linear-gradient(155deg,${NAVY_CARD} 0%,${NAVY_CARD2} 55%,${NAVY_CARD3} 100%)`,
                  border:`1px solid ${item.color}28`,
                  boxShadow:`0 4px 16px rgba(10,22,40,0.18)`
                }}>
                {/* トップゴールドライン */}
                <div className="h-0.5" style={{background:`linear-gradient(90deg,transparent,${item.color}70,${item.color}90,${item.color}70,transparent)`}}/>
                <div className="p-3 text-center">
                  {/* アイコン：白ベースフラット */}
                  <div className="w-11 h-11 rounded-xl mx-auto mb-2 flex items-center justify-center"
                    style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.10)"}}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color:item.color}}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.d}/>
                    </svg>
                  </div>
                  <p className="font-jp text-[11px] font-medium leading-tight whitespace-pre-line" style={{color:"rgba(255,255,255,0.88)"}}>{item.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 福利厚生メニュー（深紺グリッド） ── */}
        <section id="menu">
          <SectionHeader en="WELFARE MENU" ja="福利厚生 メニュー"/>
          <div className="grid grid-cols-3 gap-2.5">
            {menus.map(m=>{
              const iconType = m.iconType??"";
              const wIcon = WELFARE_ICONS[iconType];
              const iconColor = wIcon?.color ?? GOLD_LIGHT;

              const cardContent = (
                <>
                  <div className="h-0.5" style={{background:`linear-gradient(90deg,transparent,${iconColor}55,${iconColor}75,${iconColor}55,transparent)`}}/>
                  <div className="p-3 text-center">
                    <div className="w-11 h-11 rounded-xl mx-auto mb-2 flex items-center justify-center"
                      style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.10)"}}>
                      {wIcon?(
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color:iconColor}}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={wIcon.path}/>
                        </svg>
                      ):(
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color:iconColor}}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                        </svg>
                      )}
                    </div>
                    <p className="font-jp text-[11px] font-medium leading-tight" style={{color:"rgba(255,255,255,0.90)"}}>{m.title}</p>
                    {m.subtitle&&<p className="font-jp text-[9px] mt-0.5" style={{color:`${iconColor}65`}}>{m.subtitle}</p>}
                  </div>
                </>
              );

              const cardStyle = {
                background:`linear-gradient(155deg,${NAVY_CARD} 0%,${NAVY_CARD2} 55%,${NAVY_CARD3} 100%)`,
                border:`1px solid ${iconColor}22`,
                boxShadow:`0 4px 16px rgba(10,22,40,0.18)`
              };

              // VPphone判定：menuType or タイトルに「VP」「phone」が含まれる
              const isVpPhone = m.menuType==="vp_phone"
                || m.title.toLowerCase().includes("vp")
                || m.title.toLowerCase().includes("phone")
                || m.title.includes("携帯");
              // 旅行判定：menuType or タイトルに「旅行」が含まれる
              const isTravel = m.menuType==="travel_sub"
                || m.title.includes("旅行");

              // 肌診断：linkUrlがあれば外部リンク、なければ代理店モーダル
              if(m.menuType==="skin") {
                if(m.linkUrl&&m.linkUrl.trim()!=="") {
                  const skinHref=m.linkUrl.trim();
                  const skinInternal=skinHref.startsWith("/");
                  return (
                    <a key={m.id} href={skinHref} target={skinInternal?undefined:"_blank"} rel={skinInternal?undefined:"noopener noreferrer"} className="rounded-2xl overflow-hidden transition-all hover:scale-[1.03] active:scale-95" style={cardStyle}>{cardContent}</a>
                  );
                }
                // モーダルを開く（contentDataからshopsをパース）
                return (
                  <button key={m.id} type="button"
                    onClick={()=>{
                      let shops:SkinShop[]=[];
                      try{
                        if(m.contentData){
                          const parsed=JSON.parse(m.contentData);
                          if(Array.isArray(parsed)) shops=parsed;
                          else if(parsed && Array.isArray(parsed.shops)) shops=parsed.shops;
                        }
                      }catch(_e){}
                      setSkinModal({menuId:m.id,title:m.title,shops});
                    }}
                    className="w-full rounded-2xl overflow-hidden transition-all hover:scale-[1.03] active:scale-95 text-left"
                    style={cardStyle}>{cardContent}</button>
                );
              }
              if(m.menuType==="contact") return (
                <a key={m.id} href="/contact" className="rounded-2xl overflow-hidden transition-all hover:scale-[1.03] active:scale-95" style={cardStyle}>{cardContent}</a>
              );
              if(m.menuType==="used_car") return (
                <a key={m.id} href="/used-cars" className="rounded-2xl overflow-hidden transition-all hover:scale-[1.03] active:scale-95" style={cardStyle}>{cardContent}</a>
              );
              if(m.menuType==="life_insurance") return (
                <a key={m.id} href="/insurance?tab=life" className="rounded-2xl overflow-hidden transition-all hover:scale-[1.03] active:scale-95" style={cardStyle}>{cardContent}</a>
              );
              if(m.menuType==="non_life_insurance") return (
                <a key={m.id} href="/insurance?tab=non_life" className="rounded-2xl overflow-hidden transition-all hover:scale-[1.03] active:scale-95" style={cardStyle}>{cardContent}</a>
              );
              if(isVpPhone) return (
                <a key={m.id} href="/vp-phone" className="rounded-2xl overflow-hidden transition-all hover:scale-[1.03] active:scale-95" style={cardStyle}>{cardContent}</a>
              );
              if(isTravel) {
                // linkUrl が設定されていればURLに遷移、なければモーダルを開く
                if(m.linkUrl&&m.linkUrl.trim()!==""){
                  const travelHref=m.linkUrl.trim();
                  const travelInternal=travelHref.startsWith("/");
                  return (
                    <a key={m.id} href={travelHref} target={travelInternal?undefined:"_blank"} rel={travelInternal?undefined:"noopener noreferrer"} className="rounded-2xl overflow-hidden transition-all hover:scale-[1.03] active:scale-95" style={cardStyle}>{cardContent}</a>
                  );
                }
                return (
                  <button key={m.id} onClick={()=>travelSubRef.current?.openModal()} className="w-full rounded-2xl overflow-hidden transition-all hover:scale-[1.03] active:scale-95 text-left" style={cardStyle}>{cardContent}</button>
                );
              }
              const href=m.linkUrl??"#";
              const isInternal=href.startsWith("/");
              return (
                <a key={m.id} href={href} target={isInternal?undefined:"_blank"} rel={isInternal?undefined:"noopener noreferrer"} className="rounded-2xl overflow-hidden transition-all hover:scale-[1.03] active:scale-95" style={cardStyle}>{cardContent}</a>
              );
            })}
          </div>
        </section>

        {/* ── 肌診断モーダル（都道府県別・サブタブ付き） ── */}
        {skinModal&&(
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{background:"rgba(10,22,40,0.92)",backdropFilter:"blur(8px)"}}
            onClick={()=>{setSkinModal(null);}}>
            <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
              style={{
                background:`linear-gradient(160deg,${NAVY} 0%,${NAVY_CARD} 30%,${NAVY_CARD2} 70%,${NAVY_CARD3} 100%)`,
                border:`1px solid ${GOLD}40`,
                boxShadow:`0 -12px 60px rgba(10,22,40,0.50),0 0 0 1px ${GOLD}15 inset`,
                maxHeight:"92vh"
              }}
              onClick={e=>e.stopPropagation()}>

              {/* トップゴールドライン */}
              <div className="h-0.5 flex-shrink-0"
                style={{background:`linear-gradient(90deg,transparent,${GOLD}90 20%,${GOLD_LIGHT} 50%,${GOLD}90 80%,transparent)`}}/>

              {/* ヘッダー */}
              <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{borderBottom:`1px solid rgba(201,168,76,0.15)`}}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{background:"rgba(201,168,76,0.12)",border:`1px solid ${GOLD}30`}}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color:GOLD_LIGHT}}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[8px] font-label tracking-[0.26em] font-bold" style={{color:`${GOLD}60`}}>SKIN DIAGNOSIS</p>
                    <h2 className="font-jp font-bold text-white text-sm leading-tight">{skinModal.title} — 全国代理店</h2>
                  </div>
                </div>
                <button onClick={()=>{setSkinModal(null);}}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition"
                  style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.10)",color:"rgba(255,255,255,0.45)"}}>✕</button>
              </div>

              {/* ── データ計算（IIFE外に出してJSXに直接渡す） ── */}
              {(()=>{
                // 正規代理店・代理店をエリアごとにまとめる
                const localShops = skinModal.shops.filter(s=>{
                  const t = s.shopType??"agent";
                  return t==="authorized" || t==="agent";
                });
                const hasLocal = localShops.length > 0;
                const areaBlocks = !hasLocal ? [] : AREA_GROUPS.map(area=>{
                  const areaShops = localShops.filter(s=>area.prefs.includes(s.prefecture??s.area??""))
                    .sort((a,b)=>{
                      const ap = area.prefs.indexOf(a.prefecture??a.area??"");
                      const bp = area.prefs.indexOf(b.prefecture??b.area??"");
                      if(ap!==bp) return ap-bp;
                      const at = (a.shopType??"agent")==="authorized" ? 0 : 1;
                      const bt = (b.shopType??"agent")==="authorized" ? 0 : 1;
                      return at-bt;
                    });
                  if(areaShops.length===0) return null;
                  const prefGroups: {pref:string; shops:SkinShop[]}[] = [];
                  areaShops.forEach(shop=>{
                    const pref = shop.prefecture??shop.area??"";
                    const g = prefGroups.find(g=>g.pref===pref);
                    if(g) g.shops.push(shop);
                    else prefGroups.push({pref,shops:[shop]});
                  });
                  return {area, prefGroups, count: areaShops.length};
                }).filter(Boolean) as {area:{label:string;prefs:string[]};prefGroups:{pref:string;shops:SkinShop[]}[];count:number}[];

                const activeAreaLabels = areaBlocks.map(b=>b.area.label);
                const noPrefShops = localShops.filter(s=>!(s.prefecture??s.area??""));

                return (
                  /* ★ flex-col + min-h-0 で flex-1 子要素が正しく高さを取れるようにする */
                  <div className="flex flex-col min-h-0 flex-1">

                    {/* ── 固定：本部・直営・全国 ── */}
                    {(["hq","direct","nationwide"] as const).map(typeKey=>{
                      const typeCfg = SHOP_TYPE_CONFIG[typeKey];
                      const typeShops = skinModal.shops.filter(s=>(s.shopType??"agent")===typeKey);
                      if(typeShops.length===0) return null;
                      return (
                        <div key={typeKey} className="flex-shrink-0 px-4 pt-3"
                          style={{borderBottom:`1px solid rgba(255,255,255,0.06)`}}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                              style={{background:typeCfg.bgColor,color:typeCfg.color,border:`1px solid ${typeCfg.borderColor}`}}>
                              {typeCfg.badge}
                            </span>
                            <span className="text-[10px]" style={{color:"rgba(255,255,255,0.30)"}}>{typeShops.length}件</span>
                          </div>
                          <div className="space-y-2 pb-3">
                            {typeShops.map((shop,si)=>(
                              <SkinShopCard key={si} shop={shop} gold={GOLD} goldLight={GOLD_LIGHT} navyCard2={NAVY_CARD2}
                                onPhotoClick={(photos,idx)=>setSkinPhotoViewer({photos,index:idx})}/>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* ── 固定：エリアジャンプボタン ── */}
                    {activeAreaLabels.length > 0 && (
                      <div className="flex-shrink-0 px-4 pt-3 pb-2"
                        style={{borderTop:`1px solid rgba(255,255,255,0.06)`}}>
                        <p className="text-[9px] font-bold mb-2 tracking-widest" style={{color:`${GOLD}80`}}>▼ エリアから探す</p>
                        <div className="flex flex-wrap gap-1.5">
                          {activeAreaLabels.map(label=>(
                            <button key={label} type="button"
                              onClick={()=>jumpToArea(label)}
                              className="rounded-full px-2.5 py-1 text-[10px] font-bold transition-all active:scale-95"
                              style={{background:`${GOLD}18`,color:GOLD_LIGHT,border:`1px solid ${GOLD}35`}}>
                              {label.replace("エリア","")}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── スクロール領域：エリア別代理店リスト ── */}
                    {hasLocal && (
                      <div ref={skinScrollRef} className="overflow-y-auto flex-1 min-h-0 px-4 pt-2 pb-10">
                        {areaBlocks.map(({area, prefGroups, count})=>(
                          <div key={area.label}
                            ref={el=>{ skinAreaRefs.current[area.label]=el; }}>
                            {/* エリアバー */}
                            <div className="flex items-center gap-2 py-2 mt-2 mb-1 sticky top-0 z-10"
                              style={{background:`linear-gradient(90deg,rgba(10,22,40,0.98),rgba(13,30,56,0.95))`,borderBottom:`1px solid ${GOLD}25`}}>
                              <div className="h-3 w-0.5 rounded-full" style={{background:GOLD}}/>
                              <span className="text-[11px] font-bold font-jp tracking-wide" style={{color:GOLD_LIGHT}}>{area.label}</span>
                              <span className="text-[9px]" style={{color:"rgba(255,255,255,0.30)"}}>{count}件</span>
                              <div className="flex-1 h-px" style={{background:`linear-gradient(90deg,${GOLD}30,transparent)`}}/>
                            </div>
                            {/* 都道府県グループ */}
                            <div className="space-y-3 pt-1">
                              {prefGroups.map(({pref, shops})=>(
                                <div key={pref}>
                                  {pref && (
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{background:`${GOLD}14`,color:GOLD_LIGHT,border:`1px solid ${GOLD}28`}}>
                                        📍 {pref}
                                      </span>
                                      <span className="text-[9px]" style={{color:"rgba(255,255,255,0.25)"}}>{shops.length}件</span>
                                      <div className="flex-1 h-px" style={{background:`linear-gradient(90deg,${GOLD}20,transparent)`}}/>
                                    </div>
                                  )}
                                  <div className="space-y-2">
                                    {shops.map((shop,si)=>(
                                      <SkinShopCard key={si} shop={shop} gold={GOLD} goldLight={GOLD_LIGHT} navyCard2={NAVY_CARD2}
                                        onPhotoClick={(photos,idx)=>setSkinPhotoViewer({photos,index:idx})}/>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {/* 都道府県未設定の代理店 */}
                        {(()=>{
                          const noPref = localShops.filter(s=>!(s.prefecture??s.area??""));
                          if(noPref.length===0) return null;
                          return (
                            <div>
                              <div className="flex items-center gap-2 py-2 mt-1 mb-1"
                                style={{borderBottom:`1px solid rgba(255,255,255,0.08)`}}>
                                <span className="text-[10px] font-bold" style={{color:"rgba(255,255,255,0.40)"}}>エリア未設定</span>
                                <span className="text-[9px]" style={{color:"rgba(255,255,255,0.25)"}}>{noPref.length}件</span>
                              </div>
                              <div className="space-y-2 pt-1">
                                {noPref.map((shop,si)=>(
                                  <SkinShopCard key={si} shop={shop} gold={GOLD} goldLight={GOLD_LIGHT} navyCard2={NAVY_CARD2}
                                    onPhotoClick={(photos,idx)=>setSkinPhotoViewer({photos,index:idx})}/>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    {!hasLocal && (
                      <div className="flex-1 flex items-center justify-center py-10">
                        <p className="text-sm font-jp" style={{color:"rgba(255,255,255,0.35)"}}>代理店情報がありません</p>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          </div>
        )}

        {/* ── 肌診断写真フルスクリーンビューア ── */}
        {skinPhotoViewer&&(
          <div className="fixed inset-0 z-[60] flex items-center justify-center"
            style={{background:"rgba(0,0,0,0.95)"}}
            onClick={()=>setSkinPhotoViewer(null)}>
            <button type="button"
              className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold"
              style={{background:"rgba(255,255,255,0.10)",border:"1px solid rgba(255,255,255,0.20)"}}
              onClick={()=>setSkinPhotoViewer(null)}>✕</button>
            {skinPhotoViewer.photos.length>1&&(
              <>
                <button type="button"
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white"
                  style={{background:"rgba(255,255,255,0.10)",border:"1px solid rgba(255,255,255,0.20)"}}
                  onClick={e=>{e.stopPropagation();setSkinPhotoViewer(v=>v?{...v,index:(v.index-1+v.photos.length)%v.photos.length}:null);}}>‹</button>
                <button type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white"
                  style={{background:"rgba(255,255,255,0.10)",border:"1px solid rgba(255,255,255,0.20)"}}
                  onClick={e=>{e.stopPropagation();setSkinPhotoViewer(v=>v?{...v,index:(v.index+1)%v.photos.length}:null);}}>›</button>
              </>
            )}
            <img
              src={skinPhotoViewer.photos[skinPhotoViewer.index]}
              alt={`写真 ${skinPhotoViewer.index+1}`}
              className="max-w-full max-h-full object-contain rounded-xl"
              style={{maxWidth:"90vw",maxHeight:"85vh"}}
              onClick={e=>e.stopPropagation()}/>
            {skinPhotoViewer.photos.length>1&&(
              <div className="absolute bottom-6 flex gap-2">
                {skinPhotoViewer.photos.map((_,i)=>(
                  <button key={i} type="button"
                    onClick={e=>{e.stopPropagation();setSkinPhotoViewer(v=>v?{...v,index:i}:null);}}
                    className="w-2 h-2 rounded-full transition-all"
                    style={i===skinPhotoViewer.index?{background:"white",width:"20px"}:{background:"rgba(255,255,255,0.35)"}}/>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── サービスメニュー（VP未来phone申込・格安旅行申込） ── */}
        <section>
          <SectionHeader en="SERVICES" ja="サービスメニュー"/>
          <div className="space-y-3">
            <VpPhoneButton/>
            <TravelSubButton ref={travelSubRef}/>
          </div>
        </section>

        {/* ── クイックアクセス（ライン系カード） ── */}
        <section>
          <SectionHeader en="QUICK ACCESS" ja="クイックアクセス"/>
          <div className="grid grid-cols-2 gap-3">
            {[
              {href:"/profile",d:"M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",label:"マイアカウント",color:ORANGE},
            ].map(item=>(
              <Link key={item.href} href={item.href}
                className="rounded-2xl p-4 flex items-center gap-3 transition-all hover:scale-[1.01] active:scale-95"
                style={{
                  background:`linear-gradient(145deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`,
                  border:`1px solid ${item.color}25`,
                  boxShadow:`0 4px 16px rgba(10,22,40,0.15)`
                }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.09)"}}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color:item.color}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.d}/>
                  </svg>
                </div>
                <p className="font-jp text-xs font-medium leading-tight whitespace-pre-line text-white/80">{item.label}</p>
              </Link>
            ))}
          </div>
        </section>



      </main>

      {/* ── ボトムナビ（ライト系サロンUI） ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30"
        style={{
          background:"rgba(245,240,232,0.97)",
          backdropFilter:"blur(20px) saturate(160%)",
          borderTop:`1px solid rgba(201,168,76,0.22)`,
          boxShadow:`0 -4px 24px rgba(10,22,40,0.08),0 -1px 0 rgba(255,255,255,0.80) inset`
        }}>
        <div className="max-w-md mx-auto flex items-end justify-around px-2 pt-2" style={{paddingBottom:"max(10px,env(safe-area-inset-bottom))"}}>
          {/* ホーム */}
          <Link href="/dashboard" className="flex flex-col items-center gap-1 py-1 px-3 group">
            <div className="w-6 h-6" style={{color:NAVY}}><HomeIcon/></div>
            <span className="font-label text-[7px] tracking-[0.15em]" style={{color:`${NAVY}60`}}>HOME</span>
          </Link>
          {/* メニュー */}
          <Link href="#mlm-menu" className="flex flex-col items-center gap-1 py-1 px-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color:`${NAVY}70`}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h8m-8 6h16"/>
            </svg>
            <span className="font-label text-[7px] tracking-[0.15em]" style={{color:`${NAVY}55`}}>MENU</span>
          </Link>
          {/* センタービグポイントボタン */}
          <Link href="/points/use" className="flex flex-col items-center -mt-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative overflow-hidden"
              style={{
                background:`linear-gradient(135deg,${GOLD} 0%,${ORANGE} 100%)`,
                border:`2px solid ${GOLD_LIGHT}55`,
                boxShadow:`0 8px 28px ${GOLD}45,0 4px 12px rgba(10,22,40,0.25)`
              }}>
              <div className="absolute inset-0 opacity-20" style={{background:"linear-gradient(135deg,rgba(255,255,255,0.5),transparent 60%)"}}/>
              <div className="w-7 h-7 relative z-10 text-white"><CoinIcon/></div>
            </div>
            <span className="font-label text-[7px] tracking-[0.15em] mt-1 font-semibold" style={{color:GOLD_DARK}}>POINT</span>
          </Link>
          {/* お知らせ */}
          <Link href="/announcements" className="flex flex-col items-center gap-1 py-1 px-3 relative">
            <div className="w-6 h-6" style={{color:`${NAVY}70`}}><BellIcon/></div>
            {unreadCount>0&&<span className="absolute top-0 right-1 bg-red-500 text-white text-[7px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">{unreadCount>9?"9+":unreadCount}</span>}
            <span className="font-label text-[7px] tracking-[0.15em]" style={{color:`${NAVY}55`}}>NEWS</span>
          </Link>
          {/* マイページ */}
          <Link href="/profile" className="flex flex-col items-center gap-1 py-1 px-3">
            <div className="w-6 h-6" style={{color:`${NAVY}70`}}><ProfileIcon/></div>
            <span className="font-label text-[7px] tracking-[0.15em]" style={{color:`${NAVY}55`}}>MY PAGE</span>
          </Link>
        </div>
      </nav>

    </div>
  );
}
