"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

/**
 * Next Auth v5 beta の Server Action ログイン
 *
 * signIn("credentials", { redirect: false }) の動作:
 * - 認証成功: Cookieをセットしてリダイレクト先URLを返す（例外なし）
 * - 認証失敗: CredentialsSignin 例外を throw する（raw モード時）
 */
export async function loginAction(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    // ここに到達 = 認証成功（Cookieセット済み）
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return {
            success: false,
            error: "メールアドレスまたはパスワードが正しくありません。",
          };
        default:
          return {
            success: false,
            error: "ログインに失敗しました。",
          };
      }
    }
    // AuthError 以外（NEXT_REDIRECT など）は再スロー
    throw error;
  }
}
