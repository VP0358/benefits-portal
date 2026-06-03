#!/usr/bin/env python3
"""
investigate-grppt-diff.py
============================
82179501と44504701のグループpt差分（900pt, 300pt）の根本原因を特定する

CSVのグループpt=22800（82）、16050（44）
V1計算のULB段1-7合計pt → 差分の出所を特定

アプローチ：
1. V1深度マップを構築して各段のpt配分を確認
2. グループpt（全ACT合計pt）とULB段合計ptの比較
3. 段8+超過会員のfull一覧と、もし彼らを「段7に含める」とどうなるか
4. 44504701の直ACT=5 vs V1のDAC計算の確認
"""

import os, sys, csv
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
UNILEVEL_RATES = {4:[15,9,6,5,3,2,1], 5:[15,10,7,6,4,3,2]}
UNILEVEL_MAX_DEPTH = {4:7, 5:7}

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

    # ── 会員データ取得 ──
    cur.execute("""
        SELECT id, "memberCode", status, "uplineId", "referrerId",
               "forceActive", "forceLevel", "currentLevel"
        FROM mlm_members ORDER BY id
    """)
    all_members_raw = cur.fetchall()
    member_map = {}
    id_to_code = {}
    code_to_id = {}
    for m in all_members_raw:
        mid = int(m["id"])
        member_map[mid] = {
            "id": mid, "member_code": m["memberCode"], "status": m["status"],
            "upline_id": int(m["uplineId"]) if m["uplineId"] else None,
            "referrer_id": int(m["referrerId"]) if m["referrerId"] else None,
            "force_active": bool(m["forceActive"]),
            "force_level": m["forceLevel"], "current_level": m["currentLevel"] or 0,
        }
        id_to_code[mid] = m["memberCode"]
        code_to_id[m["memberCode"]] = mid

    upline_ch = defaultdict(list)
    referrer_ch = defaultdict(list)
    for mid, m in member_map.items():
        if m["upline_id"]: upline_ch[m["upline_id"]].append(mid)
        if m["referrer_id"]: referrer_ch[m["referrer_id"]].append(mid)

    # ── 購入データ取得（has_orderチェック） ──
    cur.execute("""
        SELECT p."mlmMemberId", p."productCode", p."totalPoints",
               p.order_id, (p.order_id IS NOT NULL) as has_order
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

    # ── 購入データ取得（has_orderチェック なし = order_id=NULL含む版） ──
    cur.execute("""
        SELECT p."mlmMemberId", p."productCode", p."totalPoints",
               p.order_id, (p.order_id IS NOT NULL) as has_order
        FROM mlm_purchases p
        WHERE p."purchaseMonth" = %s
          AND p."purchaseStatus" NOT IN ('cooling_off','canceled')
    """, (BONUS_MONTH,))
    purchase_map_nocheck = {}
    for p in cur.fetchall():
        mid = int(p["mlmMemberId"])
        if mid not in purchase_map_nocheck:
            purchase_map_nocheck[mid] = {"self_pt":0, "purchased_required":False}
        if p["productCode"] in ACTIVE_REQUIRED_PRODUCTS:  # order_idチェックなし
            purchase_map_nocheck[mid]["self_pt"] += (p["totalPoints"] or 0)
            purchase_map_nocheck[mid]["purchased_required"] = True

    cur.close(); conn.close()

    TARGET_CODES = ["82179501","44504701"]
    CSV_EXPECTED = {
        "82179501": {"grpPt":22800, "ulb":53850, "level":4, "grpAct":206, "dac":2},
        "44504701": {"grpPt":16050, "ulb":44850, "level":5, "grpAct":207, "dac":5},
    }

    for mc in TARGET_CODES:
        mid = code_to_id[mc]
        exp = CSV_EXPECTED[mc]
        level = exp["level"]
        rates = UNILEVEL_RATES[level]
        max_d = UNILEVEL_MAX_DEPTH[level]

        print(f"\n{'='*80}")
        print(f"【{mc}】 LV{level} グループpt差分調査")
        print(f"  CSV期待: grpPt={exp['grpPt']}, ULB={exp['ulb']}円, grpACT={exp['grpAct']}, DAC={exp['dac']}")
        print(f"{'='*80}")

        # ── ツリー全体のACT会員を収集（深度なし・全階層） ──
        all_act_members = []
        all_members_in_tree = []
        visited = set()

        def collect_all(curr_id):
            if curr_id in visited: return
            visited.add(curr_id)
            for child_id in upline_ch.get(curr_id, []):
                m = member_map.get(child_id)
                if not m: continue
                pur = purchase_map.get(child_id, {})
                self_pt = pur.get("self_pt", 0)
                pur_req = pur.get("purchased_required", False)
                fa = m["force_active"]
                wd = v1_is_withdrawn(m["status"], fa)
                ac = v1_is_active(m["status"], self_pt, pur_req, fa)
                all_members_in_tree.append({
                    "id": child_id, "code": m["member_code"],
                    "self_pt": self_pt, "active": ac, "fa": fa, "wd": wd,
                    "status": m["status"]
                })
                if ac and self_pt > 0 and not fa:
                    all_act_members.append({"id": child_id, "code": m["member_code"], "self_pt": self_pt})
                collect_all(child_id)

        collect_all(mid)
        total_grp_pt = sum(m["self_pt"] for m in all_act_members)
        print(f"\n[A] 全ツリーACT集計（深度制限なし）")
        print(f"    ACT会員数(FA除く): {len(all_act_members)}名")
        print(f"    合計selfPt: {total_grp_pt:,}pt")
        print(f"    CSV grpPt: {exp['grpPt']:,}pt → 差: {total_grp_pt - exp['grpPt']:+,}pt")

        # FA含む vs 除外のグループACT数
        act_with_fa = sum(1 for m in all_members_in_tree if m["active"])
        act_without_fa = sum(1 for m in all_members_in_tree if m["active"] and not m["fa"])
        print(f"    グループACT(FA含む): {act_with_fa}名 (CSV:{exp['grpAct']})")
        print(f"    グループACT(FA除く): {act_without_fa}名")

        # ── V1深度マップ構築（segment1-7合計ptを計算） ──
        depth_pts = defaultdict(int)
        depth_members = defaultdict(list)
        exceeded_members = []  # 段8以降に落ちた会員

        def traverse_depth(curr_id, depth):
            for child_id in upline_ch.get(curr_id, []):
                m = member_map.get(child_id)
                if not m: continue
                pur = purchase_map.get(child_id, {})
                self_pt = pur.get("self_pt", 0)
                pur_req = pur.get("purchased_required", False)
                fa = m["force_active"]
                wd = v1_is_withdrawn(m["status"], fa)
                ac = v1_is_active(m["status"], self_pt, pur_req, fa)

                info = {"id":child_id, "code":m["member_code"], "self_pt":self_pt,
                        "active":ac, "fa":fa, "wd":wd, "depth":depth}

                if wd:
                    traverse_depth(child_id, depth)
                elif ac:
                    if depth <= max_d:
                        depth_members[depth].append(info)
                        if not fa and self_pt > 0:
                            depth_pts[depth] += self_pt
                    else:
                        if not fa and self_pt > 0:
                            exceeded_members.append(info)
                    traverse_depth(child_id, depth+1)
                else:
                    traverse_depth(child_id, depth)

        traverse_depth(mid, 1)

        v1_total_pt = sum(depth_pts.values())
        v1_ulb = sum(int(depth_pts[d] * rates[d-1] / 100 * POINT_RATE) for d in range(1, max_d+1))

        print(f"\n[B] V1深度別pt（has_orderチェックあり）")
        print(f"    {'段':>2} {'ACT名':>6} {'FA名':>5} {'pt合計':>10} {'rate':>5} {'bonus':>10}")
        for d in range(1, max_d+1):
            members_at_d = depth_members[d]
            act_cnt = sum(1 for m in members_at_d if m["active"] and not m["fa"] and m["self_pt"]>0)
            fa_cnt  = sum(1 for m in members_at_d if m["fa"])
            pt = depth_pts[d]
            r = rates[d-1]
            bonus = int(pt * r / 100 * POINT_RATE)
            print(f"    {d:>2}段 {act_cnt:>6}名 {fa_cnt:>5}名 {pt:>10,}pt {r:>4}% {bonus:>10,}円")
        print(f"    合計pt: {v1_total_pt:,}pt (CSV grpPt: {exp['grpPt']:,}pt → 差: {v1_total_pt - exp['grpPt']:+,}pt)")
        print(f"    V1 ULB計算: {v1_ulb:,}円 (期待: {exp['ulb']:,}円 → 差: {v1_ulb - exp['ulb']:+,}円)")

        print(f"\n[C] 段8+超過ACT会員（V1深度>{max_d}）")
        print(f"    超過会員数: {len(exceeded_members)}名, 合計pt: {sum(m['self_pt'] for m in exceeded_members):,}pt")
        for m in exceeded_members[:10]:
            print(f"    depth={m['depth']:>3} {m['code']} selfPt={m['self_pt']}")
        if len(exceeded_members) > 10:
            print(f"    ...他{len(exceeded_members)-10}名")

        # ── grpPtの逆算: CSVのgrpPtはどの範囲のACTを対象にしているか ──
        print(f"\n[D] grpPt=={exp['grpPt']}になるための仮説検証")
        # 仮説1: 段8超過も含む全ACT合計 = total_grp_pt
        diff1 = total_grp_pt - exp['grpPt']
        diff2 = v1_total_pt - exp['grpPt']
        ok1 = "OK" if diff1==0 else f"NG diff={diff1:+}"
        ok2 = "OK" if diff2==0 else f"NG diff={diff2:+}"
        print(f"    仮説1 全ACT合計pt: {total_grp_pt}pt [{ok1}]")
        # 仮説2: 段1-7のACT合計 = v1_total_pt
        print(f"    仮説2 V1段1-7合計pt: {v1_total_pt}pt [{ok2}]")
        # 仮説3: grpPt/全ACT名数
        if len(all_act_members)>0:
            avg = total_grp_pt / len(all_act_members)
            print(f"    平均selfPt: {avg:.1f}pt/人 ({total_grp_pt}pt / {len(all_act_members)}名)")

        # ── DAC計算 ──
        print(f"\n[E] DAC計算（referrerIdベース）")
        dac_referrer = sum(
            1 for ch_id in referrer_ch.get(mid, [])
            if v1_is_active(
                member_map[ch_id]["status"],
                purchase_map.get(ch_id,{}).get("self_pt",0),
                purchase_map.get(ch_id,{}).get("purchased_required",False),
                member_map[ch_id]["force_active"]
            )
        )
        dac_upline = sum(
            1 for ch_id in upline_ch.get(mid, [])
            if v1_is_active(
                member_map[ch_id]["status"],
                purchase_map.get(ch_id,{}).get("self_pt",0),
                purchase_map.get(ch_id,{}).get("purchased_required",False),
                member_map[ch_id]["force_active"]
            )
        )
        print(f"    referrerベースDAC: {dac_referrer}名 (CSV直ACT: {exp['dac']})")
        print(f"    uplineベースDAC: {dac_upline}名")
        # 直ACT=5のために、referrer children を確認
        print(f"    referrer直接の子（全員）:")
        for ch_id in referrer_ch.get(mid, []):
            m = member_map.get(ch_id,{})
            pur = purchase_map.get(ch_id,{})
            sp = pur.get("self_pt",0)
            pr = pur.get("purchased_required",False)
            fa = m.get("force_active",False)
            ac = v1_is_active(m.get("status",""), sp, pr, fa)
            print(f"      {m.get('member_code','?')} active={ac} fa={fa} sp={sp} status={m.get('status','?')}")

        # ── 段7のACTメンバー一覧詳細 ──
        print(f"\n[F] 段7のACTメンバー詳細（V1深度=7）")
        members_at_7 = depth_members.get(7, [])
        act_at_7 = [m for m in members_at_7 if m["active"] and not m["fa"] and m["self_pt"]>0]
        fa_at_7  = [m for m in members_at_7 if m["fa"]]
        print(f"    段7総数: {len(members_at_7)}名 (ACT: {len(act_at_7)}名, FA: {len(fa_at_7)}名)")
        print(f"    段7 ACTメンバー一覧:")
        for m in act_at_7[:30]:
            print(f"      {m['code']} selfPt={m['self_pt']}")
        if len(act_at_7) > 30:
            print(f"      ...他{len(act_at_7)-30}名")

        # ── matrix_892488_full.csvとの段数比較 ──
        print(f"\n[G] matrix_892488_full.csv の段数確認")
        try:
            matrix_data = {}
            with open("/home/user/uploaded_files/matrix_892488_full.csv","r",encoding="utf-8-sig") as f:
                for row in csv.DictReader(f):
                    matrix_data[row["会員ID"].strip()] = {
                        "depth": int(row.get("段",0) or 0),
                        "act": row.get("Act",""),
                        "sp": row.get("自己pt","") or row.get("selfPt","") or "",
                    }

            # 段8+超過メンバーのmatrix段数確認
            print(f"    段8+超過会員のmatrix段数:")
            for m in exceeded_members:
                mat = matrix_data.get(m["code"],{})
                print(f"      {m['code']}: V1depth={m['depth']} matrix段={mat.get('depth','?')} act={mat.get('act','?')}")

            # V1段7でmatrixが6以下の会員（圧縮で段7に到達した会員）
            compressed_to_7 = []
            for m in act_at_7:
                mat = matrix_data.get(m["code"],{})
                mat_d = mat.get("depth",0)
                if mat_d > 7:  # V1では段7だがmatrixでは段8以上
                    compressed_to_7.append({"code":m["code"],"v1_d":7,"mat_d":mat_d,"sp":m["self_pt"]})
            print(f"\n    V1段7にいてmatrix段8+の会員（非ACT透過で短縮されてV1段7に到達）: {len(compressed_to_7)}名")
            for m in compressed_to_7:
                print(f"      {m['code']}: V1=7段, matrix={m['mat_d']}段, selfPt={m['sp']}")

        except Exception as e:
            print(f"    CSV読み込みエラー: {e}")

        # ── order_id=NULL購入者のツリー内確認 ──
        print(f"\n[H] order_id=NULL購入者がV1 active=×なのにCSV active=○になっていないか確認")
        # order_id=NULLの会員がV1では非ACTだが、CSVのグループptに含まれている場合
        cur2 = psycopg2.connect(DATABASE_URL).cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur2.execute("""
            SELECT DISTINCT p."mlmMemberId"
            FROM mlm_purchases p
            WHERE p."purchaseMonth" = %s
              AND p."purchaseStatus" NOT IN ('cooling_off','canceled')
              AND p."productCode" IN ('1000','2000')
              AND p.order_id IS NULL
        """, (BONUS_MONTH,))
        null_order_mids = {int(r["mlmMemberId"]) for r in cur2.fetchall()}
        cur2.close()

        # このツリー内でorder_id=NULLの会員
        tree_null_order = [m for m in all_members_in_tree if m["id"] in null_order_mids]
        print(f"    ツリー内のorder_id=NULL購入者: {len(tree_null_order)}名")
        # has_orderチェックありでactive
        for tm in tree_null_order[:5]:
            pur_with = purchase_map.get(tm["id"],{})
            pur_without = purchase_map_nocheck.get(tm["id"],{})
            print(f"      {tm['code']}: with_check(sp={pur_with.get('self_pt',0)},ac={tm['active']}), "
                  f"without_check(sp={pur_without.get('self_pt',0)})")
        if len(tree_null_order) > 5:
            print(f"      ...他{len(tree_null_order)-5}名")

    print(f"\n{'='*80}")
    print("調査完了")
    print(f"{'='*80}")

if __name__ == "__main__":
    main()
