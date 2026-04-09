"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Link from "next/link";

interface User { id:string; name:string; memberCode:string; email:string; phone:string; availablePoints:number; }
interface DashboardPoints {
  mlmLastMonthPoints: number;
  mlmCurrentMonthPoints: number;
  savingsBonusPoints: number;
  mobileReferralPoints: number;
}
interface Announcement { id:string; title:string; content:string; tag:string; isPublished:boolean; publishedAt:string|null; }
interface Menu { id:string; title:string; subtitle?:string; iconType?:string; menuType?:string; linkUrl?:string; }

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
  early:    { 1: 2000, 2: 1700, 3: 1500, 4: 1200, 5: 1000 },
  standard: { 1: 3000, 2: 2700, 3: 2500, 4: 2000, 5: 1500 },
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

const TravelSubButton = forwardRef<{openModal:()=>void}>(function TravelSubButton(_,ref){
  const [travelSub,setTravelSub]=useState<TravelSubData|null>(null);
  const [showApplyModal,setShowApplyModal]=useState(false);
  useImperativeHandle(ref,()=>({openModal:()=>setShowApplyModal(true)}));
  const [applyForm,setApplyForm]=useState({memberCode:"",name:"",phone:"",email:"",level:1});
  const [applyError,setApplyError]=useState("");
  const [applying,setApplying]=useState(false);
  const [applyDone,setApplyDone]=useState(false);
  const loadSub=()=>{fetch("/api/my/travel-subscription").then(r=>r.json()).then(d=>setTravelSub(d)).catch(()=>setTravelSub({displayStatus:"none",sub:null}))};
  useEffect(()=>{loadSub();},[]);
  async function handleApply(e:React.FormEvent){
    e.preventDefault();
    if(!applyForm.name||!applyForm.phone||!applyForm.email){setApplyError("氏名・電話番号・メールアドレスは必須です");return;}
    setApplying(true);setApplyError("");
    try{
      const res=await fetch("/api/contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:applyForm.name,phone:applyForm.phone,email:applyForm.email,content:`【格安旅行申込】\n会員コード: ${applyForm.memberCode||"未入力"}\n氏名: ${applyForm.name}\n電話番号: ${applyForm.phone}\nメール: ${applyForm.email}\n現在レベル: Lv${applyForm.level}（¥${TRAVEL_FEES.early[applyForm.level].toLocaleString()}/月）\n\n※支払日：毎月15日\n※お支払い方法：銀行振込のみ`,menuTitle:"格安旅行申込"})});
      if(res.ok){setApplyDone(true);}else{const d=await res.json().catch(()=>null);setApplyError(d?.error||"申込に失敗しました。");}
    }catch{setApplyError("通信エラーが発生しました。");}
    setApplying(false);
  }
  const FORCE_STYLE:Record<string,{label:string;dot:string}>={forced_active:{label:"✨ 特別アクティブ",dot:"bg-cyan-400"},forced_inactive:{label:"⏸ 一時停止中",dot:"bg-orange-400"}};
  const DISPLAY_STATUS_DOT:Record<string,{label:string;dot:string}>={active:{label:"アクティブ",dot:"bg-emerald-400"},inactive:{label:"非アクティブ",dot:"bg-white/30"},none:{label:"未登録",dot:"bg-white/20"},pending:{label:"申込中",dot:"bg-amber-400"},canceled:{label:"退会済み",dot:"bg-red-400"},suspended:{label:"支払い待ち",dot:"bg-amber-400"}};
  if(!travelSub) return (
    <NavyCard className="p-4 flex items-center gap-3">
      <NavyIconBox color="#93c5fd"><PlaneIcon/></NavyIconBox>
      <div className="flex-1"><p className="font-jp font-semibold text-sm text-white">格安旅行</p><p className="text-xs mt-0.5 animate-pulse" style={{color:`${GOLD}80`}}>読み込み中...</p></div>
    </NavyCard>
  );
  const {sub}=travelSub;
  const lv=sub?.level??1;
  const forceStyle=sub?.forceStatus&&sub.forceStatus!=="none"?FORCE_STYLE[sub.forceStatus]:null;
  let statusDot="bg-white/20",statusLabel="未登録";
  if(forceStyle){statusDot=forceStyle.dot;statusLabel=forceStyle.label;}
  else if(sub){const ds=DISPLAY_STATUS_DOT[sub.status]??DISPLAY_STATUS_DOT[travelSub.displayStatus];statusDot=ds.dot;statusLabel=ds.label;}
  return(
    <>
      <button type="button" onClick={()=>setShowApplyModal(true)} className="w-full text-left">
        <NavyCard className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <NavyIconBox color="#93c5fd"><PlaneIcon/></NavyIconBox>
              <div><p className="font-jp font-semibold text-sm text-white">格安旅行</p>{sub?<p className="text-xs mt-0.5" style={{color:GOLD}}>{sub.planName} · ¥{sub.monthlyFee.toLocaleString()}/月</p>:<p className="text-xs mt-0.5" style={{color:GOLD}}>タップして詳細・申込</p>}</div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {sub&&<span className="rounded-full text-xs font-bold px-2.5 py-0.5 font-label" style={{background:`${GOLD}25`,color:GOLD_LIGHT,border:`1px solid ${GOLD}50`}}>Lv{lv}</span>}
              <span className="flex items-center gap-1.5 text-xs text-white/55"><span className={`w-2 h-2 rounded-full ${statusDot}`}/>{statusLabel}</span>
            </div>
          </div>
        </NavyCard>
      </button>
      {showApplyModal&&(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{background:"rgba(10,22,40,0.88)",backdropFilter:"blur(4px)"}}
          onClick={()=>{setShowApplyModal(false);setApplyDone(false);setApplyError("");}}>
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
            style={{background:`linear-gradient(155deg,${NAVY_CARD} 0%,${NAVY_CARD2} 60%,${NAVY_CARD3} 100%)`,border:`1px solid ${GOLD}35`,boxShadow:`0 -8px 40px rgba(10,22,40,0.40),0 0 0 1px ${GOLD}10`,maxHeight:"92vh"}}
            onClick={e=>e.stopPropagation()}>
            {/* ゴールドグラデーションライン */}
            <div className="h-0.5 flex-shrink-0" style={{background:`linear-gradient(90deg,transparent,${GOLD}90,${GOLD_LIGHT},${GOLD}90,transparent)`}}/>
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{borderBottom:`1px solid ${GOLD}15`}}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:"rgba(147,197,253,0.12)",border:"1px solid rgba(147,197,253,0.25)"}}>
                  <span className="w-5 h-5 text-sky-300"><PlaneIcon/></span>
                </div>
                <div>
                  <p className="text-[9px] font-label tracking-[0.22em]" style={{color:`${GOLD}65`}}>TRAVEL SERVICE</p>
                  <h2 className="font-jp font-semibold text-white text-sm leading-tight">格安旅行</h2>
                </div>
              </div>
              <button onClick={()=>{setShowApplyModal(false);setApplyDone(false);setApplyError("");}}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition"
                style={{background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.45)"}}>✕</button>
            </div>
            {/* コンテンツ */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 pb-10">
              {/* 現在のプラン（契約済みの場合） */}
              {sub&&(
                <div className="rounded-2xl p-4" style={{background:`${GOLD}10`,border:`1px solid ${GOLD}30`}}>
                  <p className="text-[9px] font-label tracking-widest mb-2" style={{color:`${GOLD}60`}}>CURRENT PLAN</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white font-jp text-sm">{sub.planName}</p>
                      <p className="text-sm font-bold mt-0.5" style={{color:GOLD}}>¥{sub.monthlyFee.toLocaleString()}/月</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="rounded-full text-xs font-bold px-2.5 py-0.5 font-label" style={{background:`${GOLD}22`,color:GOLD_LIGHT,border:`1px solid ${GOLD}45`}}>Lv{lv}</span>
                      <span className="flex items-center gap-1.5 text-xs" style={{color:"rgba(255,255,255,0.50)"}}>
                        <span className={`w-2 h-2 rounded-full ${statusDot}`}/>{statusLabel}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {/* 料金プラン一覧 */}
              <div className="rounded-2xl p-4" style={{background:NAVY_CARD2,border:`1px solid ${GOLD}18`}}>
                <p className="text-[9px] font-label tracking-[0.22em] mb-3 font-bold" style={{color:GOLD}}>PRICE PLAN</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3" style={{background:`${GOLD}10`,border:`1px solid ${GOLD}28`}}>
                    <p className="text-[10px] font-bold mb-2" style={{color:GOLD_LIGHT}}>🌟 先着50名まで</p>
                    {[1,2,3,4,5].map(l=>(
                      <div key={l} className="flex justify-between text-xs py-0.5" style={{borderBottom:l<5?`1px solid ${GOLD}10`:"none"}}>
                        <span className="font-label font-bold" style={{color:GOLD}}>Lv{l}</span>
                        <span className="font-semibold text-white">¥{TRAVEL_FEES.early[l].toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl p-3" style={{background:"rgba(20,50,100,0.55)",border:"1px solid rgba(100,150,240,0.22)"}}>
                    <p className="text-[10px] font-bold mb-2 text-sky-300">51名以降</p>
                    {[1,2,3,4,5].map(l=>(
                      <div key={l} className="flex justify-between text-xs py-0.5" style={{borderBottom:l<5?"1px solid rgba(100,150,240,0.10)":"none"}}>
                        <span className="font-label font-bold text-sky-300">Lv{l}</span>
                        <span className="font-semibold text-white">¥{TRAVEL_FEES.standard[l].toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[9px] mt-2" style={{color:"rgba(255,255,255,0.30)"}}>※支払日：毎月15日　※お支払い方法：銀行振込のみ</p>
              </div>
              {/* 申込フォーム（未契約かつ未完了） */}
              {!sub&&!applyDone&&(
                <div className="rounded-2xl p-4" style={{background:NAVY_CARD2,border:`1px solid ${GOLD}15`}}>
                  <p className="text-[9px] font-label tracking-[0.22em] mb-3" style={{color:`${GOLD}70`}}>APPLICATION FORM</p>
                  <p className="text-sm font-jp font-semibold mb-3 text-white">格安旅行に申し込む</p>
                  <form onSubmit={handleApply} className="space-y-3">
                    {[
                      {label:"会員ID（任意）",type:"text",key:"memberCode",placeholder:"例: M0001",required:false},
                      {label:"氏名",type:"text",key:"name",placeholder:"山田 太郎",required:true},
                      {label:"電話番号",type:"tel",key:"phone",placeholder:"090-1234-5678",required:true},
                      {label:"メールアドレス",type:"email",key:"email",placeholder:"example@email.com",required:true}
                    ].map(f=>(
                      <div key={f.key}>
                        <label className="block text-xs font-semibold mb-1" style={{color:`${GOLD}80`}}>
                          {f.label}{f.required&&<span className="text-red-400 ml-1">*</span>}
                        </label>
                        <input required={f.required} type={f.type}
                          className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none border focus:ring-1"
                          style={{background:"rgba(255,255,255,0.05)",borderColor:`${GOLD}22`}}
                          placeholder={f.placeholder}
                          value={(applyForm as Record<string,string|number>)[f.key] as string}
                          onChange={e=>setApplyForm({...applyForm,[f.key]:e.target.value})}/>
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{color:`${GOLD}80`}}>
                        現在の自身のレベル<span className="text-red-400 ml-1">*</span>
                      </label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[1,2,3,4,5].map(l=>(
                          <button key={l} type="button" onClick={()=>setApplyForm({...applyForm,level:l})}
                            className="rounded-xl border py-2 text-center transition-all"
                            style={applyForm.level===l
                              ?{borderColor:GOLD,background:`${GOLD}22`,color:"white",borderWidth:"1.5px"}
                              :{borderColor:"rgba(255,255,255,0.10)",background:"rgba(255,255,255,0.03)",color:"rgba(255,255,255,0.40)"}}>
                            <div className="text-xs font-bold font-label">Lv{l}</div>
                            <div className="text-[9px] mt-0.5">¥{TRAVEL_FEES.early[l].toLocaleString()}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    {applyError&&(
                      <p className="text-xs rounded-xl px-3 py-2" style={{background:"rgba(239,68,68,0.10)",border:"1px solid rgba(239,68,68,0.25)",color:"#fca5a5"}}>{applyError}</p>
                    )}
                    <button type="submit" disabled={applying}
                      className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-95"
                      style={{background:`linear-gradient(135deg,${GOLD_DARK},${GOLD},${GOLD_LIGHT})`}}>
                      {applying?"申込中...":"✈️ 格安旅行に申し込む"}
                    </button>
                  </form>
                </div>
              )}
              {/* 申込完了 */}
              {applyDone&&(
                <div className="rounded-2xl p-5 text-center" style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(52,211,153,0.22)"}}>
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="font-semibold text-sm font-jp mb-1" style={{color:"#6ee7b7"}}>申し込みを受け付けました！</p>
                  <p className="text-xs mb-4" style={{color:"rgba(52,211,153,0.70)"}}>担当者より銀行振込先などのご案内をお送りします。</p>
                  <button onClick={()=>{setShowApplyModal(false);setApplyDone(false);}}
                    className="rounded-xl px-5 py-2 text-sm font-semibold text-white"
                    style={{background:"linear-gradient(135deg,#10b981,#34d399)"}}>閉じる</button>
                </div>
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
    mlmLastMonthPoints: 0, mlmCurrentMonthPoints: 0, savingsBonusPoints: 0, mobileReferralPoints: 0
  });
  const travelSubRef = useRef<{openModal:()=>void}>(null);

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
    {href:"/org-chart",           d:"M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",label:"組織図",        color:"#86efac"},
    {href:"/mlm-status",          d:"M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",label:"状況",          color:"#c4b5fd"},
    {href:"/mlm-referrer-list",   d:"M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",label:"紹介者\n一覧", color:"#a5b4fc"},
    {href:"/referral",            d:"M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4 2 2 0 010 4zm14 0a2 2 0 110-4 2 2 0 010 4z",label:"お友達\n紹介",  color:"#fdba74"},
  ];

  const drawerItems = [
    {href:"/mlm-registration",label:"登録情報",d:"M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"},
    {href:"/dashboard",label:"ホーム",d:"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"},
    {href:"#mlm-menu",label:"MLMメニュー",d:"M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"},
    {href:"/mlm-org-chart",label:"MLM組織図",d:"M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"},
    {href:"#menu",label:"福利厚生メニュー",d:"M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"},
    {href:"/vp-phone-referrals",label:"VP未来phone\n紹介ツリー",d:"M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"},
    {href:"/travel-referrals",label:"旅行紹介ツリー",d:"M12 19l9 2-9-18-9 18 9-2zm0 0v-8"},
    {href:"/points/use",label:"ポイントを使う",d:"M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"},
    {href:"/points/history",label:"ポイント履歴",d:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"},
    {href:"/announcements",label:"お知らせ",d:"M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"},
    {href:"/referral",label:"お友達紹介",d:"M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4 2 2 0 010 4zm14 0a2 2 0 110-4 2 2 0 010 4z"},
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
            <div className="grid grid-cols-2 gap-2">
              {[
                {label:"先月ポイント",sub:"MLM",value:dashboardPoints.mlmLastMonthPoints,unit:"VPpt",from:GOLD,to:GOLD_LIGHT},
                {label:"今月ポイント",sub:"MLM",value:dashboardPoints.mlmCurrentMonthPoints,unit:"VPpt",from:ORANGE,to:"#f4a060"},
                {label:"貯金ボーナス",sub:"SAV",value:dashboardPoints.savingsBonusPoints,unit:"pt",from:"#34d399",to:"#6ee7b7"},
                {label:"携帯紹介",sub:"MPI",value:dashboardPoints.mobileReferralPoints,unit:"pt",from:"#818cf8",to:"#a78bfa"},
              ].map(item=>(
                <div key={item.label} className="rounded-xl p-3" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.06)"}}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <div>
                      <p className="font-label text-[7px] tracking-[0.18em]" style={{color:`${item.from}70`}}>{item.sub}</p>
                      <p className="font-jp text-[11px]" style={{color:"rgba(255,255,255,0.50)"}}>{item.label}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-white">{item.value.toLocaleString()}</span>
                      <span className="text-[9px] ml-0.5" style={{color:`${item.from}70`}}>{item.unit}</span>
                    </div>
                  </div>
                  <div className="h-0.5 rounded-full" style={{background:"rgba(255,255,255,0.08)"}}>
                    <div className="h-0.5 rounded-full transition-all duration-700" style={{width:`${Math.min((item.value/10000)*100,100)}%`,background:`linear-gradient(90deg,${item.from},${item.to})`}}/>
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

              if(m.menuType==="contact") return (
                <a key={m.id} href="/contact" className="rounded-2xl overflow-hidden transition-all hover:scale-[1.03] active:scale-95" style={cardStyle}>{cardContent}</a>
              );
              if(m.menuType==="used_car") return (
                <a key={m.id} href="/used-cars" className="rounded-2xl overflow-hidden transition-all hover:scale-[1.03] active:scale-95" style={cardStyle}>{cardContent}</a>
              );
              if(isVpPhone) return (
                <a key={m.id} href="/vp-phone" className="rounded-2xl overflow-hidden transition-all hover:scale-[1.03] active:scale-95" style={cardStyle}>{cardContent}</a>
              );
              if(isTravel) return (
                <button key={m.id} onClick={()=>travelSubRef.current?.openModal()} className="w-full rounded-2xl overflow-hidden transition-all hover:scale-[1.03] active:scale-95 text-left" style={cardStyle}>{cardContent}</button>
              );
              const href=m.linkUrl??"#";
              const isInternal=href.startsWith("/");
              return (
                <a key={m.id} href={href} target={isInternal?undefined:"_blank"} rel={isInternal?undefined:"noopener noreferrer"} className="rounded-2xl overflow-hidden transition-all hover:scale-[1.03] active:scale-95" style={cardStyle}>{cardContent}</a>
              );
            })}
          </div>
        </section>

        {/* ── VP Phone / Travel Sub カード ── */}
        <section>
          <SectionHeader en="SERVICES" ja="サービス"/>
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
              {href:"/points/history",d:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",label:"ポイント履歴",color:GOLD},
              {href:"/profile",d:"M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",label:"マイアカウント",color:ORANGE},
              {href:"/mlm-org-chart",d:"M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",label:"MLM組織図",color:"#34d399"},
              {href:"/travel-referrals",d:"M12 19l9 2-9-18-9 18 9-2zm0 0v-8",label:"旅行紹介ツリー",color:"#a5b4fc"},
              {href:"/vp-phone-referrals",d:"M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",label:"VP未来phone\n紹介ツリー",color:"#6ee7b7"},
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

        {/* TravelSubButton 非表示（参照のみ） */}
        <div className="hidden"><TravelSubButton/></div>

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
