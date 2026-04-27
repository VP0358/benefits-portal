/**
 * 日本時間（JST = UTC+9）ユーティリティ
 *
 * ポイント：
 *  - サーバー（Vercel / Node.js）はシステムタイムゾーンが UTC であるため
 *    new Date() はそのまま UTC 時刻を返す。
 *  - DB 保存用の DateTime は UTC の Date オブジェクトをそのまま渡せばよい
 *    （Prisma / PostgreSQL は UTC で保存し、取り出し時も UTC）。
 *  - 「今日の日付文字列（YYYY-MM-DD）」や「今月（YYYY-MM）」を日本時間で
 *    取得したい場合は toJSTDateString() / toJSTMonthString() を使う。
 *  - 表示用フォーマットは fmtJST() を使う。
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000; // +9h in ms

/** UTC の Date を JST に換算した Date を返す（内部計算用） */
export function toJSTDate(date: Date = new Date()): Date {
  return new Date(date.getTime() + JST_OFFSET_MS);
}

/** 現在の JST 時刻の Date オブジェクト */
export function nowJST(): Date {
  return toJSTDate(new Date());
}

/**
 * 現在の JST 日付を "YYYY-MM-DD" 形式で返す
 * （UTC 00:00〜08:59 の間でも日本の日付を正しく返す）
 */
export function todayJST(): string {
  const jst = nowJST();
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 現在の JST の年を返す
 */
export function currentYearJST(): number {
  return nowJST().getUTCFullYear();
}

/**
 * 現在の JST 年月を "YYYY-MM" 形式で返す
 */
export function currentMonthJST(): string {
  const jst = nowJST();
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * 任意の Date を JST の "YYYY-MM-DD" 形式に変換
 */
export function toJSTDateString(date: Date): string {
  const jst = toJSTDate(date);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 任意の Date を JST の "YYYY-MM" 形式に変換
 */
export function toJSTMonthString(date: Date): string {
  return toJSTDateString(date).slice(0, 7);
}

/**
 * 今月の JST 月初（UTC の Date オブジェクト）
 * DB の範囲検索 WHERE orderedAt >= startOfMonthJST() などに使う
 */
export function startOfMonthJST(date: Date = new Date()): Date {
  const jst = toJSTDate(date);
  // JST の月初 00:00:00 を UTC に戻す
  const jstMonthStart = new Date(
    Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), 1)
  );
  return new Date(jstMonthStart.getTime() - JST_OFFSET_MS);
}

/**
 * 今月の JST 月末（UTC の Date オブジェクト）
 */
export function endOfMonthJST(date: Date = new Date()): Date {
  const jst = toJSTDate(date);
  const jstMonthEnd = new Date(
    Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth() + 1, 0, 23, 59, 59, 999)
  );
  return new Date(jstMonthEnd.getTime() - JST_OFFSET_MS);
}

/**
 * 指定した JST 月文字列 "YYYY-MM" の月初・月末を UTC Date で返す
 */
export function jstMonthRange(yyyymm: string): { start: Date; end: Date } {
  const [y, m] = yyyymm.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1) - JST_OFFSET_MS);
  const end   = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999) - JST_OFFSET_MS);
  return { start, end };
}

/**
 * 今日の JST 日の開始・終了 UTC Date を返す
 */
export function todayJSTRange(): { start: Date; end: Date } {
  return jstDayRange(todayJST());
}

/**
 * 指定した JST 日付文字列 "YYYY-MM-DD" の 00:00:00〜23:59:59 を UTC Date で返す
 */
export function jstDayRange(yyyymmdd: string): { start: Date; end: Date } {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - JST_OFFSET_MS);
  const end   = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - JST_OFFSET_MS);
  return { start, end };
}

/**
 * CSV ファイル名などに使う JST 日付文字列（ハイフンなし "YYYYMMDD"）
 */
export function todayJSTCompact(): string {
  return todayJST().replace(/-/g, "");
}

/**
 * 表示用：UTC Date → JST の日本語日付文字列
 * 例: "2026年4月27日"
 */
export function fmtJSTDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric" });
}

/**
 * 表示用：UTC Date → JST の日付文字列 "YYYY/MM/DD"
 */
export function fmtJSTDateSlash(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "/");
}

/**
 * 表示用：UTC Date → JST の日時文字列
 * 例: "2026/04/27 14:30"
 */
export function fmtJSTDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

/**
 * 年齢計算（JST 基準）
 * birthDate: "YYYY-MM-DD" 文字列 または Date
 */
export function calcAgeJST(birthDate: Date | string | null | undefined): number {
  if (!birthDate) return 0;
  const bd = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  if (isNaN(bd.getTime())) return 0;
  const todayStr = todayJST();
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const by = bd.getUTCFullYear();
  const bm = bd.getUTCMonth() + 1;
  const bdDay = bd.getUTCDate();
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bdDay)) age--;
  return age;
}

/**
 * JST "YYYY-MM-DD" → CSV・ファイル名用に "YYYYMMDD"
 */
export function jstDateToCompact(yyyymmdd: string): string {
  return yyyymmdd.replace(/-/g, "");
}

/**
 * 今月・先月の "YYYY-MM" 文字列を JST 基準で返す
 */
export function currentAndLastMonthJST(): { currentMonth: string; lastMonth: string } {
  const jst = nowJST();
  const y  = jst.getUTCFullYear();
  const m0 = jst.getUTCMonth(); // 0-based
  const currentMonth = `${y}-${String(m0 + 1).padStart(2, "0")}`;
  // 先月
  const lastMonthTotal = y * 12 + m0 - 1;
  const ly = Math.floor(lastMonthTotal / 12);
  const lm = (lastMonthTotal % 12) + 1;
  const lastMonth = `${ly}-${String(lm).padStart(2, "0")}`;
  return { currentMonth, lastMonth };
}

/**
 * JST の月文字列 "YYYY-MM" から N ヶ月前の "YYYY-MM" を返す
 */
export function monthOffsetJST(yyyymm: string, offset: number): string {
  const [y, m] = yyyymm.split("-").map(Number);
  const total = y * 12 + (m - 1) + offset;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

/**
 * JST 基準の今月月初 "YYYY-MM-DD" を返す
 */
export function firstDayOfMonthJST(): string {
  const jst = nowJST();
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/**
 * JST 日付文字列 "YYYY-MM-DD" → DB保存用 UTC Date
 *
 * 問題: new Date("2025-01-01") は UTC 00:00 として解釈されるため、
 *       JST で表示すると「前日の09:00」になり日付がずれる。
 *
 * 解決: "YYYY-MM-DD" を JST 00:00:00 として解釈 = UTC 前日15:00 で保存。
 *       これにより JST で取り出した際に入力した日付と一致する。
 *
 * 使い方: new Date(data.birthDate) の代わりに parseDateJST(data.birthDate) を使う
 */
export function parseDateJST(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10) - 1; // 0-based
  const d = parseInt(match[3], 10);
  // JST 00:00:00 → UTC = 前日15:00:00
  return new Date(Date.UTC(y, m, d, 0, 0, 0) - JST_OFFSET_MS);
}
