"use client"

import { useState, useEffect, useCallback } from "react"

// ─── 型定義 ──────────────────────────────────────────────────────────────────

interface DistItem  { label: string; count: number }
interface LevelItem { level: number; count: number }
interface TrendItem { month: string; count: number }
interface AutoshipTrendItem { month: string; retentionRate: number; activeCount: number }

interface MonthlyStats {
  period: { year: number; month: number; label: string }
  snapshot: {
    totalMembers:     number
    activeMembers:    number
    newMembers:       number
    suspendedMembers: number
    inactiveMembers:  number
  }
  ageDistribution:           DistItem[]
  genderDistribution:        DistItem[]
  prefectureDistribution:    DistItem[]
  levelDistribution:         LevelItem[]
  memberTypeDistribution:    DistItem[]
  paymentMethodDistribution: DistItem[]
  autoshipStats: {
    activeCount:         number
    retentionRate:       number
    suspendedThisMonth:  number
    suspendRate:         number
    newStartThisMonth:   number
    stoppedThisMonth:    number
  }
  bonusSummary: {
    recipientCount: number
    totalAmount:    number
    avgAmount:      number
  }
  registrationTrend: TrendItem[]
  retentionTrend:    TrendItem[]
  autoshipTrend:     AutoshipTrendItem[]
}

// ─── カラーパレット ──────────────────────────────────────────────────────────

const GOLD   = "#c9a84c"
const NAVY   = "#0a1628"
const NAVY2  = "#162c50"
const VIOLET = "#8b7cf8"
const EMERALD = "#34d399"
const SKY   = "#60a5fa"
const ROSE  = "#f87171"
const AMBER = "#fbbf24"

// ─── 簡易棒グラフ ─────────────────────────────────────────────────────────────

function BarChart({
  data, colorFn, maxWidth = 280,
}: {
  data: { label: string; count: number }[]
  colorFn?: (i: number, label: string) => string
  maxWidth?: number
}) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="w-20 text-right text-xs shrink-0" style={{ color: "#78716c" }}>{d.label}</span>
          <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: "rgba(201,168,76,0.07)", maxWidth }}>
            <div
              className="h-full rounded-lg transition-all duration-700"
              style={{
                width: `${(d.count / max) * 100}%`,
                background: colorFn ? colorFn(i, d.label) : GOLD,
                minWidth: d.count > 0 ? "4px" : "0",
              }}
            />
          </div>
          <span className="w-10 text-xs font-bold shrink-0" style={{ color: NAVY }}>{d.count}</span>
        </div>
      ))}
    </div>
  )
}

// ─── 簡易折れ線チャート（SVG） ────────────────────────────────────────────────

function LineChart({
  data, color = GOLD, height = 80, showDot = true,
}: {
  data: number[]
  color?: string
  height?: number
  showDot?: boolean
}) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 440
  const h = height
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * (w - 20) + 10,
    y: h - 10 - ((v - min) / range) * (h - 20),
  }))
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
  const fill = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
    + ` L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`lg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#lg-${color.replace('#','')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {showDot && pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
    </svg>
  )
}

// ─── KPI カード ──────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color = GOLD, icon,
}: {
  label: string; value: string | number; sub?: string; color?: string; icon: string
}) {
  return (
    <div
      className="rounded-2xl bg-white p-5 flex items-start gap-4"
      style={{ border: "1px solid rgba(201,168,76,0.12)", boxShadow: "0 2px 12px rgba(10,22,40,0.05)" }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}
      >
        <i className={icon} style={{ color, fontSize: 16 }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide" style={{ color: "#78716c" }}>{label}</p>
        <p className="text-2xl font-bold mt-0.5 leading-none" style={{ color: NAVY }}>{value}</p>
        {sub && <p className="text-xs mt-1" style={{ color: "#a8a29e" }}>{sub}</p>}
      </div>
    </div>
  )
}

// ─── セクションタイトル ──────────────────────────────────────────────────────

function SectionHead({ title, icon, accent = GOLD }: { title: string; icon: string; accent?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-1 h-5 rounded-full" style={{ background: accent }} />
      <i className={icon} style={{ color: accent, fontSize: 14 }} />
      <h3 className="text-sm font-bold tracking-wide" style={{ color: NAVY }}>{title}</h3>
    </div>
  )
}

// ─── パイグラフ（簡易 SVG） ──────────────────────────────────────────────────

const PIE_COLORS = [GOLD, VIOLET, EMERALD, SKY, ROSE, AMBER, "#a78bfa", "#86efac"]

function PieChart({ data }: { data: { label: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <p className="text-sm text-stone-400 text-center py-4">データなし</p>

  let cumulative = 0
  const size = 120
  const cx = size / 2, cy = size / 2, r = 45, innerR = 24

  const slices = data.filter(d => d.count > 0).map((d, i) => {
    const pct = d.count / total
    const startAngle = cumulative * Math.PI * 2 - Math.PI / 2
    cumulative += pct
    const endAngle = cumulative * Math.PI * 2 - Math.PI / 2
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle),   y2 = cy + r * Math.sin(endAngle)
    const ix1 = cx + innerR * Math.cos(startAngle), iy1 = cy + innerR * Math.sin(startAngle)
    const ix2 = cx + innerR * Math.cos(endAngle),   iy2 = cy + innerR * Math.sin(endAngle)
    const largeArc = pct > 0.5 ? 1 : 0
    const path = `M${ix1},${iy1} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} L${ix2},${iy2} A${innerR},${innerR} 0 ${largeArc} 0 ${ix1},${iy1} Z`
    return { path, color: PIE_COLORS[i % PIE_COLORS.length], label: d.label, count: d.count, pct }
  })

  return (
    <div className="flex items-center gap-4">
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: 120, height: 120, flexShrink: 0 }}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity="0.9" />
        ))}
      </svg>
      <div className="flex-1 space-y-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="flex-1 truncate" style={{ color: "#44403c" }}>{s.label}</span>
            <span className="font-bold" style={{ color: NAVY }}>{s.count}</span>
            <span style={{ color: "#a8a29e" }}>({Math.round(s.pct * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 都道府県ヒートマップ風テーブル ─────────────────────────────────────────

function PrefectureTable({ data }: { data: DistItem[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const top = data.slice(0, 20)
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {top.map(d => (
        <div
          key={d.label}
          className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs"
          style={{
            background: `rgba(201,168,76,${0.04 + (d.count / max) * 0.2})`,
            border: `1px solid rgba(201,168,76,${0.06 + (d.count / max) * 0.15})`,
          }}
        >
          <span style={{ color: "#44403c" }}>{d.label}</span>
          <span className="font-bold ml-2" style={{ color: NAVY }}>{d.count}</span>
        </div>
      ))}
    </div>
  )
}

// ─── オートシップ進捗リング ──────────────────────────────────────────────────

function RetentionRing({ rate, label, color = GOLD }: { rate: number; label: string; color?: string }) {
  const r = 38, cx = 50, cy = 50
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - rate / 100)
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 100" style={{ width: 96, height: 96 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(201,168,76,0.1)" strokeWidth="8" />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="middle"
          fontSize="18" fontWeight="bold" fill={NAVY}>{rate}%</text>
      </svg>
      <p className="text-xs font-semibold text-center" style={{ color: "#78716c" }}>{label}</p>
    </div>
  )
}

// ─── メインコンポーネント ─────────────────────────────────────────────────────

export default function MlmStatsPage() {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [stats, setStats] = useState<MonthlyStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "age" | "gender" | "region" | "autoship" | "trend" | "bonus">("overview")

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/mlm-stats/monthly?year=${year}&month=${month}`)
      if (!res.ok) throw new Error(await res.text())
      setStats(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "データ取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { fetchStats() }, [fetchStats])

  // 月を進める / 戻す
  const shiftMonth = (delta: number) => {
    let m = month + delta, y = year
    if (m < 1)  { m += 12; y-- }
    if (m > 12) { m -= 12; y++ }
    setMonth(m); setYear(y)
  }

  const TABS = [
    { id: "overview", label: "概要",     icon: "fas fa-th-large",      color: GOLD    },
    { id: "age",      label: "年齢",     icon: "fas fa-birthday-cake",  color: VIOLET  },
    { id: "gender",   label: "性別",     icon: "fas fa-venus-mars",     color: EMERALD },
    { id: "region",   label: "地域",     icon: "fas fa-map-marker-alt", color: SKY     },
    { id: "autoship", label: "オートシップ", icon: "fas fa-sync",       color: AMBER   },
    { id: "trend",    label: "推移",     icon: "fas fa-chart-line",     color: ROSE    },
    { id: "bonus",    label: "ボーナス", icon: "fas fa-yen-sign",       color: GOLD    },
  ] as const

  return (
    <div className="space-y-6">

      {/* ── ページヘッダー ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-1"
            style={{ color: GOLD, fontFamily: "var(--font-josefin), 'Arial Narrow', sans-serif", letterSpacing: "0.15em" }}
          >
            MLM Management
          </p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>
            MLM 月次統計
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#78716c" }}>
            会員属性・オートシップ継続率・ボーナス支払いの月次レポート
          </p>
        </div>
        {/* 月選択 */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-2xl"
          style={{ background: "white", border: "1px solid rgba(201,168,76,0.18)", boxShadow: "0 2px 8px rgba(10,22,40,0.06)" }}
        >
          <button
            onClick={() => shiftMonth(-1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: "rgba(201,168,76,0.08)" }}
          >
            <i className="fas fa-chevron-left text-xs" style={{ color: GOLD }} />
          </button>
          <div className="flex gap-2 items-center">
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="text-sm font-bold border-0 outline-none bg-transparent"
              style={{ color: NAVY }}
            >
              {Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i).map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="text-sm font-bold border-0 outline-none bg-transparent"
              style={{ color: NAVY }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => shiftMonth(1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: "rgba(201,168,76,0.08)" }}
            disabled={year === now.getFullYear() && month === now.getMonth() + 1}
          >
            <i className="fas fa-chevron-right text-xs" style={{ color: GOLD }} />
          </button>
          <button
            onClick={fetchStats}
            className="ml-1 w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: "rgba(201,168,76,0.08)" }}
          >
            <i className={`fas fa-sync-alt text-xs ${loading ? "animate-spin" : ""}`} style={{ color: GOLD }} />
          </button>
        </div>
      </div>

      {/* ── エラー ── */}
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
          <i className="fas fa-exclamation-circle mr-2" />{error}
        </div>
      )}

      {/* ── ローディング ── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-2xl mb-3" style={{ color: GOLD }} />
            <p className="text-sm" style={{ color: "#78716c" }}>統計データを読み込んでいます...</p>
          </div>
        </div>
      )}

      {/* ── メインコンテンツ ── */}
      {!loading && stats && (
        <>
          {/* KPI カード */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <KpiCard label="総会員数"     value={stats.snapshot.totalMembers.toLocaleString()}   icon="fas fa-users"       color={NAVY}    />
            <KpiCard label="アクティブ"   value={stats.snapshot.activeMembers.toLocaleString()}  icon="fas fa-user-check"  color={EMERALD} />
            <KpiCard label="今月新規"     value={stats.snapshot.newMembers.toLocaleString()}      icon="fas fa-user-plus"   color={VIOLET}  sub="当月登録数" />
            <KpiCard label="一時停止"     value={stats.snapshot.suspendedMembers.toLocaleString()} icon="fas fa-pause-circle" color={AMBER} />
            <KpiCard label="オートシップ率" value={`${stats.autoshipStats.retentionRate}%`}       icon="fas fa-sync"        color={GOLD}    sub={`${stats.autoshipStats.activeCount}名有効`} />
          </div>

          {/* タブナビゲーション */}
          <div
            className="flex gap-1 overflow-x-auto pb-0 -mb-px"
            style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}
          >
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 border-b-2 -mb-px"
                style={activeTab === t.id
                  ? { borderColor: t.color, color: t.color, background: `${t.color}0d` }
                  : { borderColor: "transparent", color: "#78716c" }
                }
              >
                <i className={t.icon} style={{ fontSize: 11 }} />
                {t.label}
              </button>
            ))}
          </div>

          {/* タブコンテンツ */}
          <div
            className="rounded-2xl bg-white p-6"
            style={{ border: "1px solid rgba(201,168,76,0.12)", boxShadow: "0 4px 20px rgba(10,22,40,0.06)" }}
          >
            {/* 概要タブ */}
            {activeTab === "overview" && (
              <div className="space-y-8">
                <SectionHead title="会員サマリー" icon="fas fa-users" accent={GOLD} />
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <p className="text-xs font-semibold mb-3" style={{ color: "#78716c" }}>会員種別</p>
                    <PieChart data={stats.memberTypeDistribution} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-3" style={{ color: "#78716c" }}>支払い方法</p>
                    <PieChart data={stats.paymentMethodDistribution} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-3" style={{ color: "#78716c" }}>レベル分布</p>
                  <BarChart
                    data={stats.levelDistribution.map(d => ({
                      label: d.level === 0 ? "無" : `LV${d.level}`,
                      count: d.count,
                    }))}
                    colorFn={i => [GOLD, VIOLET, EMERALD, SKY, ROSE, AMBER][i % 6]}
                  />
                </div>
              </div>
            )}

            {/* 年齢タブ */}
            {activeTab === "age" && (
              <div className="space-y-6">
                <SectionHead title="年齢分布" icon="fas fa-birthday-cake" accent={VIOLET} />
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <BarChart
                      data={stats.ageDistribution}
                      colorFn={i => [VIOLET, "#a78bfa", GOLD, EMERALD, SKY, AMBER, ROSE, "#94a3b8"][i % 8]}
                      maxWidth={320}
                    />
                  </div>
                  <div>
                    <PieChart data={stats.ageDistribution.filter(d => d.count > 0)} />
                  </div>
                </div>
              </div>
            )}

            {/* 性別タブ */}
            {activeTab === "gender" && (
              <div className="space-y-6">
                <SectionHead title="性別分布" icon="fas fa-venus-mars" accent={EMERALD} />
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <PieChart data={stats.genderDistribution.filter(d => d.count > 0)} />
                  </div>
                  <div className="flex flex-col gap-3">
                    {stats.genderDistribution.map(d => (
                      <div
                        key={d.label}
                        className="flex items-center justify-between p-4 rounded-xl"
                        style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}
                      >
                        <div className="flex items-center gap-2">
                          <i
                            className={d.label === "男性" ? "fas fa-mars" : d.label === "女性" ? "fas fa-venus" : "fas fa-genderless"}
                            style={{ color: EMERALD, fontSize: 18 }}
                          />
                          <span className="font-semibold text-sm" style={{ color: NAVY }}>{d.label}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold" style={{ color: NAVY }}>{d.count.toLocaleString()}</p>
                          <p className="text-xs" style={{ color: "#78716c" }}>
                            {stats.snapshot.totalMembers > 0
                              ? `${Math.round((d.count / stats.snapshot.totalMembers) * 100)}%`
                              : "-"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 地域タブ */}
            {activeTab === "region" && (
              <div className="space-y-6">
                <SectionHead title="地域分布（都道府県）" icon="fas fa-map-marker-alt" accent={SKY} />
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <p className="text-xs font-semibold mb-3" style={{ color: "#78716c" }}>上位10都道府県</p>
                    <BarChart
                      data={stats.prefectureDistribution.slice(0, 10)}
                      colorFn={() => SKY}
                      maxWidth={300}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-3" style={{ color: "#78716c" }}>全都道府県（上位20）</p>
                    <PrefectureTable data={stats.prefectureDistribution} />
                  </div>
                </div>
              </div>
            )}

            {/* オートシップタブ */}
            {activeTab === "autoship" && (
              <div className="space-y-8">
                <SectionHead title="オートシップ統計" icon="fas fa-sync" accent={AMBER} />
                <div className="flex flex-wrap gap-8 justify-center">
                  <RetentionRing
                    rate={stats.autoshipStats.retentionRate}
                    label="オートシップ継続率"
                    color={GOLD}
                  />
                  <RetentionRing
                    rate={100 - stats.autoshipStats.retentionRate}
                    label="未加入率"
                    color="#e2d5c3"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "有効会員数",     value: stats.autoshipStats.activeCount,         color: GOLD,    icon: "fas fa-sync"          },
                    { label: "今月新規開始",   value: stats.autoshipStats.newStartThisMonth,    color: EMERALD, icon: "fas fa-play-circle"   },
                    { label: "今月停止",       value: stats.autoshipStats.stoppedThisMonth,     color: ROSE,    icon: "fas fa-stop-circle"   },
                    { label: "今月一時停止",   value: stats.autoshipStats.suspendedThisMonth,   color: AMBER,   icon: "fas fa-pause-circle"  },
                    { label: "一時停止率",     value: `${stats.autoshipStats.suspendRate}%`,    color: "#94a3b8", icon: "fas fa-percentage" },
                    { label: "アクティブ総数", value: stats.snapshot.activeMembers,             color: VIOLET,  icon: "fas fa-users"         },
                  ].map(item => (
                    <div
                      key={item.label}
                      className="rounded-xl p-4 flex items-center gap-3"
                      style={{ background: `${item.color}08`, border: `1px solid ${item.color}20` }}
                    >
                      <i className={item.icon} style={{ color: item.color, fontSize: 20 }} />
                      <div>
                        <p className="text-xs" style={{ color: "#78716c" }}>{item.label}</p>
                        <p className="text-xl font-bold" style={{ color: NAVY }}>{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: "#78716c" }}>オートシップ継続率 推移（過去12ヶ月）</p>
                  <div className="text-xs flex justify-between mb-1" style={{ color: "#a8a29e" }}>
                    {stats.autoshipTrend.map(d => <span key={d.month}>{d.month.slice(5)}</span>)}
                  </div>
                  <LineChart data={stats.autoshipTrend.map(d => d.retentionRate)} color={GOLD} height={90} />
                </div>
              </div>
            )}

            {/* 推移タブ */}
            {activeTab === "trend" && (
              <div className="space-y-8">
                <SectionHead title="月別推移（過去12ヶ月）" icon="fas fa-chart-line" accent={ROSE} />
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: "#78716c" }}>月別新規登録数</p>
                  <div className="text-xs flex justify-between mb-1" style={{ color: "#a8a29e" }}>
                    {stats.registrationTrend.map(d => <span key={d.month}>{d.month.slice(5)}</span>)}
                  </div>
                  <LineChart data={stats.registrationTrend.map(d => d.count)} color={VIOLET} height={100} />
                  <div className="mt-2 grid grid-cols-12 gap-0.5">
                    {stats.registrationTrend.map(d => (
                      <div key={d.month} className="text-center">
                        <p className="text-[10px] font-bold" style={{ color: NAVY }}>{d.count}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: "#78716c" }}>アクティブ会員数 推移</p>
                  <div className="text-xs flex justify-between mb-1" style={{ color: "#a8a29e" }}>
                    {stats.retentionTrend.map(d => <span key={d.month}>{d.month.slice(5)}</span>)}
                  </div>
                  <LineChart data={stats.retentionTrend.map(d => d.count)} color={EMERALD} height={100} />
                </div>
              </div>
            )}

            {/* ボーナスタブ */}
            {activeTab === "bonus" && (
              <div className="space-y-6">
                <SectionHead title={`ボーナスサマリー（${year}年${month}月）`} icon="fas fa-yen-sign" accent={GOLD} />
                <div className="grid grid-cols-3 gap-4">
                  <KpiCard
                    label="受取人数"
                    value={stats.bonusSummary.recipientCount.toLocaleString() + " 名"}
                    icon="fas fa-users"
                    color={VIOLET}
                  />
                  <KpiCard
                    label="総支払額"
                    value={"¥" + stats.bonusSummary.totalAmount.toLocaleString()}
                    icon="fas fa-yen-sign"
                    color={GOLD}
                  />
                  <KpiCard
                    label="平均支払額"
                    value={"¥" + stats.bonusSummary.avgAmount.toLocaleString()}
                    icon="fas fa-chart-bar"
                    color={EMERALD}
                  />
                </div>
                {stats.bonusSummary.recipientCount === 0 && (
                  <div className="text-center py-10">
                    <i className="fas fa-info-circle text-3xl mb-3" style={{ color: "#d6cfca" }} />
                    <p className="text-sm" style={{ color: "#a8a29e" }}>
                      {year}年{month}月のボーナスデータがありません
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#c4b9b0" }}>
                      ボーナス計算が未実行、またはデータが登録されていません
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── データなし ── */}
      {!loading && !stats && !error && (
        <div className="text-center py-20">
          <i className="fas fa-chart-bar text-4xl mb-4" style={{ color: "#d6cfca" }} />
          <p className="text-sm" style={{ color: "#a8a29e" }}>統計データを取得できませんでした</p>
        </div>
      )}
    </div>
  )
}
