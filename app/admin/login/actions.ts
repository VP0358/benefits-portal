"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function adminLoginAction(
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
    // AuthError 以外は再スロー
    throw error;
  }
}
