import Link from "next/link";

export default function VpPhonePrivacyPage() {
  return (
    <div className="min-h-screen bg-[#e6f2dc] pb-16">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 bg-white shadow-sm flex items-center gap-3 px-4 py-3">
        <Link href="/vp-phone" className="text-gray-500 text-lg hover:text-gray-700">←</Link>
        <div className="flex items-center gap-2">
          <span className="text-xl">🔒</span>
          <div>
            <h1 className="font-bold text-green-800 text-sm leading-none">個人情報の取扱いについて</h1>
            <p className="text-[10px] text-gray-500 mt-0.5">VP未来phone 申し込みに係る個人情報保護方針</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5 pb-10 space-y-5">

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">
            個人情報の取扱いに関する重要事項
          </h2>
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            VP未来phone（以下「本サービス」）の申し込みにあたり、お客様の個人情報を以下の通り取り扱います。
            ご同意の上でお申し込みください。
          </p>

          <section className="mb-5">
            <h3 className="text-sm font-bold text-gray-800 mb-2">1. 個人情報の収集目的</h3>
            <ul className="text-xs text-gray-700 space-y-1.5 pl-4">
              <li className="list-disc leading-relaxed">VP未来phone サービスの申し込み受付・審査・契約締結のため</li>
              <li className="list-disc leading-relaxed">携帯電話回線サービスの提供・開通手続きのため</li>
              <li className="list-disc leading-relaxed">お客様へのご連絡（審査結果・開通通知・サービス案内等）のため</li>
              <li className="list-disc leading-relaxed">紹介者への紹介ポイント付与のため</li>
              <li className="list-disc leading-relaxed">法令に基づく本人確認のため</li>
            </ul>
          </section>

          <section className="mb-5">
            <h3 className="text-sm font-bold text-gray-800 mb-2">2. 収集する個人情報の項目</h3>
            <ul className="text-xs text-gray-700 space-y-1.5 pl-4">
              <li className="list-disc leading-relaxed">氏名（漢字・かな）</li>
              <li className="list-disc leading-relaxed">メールアドレス</li>
              <li className="list-disc leading-relaxed">電話番号</li>
              <li className="list-disc leading-relaxed">生年月日・性別</li>
              <li className="list-disc leading-relaxed">LINE ID・LINE表示名（任意）</li>
              <li className="list-disc leading-relaxed">紹介者情報</li>
              <li className="list-disc leading-relaxed">ご希望の契約プラン</li>
            </ul>
          </section>

          <section className="mb-5">
            <h3 className="text-sm font-bold text-gray-800 mb-2">3. 個人情報の第三者提供</h3>
            <p className="text-xs text-gray-700 leading-relaxed mb-2">
              お申し込みいただいた個人情報は、以下の場合を除き第三者に提供しません。
            </p>
            <ul className="text-xs text-gray-700 space-y-1.5 pl-4">
              <li className="list-disc leading-relaxed">
                <strong>回線事業者への提供：</strong>携帯電話回線契約の締結に必要な範囲で、MVNO事業者（回線提供会社）に情報を提供します
              </li>
              <li className="list-disc leading-relaxed">
                <strong>法令に基づく場合：</strong>法令の規定に基づき開示が必要な場合
              </li>
            </ul>
          </section>

          <section className="mb-5">
            <h3 className="text-sm font-bold text-gray-800 mb-2">4. 個人情報の安全管理</h3>
            <p className="text-xs text-gray-700 leading-relaxed">
              収集した個人情報は、不正アクセス・紛失・破壊・改ざん・漏えい等を防止するため、
              適切なセキュリティ措置を講じて管理します。
            </p>
          </section>

          <section className="mb-5">
            <h3 className="text-sm font-bold text-gray-800 mb-2">5. 個人情報の保存期間</h3>
            <p className="text-xs text-gray-700 leading-relaxed">
              申し込み情報は契約締結後も、法令上の保存義務期間が経過するまで保存します。
              審査不可・キャンセルの場合は、手続き完了後に速やかに削除します。
            </p>
          </section>

          <section className="mb-5">
            <h3 className="text-sm font-bold text-gray-800 mb-2">6. 個人情報の開示・訂正・削除</h3>
            <p className="text-xs text-gray-700 leading-relaxed">
              ご自身の個人情報について、開示・訂正・削除のご請求は管理者までお問い合わせください。
              ご本人確認の上、法令の範囲内で対応いたします。
            </p>
          </section>

          <section className="mb-5">
            <h3 className="text-sm font-bold text-gray-800 mb-2">7. お問い合わせ窓口</h3>
            <p className="text-xs text-gray-700 leading-relaxed">
              個人情報の取扱いに関するご質問・ご相談は、会員ポータルのお問い合わせフォームよりご連絡ください。
            </p>
          </section>

          <div className="rounded-xl bg-green-50 border border-green-200 p-4 mt-4">
            <p className="text-xs text-green-800 leading-relaxed font-medium">
              上記の内容をご確認の上、申し込みフォームの「個人情報の取扱いに同意する」にチェックを入れてお申し込みください。
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link href="/vp-phone"
            className="inline-block rounded-xl bg-green-600 text-white px-8 py-3 text-sm font-bold hover:bg-green-700 transition shadow">
            ← 申し込みフォームに戻る
          </Link>
        </div>

      </main>
    </div>
  );
}
