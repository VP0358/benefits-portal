#!/usr/bin/env python3
"""
VIOLA Pure MLM Bonus Calculation Engine V1 - 検証スクリプト
=====================================================

使用方法:
  python3 scripts/verify-bonus-v1.py [--api-base URL] [--month 2026-04]

例:
  python3 scripts/verify-bonus-v1.py --api-base https://viola-pure.vercel.app --month 2026-04
  python3 scripts/verify-bonus-v1.py --api-base http://localhost:3000 --month 2026-04

目的:
  1. tree-debug API から現在の計算結果を取得
  2. CSVファイルのデータと組み合わせて検証
  3. 期待値と一致するかチェック

検証対象 (2026-04):
  82179501: ULB=53,850, SB=35,700 (min系列PT=10,200)
  44504701: ULB=44,850, SB=122,400 (min系列PT=30,600)
  86820601: ULB=161,250, SB=16,200
  93713601: ULB=110,100, SB=4,200
  89248801: ULB=0, SB=122,400
  支払対象者数: 37名
"""

import argparse
import json
import sys
import csv
import os

# ━━━ 期待値定義 ━━━
EXPECTED = {
    "82179501": {"ulb": 53850,  "sb": 35700,  "min_series_pt": 10200, "sb_level": 4},
    "44504701": {"ulb": 44850,  "sb": 122400, "min_series_pt": 30600, "sb_level": 5},
    "86820601": {"ulb": 161250, "sb": 16200,  "min_series_pt": None,  "sb_level": 5},
    "93713601": {"ulb": 110100, "sb": 4200,   "min_series_pt": None,  "sb_level": 4},
    "89248801": {"ulb": None,   "sb": 122400, "min_series_pt": 30600, "sb_level": 5},
}
EXPECTED_PAY_COUNT = 37

# ━━━ 定数 ━━━
UNILEVEL_RATES = {
    0: [15, 7, 3, 0, 0, 0, 0],
    1: [15, 7, 3, 0, 0, 0, 0],
    2: [15, 7, 4, 3, 1, 0, 0],
    3: [15, 8, 5, 4, 2, 2, 1],
    4: [15, 9, 6, 5, 3, 2, 1],
    5: [15, 10, 7, 6, 4, 3, 2],
}
UNILEVEL_MAX_DEPTH = {0: 0, 1: 3, 2: 5, 3: 7, 4: 7, 5: 7}
STRUCTURE_BONUS_RATES = {3: 3, 4: 3.5, 5: 4}
POINT_RATE = 100
ORG_EXCEPTION_CODES = {"44504701", "89248801"}


def load_matrix_csv():
    """マトリックスCSV読み込み"""
    path = "/home/user/uploaded_files/ダウンラインレポート　マトリックス892488-01 (2).csv"
    if not os.path.exists(path):
        return {}
    members = {}
    with open(path, "r", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            mid = row["会員ID"]
            members[mid] = {
                "id": mid,
                "uplineId": row["紹介者ID"],
                "selfPt": int(row["当月ポイント"] or 0),
                "directAct": int(row["Act"] or 0),
                "status": row["ステイタス"],
                "name": row["氏名（表示名）"],
            }
    return members


def load_force_csv():
    """強制設定CSV読み込み"""
    path = "/home/user/uploaded_files/強制設定会員一覧_2026-06-02 - コピー (2).csv"
    if not os.path.exists(path):
        return {}
    force = {}
    with open(path, "r", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            code = row["会員コード"]
            force_lv_str = row.get("強制タイトル", "")
            force_act_str = row.get("強制アクティブ", "")
            lv = 0
            if "LV." in force_lv_str:
                try:
                    lv = int(force_lv_str.replace("LV.", ""))
                except Exception:
                    pass
            force_active = force_act_str not in ["—", "", "未選択", "なし"]
            force[code] = {
                "forceLevel": lv if lv > 0 else None,
                "forceActive": force_active,
            }
    return force


def verify_from_api(api_base, bonus_month):
    """tree-debug APIから計算結果を取得して検証"""
    try:
        import urllib.request
        import urllib.error
    except ImportError:
        print("urllib が利用できません")
        return

    print(f"\n{'='*60}")
    print(f"🔍 APIベース検証 - {bonus_month}")
    print(f"   API: {api_base}")
    print(f"{'='*60}")

    all_pass = True

    for code, exp in EXPECTED.items():
        url = f"{api_base}/api/admin/bonus-run/tree-debug?memberCode={code}&bonusMonth={bonus_month}"
        try:
            with urllib.request.urlopen(url, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            print(f"\n  ❌ {code}: HTTP Error {e.code}")
            all_pass = False
            continue
        except Exception as e:
            print(f"\n  ❌ {code}: Error - {e}")
            all_pass = False
            continue

        db_result = data.get("dbResult")
        if not db_result:
            print(f"\n  ⚠️  {code}: DBResult なし（計算未実行？）")
            continue

        actual_ulb = db_result.get("unilevelBonus", 0)
        actual_sb = db_result.get("structureBonus", 0)
        actual_min_series = db_result.get("minLinePoints", 0)
        actual_level = db_result.get("achievedLevel", 0)
        
        # tree-debugが独自計算した値も取得
        calc_ulb = data.get("unilevel", {}).get("calculatedUnilevelB", 0)
        calc_sb = data.get("structureBonus", {}).get("calculatedOrgBuildB", 0)
        calc_min_series = data.get("structureBonus", {}).get("selectedMinSeriesPt", 0)

        print(f"\n  === {code} ===")
        print(f"  Level: {actual_level} (DB) / 期待: {exp.get('sb_level', '?')}")

        # ULB検証
        if exp["ulb"] is not None:
            ulb_ok = actual_ulb == exp["ulb"]
            mark = "✅" if ulb_ok else "❌"
            print(f"  {mark} ULB: {actual_ulb:,} / 期待: {exp['ulb']:,}" + 
                  ("" if ulb_ok else f" (差: {actual_ulb - exp['ulb']:+,})"))
            if not ulb_ok:
                all_pass = False
        else:
            print(f"  ℹ️  ULB: {actual_ulb:,} (期待値なし)")

        # SB検証
        sb_ok = actual_sb == exp["sb"]
        mark = "✅" if sb_ok else "❌"
        print(f"  {mark} SB: {actual_sb:,} / 期待: {exp['sb']:,}" +
              ("" if sb_ok else f" (差: {actual_sb - exp['sb']:+,})"))
        if not sb_ok:
            all_pass = False

        # 最小系列PT検証
        if exp.get("min_series_pt") is not None:
            ms_ok = actual_min_series == exp["min_series_pt"]
            mark = "✅" if ms_ok else "❌"
            print(f"  {mark} 最小系列PT: {actual_min_series:,} / 期待: {exp['min_series_pt']:,}" +
                  ("" if ms_ok else f" (差: {actual_min_series - exp['min_series_pt']:+,})"))
            if not ms_ok:
                all_pass = False

        # series詳細
        series_pts = data.get("structureBonus", {}).get("seriesPtList", [])
        print(f"  系列PT一覧: {series_pts}")
        ul_detail = data.get("unilevel", {}).get("ulDetail", {})
        print(f"  UL段別: {ul_detail}")
        depth_pts = {k: v['pt'] for k, v in ul_detail.items()}
        print(f"  深さ別PT: {depth_pts}")

    print(f"\n{'='*60}")
    if all_pass:
        print("🎉 全検証項目 PASS!")
    else:
        print("❌ 一部の検証項目が FAIL")
    print(f"{'='*60}")

    return all_pass


def verify_from_csv(bonus_month):
    """CSVファイルからロジック検証（89248801配下の55名のみ）"""
    print(f"\n{'='*60}")
    print(f"🔍 CSVベース検証 - {bonus_month}")
    print(f"{'='*60}")

    members = load_matrix_csv()
    force = load_force_csv()

    if not members:
        print("  ⚠️  マトリックスCSVが見つかりません")
        return

    # forceActive/forceLevelを適用
    for code, f in force.items():
        if code in members:
            members[code]["forceActive"] = f.get("forceActive", False)
            members[code]["forceLevel"] = f.get("forceLevel")
        else:
            # マトリックスに存在しない会員もforce適用
            members[code] = {
                "id": code, "uplineId": None, "selfPt": 0,
                "directAct": 0, "status": "活動中", "name": code,
                "forceActive": f.get("forceActive", False),
                "forceLevel": f.get("forceLevel"),
            }

    # デフォルト値設定
    for mid in members:
        members[mid].setdefault("forceActive", False)
        members[mid].setdefault("forceLevel", None)

    # uplineIdベースのchildrenMap構築
    children = {}
    for mid, m in members.items():
        upline = m.get("uplineId", "")
        if upline:
            if upline not in children:
                children[upline] = []
            children[upline].append(mid)

    def is_active(mid):
        m = members.get(mid)
        if not m: return False
        if m.get("forceActive"): return True
        if m["status"] == "退会": return False
        return m["selfPt"] > 0

    def is_withdrawn(mid):
        m = members.get(mid)
        if not m: return True
        if m.get("forceActive"): return False
        return m["status"] == "退会"

    def calc_depth_points(root_id, level):
        max_depth = UNILEVEL_MAX_DEPTH.get(level, 0)
        depth_pts = {}

        def traverse(mid, depth):
            if depth > max_depth: return
            kids = children.get(mid, [])
            for kid in kids:
                if is_withdrawn(kid):
                    traverse(kid, depth)
                elif is_active(kid):
                    selfpt = members[kid]["selfPt"]
                    if selfpt > 0:
                        depth_pts[depth] = depth_pts.get(depth, 0) + selfpt
                    traverse(kid, depth + 1)
                else:
                    traverse(kid, depth)  # 非アクティブ: depth消費なし

        traverse(root_id, 1)
        return depth_pts

    def calc_ulb(mid, level, direct_act):
        m = members.get(mid)
        if not m: return 0, {}
        if direct_act < 2: return 0, {}
        self_pt = m["selfPt"]
        force_active = m.get("forceActive", False)
        if self_pt == 0 and not force_active: return 0, {}

        depth_pts = calc_depth_points(mid, level)
        rates = UNILEVEL_RATES.get(level, [])
        total = 0
        detail = {}
        for d in range(1, UNILEVEL_MAX_DEPTH.get(level, 0) + 1):
            pt = depth_pts.get(d, 0)
            rate = rates[d-1] if d-1 < len(rates) else 0
            if rate > 0 and pt > 0:
                bonus = int(pt * rate / 100 * POINT_RATE)
                detail[d] = bonus
                total += bonus
        return total, detail

    def calc_series_points(root_id):
        kids = children.get(root_id, [])
        series_pts = []
        for kid in kids:
            total = [0]

            def traverse_series(mid):
                if is_withdrawn(mid):
                    for desc in children.get(mid, []):
                        traverse_series(desc)
                    return
                m = members.get(mid)
                if m and m.get("forceActive"):
                    # forceActive: depth消費あり・pt加算なし
                    for desc in children.get(mid, []):
                        traverse_series(desc)
                    return
                if is_active(mid):
                    total[0] += members[mid]["selfPt"]
                for desc in children.get(mid, []):
                    traverse_series(desc)

            traverse_series(kid)
            if total[0] > 0:
                series_pts.append(total[0])
        return series_pts

    # 検証対象の計算
    targets = ["82179501", "44504701", "86820601", "93713601", "89248801"]
    
    print("\n注意: CSVは89248801配下の55名のみ。全体(381名)のデータはDBに存在。")
    print("     93713601の配下はCSVには存在しないため、正確な検証は不可。\n")

    for mid in targets:
        m = members.get(mid)
        exp = EXPECTED.get(mid, {})
        
        if not m:
            print(f"  {mid}: CSVにデータなし")
            continue

        direct_act = m["directAct"]
        self_pt = m["selfPt"]
        force_lv = m.get("forceLevel")
        force_active = m.get("forceActive", False)

        # レベル（マトリックスCSVにはレベルがないのでforceレベルを使用）
        level = force_lv or 0

        series_pts = calc_series_points(mid)
        min_series_pt = min(series_pts) if series_pts else 0
        series_count = len(series_pts)

        ulb, ulb_detail = calc_ulb(mid, level, direct_act)

        is_org_exception = mid in ORG_EXCEPTION_CODES
        min_required = 1 if is_org_exception else 3
        if is_active(mid) and direct_act >= 2 and level >= 3 and mid.endswith("01"):
            if series_count >= min_required and min_series_pt > 0:
                rate = STRUCTURE_BONUS_RATES.get(level, 0)
                sb = int(min_series_pt * rate / 100 * POINT_RATE)
            else:
                sb = 0
        else:
            sb = 0

        print(f"\n  === {mid} ({m.get('name', mid)}) ===")
        print(f"  selfPt={self_pt}, directAct={direct_act}, active={is_active(mid)}, forceActive={force_active}, forceLevel={force_lv}")
        print(f"  direct children: {children.get(mid, [])}")
        print(f"  series_pts: {series_pts}")
        print(f"  min_series_pt: {min_series_pt}")
        print(f"  [CSV計算] ULB={ulb:,}, SB={sb:,}, detail={ulb_detail}")
        
        if exp.get("ulb") is not None:
            ulb_ok = ulb == exp["ulb"]
            mark = "✅" if ulb_ok else "❌"
            print(f"  {mark} ULB: {ulb:,} / 期待: {exp['ulb']:,}")
        
        sb_ok = sb == exp.get("sb", 0)
        mark = "✅" if sb_ok else "❌"
        print(f"  {mark} SB: {sb:,} / 期待: {exp.get('sb', '?'):,}")
        
        if exp.get("min_series_pt") is not None:
            ms_ok = min_series_pt == exp["min_series_pt"]
            mark = "✅" if ms_ok else "❌"
            print(f"  {mark} 最小系列PT: {min_series_pt:,} / 期待: {exp['min_series_pt']:,}")


def print_summary():
    """期待値サマリー表示"""
    print("\n" + "="*60)
    print("📋 2026-04 検証基準（期待値）")
    print("="*60)
    print(f"{'会員コード':<12} {'ULB':>10} {'SB':>10} {'最小系列PT':>12} {'LV':>4}")
    print("-" * 55)
    for code, exp in EXPECTED.items():
        ulb_str = f"¥{exp['ulb']:,}" if exp["ulb"] is not None else "-"
        sb_str = f"¥{exp['sb']:,}"
        ms_str = f"{exp['min_series_pt']:,}" if exp.get("min_series_pt") else "-"
        lv_str = str(exp.get("sb_level", "?"))
        print(f"{code:<12} {ulb_str:>10} {sb_str:>10} {ms_str:>12} {lv_str:>4}")
    print("-" * 55)
    print(f"支払対象者数: {EXPECTED_PAY_COUNT}名")
    print("="*60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VIOLA Pure Bonus V1 Verification")
    parser.add_argument("--api-base", default="", help="API base URL (例: https://viola-pure.vercel.app)")
    parser.add_argument("--month", default="2026-04", help="ボーナス月 (default: 2026-04)")
    parser.add_argument("--csv-only", action="store_true", help="CSVベース検証のみ実行")
    args = parser.parse_args()

    print_summary()

    if not args.csv_only:
        verify_from_csv(args.month)

    if args.api_base:
        verify_from_api(args.api_base, args.month)
    else:
        print("\n💡 APIベース検証を実行するには --api-base を指定してください")
        print("   例: python3 scripts/verify-bonus-v1.py --api-base http://localhost:3000")
        print("\n   または Vercel URLを指定:")
        print("   例: python3 scripts/verify-bonus-v1.py --api-base https://viola-pure.vercel.app")
