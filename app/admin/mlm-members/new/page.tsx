"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  BANKS, 
  BRANCHES,
  getBankNameByCode,
  getBankCodeByName,
  getBranchNameByCode,
  getBranchCodeByName,
  getBranchesByBankCode 
} from "@/lib/bank-data";

export default function MlmMemberNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState<{ name: string; memberCode: string } | null>(null);

  // 基本情報
  const [formData, setFormData] = useState({
    // 会員情報
    memberCode: "",
    memberType: "business" as "business" | "consumer",
    status: "active" as "active" | "inactive" | "suspended",
    
    // 個人情報
    name: "",
    nameKana: "",
    companyName: "",
    companyNameKana: "",
    birthDate: "",
    gender: "" as "" | "male" | "female" | "other",
    
    // 連絡先
    postalCode: "",
    prefecture: "",
    city: "",
    address1: "",
    address2: "",
    phone: "",
    mobile: "",
    email: "",
    
    // 銀行情報
    bankCode: "",
    bankName: "",
    branchCode: "",
    branchName: "",
    accountType: "ordinary" as "ordinary" | "current",
    accountNumber: "",
    accountHolder: "",
    
    // 組織情報
    uplineMemberCode: "",
    referrerMemberCode: "",
    matrixPosition: 1,
    
    // レベル情報
    currentLevel: 0,
    titleLevel: 0,
    forceActive: false,
    forceLevel: 0,
    
    // 契約情報
    contractDate: "",
    
    // オートシップ
    autoshipEnabled: false,
    autoshipStartDate: "",
    paymentMethod: "credit_card" as "credit_card" | "bank_transfer" | "bank_payment",
    
    // その他
    note: "",
  });

  const prefectures = [
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
    "岐阜県", "静岡県", "愛知県", "三重県",
    "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
    "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県",
    "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // 銀行コード入力時の処理
  const handleBankCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value;
    setFormData((prev) => ({ ...prev, bankCode: code }));
    
    // 4桁入力時に自動で銀行名を検索
    if (code.length === 4) {
      const bankName = getBankNameByCode(code);
      if (bankName) {
        setFormData((prev) => ({ ...prev, bankCode: code, bankName }));
      }
    }
  };

  // 銀行名入力時の処理
  const handleBankNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({ ...prev, bankName: name }));
    
    // 完全一致時に銀行コードを自動入力
    const bankCode = getBankCodeByName(name);
    if (bankCode) {
      setFormData((prev) => ({ ...prev, bankName: name, bankCode }));
    }
  };

  // 支店コード入力時の処理
  const handleBranchCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value;
    setFormData((prev) => ({ ...prev, branchCode: code }));
    
    // 3桁入力時に自動で支店名を検索
    if (code.length === 3 && formData.bankCode) {
      const branchName = getBranchNameByCode(formData.bankCode, code);
      if (branchName) {
        setFormData((prev) => ({ ...prev, branchCode: code, branchName }));
      }
    }
  };

  // 支店名入力時の処理
  const handleBranchNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({ ...prev, branchName: name }));
    
    // 完全一致時に支店コードを自動入力
    if (formData.bankCode) {
      const branchCode = getBranchCodeByName(formData.bankCode, name);
      if (branchCode) {
        setFormData((prev) => ({ ...prev, branchName: name, branchCode }));
      }
    }
  };

  // URLパラメータから紹介者コードを取得して自動入力
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      // 紹介者コードをフォームに自動入力
      setFormData((prev) => ({
        ...prev,
        uplineMemberCode: ref,
        referrerMemberCode: ref,
      }));

      // 紹介者情報を取得
      fetch(`/api/admin/mlm-members/search?memberCode=${encodeURIComponent(ref)}`)
        .then(res => res.json())
        .then(data => {
          if (data.member) {
            setReferrerInfo({
              name: data.member.user?.name || '不明',
              memberCode: data.member.memberCode
            });
          }
        })
        .catch(err => {
          console.error('Error fetching referrer info:', err);
        });
    }
  }, [searchParams]);

  const handlePostalCodeSearch = async () => {
    if (!formData.postalCode || formData.postalCode.length < 7) {
      alert("7桁の郵便番号を入力してください");
      return;
    }

    try {
      const cleanCode = formData.postalCode.replace(/[^0-9]/g, "");
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanCode}`);
      const data = await res.json();

      if (data.status === 200 && data.results && data.results.length > 0) {
        const result = data.results[0];
        setFormData((prev) => ({
          ...prev,
          prefecture: result.address1,
          city: result.address2,
          address1: result.address3,
        }));
        alert("住所を自動入力しました");
      } else {
        alert("郵便番号が見つかりませんでした");
      }
    } catch (error) {
      console.error("Error searching postal code:", error);
      alert("郵便番号検索に失敗しました");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // バリデーション
      if (!formData.memberCode) {
        alert("会員コードを入力してください");
        setLoading(false);
        return;
      }
      if (!formData.name) {
        alert("氏名を入力してください");
        setLoading(false);
        return;
      }
      if (!formData.email) {
        alert("メールアドレスを入力してください");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/admin/mlm-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert("MLM会員を登録しました");
        router.push("/admin/mlm-members");
      } else {
        const error = await res.json();
        alert(`登録失敗: ${error.error || "不明なエラー"}`);
      }
    } catch (error) {
      console.error("Error creating member:", error);
      alert("エラーが発生しました");
    }

    setLoading(false);
  };

  return (
    <main className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          <i className="fas fa-user-plus mr-2"></i>
          MLM会員新規登録
        </h1>
        <p className="mt-2 text-gray-600">新しいMLM会員を登録します</p>
      </div>

      {/* 紹介者情報表示 */}
      {referrerInfo && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <div className="flex items-center">
            <i className="fas fa-info-circle text-blue-500 text-xl mr-3"></i>
            <div>
              <p className="text-sm font-semibold text-blue-800">
                紹介者: {referrerInfo.name} ({referrerInfo.memberCode})
              </p>
              <p className="text-xs text-blue-600 mt-1">
                この紹介者の配下として自動的に登録されます
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
            <i className="fas fa-id-card mr-2"></i>
            基本情報
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                会員コード
                <span className="text-xs text-gray-500 ml-2">（未入力の場合は自動生成されます）</span>
              </label>
              <input
                type="text"
                name="memberCode"
                value={formData.memberCode}
                onChange={handleInputChange}
                placeholder="例: 123456-01 または空欄で自動生成"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                <i className="fas fa-info-circle mr-1"></i>
                6桁ランダム番号＋ポジション番号が自動生成されます
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">会員区分</label>
              <select
                name="memberType"
                value={formData.memberType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="business">ビジネス会員</option>
                <option value="consumer">愛用会員</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">ステータス</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">アクティブ</option>
                <option value="inactive">非アクティブ</option>
                <option value="suspended">停止</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">契約日</label>
              <input
                type="date"
                name="contractDate"
                value={formData.contractDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 個人情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
            <i className="fas fa-user mr-2"></i>
            個人情報
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                <span className="text-red-600">*</span> 氏名
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="山田 太郎"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">フリガナ</label>
              <input
                type="text"
                name="nameKana"
                value={formData.nameKana}
                onChange={handleInputChange}
                placeholder="ヤマダ タロウ"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">法人名</label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                placeholder="株式会社〇〇"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">法人名（カナ）</label>
              <input
                type="text"
                name="companyNameKana"
                value={formData.companyNameKana}
                onChange={handleInputChange}
                placeholder="カブシキガイシャ〇〇"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">生年月日</label>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">性別</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="other">その他</option>
              </select>
            </div>
          </div>
        </div>

        {/* 連絡先情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
            <i className="fas fa-address-book mr-2"></i>
            連絡先情報
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">郵便番号</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  placeholder="1234567"
                  maxLength={8}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handlePostalCodeSearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  <i className="fas fa-search mr-1"></i>
                  住所検索
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">都道府県</label>
              <select
                name="prefecture"
                value={formData.prefecture}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                {prefectures.map((pref) => (
                  <option key={pref} value={pref}>
                    {pref}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">市区町村</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="〇〇市〇〇区"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">住所1（町名・番地）</label>
              <input
                type="text"
                name="address1"
                value={formData.address1}
                onChange={handleInputChange}
                placeholder="〇〇町1-2-3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">住所2（建物名・部屋番号）</label>
              <input
                type="text"
                name="address2"
                value={formData.address2}
                onChange={handleInputChange}
                placeholder="〇〇マンション 101号室"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">電話番号</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="03-1234-5678"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">携帯電話</label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleInputChange}
                placeholder="090-1234-5678"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                <span className="text-red-600">*</span> メールアドレス
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="example@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* 銀行情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
            <i className="fas fa-university mr-2"></i>
            銀行情報
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                銀行コード
                <span className="text-xs text-gray-500 ml-2">（4桁入力で自動検索）</span>
              </label>
              <input
                type="text"
                name="bankCode"
                value={formData.bankCode}
                onChange={handleBankCodeChange}
                placeholder="0001"
                maxLength={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                銀行名
                <span className="text-xs text-gray-500 ml-2">（候補から選択可能）</span>
              </label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleBankNameChange}
                list="bank-list"
                placeholder="みずほ銀行"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="bank-list">
                {BANKS.map(bank => (
                  <option key={bank.code} value={bank.name}>
                    {bank.code} - {bank.name}
                  </option>
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                支店コード
                <span className="text-xs text-gray-500 ml-2">（3桁入力で自動検索）</span>
              </label>
              <input
                type="text"
                name="branchCode"
                value={formData.branchCode}
                onChange={handleBranchCodeChange}
                placeholder="001"
                maxLength={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                支店名
                <span className="text-xs text-gray-500 ml-2">（候補から選択可能）</span>
              </label>
              <input
                type="text"
                name="branchName"
                value={formData.branchName}
                onChange={handleBranchNameChange}
                list="branch-list"
                placeholder="東京支店"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="branch-list">
                {formData.bankCode && getBranchesByBankCode(formData.bankCode).map(branch => (
                  <option key={branch.code} value={branch.name}>
                    {branch.code} - {branch.name}
                  </option>
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">口座種別</label>
              <select
                name="accountType"
                value={formData.accountType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="ordinary">普通</option>
                <option value="current">当座</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">口座番号</label>
              <input
                type="text"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleInputChange}
                placeholder="1234567"
                maxLength={7}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">口座名義（カナ）</label>
              <input
                type="text"
                name="accountHolder"
                value={formData.accountHolder}
                onChange={handleInputChange}
                placeholder="ヤマダ タロウ"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 組織情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
            <i className="fas fa-sitemap mr-2"></i>
            組織情報
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">直上者会員コード</label>
              <input
                type="text"
                name="uplineMemberCode"
                value={formData.uplineMemberCode}
                onChange={handleInputChange}
                placeholder="123456-01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">紹介者会員コード</label>
              <input
                type="text"
                name="referrerMemberCode"
                value={formData.referrerMemberCode}
                onChange={handleInputChange}
                placeholder="123456-01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">マトリックス位置</label>
              <select
                name="matrixPosition"
                value={formData.matrixPosition}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6].map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">現在レベル</label>
              <select
                name="currentLevel"
                value={formData.currentLevel}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {[0, 1, 2, 3, 4, 5].map((lv) => (
                  <option key={lv} value={lv}>
                    {lv === 0 ? "なし" : `レベル${lv}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">称号レベル</label>
              <select
                name="titleLevel"
                value={formData.titleLevel}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {[0, 1, 2, 3, 4, 5].map((lv) => (
                  <option key={lv} value={lv}>
                    {lv === 0 ? "なし" : `称号${lv}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="forceActive"
                checked={formData.forceActive}
                onChange={handleInputChange}
                className="w-4 h-4 mr-2"
              />
              <label className="text-sm font-semibold text-gray-700">強制アクティブ</label>
            </div>
          </div>
        </div>

        {/* オートシップ情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
            <i className="fas fa-sync-alt mr-2"></i>
            オートシップ情報
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="autoshipEnabled"
                checked={formData.autoshipEnabled}
                onChange={handleInputChange}
                className="w-4 h-4 mr-2"
              />
              <label className="text-sm font-semibold text-gray-700">オートシップ有効</label>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">オートシップ開始日</label>
              <input
                type="date"
                name="autoshipStartDate"
                value={formData.autoshipStartDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">支払い方法</label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="credit_card">クレジットカード（クレディックス）</option>
                <option value="bank_transfer">口座振替（三菱UFJファクター）</option>
                <option value="bank_payment">銀行振込</option>
              </select>
            </div>
          </div>
        </div>

        {/* 備考 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
            <i className="fas fa-sticky-note mr-2"></i>
            備考
          </h2>
          <textarea
            name="note"
            value={formData.note}
            onChange={handleInputChange}
            rows={4}
            placeholder="その他メモや備考を入力してください"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 送信ボタン */}
        <div className="flex gap-4 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-semibold"
          >
            <i className="fas fa-times mr-2"></i>
            キャンセル
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
          >
            <i className="fas fa-save mr-2"></i>
            {loading ? "登録中..." : "登録する"}
          </button>
        </div>
      </form>
    </main>
  );
}
