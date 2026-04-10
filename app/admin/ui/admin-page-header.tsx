/**
 * AdminPageHeader - 管理画面共通ページヘッダーコンポーネント
 * 統一されたサロン風スタイリッシュデザイン
 */

interface AdminPageHeaderProps {
  category?: string          // 上部の小文字カテゴリ（例: "Member Management"）
  title: string              // メインタイトル
  description?: string       // サブタイトル・説明文
  actions?: React.ReactNode  // 右側のアクションボタン群
  accent?: string            // アクセントカラー（デフォルト: ゴールド）
}

export function AdminPageHeader({
  category,
  title,
  description,
  actions,
  accent = "#c9a84c",
}: AdminPageHeaderProps) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
      <div>
        {category && (
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: accent }}>
            {category}
          </p>
        )}
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-stone-400 mt-0.5">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 items-center">
          {actions}
        </div>
      )}
    </div>
  )
}

/**
 * AdminCard - 管理画面共通カードコンポーネント
 */
interface AdminCardProps {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export function AdminCard({ children, className = "", noPadding = false }: AdminCardProps) {
  return (
    <div
      className={`rounded-2xl bg-white border border-stone-100 ${noPadding ? "" : "p-6"} ${className}`}
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)" }}
    >
      {children}
    </div>
  )
}

/**
 * AdminBadge - ステータスバッジコンポーネント
 */
interface AdminBadgeProps {
  children: React.ReactNode
  variant?: "success" | "warning" | "error" | "info" | "neutral" | "gold"
  size?: "sm" | "md"
}

export function AdminBadge({ children, variant = "neutral", size = "sm" }: AdminBadgeProps) {
  const styles: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    error:   "bg-red-50 text-red-700 border-red-200",
    info:    "bg-blue-50 text-blue-700 border-blue-200",
    neutral: "bg-stone-50 text-stone-600 border-stone-200",
    gold:    "bg-amber-50 text-amber-800 border-amber-300",
  }
  const sizeClass = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]"

  return (
    <span className={`inline-flex items-center rounded-full border font-semibold ${sizeClass} ${styles[variant]}`}>
      {children}
    </span>
  )
}

/**
 * AdminButton - 統一ボタンコンポーネント
 */
interface AdminButtonProps {
  children: React.ReactNode
  onClick?: () => void
  href?: string
  variant?: "primary" | "secondary" | "danger" | "ghost"
  size?: "sm" | "md" | "lg"
  disabled?: boolean
  loading?: boolean
  className?: string
  type?: "button" | "submit" | "reset"
}

export function AdminButton({
  children,
  onClick,
  href,
  variant = "secondary",
  size = "md",
  disabled = false,
  loading = false,
  className = "",
  type = "button",
}: AdminButtonProps) {
  const sizeClass = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2 text-sm rounded-xl",
    lg: "px-6 py-3 text-sm rounded-xl",
  }[size]

  const variantStyle: Record<string, React.CSSProperties> = {
    primary: { background: "linear-gradient(135deg, #c9a84c, #a88830)", color: "#fff", boxShadow: "0 2px 8px rgba(201,168,76,0.35)" },
    secondary: { background: "#fff", color: "#44403c", border: "1px solid rgba(0,0,0,0.12)" },
    danger: { background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", boxShadow: "0 2px 8px rgba(239,68,68,0.3)" },
    ghost: { background: "transparent", color: "#78716c" },
  }

  const baseClass = `inline-flex items-center gap-2 font-semibold transition-all duration-150 disabled:opacity-50 ${sizeClass} ${className}`

  if (href) {
    return (
      <a href={href} className={baseClass} style={variantStyle[variant]}>
        {loading && <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
        {children}
      </a>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={baseClass}
      style={variantStyle[variant]}
    >
      {loading && <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
      {children}
    </button>
  )
}

/**
 * AdminEmptyState - 空の状態表示コンポーネント
 */
interface AdminEmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function AdminEmptyState({ icon = "fas fa-inbox", title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-stone-50 flex items-center justify-center mb-4">
        <i className={`${icon} text-2xl text-stone-300`} />
      </div>
      <p className="font-semibold text-stone-700 mb-1">{title}</p>
      {description && <p className="text-sm text-stone-400 mb-4">{description}</p>}
      {action}
    </div>
  )
}

/**
 * AdminLoadingSpinner - ローディングスピナー
 */
export function AdminLoadingSpinner({ text = "読み込み中..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-20 gap-3">
      <span className="w-6 h-6 border-2 border-stone-200 border-t-amber-500 rounded-full animate-spin" />
      <span className="text-sm text-stone-400">{text}</span>
    </div>
  )
}

/**
 * AdminAlertBanner - 警告・エラーバナー
 */
interface AdminAlertBannerProps {
  children: React.ReactNode
  variant?: "error" | "warning" | "success" | "info"
  onClose?: () => void
}

export function AdminAlertBanner({ children, variant = "error", onClose }: AdminAlertBannerProps) {
  const styles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    error:   { bg: "bg-red-50",    border: "border-red-200",   text: "text-red-700",   icon: "fas fa-exclamation-circle text-red-500" },
    warning: { bg: "bg-amber-50",  border: "border-amber-200", text: "text-amber-800", icon: "fas fa-exclamation-triangle text-amber-500" },
    success: { bg: "bg-emerald-50",border: "border-emerald-200",text: "text-emerald-800",icon: "fas fa-check-circle text-emerald-500" },
    info:    { bg: "bg-blue-50",   border: "border-blue-200",  text: "text-blue-800",  icon: "fas fa-info-circle text-blue-500" },
  }
  const s = styles[variant]

  return (
    <div className={`rounded-2xl border ${s.bg} ${s.border} p-4 flex items-start gap-3`}>
      <i className={`${s.icon} text-lg mt-0.5 flex-shrink-0`} />
      <p className={`text-sm flex-1 ${s.text}`}>{children}</p>
      {onClose && (
        <button onClick={onClose} className={`${s.text} opacity-60 hover:opacity-100`}>✕</button>
      )}
    </div>
  )
}
