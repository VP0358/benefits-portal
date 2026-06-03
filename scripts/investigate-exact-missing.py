#!/usr/bin/env python3
"""
investigate-exact-missing.py
===================================
44504701の段7不足1人 (150pt) の正確な特定

アプローチ:
V1段8の会員（40名）をリストアップし、
CSVのgrpPtに含まれる1人を探す

Key insight:
- V1のULB段1-7合計pt = 15900pt
- CSV grpPt = 16050pt
- 差 = 150pt (1人分)
- この1人はV1では段8以降だが、CSVの計算では段7以内に入っている

方法: V1段8の各会員について、
その会員のuplineチェーン内にFA会員がいる場合
「そのFA会員をスキップした深度」を計算
もし「FA会員なし深度」が7以内なら、CSVで段7に計上される可能性

また、82179501の段6(+1人)+段7(+5人) = 900ptも同様に分析
"""

import os, sys
from collections import defaultdict

try:
    import psycopg2, psycopg2.extras
except ImportError:
    print("pip install psycopg2-binary"); sys.exit(1)

DATABASE_URL = os.environ.get("DATABASE_URL","")
if not DATABASE_URL:
    print("ERROR: set DATABASE_URL"); sys.exit(1)

BONUS_MONTH = "2026-04"
ACTIVE_REQUIRED_PRODUCTS = ["1000","2000"]
POINT_RATE = 100

def v1_is_active(status, self_pt, purchased_required, force_active):
    if force_active: return True
    if status in ("withdrawn","lapsed"): return False
    return purchased_required and self_pt > 0

def v1_is_withdrawn(status, force_active):
    if force_active: return False
    return status in ("withdrawn","lapsed")

def main():
    conn = psycopg2.connect(DATABASE_URL)
    conn.set_client_encoding("UTF8")
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute("""
        SELECT id, "memberCode", status, "uplineId", "referrerId",
               "forceActive", "forceLevel", "currentLevel"
        FROM mlm_members ORDER BY id
    """)
    member_map = {}
    id_to_code = {}
    code_to_id = {}
    for m in cur.fetchall():
        mid = int(m["id"])
        member_map[mid] = {
            "id":mid, "member_code":m["memberCode"], "status":m["status"],
            "upline_id":int(m["uplineId"]) if m["uplineId"] else None,
            "referrer_id":int(m["referrerId"]) if m["referrerId"] else None,
            "force_active":bool(m["forceActive"]),
            "force_level":m["force_level"] if "force_level" in m else None,
        }
        # forceLevel を取得
        id_to_code[mid] = m["memberCode"]
        code_to_id[m["memberCode"]] = mid

    # forceLevel再取得
    cur.execute('SELECT id, "forceLevel" FROM mlm_members')
    for r in cur.fetchall():
        mid = int(r["id"])
        if mid in member_map:
            member_map[mid]["force_level"] = r["forceLevel"]

    upline_ch = defaultdict(list)
    for mid, m in member_map.items():
        if m["upline_id"]: upline_ch[m["upline_id"]].append(mid)

    cur.execute("""
        SELECT p."mlmMemberId", p."productCode", p."totalPoints",
               (p.order_id IS NOT NULL) as has_order
        FROM mlm_purchases p
        WHERE p."purchaseMonth" = %s
          AND p."purchaseStatus" NOT IN ('cooling_off','canceled')
    """, (BONUS_MONTH,))
    purchase_map = {}
    for p in cur.fetchall():
        mid = int(p["mlmMemberId"])
        if mid not in purchase_map:
            purchase_map[mid] = {"self_pt":0, "purchased_required":False}
        if p["productCode"] in ACTIVE_REQUIRED_PRODUCTS and p["has_order"]:
            purchase_map[mid]["self_pt"] += (p["totalPoints"] or 0)
            purchase_map[mid]["purchased_required"] = True

    cur.close(); conn.close()

    # ── V1深度を構築し、各会員の「FA無視深度」も計算 ──
    def build_depths(root_id):
        """V1深度と「FA/WD/非ACT全透過」の素の深度を両方計算"""
        v1_depth = {}  # code -> V1圧縮深度
        raw_depth = {}  # code -> 素の深度（FA透過なし、非ACT透過なし）

        def traverse_v1(curr_id, depth):
            for child_id in upline_ch.get(curr_id, []):
                m = member_map.get(child_id)
                if not m: continue
                pur = purchase_map.get(child_id, {})
                self_pt = pur.get("self_pt", 0)
                pur_req = pur.get("purchased_required", False)
                fa = m["force_active"]
                wd = v1_is_withdrawn(m["status"], fa)
                ac = v1_is_active(m["status"], self_pt, pur_req, fa)
                code = m["member_code"]
                v1_depth[code] = depth
                if wd: traverse_v1(child_id, depth)
                elif ac: traverse_v1(child_id, depth+1)
                else: traverse_v1(child_id, depth)

        def traverse_raw(curr_id, depth):
            for child_id in upline_ch.get(curr_id, []):
                m = member_map.get(child_id)
                if not m: continue
                code = m["member_code"]
                raw_depth[code] = depth
                traverse_raw(child_id, depth+1)  # 全員depth+1

        traverse_v1(root_id, 1)
        traverse_raw(root_id, 1)
        return v1_depth, raw_depth

    CONFIGS = [
        ("44504701", 5, [15,10,7,6,4,3,2], 7, 16050, 44850),
        ("82179501", 4, [15,9,6,5,3,2,1],  7, 22800, 53850),
    ]

    for mc, level, rates, max_d, csv_grp_pt, csv_ulb in CONFIGS:
        mid = code_to_id[mc]
        v1_depth, raw_depth = build_depths(mid)

        print(f"\n{'='*70}")
        print(f"【{mc}】 LV{level}")
        print(f"{'='*70}")

        # V1段8+のACT会員（段7まで捕捉できていない会員）
        v1_exceeded = [
            (code, v1_depth[code])
            for code in v1_depth
            if v1_depth[code] > max_d
        ]
        v1_exceeded_act = [
            (code, depth) for code, depth in v1_exceeded
            if v1_is_active(
                member_map[code_to_id[code]]["status"],
                purchase_map.get(code_to_id[code],{}).get("self_pt",0),
                purchase_map.get(code_to_id[code],{}).get("purchased_required",False),
                member_map[code_to_id[code]]["force_active"]
            )
            and purchase_map.get(code_to_id[code],{}).get("self_pt",0) > 0
            and not member_map[code_to_id[code]]["force_active"]
        ]
        print(f"\n  V1段{max_d}+超過ACT会員: {len(v1_exceeded_act)}名")

        # 各超過会員の「FA会員数ぶんだけ深度を減らした深度」を計算
        # uplineチェーン内のFA会員数をカウント
        def count_fa_in_chain_to_root(member_id, root_id):
            """rootから memberへのuplineチェーンにあるFA会員数"""
            count = 0
            curr = member_map[member_id]["upline_id"]
            while curr and curr != root_id:
                m = member_map.get(curr)
                if not m: break
                if m["force_active"]:
                    count += 1
                curr = m["upline_id"]
            return count

        print(f"\n  超過会員のuplineチェーン内FA数と補正深度:")
        print(f"  {'会員コード':>12} {'V1深度':>6} {'raw深度':>7} {'FA数':>5} {'補正深度(v1-FA)':>15} {'7以内?':>7}")

        candidates_for_d7 = []  # 補正後に段7になる会員
        candidates_for_d6 = []  # 補正後に段6になる会員

        for code, v1d in sorted(v1_exceeded_act, key=lambda x: x[1]):
            pid = code_to_id[code]
            raw_d = raw_depth.get(code, 0)
            fa_count = count_fa_in_chain_to_root(pid, mid)
            corrected_d = v1d - fa_count  # FA透過でfaぶんだけ浅くなる
            in_max = "YES" if corrected_d <= max_d else "no"
            sp = purchase_map.get(pid,{}).get("self_pt",0)

            print(f"  {code:>12} {v1d:>6} {raw_d:>7} {fa_count:>5} {corrected_d:>15} {in_max:>7}")

            if corrected_d == max_d:
                candidates_for_d7.append((code, v1d, corrected_d, sp, fa_count))
            elif corrected_d == max_d - 1:
                candidates_for_d6.append((code, v1d, corrected_d, sp, fa_count))

        print(f"\n  補正後段{max_d}になる会員: {len(candidates_for_d7)}名")
        for code, v1d, cd, sp, fa_c in candidates_for_d7:
            print(f"    {code}: V1={v1d}段→補正{cd}段 (FA={fa_c}個スキップ) sp={sp}")
        print(f"  補正後段{max_d-1}になる会員: {len(candidates_for_d6)}名")
        for code, v1d, cd, sp, fa_c in candidates_for_d6:
            print(f"    {code}: V1={v1d}段→補正{cd}段 (FA={fa_c}個スキップ) sp={sp}")

        # ── 差の計算 ──
        total_pt_d7 = sum(sp for _, _, _, sp, _ in candidates_for_d7)
        total_pt_d6 = sum(sp for _, _, _, sp, _ in candidates_for_d6)
        bonus_d7 = int(total_pt_d7 * rates[max_d-1] / 100 * POINT_RATE)
        bonus_d6 = int(total_pt_d6 * rates[max_d-2] / 100 * POINT_RATE) if len(rates) >= max_d-1 else 0

        print(f"\n  補正後段{max_d}: {total_pt_d7}pt × {rates[max_d-1]}% = {bonus_d7}円")
        print(f"  補正後段{max_d-1}: {total_pt_d6}pt × {rates[max_d-2]}% = {bonus_d6}円")
        print(f"  合計追加ボーナス: {bonus_d7+bonus_d6}円 (期待差: {csv_ulb - (sum(int(purchase_map.get(code_to_id[c],{}).get('self_pt',0)*rates[v1_depth.get(c,0)-1]/100*POINT_RATE) for c in v1_depth if v1_depth[c]<=max_d and v1_is_active(member_map[code_to_id[c]]['status'],purchase_map.get(code_to_id[c],{}).get('self_pt',0),purchase_map.get(code_to_id[c],{}).get('purchased_required',False),member_map[code_to_id[c]]['force_active']) and purchase_map.get(code_to_id[c],{}).get('self_pt',0)>0 and not member_map[code_to_id[c]]['force_active'])):+,}円)")

    print(f"\n{'='*70}")
    print("完了")
    print(f"{'='*70}")

if __name__ == "__main__":
    main()
