/**
 * AdminPageHeader - 管理画面共通ページヘッダーコンポーネント
 * VIOLA Pure デザインシステム統一版
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
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-1"
            style={{
              color: accent,
              fontFamily: "var(--font-josefin), 'Arial Narrow', sans-serif",
              letterSpacing: "0.15em",
            }}
          >
            {category}
          </p>
        )}
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "#0a1628" }}
        >
          {title}
        </h1>
        {description && (
          <p className="text-sm mt-0.5" style={{ color: "#78716c" }}>
            {description}
          </p>
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
 * AdminCard - 管理画面共通カードコンポーネント（VIOLA Pure デザイン）
 */
interface AdminCardProps {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
  variant?: "light" | "navy"
}

export function AdminCard({ children, className = "", noPadding = false, variant = "light" }: AdminCardProps) {
  if (variant === "navy") {
    return (
      <div
        className={`rounded-2xl ${noPadding ? "" : "p-6"} ${className}`}
        style={{
          background: "linear-gradient(135deg, #0d1e38, #122444)",
          border: "1px solid rgba(201,168,76,0.18)",
          boxShadow: "0 8px 32px rgba(10,22,40,0.25), 0 2px 8px rgba(10,22,40,0.15)",
        }}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      className={`rounded-2xl bg-white ${noPadding ? "" : "p-6"} ${className}`}
      style={{
        border: "1px solid rgba(201,168,76,0.12)",
        boxShadow: "0 4px 20px rgba(10,22,40,0.06), 0 1px 4px rgba(10,22,40,0.04)",
      }}
    >
      {children}
    </div>
  )
}

/**
 * AdminBadge - ステータスバッジコンポーネント（VIOLA Pure デザイン）
 */
interface AdminBadgeProps {
  children: React.ReactNode
  variant?: "success" | "warning" | "error" | "info" | "neutral" | "gold" | "navy"
  size?: "sm" | "md"
}

export function AdminBadge({ children, variant = "neutral", size = "sm" }: AdminBadgeProps) {
  const styles: Record<string, React.CSSProperties> = {
    success: { background: "rgba(16,185,129,0.08)", color: "#059669", border: "1px solid rgba(16,185,129,0.2)" },
    warning: { background: "rgba(251,191,36,0.08)", color: "#b45309", border: "1px solid rgba(251,191,36,0.25)" },
    error:   { background: "rgba(239,68,68,0.08)",  color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" },
    info:    { background: "rgba(59,130,246,0.08)",  color: "#2563eb", border: "1px solid rgba(59,130,246,0.2)" },
    neutral: { background: "rgba(120,113,108,0.08)", color: "#57534e", border: "1px solid rgba(120,113,108,0.15)" },
    gold:    { background: "rgba(201,168,76,0.1)",   color: "#c9a84c", border: "1px solid rgba(201,168,76,0.3)" },
    navy:    { background: "rgba(10,22,40,0.08)",    color: "#0a1628", border: "1px solid rgba(10,22,40,0.15)" },
  }
  const sizeClass = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]"

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${sizeClass}`}
      style={styles[variant]}
    >
      {children}
    </span>
  )
}

/**
 * AdminButton - 統一ボタンコンポーネント（VIOLA Pure デザイン）
 */
interface AdminButtonProps {
  children: React.ReactNode
  onClick?: () => void
  href?: string
  variant?: "primary" | "secondary" | "danger" | "ghost" | "navy"
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
    primary: {
      background: "linear-gradient(135deg, #c9a84c, #a88830)",
      color: "#1a1410",
      boxShadow: "0 2px 8px rgba(201,168,76,0.35)",
      border: "none",
    },
    navy: {
      background: "linear-gradient(135deg, #0a1628, #162c50)",
      color: "#e8c96a",
      border: "1px solid rgba(201,168,76,0.25)",
      boxShadow: "0 2px 8px rgba(10,22,40,0.25)",
    },
    secondary: {
      background: "#fff",
      color: "#44403c",
      border: "1px solid rgba(201,168,76,0.2)",
      boxShadow: "0 1px 3px rgba(10,22,40,0.06)",
    },
    danger: {
      background: "linear-gradient(135deg, #ef4444, #dc2626)",
      color: "#fff",
      boxShadow: "0 2px 8px rgba(239,68,68,0.3)",
      border: "none",
    },
    ghost: {
      background: "transparent",
      color: "#78716c",
      border: "1px solid transparent",
    },
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
 * AdminEmptyState - 空の状態表示コンポーネント（VIOLA Pure デザイン）
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
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}
      >
        <i className={`${icon} text-2xl`} style={{ color: "rgba(201,168,76,0.4)" }} />
      </div>
      <p className="font-semibold mb-1" style={{ color: "#1a1410" }}>{title}</p>
      {description && <p className="text-sm mb-4" style={{ color: "#78716c" }}>{description}</p>}
      {action}
    </div>
  )
}

/**
 * AdminLoadingSpinner - ローディングスピナー（VIOLA Pure デザイン）
 */
export function AdminLoadingSpinner({ text = "読み込み中..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-20 gap-3">
      <span
        className="w-6 h-6 rounded-full animate-spin"
        style={{ border: "2px solid rgba(201,168,76,0.2)", borderTopColor: "#c9a84c" }}
      />
      <span className="text-sm" style={{ color: "#78716c" }}>{text}</span>
    </div>
  )
}

/**
 * AdminAlertBanner - 警告・エラーバナー（VIOLA Pure デザイン）
 */
interface AdminAlertBannerProps {
  children: React.ReactNode
  variant?: "error" | "warning" | "success" | "info"
  onClose?: () => void
}

export function AdminAlertBanner({ children, variant = "error", onClose }: AdminAlertBannerProps) {
  const styles: Record<string, { bg: string; border: string; text: string; iconColor: string; icon: string }> = {
    error:   { bg: "rgba(239,68,68,0.06)",  border: "rgba(239,68,68,0.2)",   text: "#dc2626", iconColor: "#ef4444", icon: "fas fa-exclamation-circle" },
    warning: { bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.25)", text: "#92400e", iconColor: "#d97706", icon: "fas fa-exclamation-triangle" },
    success: { bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)",  text: "#065f46", iconColor: "#10b981", icon: "fas fa-check-circle" },
    info:    { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.2)",  text: "#1e40af", iconColor: "#3b82f6", icon: "fas fa-info-circle" },
  }
  const s = styles[variant]

  return (
    <div
      className="rounded-2xl p-4 flex items-start gap-3"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <i className={`${s.icon} text-lg mt-0.5 flex-shrink-0`} style={{ color: s.iconColor }} />
      <p className="text-sm flex-1" style={{ color: s.text }}>{children}</p>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100 transition" style={{ color: s.text }}>✕</button>
      )}
    </div>
  )
}
