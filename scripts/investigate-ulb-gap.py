#!/usr/bin/env python3
"""
investigate-ulb-gap.py
======================
82179501と44504701のULB差分（-1,050円、-300円）の根本原因をDBで特定する。

【仮説】
- V1計算: 段7=4,200pt(82179501), 段7=5,700pt(44504701)
- CSV期待: 段7=6,750pt(82179501), 段7=6,000pt(44504701)
- 差の原因: FAノードがdepthを消費することで、一部メンバーが段7→段8に押し出される

【期待する差分】
- 82179501: -1,050円 → 段7(1%)で1,050ptが不足 → 1,050pt÷150pt/人=7人が段8に押し出されている
- 44504701: -300円 → 段7(1%)で300ptが不足 → 300pt÷150pt/人=2人が段8に押し出されている

【key調査】
- order_id=NULLの41名がV1エンジンで誤ってactive扱いされている
- これらがFAとして扱われてdepthを消費している可能性
- order_id修正後に段7のptが正しくなるはず
"""

import os
import sys
import csv
from collections import defaultdict

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("pip install psycopg2-binary")
    sys.exit(1)

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

BONUS_MONTH = "2026-04"
ACTIVE_REQUIRED_PRODUCTS = ["1000", "2000"]
POINT_RATE = 100

UNILEVEL_RATES = {
    4: [15, 9, 6, 5, 3, 2, 1],
    5: [15, 10, 7, 6, 4, 3, 2],
}
UNILEVEL_MAX_DEPTH = {4: 7, 5: 7}

TARGET_CODES = ["82179501", "44504701"]

def v1_is_active(status, self_pt, purchased_required, force_active):
    if force_active: return True
    if status in ("withdrawn", "lapsed"): return False
    return purchased_required and self_pt > 0

def v1_is_withdrawn(status, force_active):
    if force_active: return False
    return status in ("withdrawn", "lapsed")

def calc_ulb_with_detail(root_id, level, upline_ch, purchase_map, member_map, mode="with_order_check"):
    """
    mode="with_order_check": order_id=NULL購入を除外（修正版）
    mode="without_order_check": order_id=NULL購入を含む（現行版）
    """
    max_depth = UNILEVEL_MAX_DEPTH.get(level, 0)
    rates = UNILEVEL_RATES.get(level, [])
    if max_depth == 0:
        return {}, []

    depth_pts = defaultdict(int)
    depth_members = defaultdict(list)  # 各段にいる会員

    def traverse(curr_id, depth):
        if depth > max_depth + 1:  # +1で段8まで記録
            return
        for child_id in upline_ch.get(curr_id, []):
            m = member_map.get(child_id)
            if not m:
                continue
            pur = purchase_map.get(child_id, {})
            
            if mode == "with_order_check":
                self_pt = pur.get("self_pt_with_order", 0)
                pur_req = pur.get("purchased_required_with_order", False)
            else:
                self_pt = pur.get("self_pt_all", 0)
                pur_req = pur.get("purchased_required_all", False)
            
            fa = m["force_active"]
            wd = v1_is_withdrawn(m["status"], fa)
            ac = v1_is_active(m["status"], self_pt, pur_req, fa)

            if wd:
                traverse(child_id, depth)
            elif ac:
                if depth <= max_depth:
                    if not fa and self_pt > 0:
                        depth_pts[depth] += self_pt
                    depth_members[depth].append({
                        "id": child_id,
                        "code": m["member_code"],
                        "self_pt": self_pt,
                        "fa": fa,
                        "status": m["status"],
                    })
                elif depth == max_depth + 1:
                    # 段8: 超過分の記録
                    depth_members[max_depth + 1].append({
                        "id": child_id,
                        "code": m["member_code"],
                        "self_pt": self_pt,
                        "fa": fa,
                        "status": m["status"],
                        "overflow": True,
                    })
                traverse(child_id, depth + 1)
            else:
                traverse(child_id, depth)

    traverse(root_id, 1)
    return dict(depth_pts), dict(depth_members)


def main():
    print("=" * 80)
    print("ULB差分調査スクリプト（order_id修正効果の検証）")
    print(f"BONUS_MONTH: {BONUS_MONTH}")
    print("=" * 80)

    conn = psycopg2.connect(DATABASE_URL)
    conn.set_client_encoding("UTF8")
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # 全会員取得
    cur.execute("""
        SELECT id, "memberCode", status, "uplineId", "referrerId",
               "forceActive", "forceLevel", "currentLevel"
        FROM mlm_members ORDER BY id
    """)
    all_members = cur.fetchall()
    print(f"\n会員数: {len(all_members)}")

    member_map = {}
    code_to_id = {}
    for m in all_members:
        mid = int(m["id"])
        member_map[mid] = {
            "id": mid,
            "member_code": m["memberCode"],
            "status": m["status"],
            "upline_id": int(m["uplineId"]) if m["uplineId"] else None,
            "referrer_id": int(m["referrerId"]) if m["referrerId"] else None,
            "force_active": bool(m["forceActive"]),
            "force_level": m["forceLevel"],
            "current_level": m["currentLevel"] or 0,
        }
        code_to_id[m["memberCode"]] = mid

    # childrenMap（uplineId基準）
    upline_ch = defaultdict(list)
    for mid, m in member_map.items():
        if m["upline_id"]:
            upline_ch[m["upline_id"]].append(mid)

    # 購入データ取得（order_id有無を区別）
    print("[購入データ取得中...]")
    cur.execute("""
        SELECT p."mlmMemberId", p."productCode", p."totalPoints",
               p.order_id,
               (p.order_id IS NOT NULL) as has_order
        FROM mlm_purchases p
        WHERE p."purchaseMonth" = %s
          AND p."purchaseStatus" NOT IN ('cooling_off', 'canceled')
    """, (BONUS_MONTH,))
    purchases_raw = cur.fetchall()
    print(f"  → {len(purchases_raw)}件取得")

    # order_id有無別に購入マップ構築
    purchase_map = {}
    null_order_count = 0
    for p in purchases_raw:
        mid = int(p["mlmMemberId"])
        if mid not in purchase_map:
            purchase_map[mid] = {
                "self_pt_all": 0, "purchased_required_all": False,
                "self_pt_with_order": 0, "purchased_required_with_order": False,
            }
        if p["productCode"] in ACTIVE_REQUIRED_PRODUCTS:
            pts = p["totalPoints"] or 0
            # 全件（order_id問わず）
            purchase_map[mid]["self_pt_all"] += pts
            purchase_map[mid]["purchased_required_all"] = True
            # order_id有りのみ
            if p["has_order"]:
                purchase_map[mid]["self_pt_with_order"] += pts
                purchase_map[mid]["purchased_required_with_order"] = True
            else:
                null_order_count += 1

    print(f"  order_id=NULL件数: {null_order_count}")

    cur.close()
    conn.close()

    # ── 各対象者の詳細分析 ──
    EXPECTED = {
        "82179501": {"ulb": 53850, "level": 4},
        "44504701": {"ulb": 44850, "level": 5},
    }

    for target_code in TARGET_CODES:
        root_id = code_to_id.get(target_code)
        if not root_id:
            print(f"\n{target_code} が見つかりません")
            continue

        exp = EXPECTED[target_code]
        level = exp["level"]
        rates = UNILEVEL_RATES[level]
        max_depth = UNILEVEL_MAX_DEPTH[level]

        print(f"\n{'='*80}")
        print(f"=== {target_code} (level={level}) ===")
        print(f"{'='*80}")
        print(f"期待ULB: {exp['ulb']:,}円")

        for mode_label, mode in [("【現行版】order_id問わず", "without_order_check"), ("【修正版】order_id必須", "with_order_check")]:
            depth_pts, depth_members = calc_ulb_with_detail(
                root_id, level, upline_ch, purchase_map, member_map, mode
            )

            ulb = sum(
                depth_pts.get(d, 0) * rates[d-1] * POINT_RATE // 100
                for d in range(1, max_depth + 1)
            )

            print(f"\n  {mode_label}:")
            print(f"  {'段':>3} {'rate':>5} {'pt':>8} {'ACT人数':>8} {'金額':>8}  FA人数")
            total = 0
            for d in range(1, max_depth + 2):
                pt = depth_pts.get(d, 0)
                members_in_d = depth_members.get(d, [])
                act_count = len([m for m in members_in_d if not m["fa"] and m["self_pt"] > 0])
                fa_count = len([m for m in members_in_d if m["fa"]])
                r = rates[d-1] if d <= len(rates) else 0
                yen = pt * r * POINT_RATE // 100
                total += yen if d <= max_depth else 0
                overflow_mark = "  ← 段8(超過)" if d == max_depth + 1 else ""
                print(f"  段{d:>2} {r:>4}%  {pt:>7}pt  {act_count:>6}人  {yen:>7}円  FA:{fa_count}{overflow_mark}")
            print(f"  {'合計':>30} {total:>7}円  (差: {total - exp['ulb']:+,}円)")

        # order_id修正による変化の詳細
        print(f"\n  [order_id修正による変化]")
        _, dm_before = calc_ulb_with_detail(root_id, level, upline_ch, purchase_map, member_map, "without_order_check")
        _, dm_after = calc_ulb_with_detail(root_id, level, upline_ch, purchase_map, member_map, "with_order_check")

        for d in range(1, max_depth + 2):
            before = set(m["code"] for m in dm_before.get(d, []))
            after = set(m["code"] for m in dm_after.get(d, []))
            moved_out = before - after
            moved_in = after - before
            if moved_out or moved_in:
                print(f"  段{d}: -{len(moved_out)}人/{'+' if moved_in else ''}{len(moved_in)}人")
                for code in moved_out:
                    print(f"    → 削除: {code}")
                for code in moved_in:
                    print(f"    → 追加: {code}")

        # 段7と段8のメンバーリスト（修正版）
        print(f"\n  [修正版 段7メンバー（最初の10人）]")
        _, dm = calc_ulb_with_detail(root_id, level, upline_ch, purchase_map, member_map, "with_order_check")
        for m in dm.get(max_depth, [])[:10]:
            print(f"    {m['code']} pt={m['self_pt']} fa={m['fa']} status={member_map.get(m['id'],{}).get('status','?')}")
        
        print(f"\n  [修正版 段8(超過)メンバー（全員）]")
        for m in dm.get(max_depth + 1, []):
            print(f"    {m['code']} pt={m['self_pt']} fa={m['fa']} status={member_map.get(m['id'],{}).get('status','?')}")

        # 各段の差分を詳細に
        dp_before, _ = calc_ulb_with_detail(root_id, level, upline_ch, purchase_map, member_map, "without_order_check")
        dp_after, _ = calc_ulb_with_detail(root_id, level, upline_ch, purchase_map, member_map, "with_order_check")
        print(f"\n  [各段のpt変化]")
        for d in range(1, max_depth + 1):
            b = dp_before.get(d, 0)
            a = dp_after.get(d, 0)
            if b != a:
                r = rates[d-1]
                print(f"  段{d}: {b}pt→{a}pt (差{a-b:+}pt, {(a-b)*r*POINT_RATE//100:+}円)")

    print("\n" + "="*80)
    print("調査完了")
    print("="*80)


if __name__ == "__main__":
    main()
