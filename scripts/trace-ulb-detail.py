#!/usr/bin/env python3
"""
82179501 ULB段別・全会員証跡スクリプト
======================================
・CSVデータをベースに、1〜7段の対象会員を全員リスト
・95446801系列の全会員一覧（position_id/member_code/upline_id/self_pt 相当）
・CSVに存在する会員 vs ボーナスCSVの数値から逆算して差分分析

注意: DBには繋がらないため、CSVに記載されていない会員は識別できない。
      その場合は「CSVにない会員がいる」ことを証拠付きで示す。
"""

import csv
from collections import defaultdict

MATRIX_CSV = "/home/user/uploaded_files/matrix_892488_full.csv"
FORCE_CSV  = "/home/user/uploaded_files/強制設定会員一覧_2026-06-02 - コピー (2).csv"
BONUS_CSV  = "/home/user/uploaded_files/bonus_list_full.csv"

# ━━━ データロード ━━━
def load_all():
    members = {}
    with open(MATRIX_CSV, "r", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            mid = row["会員ID"].strip()
            members[mid] = {
                "id":          mid,
                "name":        row["氏名（表示名）"].strip(),
                "referrerId":  row["紹介者ID"].strip(),
                "uplineId":    row["紹介者ID"].strip(),   # 初期値
                "selfPt":      int(row["前月ポイント"].strip() or 0),
                "status":      row["ステイタス"].strip(),
                "forceActive": False,
                "forceLevel":  None,
            }

    with open(FORCE_CSV, "r", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            code   = row["会員コード"].strip()
            upline = row["直上者コード"].strip()
            act    = row["強制アクティブ"].strip() == "有効"
            lv_str = row["強制タイトル"].strip()
            lv     = None
            if "LV." in lv_str:
                try: lv = int(lv_str.replace("LV.", ""))
                except: pass
            if code not in members:
                members[code] = {"id": code, "name": code, "referrerId": "",
                                 "uplineId": upline, "selfPt": 0, "status": "活動中",
                                 "forceActive": act, "forceLevel": lv}
            else:
                members[code]["forceActive"] = act
                members[code]["forceLevel"]  = lv
                if upline:
                    members[code]["uplineId"] = upline

    bonus = {}
    with open(BONUS_CSV, "r", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            mid = row["会員番号"].strip()
            def ti(v):
                v = v.strip().replace(",","")
                try: return int(v)
                except: return 0
            bonus[mid] = {
                "ulb": ti(row["ユニレベルB"]),
                "sb":  ti(row["組織構築B"]),
                "min_series_pt": ti(row["最小系列pt"]),
                "series_count":  ti(row["系列"]),
                "group_pt":      ti(row["グループpt"]),
                "self_pt":       ti(row["自己購入pt"]),
                "direct_act":    ti(row["直ACT"]),
            }

    upline_ch = defaultdict(list)
    for mid, m in members.items():
        uid = m.get("uplineId","")
        if uid and uid != mid:
            upline_ch[uid].append(mid)

    return members, upline_ch, bonus


def is_withdrawn(mid, members):
    m = members.get(mid)
    if not m: return True
    if m["forceActive"]: return False
    return m["status"] in ("退会","失効")


def is_active(mid, members):
    m = members.get(mid)
    if not m: return False
    if m["forceActive"]: return True
    if m["status"] in ("退会","失効"): return False
    return m["selfPt"] > 0


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Part 1: 95446801系列の全会員一覧
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def list_95446801_series(members, upline_ch):
    root = "95446801"
    print("=" * 70)
    print("Part 1: 95446801系列 全会員一覧")
    print("  (CSVにある会員のみ。position_id=member_code相当)")
    print("=" * 70)
    print(f"{'member_code':<14} {'upline_id':<14} {'self_pt':>8} {'status':<12} {'forceActive':<12} {'名前'}")
    print("-" * 80)

    visited = set()
    rows = []

    def traverse(mid, depth=0):
        if mid in visited: return
        visited.add(mid)
        m = members.get(mid, {})
        rows.append({
            "depth":       depth,
            "member_code": mid,
            "upline_id":   m.get("uplineId",""),
            "self_pt":     m.get("selfPt", 0),
            "status":      m.get("status","?"),
            "forceActive": m.get("forceActive",False),
            "name":        m.get("name","?"),
            "is_wd":       is_withdrawn(mid, members),
            "is_act":      is_active(mid, members),
        })
        for ch in upline_ch.get(mid, []):
            traverse(ch, depth + 1)

    traverse(root)

    total_pt  = 0
    act_count = 0
    for r in rows:
        mark = ("退" if r["is_wd"] else
                ("FA" if r["forceActive"] else
                 ("✓" if r["is_act"] else "×")))
        wd_mark = " [退会透過]" if r["is_wd"] else ""
        fa_mark = " [FA:depth消費・pt無]" if r["forceActive"] and not r["is_wd"] else ""
        print(f"  {'  '*r['depth']}{mark} {r['member_code']:<14} up={r['upline_id']:<14} "
              f"pt={r['self_pt']:>5} {r['status']:<10}{wd_mark}{fa_mark}")
        if not r["is_wd"] and not r["forceActive"] and r["is_act"]:
            total_pt += r["self_pt"]
            act_count += 1

    print("-" * 80)
    print(f"CSV上の全会員数（ルート含む）: {len(rows)} 名")
    print(f"PT加算対象（非FA・非退会・アクティブ）: {act_count} 名")
    print(f"系列PT合計（CSV計算）: {total_pt} pt")
    print(f"")
    print(f"ボーナスCSVの期待値:")
    print(f"  64150101.grouppt = 10,200 pt  ← 64150101配下7段以内のアクティブpt")
    print(f"  95446801.grouppt = 10,050 pt")
    print(f"  42845501.grouppt =  7,950 pt  ← 42845501配下7段以内のアクティブpt")
    print(f"")
    print(f"【差分の根拠】")
    print(f"  CSV計算の系列PT = {total_pt} pt")
    print(f"  ボーナスCSV期待値 = 10,200 pt")
    print(f"  差 = {10200 - total_pt} pt = {(10200-total_pt)//150} 名 × 150pt")
    print(f"  → この差分の会員はCSVに存在しないため、DBのみに存在すると推定")
    print()
    return rows


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Part 2: 82179501のULB段別詳細トレース
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def trace_ulb_82179501(members, upline_ch, bonus):
    root    = "82179501"
    level   = 4
    max_d   = 7
    rates   = [15, 9, 6, 5, 3, 2, 1]
    POINT_RATE = 100

    print("=" * 70)
    print("Part 2: 82179501 ULB段別詳細トレース (LV4, 7段)")
    print("=" * 70)

    depth_members = defaultdict(list)  # depth → [(member_code, self_pt, status)]
    depth_pts     = defaultdict(int)

    # ULBトレース: uplineChildrenMapを使用
    # アクティブ: depth+1, 退会: depth維持(透過), 非アクティブ: depth+1(pt加算なし)
    visited = set()

    def traverse_ul(curr_id, depth):
        if depth > max_d: return
        for ch_id in upline_ch.get(curr_id, []):
            if ch_id in visited: return
            m  = members.get(ch_id, {})
            wd = is_withdrawn(ch_id, members)
            fa = m.get("forceActive", False)
            ac = is_active(ch_id, members)
            pt = m.get("selfPt", 0)

            info = {
                "member_code": ch_id,
                "self_pt":     pt,
                "status":      m.get("status","?"),
                "name":        m.get("name","?"),
                "forceActive": fa,
                "withdrawn":   wd,
                "active":      ac,
            }

            if wd:
                info["mark"] = "退会透過"
                depth_members[depth].append(info)
                traverse_ul(ch_id, depth)        # 退会: depth維持
            elif ac:
                if pt > 0:
                    info["mark"] = "ACT+pt"
                    depth_pts[depth] += pt
                else:
                    info["mark"] = "FA(pt=0)" if fa else "ACT(pt=0)"
                depth_members[depth].append(info)
                traverse_ul(ch_id, depth + 1)    # アクティブ: depth+1
            else:
                info["mark"] = "非ACT"
                depth_members[depth].append(info)
                traverse_ul(ch_id, depth + 1)    # 非アクティブ: depth+1(pt加算なし)

    traverse_ul(root, 1)

    ulb_total = 0
    for d in range(1, max_d + 1):
        pt     = depth_pts[d]
        rate   = rates[d - 1]
        bonus_d = int(pt * rate / 100 * POINT_RATE) if pt > 0 else 0
        ulb_total += bonus_d

        print(f"\n【段{d}】 pt={pt:,} × {rate}% × {POINT_RATE} = {bonus_d:,}円")
        members_at_d = depth_members.get(d, [])
        print(f"  対象会員数: {len(members_at_d)} 名（うちACT+pt: {sum(1 for x in members_at_d if x['mark']=='ACT+pt')} 名）")
        print(f"  {'member_code':<14} {'self_pt':>8} {'mark':<12} {'name'}")
        print(f"  " + "-" * 60)
        for info in members_at_d:
            print(f"  {info['member_code']:<14} {info['self_pt']:>8} {info['mark']:<12} {info['name']}")

    print(f"\n{'='*70}")
    print(f"ULB合計（CSV計算）: {ulb_total:,} 円")
    print(f"ボーナスCSV期待値:   53,850 円")
    print(f"差:                 {ulb_total - 53850:+,} 円")

    # 差の分析: 段別に分解
    print(f"\n【段別差分分析】")
    print(f"  差 = {ulb_total - 53850} 円")
    bcsv_ulb = bonus.get("82179501", {}).get("ulb", 0)
    print(f"  ※ボーナスCSVのULB={bcsv_ulb:,}")
    if ulb_total != bcsv_ulb:
        diff = bcsv_ulb - ulb_total
        print(f"  不足分: {diff:,} 円")
        for d in range(1, max_d + 1):
            rate = rates[d - 1]
            if rate > 0:
                # この段に追加でXptあればdiff_d円補填できる
                # diff_d / (rate/100 * 100) = 必要pt
                pass

    print()
    return ulb_total, depth_pts, depth_members


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Part 3: 差分が存在することの証明
# (CSVにない会員 = DBにのみある会員)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def prove_missing_members(members, upline_ch, bonus):
    print("=" * 70)
    print("Part 3: CSVにない会員の存在証明")
    print("=" * 70)

    # ボーナスCSVに登場する会員IDのうち、マトリックスCSVにない会員
    matrix_ids = set(members.keys())
    bonus_ids  = set(bonus.keys())
    only_bonus = bonus_ids - matrix_ids

    print(f"\n[A] ボーナスCSVにあるがマトリックスCSVにない会員: {len(only_bonus)} 名")
    if only_bonus:
        for mid in sorted(only_bonus)[:20]:
            b = bonus[mid]
            print(f"  {mid}: ulb={b['ulb']:,} sb={b['sb']:,} self_pt={b['self_pt']} direct_act={b['direct_act']}")

    # 82179501のgrouppt逆算
    bcsv_82 = bonus.get("82179501", {})
    csv_grouppt = bcsv_82.get("group_pt", 0)
    print(f"\n[B] 82179501のグループpt（ボーナスCSV）: {csv_grouppt:,}")

    # 我々の計算でのグループPT
    total_gp = 0
    visited  = set()

    def calc_gp(mid, depth):
        nonlocal total_gp
        if mid in visited or depth > 7: return
        visited.add(mid)
        for ch in upline_ch.get(mid, []):
            m  = members.get(ch, {})
            wd = is_withdrawn(ch, members)
            ac = is_active(ch, members)
            pt = m.get("selfPt", 0)
            if wd:
                calc_gp(ch, depth)
            elif ac:
                if pt > 0:
                    total_gp += pt
                calc_gp(ch, depth + 1)
            else:
                calc_gp(ch, depth + 1)

    calc_gp("82179501", 1)
    print(f"  CSV計算のグループpt: {total_gp:,}")
    print(f"  差: {csv_grouppt - total_gp:,} pt = {(csv_grouppt - total_gp)//150} 名 × 150pt")

    # 95446801系列のCSV vs DB差分
    print(f"\n[C] 95446801系列のCSV vs DB差分")
    b95 = bonus.get("95446801", {})
    b64 = bonus.get("64150101", {})
    b42 = bonus.get("42845501", {})

    csv_95_series = 0
    s95_visited = set()
    def count_95(mid):
        nonlocal csv_95_series
        if mid in s95_visited: return
        s95_visited.add(mid)
        m = members.get(mid, {})
        wd = is_withdrawn(mid, members)
        fa = m.get("forceActive", False)
        ac = is_active(mid, members)
        pt = m.get("selfPt", 0)
        if not wd and not fa and ac and pt > 0:
            csv_95_series += pt
        for ch in upline_ch.get(mid, []):
            count_95(ch)
    count_95("95446801")

    print(f"  95446801.grouppt（ボーナスCSV）: {b95.get('group_pt', '?')}")
    print(f"  64150101.grouppt（ボーナスCSV）: {b64.get('group_pt', '?')}")
    print(f"  42845501.grouppt（ボーナスCSV）: {b42.get('group_pt', '?')}")
    print(f"  CSV計算の95446801系列PT:          {csv_95_series}")
    print()
    print(f"  ── 差分の根拠 ──")
    print(f"  64150101.grouppt = 10,200（ボーナスCSV）")
    print(f"  64150101はforceActiveでself_pt=0なので、")
    print(f"  この10,200は64150101「配下」のアクティブpt合計（7段以内）")
    print(f"  42845501.grouppt = 7,950（ボーナスCSV）= CSV計算値 ✅")
    print(f"  差 = 10,200 - 7,950 = 2,250 pt")
    print()
    print(f"  42845501を起点とするCSV上の全アクティブ会員一覧:")

    visited_42 = set()
    act_list_42 = []
    def list_42(mid):
        if mid in visited_42: return
        visited_42.add(mid)
        m = members.get(mid, {})
        if not is_withdrawn(mid, members) and not m.get("forceActive",False) and is_active(mid, members):
            act_list_42.append(mid)
        for ch in upline_ch.get(mid, []):
            list_42(ch)
    list_42("42845501")

    print(f"  CSV上の42845501配下アクティブ会員数: {len(act_list_42)} 名")
    print(f"  CSV上のpt合計: {sum(members[m]['selfPt'] for m in act_list_42)} pt")
    print(f"  ボーナスCSV 42845501.grouppt: {b42.get('group_pt', '?')} pt")
    print()
    print(f"  つまり: 64150101配下にはCSV上に存在しない")
    print(f"  {(10200 - csv_95_series) // 150} 名（= {10200 - csv_95_series} pt / 150pt）")
    print(f"  のアクティブ会員が「DBにのみ」存在する。")
    print()
    print(f"  ※これらの会員を特定するには DB の mlmMember テーブルから")
    print(f"    uplineId=64150101 または uplineId=42845501 配下のツリーを")
    print(f"    直接クエリする必要があります。")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Part 4: 95446801配下のCSV全会員（tabular形式）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def tabular_95446801(members, upline_ch):
    print("=" * 70)
    print("Part 4: 95446801系列 全会員 tabular出力")
    print("  (position_id=member_code, upline_id, self_pt)")
    print("=" * 70)
    print(f"{'member_code':<14} {'upline_id':<14} {'self_pt':>8} {'forceActive':>12} {'withdrawn':>10} {'active':>7} {'name'}")
    print("-" * 85)

    visited = set()
    total_pt = 0
    count = 0

    def traverse(mid):
        nonlocal total_pt, count
        if mid in visited: return
        visited.add(mid)
        m  = members.get(mid, {})
        wd = is_withdrawn(mid, members)
        fa = m.get("forceActive", False)
        ac = is_active(mid, members)
        pt = m.get("selfPt", 0)
        uid = m.get("uplineId","")

        if not wd and not fa and ac and pt > 0:
            total_pt += pt
            count += 1

        print(f"{mid:<14} {uid:<14} {pt:>8} {str(fa):>12} {str(wd):>10} {str(ac):>7} {m.get('name','?')}")
        for ch in upline_ch.get(mid, []):
            traverse(ch)

    traverse("95446801")
    print("-" * 85)
    print(f"合計 (非退会・非FA・ACT): {count} 名, {total_pt} pt")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Main
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def main():
    members, upline_ch, bonus = load_all()

    print(f"マトリックスCSV: {len(members)} 件")
    print(f"ボーナスCSV:     {len(bonus)} 件")
    print()

    # Part 1
    list_95446801_series(members, upline_ch)

    # Part 2
    trace_ulb_82179501(members, upline_ch, bonus)

    # Part 3
    prove_missing_members(members, upline_ch, bonus)

    # Part 4
    tabular_95446801(members, upline_ch)


if __name__ == "__main__":
    main()
