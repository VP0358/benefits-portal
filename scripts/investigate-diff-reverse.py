#!/usr/bin/env python3
"""
investigate-diff-reverse.py
====================================
82179501と44504701の差分を段別に完全解析

核心: 段7に1人足りないと仮定した場合のCSVとの比較
- 44504701: 段7+1人(150pt) → +300円 ✅ (一致)
- 82179501: 段7+6人(900pt) → +900円だが期待は+1050円 ❌

82179501の差1050円を満たす候補:
  - 段7だけ: 1050÷1=1050pt (7人) → なぜ段7のrateが1%なのに900ptしか合わない？
  - 段6+段7の組み合わせ?: 段6 rate=2%, 段7 rate=1%
    - Xpt@段6 + Yp@段7 → 2X+Y=10500 (×10-3換算 → 10500/10=1050)
    - もし段6にも不足分があれば

  実際の差: V1 grpPt=21900 vs CSV grpPt=22800 → 差=+900pt
  しかし ULB差は+1050円 → 900ptが全て段7にあれば+900円、一部が段6以上にあれば+1050円超

  900ptが全て段6にある場合: +1800円（大幅超過）
  900ptが段6に150pt、段7に750ptの場合: 150×2%×100 + 750×1%×100 = 300+750=1050円 ✅ !!

  つまり、CSVでは:
  - 段6に150pt追加 (1人)
  - 段7に750pt追加 (5人)
  - 合計900pt追加 → ULB差1050円

検証: どの段のどの会員が「V1段8→CSV段7」「V1段7→CSV段6」に移動しているか？

アプローチ: 44504701の段7不足1人を特定し、その上位FA連鎖を調べる
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
            "force_level":m["forceLevel"], "current_level":m["currentLevel"] or 0,
        }
        id_to_code[mid] = m["memberCode"]
        code_to_id[m["memberCode"]] = mid

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

    print("="*80)
    print("差分逆算分析")
    print("="*80)

    # ── 82179501の段別計算（段別の詳細） ──
    for mc, level, csv_grp_pt, csv_ulb, rates in [
        ("82179501", 4, 22800, 53850, [15,9,6,5,3,2,1]),
        ("44504701", 5, 16050, 44850, [15,10,7,6,4,3,2]),
    ]:
        mid = code_to_id[mc]
        max_d = 7

        depth_members = defaultdict(list)
        depth8plus = []

        def traverse(curr_id, depth):
            for child_id in upline_ch.get(curr_id, []):
                m = member_map.get(child_id)
                if not m: continue
                pur = purchase_map.get(child_id, {})
                self_pt = pur.get("self_pt", 0)
                pur_req = pur.get("purchased_required", False)
                fa = m["force_active"]
                wd = v1_is_withdrawn(m["status"], fa)
                ac = v1_is_active(m["status"], self_pt, pur_req, fa)

                if wd:
                    traverse(child_id, depth)
                elif ac:
                    if depth <= max_d:
                        depth_members[depth].append({
                            "id":child_id, "code":m["member_code"],
                            "self_pt":self_pt, "fa":fa, "depth":depth,
                            "upline_id":m["upline_id"],
                        })
                    else:
                        if self_pt>0 and not fa:
                            depth8plus.append({
                                "id":child_id, "code":m["member_code"],
                                "self_pt":self_pt, "depth":depth,
                                "upline_id":m["upline_id"],
                            })
                    traverse(child_id, depth+1)
                else:
                    traverse(child_id, depth)

        # トラバース前にリセット
        depth_members = defaultdict(list)
        depth8plus = []

        traverse(mid, 1)

        v1_pts = {d: sum(m["self_pt"] for m in depth_members[d] if not m["fa"]) for d in range(1,max_d+1)}
        v1_ulb = sum(int(v1_pts[d] * rates[d-1] / 100 * POINT_RATE) for d in range(1, max_d+1))
        v1_total_pt = sum(v1_pts.values())

        print(f"\n{'='*70}")
        print(f"【{mc}】 LV{level}")
        print(f"  V1段1-7合計: {v1_total_pt}pt, ULB={v1_ulb}円")
        print(f"  CSV grpPt: {csv_grp_pt}pt, CSV ULB: {csv_ulb}円")
        print(f"  差: pt={v1_total_pt-csv_grp_pt:+}, ULB={v1_ulb-csv_ulb:+}円")

        # 差の逆算
        diff_pt = csv_grp_pt - v1_total_pt
        diff_ulb = csv_ulb - v1_ulb
        print(f"\n[差の逆算]")
        print(f"  不足pt: {diff_pt}pt ({diff_pt//150:.0f}人分)")
        print(f"  不足ULB: {diff_ulb}円")

        # 各段に不足ptを配置した場合のULBへの影響
        print(f"\n  各段にdiff_pt({diff_pt}pt)を全て配置した場合:")
        for d in range(1, max_d+1):
            add_ulb = int(diff_pt * rates[d-1] / 100 * POINT_RATE)
            match = " ✅" if add_ulb == diff_ulb else ""
            print(f"    段{d}(rate={rates[d-1]}%): +{add_ulb}円{match}")

        # 2段の組み合わせで差を再現できるか
        print(f"\n  2段組み合わせで差{diff_ulb}円を再現:")
        for d1 in range(1, max_d+1):
            for d2 in range(d1+1, max_d+1):
                # X×rate1 + Y×rate2 = diff_ulb/100 (100倍してから割る)
                # X+Y=diff_pt (total pt constraint)
                r1, r2 = rates[d1-1], rates[d2-1]
                if r1 == r2: continue
                # Xpt@d1 + (diff_pt-X)pt@d2 = diff_ulb/100
                # X(r1-r2) + diff_pt*r2 = diff_ulb/100
                # X = (diff_ulb/100 - diff_pt*r2) / (r1-r2)
                lhs = diff_ulb / POINT_RATE
                denom = (r1 - r2)
                if denom == 0: continue
                x = (lhs - diff_pt * r2 / 100) / (r1 - r2) * 100
                y = diff_pt - x
                if x >= 0 and y >= 0 and x % 150 == 0 and y % 150 == 0:
                    print(f"    段{d1}({r1}%)+段{d2}({r2}%): {x:.0f}pt@段{d1} + {y:.0f}pt@段{d2} = {int(x*r1/100*100)+int(y*r2/100*100)}円{'✅' if int(x*r1/100*100)+int(y*r2/100*100)==diff_ulb else '❌'}")

        # ── 段8+の会員をuplineチェーンを辿って「どこのFAが原因で押し出されたか」を確認 ──
        print(f"\n[段8+会員のuplineチェーン（FA会員の特定）]")
        print(f"  段8+超過会員数: {len(depth8plus)}名")

        # 各会員のuplineチェーンを辿り、最初のFA会員を特定
        fa_caused = defaultdict(list)  # fa_code -> 影響を受けた会員リスト
        for exc in depth8plus:
            # uplineチェーンを辿る
            curr = exc["upline_id"]
            chain = []
            while curr:
                m = member_map.get(curr)
                if not m: break
                if m["force_active"]:
                    chain.append(m["member_code"])
                    fa_caused[m["member_code"]].append(exc["code"])
                    break
                curr = m["upline_id"]

        print(f"\n  FA会員ごとの影響（段7→段8に押し出した会員数）:")
        for fa_code, affected in sorted(fa_caused.items(), key=lambda x: -len(x[1])):
            print(f"    FA:{fa_code} → {len(affected)}名を段8+へ押し出し")
            # このFA会員の深度を確認
            fa_id = code_to_id.get(fa_code)
            if fa_id:
                m = member_map[fa_id]
                upline_code = id_to_code.get(m["upline_id"],"?")
                print(f"      (upline={upline_code})")

        # ── 44504701: 段7不足1人（150pt）の特定 ──
        if mc == "44504701":
            print(f"\n[44504701: 段7に本来いるべき1人（150pt）の特定]")
            # 段8でV1depth=8の会員を全員確認し、どのFAが原因か
            depth8_exact = [m for m in depth8plus if m["depth"]==8]
            print(f"  V1段8の会員: {len(depth8_exact)}名")
            # uplineが段7のFA会員か否かを確認
            for m8 in depth8_exact[:5]:
                upline = member_map.get(m8["upline_id"])
                upline_code = id_to_code.get(m8["upline_id"],"?") if m8["upline_id"] else "?"
                if upline:
                    upline_fa = upline.get("force_active", False)
                    upline_pur = purchase_map.get(m8["upline_id"],{})
                    upline_sp = upline_pur.get("self_pt",0)
                    print(f"    {m8['code']}(depth=8): upline={upline_code}(fa={upline_fa},sp={upline_sp})")

        # ── 82179501: 段6に1人+段7に5人の仮説を検証 ──
        if mc == "82179501":
            print(f"\n[82179501: 段6+1人(150pt) + 段7+5人(750pt) 仮説]")
            add_d6 = 150
            add_d7 = 750
            bonus_d6 = int(add_d6 * rates[5] / 100 * POINT_RATE)  # rate段6=2%
            bonus_d7 = int(add_d7 * rates[6] / 100 * POINT_RATE)  # rate段7=1%
            total_bonus = bonus_d6 + bonus_d7
            print(f"  段6+{add_d6}pt × {rates[5]}% × {POINT_RATE} = +{bonus_d6}円")
            print(f"  段7+{add_d7}pt × {rates[6]}% × {POINT_RATE} = +{bonus_d7}円")
            print(f"  合計: {total_bonus}円 {'✅' if total_bonus==diff_ulb else '❌ (期待='+str(diff_ulb)+'円)'}")

            # V1段7の会員のuplineを確認（段6にいるFA会員の直下か？）
            print(f"\n  段7ACT会員のuplineがFAか確認（サンプル）:")
            members_at_7 = [m for m in depth_members.get(7,[]) if not m["fa"] and m["self_pt"]>0]
            fa_upline_count = 0
            for m7 in members_at_7:
                upline = member_map.get(m7["upline_id"])
                if upline and upline.get("force_active"):
                    fa_upline_count += 1
                    print(f"    {m7['code']}(depth=7): upline={id_to_code.get(m7['upline_id'],'?')}(FA)")
            print(f"  段7のACT会員でuplineがFAの会員: {fa_upline_count}名")

            # 段6のメンバー確認
            print(f"\n  段6のメンバー（FA含む）:")
            members_at_6 = depth_members.get(6,[])
            act_at_6 = [m for m in members_at_6 if not m["fa"] and m["self_pt"]>0]
            fa_at_6  = [m for m in members_at_6 if m["fa"]]
            print(f"  段6総数: {len(members_at_6)} (ACT={len(act_at_6)}, FA={len(fa_at_6)})")
            print(f"  段6 ACT会員: {[m['code'] for m in act_at_6[:10]]}")
            print(f"  段6 FA会員: {[m['code'] for m in fa_at_6]}")

            # 段8でuplineが段7のACT会員（FA経由で段7に圧縮されてV1では段8になった）
            print(f"\n  段8超過会員のうち、uplineが段7のACT会員（FA圧縮なし）:")
            members_at_7_ids = {m["id"] for m in members_at_7}
            members_pushed_from_7_to_8 = []
            for exc in depth8plus:
                if exc["upline_id"] in members_at_7_ids:
                    upline_m = [m for m in members_at_7 if m["id"]==exc["upline_id"]]
                    upline_code = upline_m[0]["code"] if upline_m else "?"
                    members_pushed_from_7_to_8.append((exc["code"], upline_code))
            print(f"  該当会員数: {len(members_pushed_from_7_to_8)}名")
            for pushed_code, up_code in members_pushed_from_7_to_8[:10]:
                print(f"    {pushed_code} (upline={up_code})")

    print(f"\n{'='*80}")
    print("調査完了")
    print(f"{'='*80}")

if __name__ == "__main__":
    main()
