// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { handlers } from "@/auth";


export const { GET, POST } = handlers;
