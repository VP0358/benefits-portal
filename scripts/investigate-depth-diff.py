#!/usr/bin/env python3
"""
investigate-depth-diff.py
=========================
82179501と44504701のULB差分（-1,050円、-300円）を詳細調査。

段8に押し出されている会員の中で、CSVのグループACT数に含まれているか確認。
"""
import os, sys, csv as csvmod
from collections import defaultdict

try:
    import psycopg2, psycopg2.extras
except ImportError:
    print("pip install psycopg2-binary"); sys.exit(1)

DATABASE_URL = os.environ.get("DATABASE_URL","")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set"); sys.exit(1)

BONUS_MONTH = "2026-04"
ACTIVE_REQUIRED_PRODUCTS = ["1000","2000"]
POINT_RATE = 100
RATES = {4:[15,9,6,5,3,2,1], 5:[15,10,7,6,4,3,2]}
MAX_DEPTH = 7

def main():
    conn = psycopg2.connect(DATABASE_URL)
    conn.set_client_encoding("UTF8")
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute("""
        SELECT id, "memberCode", status, "uplineId", "referrerId", "forceActive"
        FROM mlm_members
    """)
    all_m = cur.fetchall()
    member_map = {}
    code_to_id = {}
    for m in all_m:
        mid = int(m["id"])
        member_map[mid] = {
            "id": mid, "code": m["memberCode"], "status": m["status"],
            "upline_id": int(m["uplineId"]) if m["uplineId"] else None,
            "referrer_id": int(m["referrerId"]) if m["referrerId"] else None,
            "fa": bool(m["forceActive"]),
        }
        code_to_id[m["memberCode"]] = mid

    upline_ch = defaultdict(list)
    for mid, m in member_map.items():
        if m["upline_id"]:
            upline_ch[m["upline_id"]].append(mid)

    cur.execute("""
        SELECT p."mlmMemberId", p."productCode", p."totalPoints"
        FROM mlm_purchases p
        WHERE p."purchaseMonth" = %s
          AND p."purchaseStatus" NOT IN ('cooling_off','canceled')
          AND p.order_id IS NOT NULL
    """, (BONUS_MONTH,))
    pur_map = {}
    for p in cur.fetchall():
        mid = int(p["mlmMemberId"])
        if mid not in pur_map:
            pur_map[mid] = {"pt":0,"req":False}
        if p["productCode"] in ACTIVE_REQUIRED_PRODUCTS:
            pur_map[mid]["pt"] += p["totalPoints"] or 0
            pur_map[mid]["req"] = True
    cur.close(); conn.close()

    def is_act(m, pur):
        if m["fa"]: return True
        if m["status"] in ("withdrawn","lapsed"): return False
        return pur.get("req",False) and pur.get("pt",0) > 0
    def is_wd(m):
        if m["fa"]: return False
        return m["status"] in ("withdrawn","lapsed")

    def calc_ulb_trace(root_id, level):
        """深度ごとのpt・ACT会員リスト（段8超過も記録）"""
        rates = RATES[level]
        depth_pts = defaultdict(int)
        depth_members = defaultdict(list)

        def traverse(curr_id, depth):
            if depth > MAX_DEPTH + 1:
                return
            for child_id in upline_ch.get(curr_id, []):
                m = member_map.get(child_id)
                if not m: continue
                pur = pur_map.get(child_id, {})
                ac = is_act(m, pur)
                wd = is_wd(m)
                fa = m["fa"]
                pt = pur.get("pt", 0)

                if wd:
                    traverse(child_id, depth)
                elif ac:
                    if not fa and pt > 0 and depth <= MAX_DEPTH:
                        depth_pts[depth] += pt
                    if depth <= MAX_DEPTH + 1:
                        depth_members[depth].append({
                            "code": m["code"], "pt": pt, "fa": fa
                        })
                    traverse(child_id, depth + 1)
                else:
                    traverse(child_id, depth)

        traverse(root_id, 1)
        ulb = sum(depth_pts[d] * rates[d-1] * POINT_RATE // 100 for d in range(1, MAX_DEPTH+1))
        return ulb, dict(depth_pts), dict(depth_members)

    # ── 期待値との差を段別に詳細確認 ──
    targets = [
        ("82179501", 4, 53850),
        ("44504701", 5, 44850),
    ]

    for code, level, exp_ulb in targets:
        root_id = code_to_id[code]
        ulb, dp, dm = calc_ulb_trace(root_id, level)
        rates = RATES[level]

        print(f"\n{'='*70}")
        print(f"=== {code} (level={level}) ===")
        print(f"計算ULB={ulb:,}円  期待ULB={exp_ulb:,}円  差={ulb-exp_ulb:+,}円")
        print(f"{'='*70}")

        # 段別サマリ
        print(f"{'段':>3} {'rate':>5} {'PT':>8} {'ACT':>5} {'FA':>4} {'金額':>8}")
        total = 0
        for d in range(1, MAX_DEPTH+2):
            r = rates[d-1] if d <= len(rates) else 0
            pt = dp.get(d, 0)
            members_d = dm.get(d, [])
            act = len([m for m in members_d if not m["fa"] and m["pt"]>0])
            fa = len([m for m in members_d if m["fa"]])
            yen = pt * r * POINT_RATE // 100
            total += yen if d <= MAX_DEPTH else 0
            over = "← 段8超過" if d == MAX_DEPTH+1 else ""
            print(f"段{d:>2} {r:>4}% {pt:>7}pt {act:>4}人 {fa:>3}FA {yen:>7}円 {over}")
        print(f"合計: {total:,}円")

        # 段8超過メンバーのuplineチェーン（最初の5名）
        overflow = dm.get(MAX_DEPTH+1, [])
        print(f"\n段8超過メンバー: {len(overflow)}名")
        print("最初の10名のuplineチェーン(V1圧縮深度):")
        
        # 各メンバーの「V1圧縮深度でのpath」を確認
        depth_of = {}  # code→V1深度
        def traverse_depth(curr_id, depth):
            for child_id in upline_ch.get(curr_id,[]):
                m = member_map.get(child_id)
                if not m: continue
                pur = pur_map.get(child_id,{})
                ac = is_act(m, pur)
                wd = is_wd(m)
                depth_of[m["code"]] = depth
                if wd:
                    traverse_depth(child_id, depth)
                elif ac:
                    traverse_depth(child_id, depth+1)
                else:
                    traverse_depth(child_id, depth)
        traverse_depth(root_id, 1)

        for om in overflow[:10]:
            d = depth_of.get(om["code"], "?")
            # uplineチェーン
            chain = []
            cid = code_to_id.get(om["code"])
            for _ in range(10):
                m = member_map.get(cid)
                if not m: break
                pur = pur_map.get(cid,{})
                ac_flag = is_act(m, pur)
                wd_flag = is_wd(m)
                label = "FA" if m["fa"] else ("ACT" if ac_flag else ("WD" if wd_flag else "非ACT"))
                chain.append(f"{m['code']}({label})")
                if m["upline_id"] is None: break
                if m["code"] == code: break
                cid = m["upline_id"]
            chain_str = " ← ".join(chain[:6])
            print(f"  {om['code']} 深度={d} pt={om['pt']}: {chain_str}")

        # 差分の仮説
        diff = exp_ulb - ulb
        print(f"\n差分分析: {diff:+,}円")
        for d in range(1, MAX_DEPTH+1):
            r = rates[d-1]
            if r > 0:
                needed_pt = diff * 100 // r // POINT_RATE
                print(f"  段{d}(rate={r}%)に{needed_pt}pt不足でも差が説明できる ({needed_pt//150:.1f}人×150pt)")

if __name__ == "__main__":
    main()
