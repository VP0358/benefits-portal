#!/usr/bin/env python3
"""
VIOLA Pure MLM Bonus Calculation Engine V2 - 完全検証スクリプト
===============================================================

使用ファイル:
  - /home/user/uploaded_files/matrix_892488_full.csv     ... 799行 (完全版)
  - /home/user/uploaded_files/bonus_list_full.csv        ... 796行 (完全版)
  - /home/user/uploaded_files/強制設定会員一覧_2026-06-02 - コピー (2).csv

検証対象:
  82179501: ULB=53,850, SB=35,700, minSeriesPT=10,200

アルゴリズム:
  - uplineChildrenMap: 紹介者ID(referrerId) + 強制設定の直上者コードでoverride
  - 前月ポイント列を使用（当月ポイントではない）
  - seriesCount = 直下全系列ルート数（0pt含む）
  - minPt = 0pt除外した系列の最小値
"""

import csv
import os
import sys
from collections import defaultdict

# ━━━ ファイルパス ━━━
MATRIX_CSV   = "/home/user/uploaded_files/matrix_892488_full.csv"
BONUS_CSV    = "/home/user/uploaded_files/bonus_list_full.csv"
FORCE_CSV    = "/home/user/uploaded_files/強制設定会員一覧_2026-06-02 - コピー (2).csv"

# ━━━ 定数 ━━━
POINT_RATE = 100
UNILEVEL_RATES = {
    0: [15, 7, 3,  0,  0,  0,  0],
    1: [15, 7, 3,  0,  0,  0,  0],
    2: [15, 7, 4,  3,  1,  0,  0],
    3: [15, 8, 5,  4,  2,  2,  1],
    4: [15, 9, 6,  5,  3,  2,  1],
    5: [15,10, 7,  6,  4,  3,  2],
}
UNILEVEL_MAX_DEPTH = {0: 0, 1: 3, 2: 5, 3: 7, 4: 7, 5: 7}
STRUCTURE_BONUS_RATES = {3: 3, 4: 3.5, 5: 4}
ORG_EXCEPTION_CODES = {"44504701", "89248801"}

# ━━━ 期待値 ━━━
EXPECTED = {
    "82179501": {"ulb": 53850,  "sb": 35700,  "min_series_pt": 10200, "series_count": 4, "level": 4},
    "44504701": {"ulb": 44850,  "sb": 122400, "min_series_pt": 30600, "level": 5},
    "86820601": {"ulb": 98550,  "sb": 16200,  "min_series_pt": None,  "level": 5},
    "93713601": {"ulb": 52650,  "sb": 4200,   "min_series_pt": None,  "level": 4},
    "89248801": {"ulb": 19950,  "sb": 122400, "min_series_pt": 30600, "level": 5},
}


# ════════════════════════════════════════════════
# Step 1: CSVロード
# ════════════════════════════════════════════════

def load_matrix() -> dict:
    """マトリックスCSV (799行) を読み込む。前月ポイントを使用。"""
    members = {}
    with open(MATRIX_CSV, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            mid = row["会員ID"].strip()
            if not mid:
                continue
            members[mid] = {
                "id":           mid,
                "name":         row["氏名（表示名）"].strip(),
                "referrerId":   row["紹介者ID"].strip(),          # = CSVの「紹介者ID」列
                "uplineId":     row["紹介者ID"].strip(),          # 初期値=referrerId、force CSVでoverride
                "selfPt":       int(row["前月ポイント"].strip() or 0),  # ←前月ポイント使用
                "selfPt_cur":   int(row["当月ポイント"].strip() or 0),
                "directRefCnt": int(row["直紹"].strip() or 0),
                "actCnt":       int(row["Act"].strip() or 0),
                "status":       row["ステイタス"].strip(),
                "forceActive":  False,
                "forceLevel":   None,
            }
    return members


def load_force() -> dict:
    """強制設定CSV (20行) を読み込む。"""
    force = {}
    with open(FORCE_CSV, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code       = row["会員コード"].strip()
            upline_cd  = row["直上者コード"].strip()   # = DBのuplineId
            force_act  = row["強制アクティブ"].strip()
            force_lv   = row["強制タイトル"].strip()

            lv = None
            if "LV." in force_lv:
                try:
                    lv = int(force_lv.replace("LV.", ""))
                except ValueError:
                    pass

            active = force_act == "有効"

            force[code] = {
                "uplineId":    upline_cd if upline_cd else None,
                "forceActive": active,
                "forceLevel":  lv,
            }
    return force


def load_bonus() -> dict:
    """ボーナス取得者一覧CSV (796行) を読み込む。"""
    bonus = {}
    with open(BONUS_CSV, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            mid = row["会員番号"].strip()
            if not mid:
                continue
            def to_int(v):
                v = v.strip().replace(",", "")
                try:
                    return int(v) if v else 0
                except ValueError:
                    return 0

            def parse_level(v):
                """'LV.4' → 4, '未設定'→0, '取得レベルなし'→0"""
                v = v.strip()
                if v.startswith("LV."):
                    try:
                        return int(v[3:])
                    except ValueError:
                        return 0
                return 0

            def parse_active(v):
                v = v.strip()
                return 1 if v == "○" else 0

            bonus[mid] = {
                "ulb":            to_int(row["ユニレベルB"]),
                "sb":             to_int(row["組織構築B"]),
                "other_pos":      to_int(row["他ポジション"]),
                "min_series_pt":  to_int(row["最小系列pt"]),
                "series_count":   to_int(row["系列"]),
                "group_pt":       to_int(row["グループpt"]),
                "self_pt":        to_int(row["自己購入pt"]),
                "direct_act":     to_int(row["直ACT"]),
                "level_cur":      parse_level(row["当月判定レベル"]),
                "level_force":    parse_level(row["強制レベル"]),
                "active":         parse_active(row["ｱｸﾃｨﾌﾞ"]),
            }
    return bonus


# ════════════════════════════════════════════════
# Step 2: ツリー構築
# ════════════════════════════════════════════════

def build_trees(members: dict, force: dict):
    """
    uplineChildrenMap: uplineId → [children]  (SB/ULB計算用)
    referrerChildrenMap: referrerId → [children] (DAC計算用、今回は不使用)

    uplineId の決定ルール:
      1. 強制設定CSVに直上者コードがある → それをuplineIdとして使う
      2. それ以外 → マトリックスCSVの「紹介者ID」をuplineIdとして使う
    """
    # Force CSVのoverride適用
    for code, f in force.items():
        if code not in members:
            # マトリックスにいない会員もforce情報を持つ場合 → 追加
            members[code] = {
                "id": code, "name": code, "referrerId": "",
                "uplineId": f["uplineId"] or "",
                "selfPt": 0, "selfPt_cur": 0,
                "directRefCnt": 0, "actCnt": 0, "status": "活動中",
                "forceActive": f["forceActive"],
                "forceLevel":  f["forceLevel"],
            }
        else:
            members[code]["forceActive"] = f["forceActive"]
            members[code]["forceLevel"]  = f["forceLevel"]
            # uplineId を直上者コードでoverride（空でない場合）
            if f["uplineId"]:
                members[code]["uplineId"] = f["uplineId"]

    # uplineChildrenMap 構築
    upline_children = defaultdict(list)
    for mid, m in members.items():
        uid = m.get("uplineId", "")
        if uid and uid != mid:
            upline_children[uid].append(mid)

    return dict(upline_children)


# ════════════════════════════════════════════════
# Step 3: アクティブ判定
# ════════════════════════════════════════════════

def is_active(mid: str, members: dict) -> bool:
    m = members.get(mid)
    if not m:
        return False
    if m["forceActive"]:
        return True
    if m["status"] in ("退会", "失効"):
        return False
    return m["selfPt"] > 0


def is_withdrawn(mid: str, members: dict) -> bool:
    m = members.get(mid)
    if not m:
        return True
    if m["forceActive"]:
        return False
    return m["status"] in ("退会", "失効")


# ════════════════════════════════════════════════
# Step 4: 系列ポイント計算
# ════════════════════════════════════════════════

def calc_series_points(root_id: str, members: dict, upline_children: dict):
    """
    直下の各系列ルートに対してポイントを集計する。

    seriesCount = 直下全系列ルート数（0pt含む）
    minPt       = 0pt除外した系列の最小値
    seriesPtList = 各系列のpt（0ptも含む）
    """
    direct_children = upline_children.get(root_id, [])
    series_pts_all = []   # 0pt含む全系列

    for child_id in direct_children:
        series_total = [0]

        def traverse_series(mid):
            if is_withdrawn(mid, members):
                # 退会/失効: 透過（depth消費なし）
                for desc in upline_children.get(mid, []):
                    traverse_series(desc)
                return

            m = members.get(mid)
            if m and m["forceActive"]:
                # forceActive: depth消費あり・pt加算なし
                for desc in upline_children.get(mid, []):
                    traverse_series(desc)
                return

            # 通常: アクティブならpt加算
            if is_active(mid, members):
                series_total[0] += members[mid]["selfPt"]

            for desc in upline_children.get(mid, []):
                traverse_series(desc)

        traverse_series(child_id)
        series_pts_all.append(series_total[0])

    # seriesCount = 全直下系列ルート数（0pt含む）
    series_count = len(direct_children)

    # minPt = 0pt除外した系列の最小値
    non_zero_pts = [p for p in series_pts_all if p > 0]
    min_pt = min(non_zero_pts) if non_zero_pts else 0

    return {
        "series_count":   series_count,       # 全系列数（0pt含む）
        "min_pt":         min_pt,             # 0pt除外の最小値
        "series_pts_all": series_pts_all,     # 全系列pt（0pt含む）
        "non_zero_pts":   non_zero_pts,       # 0pt除外した系列pt
    }


# ════════════════════════════════════════════════
# Step 5: 組織構築B計算
# ════════════════════════════════════════════════

def calc_structure_bonus(
    mid: str, level: int, series_info: dict, members: dict, upline_children: dict,
    direct_act: int
) -> int:
    """
    組織構築B計算
    資格:
      - ACTIVE
      - directAct >= 2
      - level >= 3
      - 01ポジション (memberCodeが "01" で終わる)
      - seriesCount >= 3（ORG_EXCEPTIONは1以上）
      - minPt > 0
    """
    m = members.get(mid)
    if not m:
        return 0

    # 01ポジション確認
    if not mid.endswith("01"):
        return 0

    # ACTIVE確認
    if not is_active(mid, members):
        return 0

    # directAct確認
    if direct_act < 2:
        return 0

    # レベル確認
    if level < 3:
        return 0

    series_count = series_info["series_count"]
    min_pt       = series_info["min_pt"]

    is_exception = mid in ORG_EXCEPTION_CODES
    min_required = 1 if is_exception else 3

    if series_count < min_required:
        return 0
    if min_pt == 0:
        return 0

    rate = STRUCTURE_BONUS_RATES.get(level, 0)
    bonus = int(min_pt * (rate / 100) * POINT_RATE)
    return bonus


# ════════════════════════════════════════════════
# Step 6: ユニレベルB計算
# ════════════════════════════════════════════════

def calc_ulb(
    mid: str, level: int, direct_act: int, members: dict, upline_children: dict
) -> tuple:
    """
    ユニレベルB計算
    資格:
      - ACTIVE (selfPt>0 or forceActive)
      - directAct >= 2
    """
    m = members.get(mid)
    if not m:
        return 0, {}

    if not is_active(mid, members):
        return 0, {}

    if direct_act < 2:
        return 0, {}

    max_depth = UNILEVEL_MAX_DEPTH.get(level, 0)
    if max_depth == 0:
        return 0, {}

    rates = UNILEVEL_RATES.get(level, [])
    depth_pts = defaultdict(int)

    def traverse_ul(curr_id, depth):
        if depth > max_depth:
            return
        for child_id in upline_children.get(curr_id, []):
            if is_withdrawn(child_id, members):
                # 退会: 透過
                traverse_ul(child_id, depth)
            elif is_active(child_id, members):
                pt = members[child_id]["selfPt"]
                if pt > 0:
                    depth_pts[depth] += pt
                traverse_ul(child_id, depth + 1)
            else:
                # 非アクティブ: depth消費あり、pt加算なし
                traverse_ul(child_id, depth + 1)

    traverse_ul(mid, 1)

    total = 0
    detail = {}
    for d in range(1, max_depth + 1):
        pt   = depth_pts.get(d, 0)
        rate = rates[d - 1] if (d - 1) < len(rates) else 0
        if rate > 0 and pt > 0:
            bonus = int(pt * rate / 100 * POINT_RATE)
            detail[d] = {"pt": pt, "rate": rate, "bonus": bonus}
            total += bonus

    return total, detail


# ════════════════════════════════════════════════
# Step 7: 系列別詳細デバッグ（82179501専用）
# ════════════════════════════════════════════════

def debug_series_82179501(members: dict, upline_children: dict):
    root = "82179501"
    direct_kids = upline_children.get(root, [])
    print(f"\n{'='*60}")
    print(f"  系列PT詳細デバッグ: {root}")
    print(f"{'='*60}")
    print(f"  直下系列ルート数: {len(direct_kids)}")
    print(f"  直下: {direct_kids}")

    for kid in direct_kids:
        series_total = [0]
        member_list = []

        def traverse_detail(mid, depth=0):
            if is_withdrawn(mid, members):
                for desc in upline_children.get(mid, []):
                    traverse_detail(desc, depth)
                return

            m = members.get(mid)
            prefix = "  " * depth
            force_act = m["forceActive"] if m else False
            pt = m["selfPt"] if m else 0
            active = is_active(mid, members)

            if force_act:
                member_list.append(f"{prefix}[FA] {mid}({m.get('name','?')}) pt={pt} (depth消費あり・pt加算なし)")
                for desc in upline_children.get(mid, []):
                    traverse_detail(desc, depth + 1)
                return

            if active and pt > 0:
                series_total[0] += pt
                member_list.append(f"{prefix}[ACT] {mid}({m.get('name','?')}) pt={pt} ✓加算")
            else:
                member_list.append(f"{prefix}[ - ] {mid}({m.get('name','?')}) pt={pt} active={active}")

            for desc in upline_children.get(mid, []):
                traverse_detail(desc, depth + 1)

        traverse_detail(kid, 1)
        print(f"\n  --- 系列ルート: {kid}({members.get(kid, {}).get('name','?')}) ---")
        for line in member_list:
            print(f"    {line}")
        print(f"  系列計: {series_total[0]} pt")


def debug_ulb_82179501(members: dict, upline_children: dict, level: int):
    root = "82179501"
    max_depth = UNILEVEL_MAX_DEPTH.get(level, 0)
    rates = UNILEVEL_RATES.get(level, [])
    print(f"\n{'='*60}")
    print(f"  ULB詳細デバッグ: {root} (LV{level}, max_depth={max_depth})")
    print(f"{'='*60}")

    depth_pts = defaultdict(int)
    depth_members = defaultdict(list)

    def traverse_ul_debug(curr_id, depth):
        if depth > max_depth:
            return
        for child_id in upline_children.get(curr_id, []):
            m = members.get(child_id, {})
            name = m.get("name", "?")
            pt   = m.get("selfPt", 0)
            fa   = m.get("forceActive", False)
            wd   = is_withdrawn(child_id, members)
            ac   = is_active(child_id, members)

            if wd:
                depth_members[depth].append(f"[WD透過] {child_id}({name})")
                traverse_ul_debug(child_id, depth)
            elif ac:
                if pt > 0:
                    depth_pts[depth] += pt
                    depth_members[depth].append(f"[ACT] {child_id}({name}) +{pt}pt")
                else:
                    depth_members[depth].append(f"[FA/0pt] {child_id}({name}) pt=0")
                traverse_ul_debug(child_id, depth + 1)
            else:
                depth_members[depth].append(f"[非ACT] {child_id}({name}) pt={pt}")
                traverse_ul_debug(child_id, depth + 1)

    traverse_ul_debug(root, 1)

    total = 0
    for d in range(1, max_depth + 1):
        pt   = depth_pts.get(d, 0)
        rate = rates[d - 1] if (d - 1) < len(rates) else 0
        bonus = int(pt * rate / 100 * POINT_RATE) if (rate > 0 and pt > 0) else 0
        total += bonus
        members_at_d = depth_members.get(d, [])
        print(f"  段{d}: pt={pt:,} × {rate}% × {POINT_RATE} = {bonus:,}")
        if members_at_d:
            for info in members_at_d[:5]:
                print(f"       {info}")
            if len(members_at_d) > 5:
                print(f"       ... 他{len(members_at_d)-5}名")

    print(f"\n  ULB合計: {total:,}")
    return total


# ════════════════════════════════════════════════
# Step 8: メイン検証
# ════════════════════════════════════════════════

def main():
    print("\n" + "=" * 60)
    print("VIOLA Pure MLM Bonus V2 検証スクリプト")
    print("=" * 60)

    # --- CSV読み込み ---
    print("\n[1] CSVファイル読み込み")
    members = load_matrix()
    print(f"  マトリックスCSV: {len(members)} 件")

    force = load_force()
    print(f"  強制設定CSV: {len(force)} 件")

    bonus_csv = load_bonus()
    print(f"  ボーナスCSV: {len(bonus_csv)} 件")

    assert len(members) == 799, f"マトリックス件数エラー: {len(members)} (期待:799)"
    assert len(bonus_csv) == 796, f"ボーナス件数エラー: {len(bonus_csv)} (期待:796)"
    print("  ✅ 件数チェック: 799 / 796 ともに一致")

    # --- ツリー構築 ---
    print("\n[2] ツリー構築 (uplineChildrenMap)")
    upline_children = build_trees(members, force)

    # 82179501の直下確認
    root = "82179501"
    direct_kids = upline_children.get(root, [])
    print(f"  {root}の直下系列: {direct_kids}")
    assert len(direct_kids) == 4, f"直下系列数エラー: {len(direct_kids)} (期待:4)"
    print(f"  ✅ 直下4系列確認: {direct_kids}")

    # --- 系列PT詳細 ---
    debug_series_82179501(members, upline_children)

    # --- 系列ポイント計算 ---
    print(f"\n[3] 系列ポイント計算: {root}")
    series_info = calc_series_points(root, members, upline_children)
    print(f"  series_count (全系列数, 0pt含む): {series_info['series_count']}")
    print(f"  series_pts_all: {series_info['series_pts_all']}")
    print(f"  non_zero_pts:   {series_info['non_zero_pts']}")
    print(f"  min_pt (0pt除外の最小値): {series_info['min_pt']}")

    # --- レベル・directAct 取得 ---
    # forceLevelを優先、なければCSVのAct列は「ACT数」、levelは強制設定から
    m82 = members.get(root, {})
    level = m82.get("forceLevel") or 0
    direct_act = m82.get("actCnt", 0)

    # ボーナスCSVからの参照値
    bcsv = bonus_csv.get(root, {})
    level_from_csv = bcsv.get("level_force") or bcsv.get("level_cur") or level
    direct_act_from_csv = bcsv.get("direct_act", direct_act)

    print(f"\n  forceLevel: {level} / ボーナスCSV強制レベル: {level_from_csv}")
    print(f"  actCnt(マトリックス): {direct_act} / ボーナスCSV直ACT: {direct_act_from_csv}")

    # ボーナスCSVの値を優先使用
    use_level = level_from_csv if level_from_csv > 0 else level
    use_direct_act = direct_act_from_csv if direct_act_from_csv > 0 else direct_act

    print(f"  使用レベル: {use_level}, 使用直ACT: {use_direct_act}")

    # --- SB計算 ---
    print(f"\n[4] 組織構築B計算: {root}")
    sb = calc_structure_bonus(root, use_level, series_info, members, upline_children, use_direct_act)
    exp_sb = EXPECTED[root]["sb"]
    exp_min = EXPECTED[root]["min_series_pt"]
    exp_sc  = EXPECTED[root].get("series_count", "?")

    mark_sc   = "✅" if series_info["series_count"] == exp_sc  else "❌"
    mark_min  = "✅" if series_info["min_pt"] == exp_min       else "❌"
    mark_sb   = "✅" if sb == exp_sb                           else "❌"

    print(f"  {mark_sc} series_count: {series_info['series_count']} / 期待: {exp_sc}")
    print(f"  {mark_min} min_series_pt: {series_info['min_pt']:,} / 期待: {exp_min:,}")
    print(f"  {mark_sb} SB: {sb:,} / 期待: {exp_sb:,}")
    if sb != exp_sb:
        rate = STRUCTURE_BONUS_RATES.get(use_level, 0)
        print(f"  計算式: floor({series_info['min_pt']} × {rate}/100 × {POINT_RATE}) = {sb}")

    # --- ULB計算 ---
    print(f"\n[5] ユニレベルB計算: {root}")
    ulb, ulb_detail = calc_ulb(root, use_level, use_direct_act, members, upline_children)

    # ULBデバッグ出力
    debug_ulb_82179501(members, upline_children, use_level)

    exp_ulb = EXPECTED[root]["ulb"]
    mark_ulb = "✅" if ulb == exp_ulb else "❌"
    print(f"\n  {mark_ulb} ULB: {ulb:,} / 期待: {exp_ulb:,}")

    if ulb != exp_ulb:
        print(f"  差分: {ulb - exp_ulb:+,}")
        diff_pt = (ulb - exp_ulb) // 15  # LV4 段1 レート15%
        print(f"  段1レート15%換算での差分pt: {diff_pt}")

    # ━━━ 最終サマリー ━━━
    print(f"\n{'='*60}")
    print(f"  82179501 検証サマリー")
    print(f"{'='*60}")
    all_pass = True

    checks = [
        ("系列数(seriesCount)", series_info["series_count"], exp_sc),
        ("最小系列PT(minPt)",   series_info["min_pt"],       exp_min),
        ("組織構築B(SB)",       sb,                          exp_sb),
        ("ユニレベルB(ULB)",    ulb,                         exp_ulb),
    ]
    for name, actual, expected in checks:
        ok = actual == expected
        mark = "✅" if ok else "❌"
        print(f"  {mark} {name}: {actual:,} / 期待: {expected:,}")
        if not ok:
            all_pass = False

    # ━━━ ボーナスCSVとの比較 ━━━
    print(f"\n{'='*60}")
    print(f"  ボーナスCSV実績との比較 (82179501)")
    print(f"{'='*60}")
    if bcsv:
        print(f"  CSV ULB:          {bcsv.get('ulb', '?'):,}")
        print(f"  CSV SB:           {bcsv.get('sb', '?'):,}")
        print(f"  CSV min_series:   {bcsv.get('min_series_pt', '?'):,}")
        print(f"  CSV series_count: {bcsv.get('series_count', '?')}")
        print(f"  CSV group_pt:     {bcsv.get('group_pt', '?'):,}")
        print(f"  CSV self_pt:      {bcsv.get('self_pt', '?'):,}")
        print(f"  CSV direct_act:   {bcsv.get('direct_act', '?')}")
        print(f"  CSV level_cur:    {bcsv.get('level_cur', '?')}")
        print(f"  CSV level_force:  {bcsv.get('level_force', '?')}")
    else:
        print("  ⚠️  82179501はボーナスCSVに存在しません")

    print(f"\n{'='*60}")
    if all_pass:
        print("  🎉 全項目 PASS!")
    else:
        print("  ❌ 一部の項目が FAIL")
    print(f"{'='*60}\n")

    return all_pass


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
