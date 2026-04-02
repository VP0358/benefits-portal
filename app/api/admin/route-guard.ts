import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.email) {
    return {
      error: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
      session: null,
    };
  }

  if (session.user.role !== "admin") {
    return {
      error: NextResponse.json({ error: "forbidden" }, { status: 403 }),
      session: null,
    };
  }

  return { error: null, session };
}
