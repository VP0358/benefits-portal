/**
 * MLM会員の表示名を返すユーティリティ
 *
 * 法人登録者は User.name が「未設定」または空になっているため、
 * companyName が存在すればそちらを優先して表示する。
 *
 * 優先順位: companyName → user.name → fallback
 */
export function getMlmDisplayName(
  userName: string | null | undefined,
  companyName: string | null | undefined,
  fallback = "未設定"
): string {
  // companyName があれば最優先
  if (companyName && companyName.trim() !== "") {
    return companyName.trim();
  }
  // user.name が「未設定」「」以外なら使用
  if (userName && userName.trim() !== "" && userName.trim() !== "未設定") {
    return userName.trim();
  }
  return fallback;
}

/**
 * Prisma で取得した mlmMember オブジェクトから表示名を返す
 * 例: getMlmMemberDisplayName(m)
 */
export function getMlmMemberDisplayName(member: {
  companyName?: string | null;
  user?: { name?: string | null } | null;
}): string {
  return getMlmDisplayName(member.user?.name, member.companyName);
}
