"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(email: string, password: string) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "メールアドレスまたはパスワードが正しくありません。" };
        default:
          return { success: false, error: "ログインに失敗しました。" };
      }
    }
    // redirect エラーは再スロー（signIn が内部で redirect する場合）
    throw error;
  }
}
