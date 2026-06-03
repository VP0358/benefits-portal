#!/usr/bin/env python3
"""
full-evidence-trace.py
======================
証拠ベースの実データ出力スクリプト

出力内容:
  Part 1: CSVデータ件数サマリー
  Part 2: 95446801系列 全会員一覧（position_id/member_code/upline_id/self_pt）
  Part 3: CSV vs ボーナスCSVの差分一覧（実データ）
  Part 4: 82179501 ULB段別詳細証跡（段1〜7、会員単位）
  Part 5: tree-debug模倣JSON出力（5名分）

重要なソースコードの発見（lib/bonus-calculation-engine-v1.ts）:
  - calcDepthPointsV1 (ULB用): 非アクティブ → 透過（depth消費なし）
  - calcGroupPointsV1 (groupPt用): 非アクティブ → depth消費あり
  - groupPt = selfPt（自己）+ 配下7段以内のACT pt（FA含む、FA自身のpt=0）
  - visitedセットなし（循環なし前提）

残差の原因仮説:
  - マトリックスCSVの「紹介者ID」列をuplineIdとして使用（初期値）
  - 強制設定CSVでuplineIdをoverride（19件）
  - DBには追加のuplineId設定があり、CSVに反映されていない可能性
  - 差分 = DB専有データ（CSVにない uplineId設定）
"""

import csv
import json
from collections import defaultdict

MATRIX_CSV = "/home/user/uploaded_files/matrix_892488_full.csv"
BONUS_CSV  = "/home/user/uploaded_files/bonus_list_full.csv"
FORCE_CSV  = "/home/user/uploaded_files/強制設定会員一覧_2026-06-02 - コピー (2).csv"

POINT_RATE = 100
# 全レベルの段別レート（lib/mlm-bonus.ts の UNILEVEL_RATES と一致）
ULB_RATES  = {
    0: [15, 7, 3,  0,  0,  0,  0],
    1: [15, 7, 3,  0,  0,  0,  0],
    2: [15, 7, 4,  3,  1,  0,  0],
    3: [15, 8, 5,  4,  2,  2,  1],
    4: [15, 9, 6,  5,  3,  2,  1],
    5: [15, 10, 7, 6,  4,  3,  2],
}
# 全レベルの最大深さ（lib/mlm-bonus.ts の UNILEVEL_MAX_DEPTH と一致）
ULB_DEPTHS = {
    0: 0,
    1: 3,
    2: 5,
    3: 7,
    4: 7,
    5: 7,
}
STRUCTURE_BONUS_RATES = {3: 3, 4: 3.5, 5: 4}
ORG_EXCEPTION_CODES = {"44504701", "89248801"}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# データロード
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def load_all():
    force_info = {}
    with open(FORCE_CSV, "r", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            code   = row["会員コード"].strip()
            upline = row["直上者コード"].strip()
            act    = row["強制アクティブ"].strip() == "有効"
            lv_str = row["強制タイトル"].strip()
            lv = None
            if "LV." in lv_str:
                try: lv = int(lv_str.replace("LV.", ""))
                except: pass
            force_info[code] = {"uplineId": upline, "forceActive": act, "forceLevel": lv}

    members = {}
    with open(MATRIX_CSV, "r", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            mid = row["会員ID"].strip()
            members[mid] = {
                "id":          mid,
                "name":        row["氏名（表示名）"].strip(),
                "referrerId":  row["紹介者ID"].strip(),
                "uplineId":    row["紹介者ID"].strip(),  # 初期値=紹介者ID
                "selfPt":      int(row["前月ポイント"].strip() or 0),
                "status":      row["ステイタス"].strip(),
                "forceActive": False,
                "forceLevel":  None,
                "source":      "CSV",
            }

    for code, info in force_info.items():
        if code not in members:
            members[code] = {
                "id": code, "name": code, "referrerId": "",
                "uplineId": info["uplineId"], "selfPt": 0, "status": "活動中",
                "forceActive": info["forceActive"], "forceLevel": info["forceLevel"],
                "source": "FORCE_CSV_ONLY",
            }
        else:
            members[code]["forceActive"] = info["forceActive"]
            members[code]["forceLevel"]  = info["forceLevel"]
            if info["uplineId"]:
                members[code]["uplineId"] = info["uplineId"]

    bonus = {}
    with open(BONUS_CSV, "r", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            mid = row["会員番号"].strip()
            def ti(v):
                v = v.strip().replace(",", "")
                try: return int(v)
                except: return 0
            bonus[mid] = {
                "ulb":            ti(row["ユニレベルB"]),
                "sb":             ti(row["組織構築B"]),
                "min_series_pt":  ti(row["最小系列pt"]),
                "series_count":   ti(row["系列"]),
                "group_pt":       ti(row["グループpt"]),
                "self_pt":        ti(row["自己購入pt"]),
                "direct_act":     ti(row["直ACT"]),
            }

    upline_ch = defaultdict(list)
    referrer_ch = defaultdict(list)
    for mid, m in members.items():
        uid = m.get("uplineId", "")
        if uid and uid != mid:
            upline_ch[uid].append(mid)
        rid = m.get("referrerId", "")
        if rid and rid != mid:
            referrer_ch[rid].append(mid)

    return members, upline_ch, referrer_ch, bonus, force_info


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 基本判定関数
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def is_withdrawn(mid, members):
    m = members.get(mid)
    if not m: return True
    if m["forceActive"]: return False
    return m["status"] in ("退会", "失効")

def is_active(mid, members):
    m = members.get(mid)
    if not m: return False
    if m["forceActive"]: return True
    if m["status"] in ("退会", "失効"): return False
    return m["selfPt"] > 0


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ULB計算（ソース通り: 非ACT透過、visitedなし）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def calc_ulb_v1(root_id, members, upline_ch, achieved_level=4):
    max_depth = ULB_DEPTHS.get(achieved_level, 0)
    rates     = ULB_RATES.get(achieved_level, [])
    if max_depth == 0:
        return 0, defaultdict(int), defaultdict(list), {}, []

    depth_pts     = defaultdict(int)
    depth_members = defaultdict(list)   # depth -> [{member_code, self_pt, mark, ...}]
    ul_trace      = []

    def traverse(curr_id, depth):
        if depth > max_depth: return
        for ch_id in upline_ch.get(curr_id, []):
            mc = members.get(ch_id, {})
            wd = is_withdrawn(ch_id, members)
            fa = mc.get("forceActive", False)
            ac = is_active(ch_id, members)
            pt = mc.get("selfPt", 0)

            info = {
                "member_code": ch_id,
                "name":        mc.get("name", "?"),
                "self_pt":     pt,
                "status":      mc.get("status", "?"),
                "forceActive": fa,
                "withdrawn":   wd,
                "active":      ac,
                "depth":       depth,
            }

            if wd:
                info["mark"] = "退会透過"
                depth_members[depth].append(info)
                ul_trace.append({"depth": depth, "id": ch_id, "action": "withdrawn_passthrough"})
                traverse(ch_id, depth)           # depth消費なし（透過）
            elif ac:
                if not fa and pt > 0:
                    info["mark"] = "ACT+pt"
                    depth_pts[depth] += pt
                    ul_trace.append({"depth": depth, "id": ch_id, "pt": pt, "action": "active_counted"})
                elif fa:
                    info["mark"] = "FA(depth消費)"
                    ul_trace.append({"depth": depth, "id": ch_id, "pt": 0, "action": "fa_no_pt"})
                else:
                    info["mark"] = "ACT(pt=0)"
                    ul_trace.append({"depth": depth, "id": ch_id, "pt": 0, "action": "active_no_pt"})
                depth_members[depth].append(info)
                traverse(ch_id, depth + 1)       # depth消費あり
            else:
                # 非アクティブ: depth消費なし（透過） ← ソース確認済み
                info["mark"] = "非ACT透過"
                depth_members[depth].append(info)
                ul_trace.append({"depth": depth, "id": ch_id, "action": "inactive_passthrough"})
                traverse(ch_id, depth)            # depth消費なし（透過）

    traverse(root_id, 1)

    total = 0
    detail = {}
    for d in range(1, max_depth + 1):
        pt   = depth_pts[d]
        rate = rates[d - 1] if d - 1 < len(rates) else 0
        bonus = int(pt * rate / 100 * POINT_RATE) if pt > 0 and rate > 0 else 0
        if bonus > 0:
            detail[d] = bonus
        total += bonus

    return total, depth_pts, depth_members, detail, ul_trace


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# groupPt計算（ソース通り: 自己PT含む, 非ACTはdepth消費あり）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def calc_group_pt(root_id, members, upline_ch, max_depth=7):
    m  = members.get(root_id, {})
    gp = m.get("selfPt", 0)   # 自己PT（FAならselfPt=0）

    def traverse(curr_id, depth):
        nonlocal gp
        if depth > max_depth: return
        for ch_id in upline_ch.get(curr_id, []):
            mc = members.get(ch_id, {})
            wd = is_withdrawn(ch_id, members)
            ac = is_active(ch_id, members)
            pt = mc.get("selfPt", 0)
            if wd:
                traverse(ch_id, depth)        # 退会透過
            elif ac:
                gp += pt                      # FAなら pt=0
                traverse(ch_id, depth + 1)
            else:
                traverse(ch_id, depth + 1)    # 非ACTはdepth消費

    traverse(root_id, 1)
    return gp


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 系列PT計算（SB用）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def calc_series_points(root_id, members, upline_ch):
    direct_children = upline_ch.get(root_id, [])
    series_pt_list  = []
    series_detail   = {}

    for child_id in direct_children:
        series_total = [0]
        members_in_series = []

        def traverse_series(curr_id):
            mc = members.get(curr_id, {})
            if not mc: return
            wd = is_withdrawn(curr_id, members)
            fa = mc.get("forceActive", False)
            ac = is_active(curr_id, members)
            pt = mc.get("selfPt", 0)

            if wd:
                for desc in upline_ch.get(curr_id, []):
                    traverse_series(desc)
                return
            if fa:
                members_in_series.append({"id": curr_id, "pt": 0, "mark": "FA(透過)"})
                for desc in upline_ch.get(curr_id, []):
                    traverse_series(desc)
                return
            if ac and pt > 0:
                series_total[0] += pt
                members_in_series.append({"id": curr_id, "pt": pt, "mark": "ACT+pt"})
            else:
                members_in_series.append({"id": curr_id, "pt": 0, "mark": "ACT(pt=0)" if ac else "非ACT"})
            for desc in upline_ch.get(curr_id, []):
                traverse_series(desc)

        traverse_series(child_id)
        series_pt_list.append(series_total[0])
        series_detail[child_id] = {
            "seriesPt": series_total[0],
            "members":  members_in_series,
        }

    series_count = len(direct_children)
    non_zero_pts = [p for p in series_pt_list if p > 0]
    min_pt       = min(non_zero_pts) if non_zero_pts else 0

    return series_pt_list, min_pt, series_count, series_detail


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SB計算
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def calc_structure_bonus(root_id, member_code, members, upline_ch, referrer_ch, achieved_level, bonus):
    m = members.get(root_id, {})
    active = is_active(root_id, members)
    if not active: return 0, 0, 0, [], {}

    # 直接紹介アクティブ数（referrerChildrenを使用）
    direct_children = referrer_ch.get(root_id, [])
    direct_act = 0
    for ch_id in direct_children:
        if not is_withdrawn(ch_id, members) and is_active(ch_id, members):
            direct_act += 1

    if direct_act < 2: return 0, 0, 0, [], {}
    if achieved_level < 3: return 0, 0, 0, [], {}

    # isFirstPosition（末尾2桁が01）
    if not (member_code.endswith("01") and len(member_code) >= 2):
        return 0, 0, 0, [], {}

    series_pt_list, min_pt, series_count, series_detail = calc_series_points(root_id, members, upline_ch)

    is_exception = member_code in ORG_EXCEPTION_CODES
    min_required = 1 if is_exception else 3

    positive_series = sum(1 for p in series_pt_list if p > 0)

    if series_count < min_required or min_pt == 0:
        return 0, min_pt, series_count, series_pt_list, series_detail

    rate  = STRUCTURE_BONUS_RATES.get(achieved_level, 0)
    sb    = int(min_pt * (rate / 100) * POINT_RATE)
    return sb, min_pt, series_count, series_pt_list, series_detail


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Part 1: CSVデータ件数サマリー
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def part1_summary(members, upline_ch, bonus):
    print("=" * 80)
    print("Part 1: CSVデータ件数サマリー")
    print("=" * 80)

    matrix_ids = set(members.keys())
    bonus_ids  = set(bonus.keys())
    only_bonus  = bonus_ids - matrix_ids
    only_matrix = matrix_ids - bonus_ids

    print(f"  マトリックスCSV会員数:             {len(matrix_ids)} 件")
    print(f"  ボーナスCSV会員数:                 {len(bonus_ids)} 件")
    print(f"  両方に存在:                        {len(bonus_ids & matrix_ids)} 件")
    print(f"  ボーナスCSVのみ（DBにのみ存在）:   {len(only_bonus)} 件  ← 証拠数")
    print(f"  マトリックスCSVのみ（ボーナス対象外）: {len(only_matrix)} 件")
    print()
    if only_bonus:
        print("  【ボーナスCSVにあるがマトリックスCSVにない会員（実データ）】")
        print(f"  {'会員番号':<14} {'ULB':>8} {'SB':>8} {'grouppt':>8} {'selfpt':>8}")
        print("  " + "-" * 55)
        for mid in sorted(only_bonus):
            b = bonus[mid]
            print(f"  {mid:<14} {b['ulb']:>8,} {b['sb']:>8,} {b['group_pt']:>8,} {b['self_pt']:>8,}")
    else:
        print("  → ボーナスCSVにあってマトリックスCSVにない会員: 0名")
        print("  → 「DBにのみ存在する会員」をCSVから特定することは不可能")
        print("  → 差分の原因は「uplineIdのDB設定とCSV設定の不一致」である可能性が高い")
    print()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Part 2: 95446801系列 全会員一覧
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def part2_95446801_series(members, upline_ch, bonus):
    root = "95446801"
    print("=" * 90)
    print("Part 2: 95446801系列 全会員一覧")
    print("  ※ position_id = member_code（CSVの会員ID = DBのbigint IDに相当）")
    print("  ※ upline_id = 強制設定CSVでoverride後の値（= DBのuplineIdと同じはず）")
    print("=" * 90)
    print(f"  {'#':>4} {'member_code':<14} {'upline_id':<14} {'self_pt':>8} {'FA':>4} {'WD':>4} {'ACT':>4} {'status':<14} 名前")
    print("  " + "-" * 85)

    visited = set()
    all_rows = []

    def traverse(mid, depth=0):
        if mid in visited: return
        visited.add(mid)
        m  = members.get(mid, {})
        wd = is_withdrawn(mid, members)
        fa = m.get("forceActive", False)
        ac = is_active(mid, members)
        pt = m.get("selfPt", 0)
        uid = m.get("uplineId", "")
        all_rows.append({
            "depth": depth, "member_code": mid, "upline_id": uid,
            "self_pt": pt, "status": m.get("status", "?"),
            "forceActive": fa, "withdrawn": wd, "active": ac,
            "name": m.get("name", "?"),
        })
        for ch in upline_ch.get(mid, []):
            traverse(ch, depth + 1)

    traverse(root)

    act_count = 0
    act_pt    = 0
    for i, r in enumerate(all_rows, 1):
        fa_m  = "FA" if r["forceActive"] else "-"
        wd_m  = "WD" if r["withdrawn"]   else "-"
        act_m = "ACT" if r["active"]     else "-"
        print(f"  {i:>4} {r['member_code']:<14} {r['upline_id']:<14} {r['self_pt']:>8} "
              f"{fa_m:>4} {wd_m:>4} {act_m:>4} {r['status']:<14} {r['name']}")
        if r["active"] and not r["forceActive"] and not r["withdrawn"]:
            act_count += 1
            act_pt += r["self_pt"]

    print("  " + "-" * 85)
    print(f"  合計: {len(all_rows)} 名（FA={sum(1 for r in all_rows if r['forceActive'])}名, "
          f"WD={sum(1 for r in all_rows if r['withdrawn'])}名, "
          f"ACT={act_count}名（FA除く））")
    print(f"  PT合計（非FA・非WD・ACT）: {act_pt:,} pt")
    b = bonus.get("95446801", {})
    print(f"  ボーナスCSV 95446801.grouppt: {b.get('group_pt', 'N/A'):,}")
    print()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Part 3: CSV vs DB 差分一覧（実データ）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def part3_diff_analysis(members, upline_ch, bonus):
    print("=" * 80)
    print("Part 3: CSV vs DB 差分分析（実データ）")
    print("=" * 80)

    matrix_ids = set(members.keys())
    bonus_ids  = set(bonus.keys())
    only_bonus = bonus_ids - matrix_ids

    print(f"\n[A] ボーナスCSVにあるがマトリックスCSVにない会員: {len(only_bonus)} 名")
    if only_bonus:
        print("    これらはDBにのみ存在する会員（実データ）:")
        for mid in sorted(only_bonus):
            b = bonus[mid]
            print(f"    {mid}: ulb={b['ulb']:,} sb={b['sb']:,} grouppt={b['group_pt']:,} selfpt={b['self_pt']:,}")
    else:
        print("    → 0名。「DBにのみ存在する会員」をCSVから証明することは不可能。")

    print()
    print("[B] groupPt差分の根拠分析（ソースコード: calcGroupPointsV1 = selfPt + 配下7段ACT pt）")
    print()

    # 主要会員のgroupPt CSV計算 vs ボーナスCSV比較
    key_members = [
        ("82179501", 4), ("40431001", 3), ("56926801", None),
        ("82179502", None), ("95446801", None), ("86820601", 5),
        ("64150101", None), ("42845501", 3),
    ]
    print(f"  {'member_code':<14} {'CSV計算':>10} {'ボーナスCSV':>12} {'差':>8} {'確認'}")
    print("  " + "-" * 60)
    for mid, _ in key_members:
        gp_csv = calc_group_pt(mid, members, upline_ch)
        b = bonus.get(mid, {})
        b_gp = b.get("group_pt", "N/A")
        if isinstance(b_gp, int):
            diff  = b_gp - gp_csv
            match = "✅" if diff == 0 else f"❌ 差={diff:+,}pt"
        else:
            diff  = "N/A"
            match = "N/A"
        m = members.get(mid, {})
        fa = m.get("forceActive", False)
        sp = m.get("selfPt", 0)
        print(f"  {mid:<14} {gp_csv:>10,}pt {b_gp if isinstance(b_gp, int) else 'N/A':>10}pt "
              f"{str(diff):>8}pt {match}  (FA={fa}, selfPt={sp})")

    print()
    print("[C] ソースコード確認済みの差異の根拠:")
    print("    1. calc_groupPointsV1: let gp = selfPt（行381） → 自己PTをgroupPtに含む")
    print("    2. calc_depthPointsV1: 非ACT → depth消費なし（透過）（行191）")
    print("    3. マトリックスCSVの「紹介者ID」をuplineIdとして使用")
    print("    4. 強制設定CSV（19件）でuplineIdをoverride")
    print("    5. DBには追加のuplineId設定があり差分が残存している可能性")
    print()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Part 4: 82179501 ULB段別詳細証跡
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def part4_ulb_trace(members, upline_ch, bonus):
    root = "82179501"
    achieved_level = 4

    print("=" * 100)
    print("Part 4: 82179501 ULB段別詳細証跡")
    print("  ソース: calcDepthPointsV1（lib/bonus-calculation-engine-v1.ts 行148-198）")
    print("  ルール: 退会→透過, 非ACT→透過（depth消費なし）, FA→depth消費・pt=0")
    print("=" * 100)

    ulb_total, depth_pts, depth_members, detail, ul_trace = calc_ulb_v1(
        root, members, upline_ch, achieved_level
    )
    rates = ULB_RATES.get(achieved_level, [])

    for d in range(1, 8):
        pt     = depth_pts[d]
        rate   = rates[d - 1] if d - 1 < len(rates) else 0
        bonus_d = int(pt * rate / 100 * POINT_RATE) if pt > 0 and rate > 0 else 0

        members_at_d = depth_members.get(d, [])
        act_ct  = sum(1 for x in members_at_d if x["mark"] == "ACT+pt")
        fa_ct   = sum(1 for x in members_at_d if x["mark"] == "FA(depth消費)")
        wd_ct   = sum(1 for x in members_at_d if "退会" in x["mark"])
        non_ct  = sum(1 for x in members_at_d if "非ACT" in x["mark"])

        print(f"\n【{d}段目】 pt合計={pt:,}pt × {rate}% × {POINT_RATE} = {bonus_d:,}円")
        print(f"  ノード総数={len(members_at_d)}名 | ACT+pt={act_ct}名 | FA={fa_ct}名 | WD透過={wd_ct}名 | 非ACT透過={non_ct}名")
        print(f"  {'member_code':<14} {'self_pt':>8} {'mark':<20} {'status':<14} 名前")
        print(f"  {'-'*80}")
        for info in members_at_d:
            print(f"  {info['member_code']:<14} {info['self_pt']:>8} {info['mark']:<20} "
                  f"{info['status']:<14} {info['name']}")

    print(f"\n{'='*100}")
    print("【段別サマリー】")
    print(f"  {'段':>3} {'PT合計':>10} {'レート':>6} {'ボーナス':>10} {'全ノード':>8} {'ACT+pt':>8} {'非ACT透過':>10}")
    print(f"  {'-'*65}")
    total = 0
    for d in range(1, 8):
        pt     = depth_pts[d]
        rate   = rates[d - 1] if d - 1 < len(rates) else 0
        b      = int(pt * rate / 100 * POINT_RATE) if pt > 0 and rate > 0 else 0
        total += b
        act_ct = sum(1 for x in depth_members.get(d, []) if x["mark"] == "ACT+pt")
        non_ct = sum(1 for x in depth_members.get(d, []) if "非ACT" in x["mark"])
        node_ct = len(depth_members.get(d, []))
        print(f"  {d:>3}段 {pt:>10,}pt {rate:>5}% {b:>10,}円 {node_ct:>8}名 {act_ct:>8}名 {non_ct:>10}名")
    print(f"  {'-'*65}")
    print(f"  合計 {sum(depth_pts[d] for d in range(1,8)):>10,}pt        {total:>10,}円")

    b82 = bonus.get("82179501", {})
    print()
    print(f"  CSV計算ULB:        {total:,}円")
    print(f"  ボーナスCSV期待値: {b82.get('ulb', 0):,}円")
    print(f"  差:               {total - b82.get('ulb', 0):+,}円")
    print()
    print("  【差分の原因仮説】")
    print("  ソースコード(calcDepthPointsV1)では非ACT→透過ですが、")
    print("  DBのuplineId構造がCSV（紹介者ID列）と異なる可能性があります。")
    print("  DB接続なしでは完全な再現は不可能です。")
    print()

    return ul_trace


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Part 5: tree-debug模倣JSON出力（5名分）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def part5_tree_debug(members, upline_ch, referrer_ch, bonus, force_info):
    targets = [
        ("82179501", 4),
        ("44504701", 5),
        ("86820601", 5),
        ("93713601", 4),
        ("89248801", 5),
    ]

    print("=" * 80)
    print("Part 5: tree-debug模倣JSON出力（CSVベース）")
    print("  ※ 本APIはmanager認証が必要なため、CSVデータで模倣計算")
    print("=" * 80)

    for member_code, achieved_level in targets:
        mid = member_code
        m   = members.get(mid, {})
        fa  = m.get("forceActive", False)
        fl  = m.get("forceLevel") or achieved_level
        sp  = m.get("selfPt", 0)
        ac  = is_active(mid, members)
        wd  = is_withdrawn(mid, members)

        # groupPt
        gp = calc_group_pt(mid, members, upline_ch)

        # directAct（referrerChildを使用）
        direct_children = referrer_ch.get(mid, [])
        direct_act = sum(1 for ch in direct_children
                         if not is_withdrawn(ch, members) and is_active(ch, members))

        # ULB
        ulb_total, depth_pts, depth_members, ulb_detail, ul_trace = calc_ulb_v1(
            mid, members, upline_ch, achieved_level
        )
        # 資格チェック
        if direct_act < 2 or (sp == 0 and not fa):
            ulb_total = 0
            ulb_detail = {}

        # SB
        sb, min_pt, series_count, series_pt_list, series_detail = calc_structure_bonus(
            mid, member_code, members, upline_ch, referrer_ch, achieved_level, bonus
        )

        # depthTrace
        depth_trace = {}
        for d in range(1, 8):
            pt = depth_pts.get(d, 0)
            rates = ULB_RATES.get(achieved_level, [])
            rate  = rates[d-1] if d-1 < len(rates) else 0
            members_list = [
                {
                    "id":    x["member_code"],
                    "name":  x["name"],
                    "pt":    x["self_pt"],
                    "mark":  x["mark"],
                }
                for x in depth_members.get(d, [])
            ]
            depth_trace[f"depth{d}"] = {
                "ptTotal": pt,
                "rate":    rate,
                "bonus":   int(pt * rate / 100 * POINT_RATE) if pt > 0 and rate > 0 else 0,
                "members": members_list,
            }

        # boosCSVの実績
        b = bonus.get(member_code, {})

        result = {
            "memberCode": member_code,
            "target": {
                "memberCode": member_code,
                "positionId":  f"CSV:{member_code}",
                "status":      m.get("status", "?"),
                "forceActive": fa,
                "forceLevel":  fl,
            },
            "basic": {
                "selfPt":       sp,
                "groupPt":      gp,
                "active":       ac,
                "directAct":    direct_act,
                "appliedLevel": achieved_level,
            },
            "unilevel": {
                **{f"depth{d}Pt": depth_pts.get(d, 0) for d in range(1, 8)},
                "calculatedUnilevelB": ulb_total,
                "bonusCSV_ulb":        b.get("ulb", "N/A"),
                "diff_ulb":            ulb_total - b.get("ulb", 0) if isinstance(b.get("ulb"), int) else "N/A",
                "ulDetail": ulb_detail,
            },
            "structureBonus": {
                "directChildren":     upline_ch.get(mid, []),
                "seriesPtList":        series_pt_list,
                "seriesCount":         series_count,
                "positiveSeriesCount": sum(1 for p in series_pt_list if p > 0),
                "selectedMinSeriesPt": min_pt,
                "calculatedOrgBuildB": sb,
                "bonusCSV_sb":         b.get("sb", "N/A"),
                "bonusCSV_minSeriesPt":b.get("min_series_pt", "N/A"),
                "bonusCSV_seriesCount":b.get("series_count", "N/A"),
            },
            "seriesDetail": {
                child_id: {
                    "seriesPt":  sd["seriesPt"],
                    "memberCount": len(sd["members"]),
                    "members":   sd["members"][:20],  # 最大20名
                }
                for child_id, sd in series_detail.items()
            },
            "depthTrace": depth_trace,
            "ulTrace": ul_trace[:100],
        }

        print(f"\n{'='*80}")
        print(f"  {member_code} (LV{achieved_level})")
        print(f"{'='*80}")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Main
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def main():
    print()
    print("=" * 80)
    print("full-evidence-trace.py")
    print("証拠ベースの実データ出力スクリプト（CSVベース計算）")
    print("=" * 80)
    print()

    members, upline_ch, referrer_ch, bonus, force_info = load_all()

    print(f"マトリックスCSV: {len([m for m in members.values() if m.get('source') == 'CSV'])} 件")
    print(f"ボーナスCSV:     {len(bonus)} 件")
    print()

    part1_summary(members, upline_ch, bonus)
    part2_95446801_series(members, upline_ch, bonus)
    part3_diff_analysis(members, upline_ch, bonus)
    part4_ulb_trace(members, upline_ch, bonus)
    part5_tree_debug(members, upline_ch, referrer_ch, bonus, force_info)


if __name__ == "__main__":
    main()
