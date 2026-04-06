import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import VpPhoneAdminActions from "./ui/vp-phone-admin-actions";

const STATUS_LABEL: Record<string, { label: string; cls: string; icon: string }> = {
  pending:    { label: "審査待ち",       cls: "bg-yellow-50 text-yellow-800 border-yellow-200", icon: "⏳" },
  reviewing:  { label: "審査中",         cls: "bg-blue-50 text-blue-800 border-blue-200",       icon: "🔍" },
  contracted: { label: "契約済み",       cls: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: "✅" },
  rejected:   { label: "審査不可",       cls: "bg-red-50 text-red-800 border-red-200",          icon: "❌" },
  canceled:   { label: "キャンセル済み", cls: "bg-gray-50 text-gray-700 border-gray-200",        icon: "🚫" },
};

const GENDER_LABEL: Record<string, string> = {
  male: "男性", female: "女性", other: "その他",
};

const CONTRACT_TYPE_LABEL: Record<string, string> = {
  voice: "音声回線契約",
  data:  "大容量データ回線契約",
};

export default async function AdminVpPhonePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; view?: string; }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  const sp = await searchParams;
  const statusFilter = sp.status ?? "";
  const requestFilter = sp.view ?? ""; // "plan_change" | "contract_cancel" | "cancel_apply" | ""
  const page = Math.max(1, Number(sp.page ?? "1"));
  const limit = 30;
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (statusFilter) where.status = statusFilter;
  // 申請種別フィルタ（adminNoteのタグで絞り込み）
  if (requestFilter === "plan_change")     where.adminNote = { contains: "【プラン変更申請】" };
  if (requestFilter === "contract_cancel") where.adminNote = { contains: "【解約申請】" };
  if (requestFilter === "cancel_apply")    where.adminNote = { contains: "【申込取消申請】" };

  const [total, applications, statusCounts, planChangeCnt, contractCancelCnt, cancelApplyCnt] = await Promise.all([
    prisma.vpPhoneApplication.count({ where }),
    prisma.vpPhoneApplication.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, memberCode: true, email: true },
        },
      },
    }),
    prisma.vpPhoneApplication.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.vpPhoneApplication.count({ where: { adminNote: { contains: "【プラン変更申請】" } } }),
    prisma.vpPhoneApplication.count({ where: { adminNote: { contains: "【解約申請】" } } }),
    prisma.vpPhoneApplication.count({ where: { adminNote: { contains: "【申込取消申請】" } } }),
  ]);

  const countByStatus = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count.id])
  );

  const pages = Math.ceil(total / limit);
  const pendingCount = countByStatus["pending"] ?? 0;

  return (
    <main className="space-y-5">

      {/* ヘッダー */}
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">📱 VP未来phone 申し込み管理</h1>
            <p className="text-sm text-slate-500 mt-0.5">全 {total.toLocaleString()} 件</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {(["pending", "reviewing", "contracted", "rejected"] as const).map(s => (
              <div key={s} className="rounded-2xl bg-slate-50 px-4 py-2 text-center min-w-[72px]">
                <div className={`text-xs font-medium mb-0.5 ${STATUS_LABEL[s].cls.split(" ").filter(c => c.startsWith("text-")).join(" ")}`}>
                  {STATUS_LABEL[s].icon} {STATUS_LABEL[s].label}
                </div>
                <div className="text-lg font-bold text-slate-800">{countByStatus[s] ?? 0}</div>
              </div>
            ))}
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="mt-3 rounded-2xl bg-yellow-50 border border-yellow-200 px-4 py-2.5 flex items-center gap-2">
            <span className="text-yellow-600 font-bold text-sm">⚠️</span>
            <span className="text-sm font-semibold text-yellow-800">
              審査待ちの申し込みが {pendingCount} 件あります
            </span>
          </div>
        )}

        {/* VP未来phone手動申請ガイド */}
        <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-200 p-4">
          <h3 className="text-sm font-bold text-blue-800 mb-2">📋 VP未来phone 手動申請フロー</h3>
          <ol className="text-xs text-blue-700 space-y-1">
            <li className="flex items-start gap-2">
              <span className="font-bold mt-0.5">①</span>
              <span>申し込みを確認し、ステータスを「審査中」に変更</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold mt-0.5">②</span>
              <span>下記の申込者情報を確認し、外部サービスへ手動申請</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold mt-0.5">③</span>
              <span>申請完了後、ステータスを「契約済み」に変更</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold mt-0.5">④</span>
              <span>管理メニュー「携帯契約管理」から契約情報を登録</span>
            </li>
          </ol>
        </div>
      </div>

      {/* 申請種別フィルター（会員からの要対応申請） */}
      {(planChangeCnt > 0 || contractCancelCnt > 0 || cancelApplyCnt > 0) && (
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-600 mb-3">⚠️ 会員からの申請（要対応）</p>
          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/admin/vp-phone`}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                !requestFilter && !statusFilter ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              すべて
            </Link>
            {planChangeCnt > 0 && (
              <Link
                href={`/admin/vp-phone?view=plan_change`}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  requestFilter === "plan_change"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                }`}
              >
                🔄 プラン変更申請
                <span className="ml-1.5 text-xs font-bold opacity-80">{planChangeCnt}</span>
              </Link>
            )}
            {contractCancelCnt > 0 && (
              <Link
                href={`/admin/vp-phone?view=contract_cancel`}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  requestFilter === "contract_cancel"
                    ? "bg-red-600 text-white"
                    : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                }`}
              >
                🚫 解約申請
                <span className="ml-1.5 text-xs font-bold opacity-80">{contractCancelCnt}</span>
              </Link>
            )}
            {cancelApplyCnt > 0 && (
              <Link
                href={`/admin/vp-phone?view=cancel_apply`}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  requestFilter === "cancel_apply"
                    ? "bg-orange-600 text-white"
                    : "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
                }`}
              >
                ✋ 申込取消申請
                <span className="ml-1.5 text-xs font-bold opacity-80">{cancelApplyCnt}</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ステータスフィルター */}
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">ステータスで絞り込み</p>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "", label: "すべて" },
            { value: "pending",    label: "⏳ 審査待ち" },
            { value: "reviewing",  label: "🔍 審査中" },
            { value: "contracted", label: "✅ 契約済み" },
            { value: "rejected",   label: "❌ 審査不可" },
            { value: "canceled",   label: "🚫 キャンセル" },
          ].map(opt => (
            <Link
              key={opt.value}
              href={`/admin/vp-phone?status=${opt.value}`}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === opt.value && !requestFilter
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {opt.label}
              {opt.value && (countByStatus[opt.value] ?? 0) > 0 && (
                <span className="ml-1.5 text-xs font-bold">
                  {countByStatus[opt.value]}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* 申し込みカード一覧（手動申請しやすい詳細表示） */}
      <div className="space-y-4">
        {applications.length === 0 && (
          <div className="rounded-3xl bg-white p-10 text-center text-slate-500 shadow-sm">
            該当する申し込みがありません
          </div>
        )}

        {applications.map(a => {
          const st = STATUS_LABEL[a.status] ?? STATUS_LABEL.pending;
          const birthDate = a.birthDate
            ? new Date(a.birthDate).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
            : "未入力";
          const hasPassword = !!(a as typeof a & { password?: string | null }).password;

          // adminNoteから申請種別タグを検出
          const note = a.adminNote ?? "";
          const isCancelApply    = note.includes("【申込取消申請】");
          const isContractCancel = note.includes("【解約申請】");
          const isPlanChange     = note.includes("【プラン変更申請】");
          const cancelBadge =
            isContractCancel ? { label: "🚫 解約申請",      cls: "bg-red-600 text-white" } :
            isPlanChange     ? { label: "🔄 プラン変更申請", cls: "bg-blue-600 text-white" } :
            isCancelApply    ? { label: "✋ 申込取消申請",   cls: "bg-orange-500 text-white" } :
            null;

          // 申請種別バナーが有効かつ、管理者が対応済み（ステータスが rejected/canceled で adminNote にタグがある場合は対応済みの可能性）
          // バナーは常時表示して管理者が認識できるようにする

          return (
            <div key={a.id.toString()} className="rounded-3xl bg-white shadow-sm overflow-hidden">
              {/* 変更・解約・取消申請バナー（ステータス問わず常時表示） */}
              {cancelBadge && (
                <div className={`px-5 py-2.5 flex items-center gap-2 ${cancelBadge.cls}`}>
                  <span className="text-sm font-bold">{cancelBadge.label}</span>
                  <span className="text-xs opacity-90">（会員より申請 ・要対応）</span>
                </div>
              )}
              {/* カードヘッダー */}
              <div className={`px-5 py-3 border-b flex items-center justify-between ${st.cls}`}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{st.icon}</span>
                  <span className="text-sm font-bold">{st.label}</span>
                  <span className="text-xs font-medium ml-2">
                    申込日: {new Date(a.createdAt).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                <VpPhoneAdminActions
                  applicationId={a.id.toString()}
                  currentStatus={a.status}
                  adminNote={a.adminNote ?? ""}
                  userName={a.nameKanji}
                  userId={a.user.id.toString()}
                />
              </div>

              {/* 申込者情報（手動申請用に詳細表示） */}
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  {/* 左カラム：申込者基本情報 */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide pb-1 border-b border-slate-100">
                      申込者情報
                    </h3>

                    <InfoRow label="氏名（漢字）" value={a.nameKanji} highlight />
                    <InfoRow label="氏名（かな）" value={a.nameKana} highlight />
                    <InfoRow label="生年月日" value={birthDate} />
                    <InfoRow label="性別" value={GENDER_LABEL[a.gender] ?? a.gender} />
                    <InfoRow label="電話番号" value={a.phone} highlight copyable />
                    <InfoRow label="メールアドレス" value={a.email} highlight copyable />
                    <InfoRow
                      label="パスワード"
                      value={hasPassword ? "●●●●●●●● (設定あり)" : "未設定"}
                      valueClass={hasPassword ? "text-emerald-700 font-semibold" : "text-slate-400"}
                    />
                  </div>

                  {/* 右カラム：契約・連絡先情報 */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide pb-1 border-b border-slate-100">
                      契約・連絡先情報
                    </h3>

                    <InfoRow
                      label="契約種別"
                      value={a.contractType ? CONTRACT_TYPE_LABEL[a.contractType] ?? a.contractType : "未選択"}
                      highlight
                    />
                    <InfoRow
                      label="希望プラン"
                      value={a.desiredPlan || "未選択"}
                    />
                    <InfoRow label="LINE ID" value={a.lineId || "なし"} />
                    <InfoRow label="LINE表示名" value={a.lineDisplayName || "なし"} />
                    <InfoRow
                      label="紹介者コード"
                      value={(a as typeof a & { referrerCode?: string | null }).referrerCode || "なし"}
                    />
                    <InfoRow
                      label="紹介者名"
                      value={(a as typeof a & { referrerName?: string | null }).referrerName || "なし"}
                    />
                  </div>
                </div>

                {/* 会員情報 */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/users/${a.user.id}`}
                            className="text-sm font-bold text-slate-800 hover:text-slate-600">
                            {a.user.name}
                          </Link>
                          <span className="text-xs text-slate-400">{a.user.memberCode}</span>
                        </div>
                        <p className="text-xs text-slate-500">{a.user.email}</p>
                      </div>
                    </div>
                    <Link href={`/admin/users/${a.user.id}`}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      会員詳細 →
                    </Link>
                  </div>
                </div>

                {/* 担当者メモ */}
                {a.adminNote && (
                  <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
                    <p className="text-xs font-bold text-amber-700 mb-1">📝 担当者メモ</p>
                    <p className="text-xs text-amber-800">{a.adminNote}</p>
                  </div>
                )}

                {/* 契約日 */}
                {a.contractedAt && (
                  <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2">
                    <span className="text-emerald-600">✅</span>
                    <p className="text-xs font-semibold text-emerald-800">
                      契約完了: {new Date(a.contractedAt).toLocaleDateString("ja-JP")}
                    </p>
                    <Link href={`/admin/contracts`}
                      className="ml-auto text-xs text-emerald-600 hover:text-emerald-800 underline">
                      携帯契約管理 →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ページネーション */}
      {pages > 1 && (
        <div className="rounded-3xl bg-white px-5 py-4 shadow-sm flex justify-center gap-2">
          {page > 1 && (
            <Link href={`/admin/vp-phone?status=${statusFilter}&page=${page - 1}`}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">← 前へ</Link>
          )}
          <span className="px-4 py-2 text-sm text-slate-500">{page} / {pages}</span>
          {page < pages && (
            <Link href={`/admin/vp-phone?status=${statusFilter}&page=${page + 1}`}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">次へ →</Link>
          )}
        </div>
      )}
    </main>
  );
}

// 情報行コンポーネント
function InfoRow({
  label,
  value,
  highlight = false,
  copyable = false,
  valueClass,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  copyable?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-slate-500 min-w-[100px] shrink-0 mt-0.5">{label}</span>
      <span className={`text-xs ${highlight ? "font-semibold text-slate-800" : "text-slate-700"} ${valueClass ?? ""} break-all`}>
        {value}
        {copyable && (
          <span className="ml-1 text-[10px] text-slate-400">（コピー可）</span>
        )}
      </span>
    </div>
  );
}
