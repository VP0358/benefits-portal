// ルートAPIエンドポイント - 全APIルートの動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const revalidate = 0

export async function GET() {
  return Response.json({ 
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString()
  })
}
