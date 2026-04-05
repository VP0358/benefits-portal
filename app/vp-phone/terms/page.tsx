import Link from "next/link";

type TermsSection = {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
};

// 利用規約の各セクション定義
const VOICE_TERMS_SECTIONS: TermsSection[] = [
  {
    id: "purpose",
    title: "第1条（目的）",
    icon: "📋",
    content: (
      <p className="text-xs text-gray-700 leading-relaxed">
        本規約は、VP未来phone サービス（以下「本サービス」）の利用に関する条件を定めるものです。
        会員は本規約に同意の上、本サービスをご利用ください。
      </p>
    ),
  },
  {
    id: "service",
    title: "第2条（サービスの内容）",
    icon: "📱",
    content: (
      <div className="text-xs text-gray-700 leading-relaxed space-y-2">
        <p>本サービスは、以下の携帯電話回線サービスを提供します。</p>
        <ul className="pl-4 space-y-1">
          <li className="list-disc">音声回線契約（VP未来phone 音声通話プラン）</li>
          <li className="list-disc">大容量データ回線契約（VP未来phone データプラン）</li>
          <li className="list-disc">音声通話かけ放題オプション（オプション契約）</li>
        </ul>
        <p>本サービスはMVNO（仮想移動体通信事業者）として、ドコモ回線を利用して提供されます。</p>
      </div>
    ),
  },
  {
    id: "application",
    title: "第3条（申し込み・契約）",
    icon: "✍️",
    content: (
      <div className="text-xs text-gray-700 leading-relaxed space-y-2">
        <p>1. 本サービスへの申し込みは、当ポータルの申し込みフォームより行ってください。</p>
        <p>2. 申し込み後、担当者が審査を行い、審査結果をメール・ポータル内でご連絡します。</p>
        <p>3. 審査通過後、担当者より契約手続きのご案内をいたします。</p>
        <p>4. 契約成立は、回線の開通をもって確定とします。</p>
      </div>
    ),
  },
  {
    id: "fees",
    title: "第4条（料金）",
    icon: "💴",
    content: (
      <div className="text-xs text-gray-700 leading-relaxed space-y-2">
        <p>月額料金・初期費用等の詳細は、担当者よりご案内します。</p>
        <p>1. 月額料金は毎月所定の日に請求します。</p>
        <p>2. 初月料金は契約開始日に応じて日割り計算する場合があります。</p>
        <p>3. 支払い方法は担当者との契約時に取り決めます。</p>
      </div>
    ),
  },
  {
    id: "cancellation",
    title: "第5条（解約・変更）",
    icon: "🔄",
    content: (
      <div className="text-xs text-gray-700 leading-relaxed space-y-2">
        <p>1. 解約を希望する場合は、担当者または管理者窓口へご連絡ください。</p>
        <p>2. 解約は申請月の翌月末をもって契約終了とする場合があります。</p>
        <p>3. プラン変更は所定の手続きにより対応します。</p>
      </div>
    ),
  },
  {
    id: "prohibited",
    title: "第6条（禁止事項）",
    icon: "🚫",
    content: (
      <div className="text-xs text-gray-700 leading-relaxed space-y-2">
        <p>本サービスのご利用にあたり、以下の行為を禁止します。</p>
        <ul className="pl-4 space-y-1">
          <li className="list-disc">第三者への回線の転貸・転売</li>
          <li className="list-disc">違法・不正な目的での利用</li>
          <li className="list-disc">契約情報の虚偽申告</li>
          <li className="list-disc">迷惑行為・スパム送信</li>
          <li className="list-disc">その他、法令または公序良俗に反する行為</li>
        </ul>
      </div>
    ),
  },
  {
    id: "liability",
    title: "第7条（免責事項）",
    icon: "⚖️",
    content: (
      <div className="text-xs text-gray-700 leading-relaxed space-y-2">
        <p>1. 天災・通信障害等、やむを得ない事由によるサービス停止について、当社は責任を負いません。</p>
        <p>2. 本サービスの利用により生じた損害について、当社の故意または重大な過失による場合を除き、責任を負いません。</p>
      </div>
    ),
  },
];

const KALLRADID_TERMS_SECTIONS: TermsSection[] = [
  {
    id: "option",
    title: "音声通話かけ放題オプション",
    icon: "📞",
    content: (
      <div className="text-xs text-gray-700 leading-relaxed space-y-2">
        <p>VP未来phone 音声通話かけ放題オプションは、指定エリア内の国内通話が定額でご利用いただけるオプションサービスです。</p>
        <ul className="pl-4 space-y-1">
          <li className="list-disc">国内通話（固定電話・携帯電話宛）が対象</li>
          <li className="list-disc">0120・0570等の特番は対象外となる場合があります</li>
          <li className="list-disc">データ通信には適用されません</li>
          <li className="list-disc">オプションの追加・解除は担当者窓口へご連絡ください</li>
        </ul>
      </div>
    ),
  },
  {
    id: "option-fees",
    title: "オプション料金",
    icon: "💴",
    content: (
      <div className="text-xs text-gray-700 leading-relaxed space-y-2">
        <p>オプション料金は月額プランに加算されます。詳細は担当者よりご案内します。</p>
      </div>
    ),
  },
];

const WIFI_TERMS_SECTIONS: TermsSection[] = [
  {
    id: "wifi-service",
    title: "VP未来Wi-Fi サービス内容",
    icon: "📶",
    content: (
      <div className="text-xs text-gray-700 leading-relaxed space-y-2">
        <p>VP未来Wi-Fi は、大容量データ通信を月額定額でご利用いただけるモバイルWi-Fiサービスです。</p>
        <ul className="pl-4 space-y-1">
          <li className="list-disc">データ通信：大容量プランあり（上限・速度制限は契約内容による）</li>
          <li className="list-disc">ルーター端末の貸与または購入が必要です</li>
          <li className="list-disc">エリアはドコモ回線カバーエリアに準じます</li>
        </ul>
      </div>
    ),
  },
  {
    id: "wifi-fees",
    title: "VP未来Wi-Fi 料金",
    icon: "💴",
    content: (
      <div className="text-xs text-gray-700 leading-relaxed">
        <p>月額料金・初期費用・端末代金等の詳細は担当者よりご案内します。</p>
      </div>
    ),
  },
];

function TermsCard({ section }: { section: TermsSection }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-100">
        <span className="text-base">{section.icon}</span>
        <h4 className="text-sm font-bold text-gray-800">{section.title}</h4>
      </div>
      <div className="px-4 py-3">{section.content}</div>
    </div>
  );
}

export default function VpPhoneTermsPage() {
  return (
    <div className="min-h-screen bg-[#e6f2dc] pb-16">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 bg-white shadow-sm flex items-center gap-3 px-4 py-3">
        <Link href="/vp-phone" className="text-gray-500 text-lg hover:text-gray-700">←</Link>
        <div className="flex items-center gap-2">
          <span className="text-xl">📄</span>
          <div>
            <h1 className="font-bold text-green-800 text-sm leading-none">利用規約・重要事項説明</h1>
            <p className="text-[10px] text-gray-500 mt-0.5">VP未来phone / VP未来Wi-Fi</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5 pb-10 space-y-6">

        {/* 音声回線契約 */}
        <section>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">📱</div>
              <div>
                <h2 className="text-base font-bold text-gray-800">VP未来phone 利用規約</h2>
                <p className="text-xs text-gray-500">音声回線契約・大容量データ回線契約 共通</p>
              </div>
            </div>

            <div className="space-y-3">
              {VOICE_TERMS_SECTIONS.map(s => (
                <TermsCard key={s.id} section={s} />
              ))}
            </div>
          </div>
        </section>

        {/* かけ放題オプション */}
        <section>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">📞</div>
              <div>
                <h2 className="text-base font-bold text-gray-800">音声通話かけ放題オプション 利用規約</h2>
                <p className="text-xs text-gray-500">VP未来phone かけ放題オプション</p>
              </div>
            </div>

            <div className="space-y-3">
              {KALLRADID_TERMS_SECTIONS.map(s => (
                <TermsCard key={s.id} section={s} />
              ))}
            </div>
          </div>
        </section>

        {/* Wi-Fi */}
        <section>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl">📶</div>
              <div>
                <h2 className="text-base font-bold text-gray-800">VP未来Wi-Fi 契約約款・重要事項説明</h2>
                <p className="text-xs text-gray-500">モバイルWi-Fiサービス</p>
              </div>
            </div>

            <div className="space-y-3">
              {WIFI_TERMS_SECTIONS.map(s => (
                <TermsCard key={s.id} section={s} />
              ))}
            </div>
          </div>
        </section>

        {/* 重要事項説明（携帯・Wi-Fi共通） */}
        <section>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center text-xl">⚠️</div>
              <div>
                <h2 className="text-base font-bold text-gray-800">重要事項説明</h2>
                <p className="text-xs text-gray-500">VP未来phone・VP未来Wi-Fi 共通</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4">
                <h4 className="text-sm font-bold text-yellow-900 mb-2">⚠️ 必ずご確認ください</h4>
                <ul className="text-xs text-yellow-800 space-y-2 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-yellow-600">•</span>
                    <span>本サービスは MVNO（仮想移動体通信事業者）が提供するサービスです。キャリア（ドコモ等）直販サービスとは異なります。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-yellow-600">•</span>
                    <span>本人確認書類（運転免許証・マイナンバーカード等）が必要です。担当者よりご案内します。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-yellow-600">•</span>
                    <span>SIMロック解除が必要な場合があります。ご使用の端末についてご確認ください。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-yellow-600">•</span>
                    <span>MNP（番号ポータビリティ）をご希望の場合は、現在のキャリアへのMNP予約番号が必要です。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-yellow-600">•</span>
                    <span>クーリングオフ制度の対象となる場合があります（訪問販売等）。詳細は担当者にご確認ください。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-yellow-600">•</span>
                    <span>速度制限：月間データ使用量が上限を超えた場合、速度制限（最大200kbps程度）が適用される場合があります。</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <h4 className="text-sm font-bold text-gray-800 mb-2">📋 申し込みから開通までの流れ</h4>
                <ol className="text-xs text-gray-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-green-700 mt-0.5">①</span>
                    <span>本フォームで申し込み送信</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-green-700 mt-0.5">②</span>
                    <span>担当者より審査・プランご提案のご連絡</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-green-700 mt-0.5">③</span>
                    <span>本人確認書類・必要書類のご提出</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-green-700 mt-0.5">④</span>
                    <span>回線事業者への申請（担当者が代行）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-green-700 mt-0.5">⑤</span>
                    <span>SIM発送・開通手続き</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-green-700 mt-0.5">⑥</span>
                    <span>開通完了・ご利用開始</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </section>

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
