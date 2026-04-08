import { handlers } from "@/auth";

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

export const { GET, POST } = handlers;
