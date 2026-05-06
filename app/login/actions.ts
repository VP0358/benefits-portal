"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

/**
 * 会員ログイン Server Action
 * 会員ID（memberCode）＋パスワードで認証
 */
export async function loginAction(
  memberCode: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await signIn("credentials", {
      loginId: memberCode,
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
            error: "会員IDまたはパスワードが正しくありません。",
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
