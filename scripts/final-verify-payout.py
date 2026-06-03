#!/usr/bin/env python3
"""
最終検証: 支払対象者数=37名の確認と5名のULB/SB計算
"""
import psycopg2
from collections import defaultdict

DB_URL = "postgresql://neondb_owner:npg_Rijek4FWvcT6@ep-super-tree-amnvg5fu-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
BONUS_MONTH = "2026-04"
POINT_RATE = 100
MIN_PAYOUT = 3000
ORG_EXCEPTION_CODES = {"44504701", "89248801"}

UNILEVEL_MAX_DEPTH = {0:0,1:3,2:5,3:7,4:7,5:7}
UNILEVEL_RATES = {
    0:[15,7,3,0,0,0,0],1:[15,7,3,0,0,0,0],2:[15,7,4,3,1,0,0],
    3:[15,8,5,4,2,2,1],4:[15,9,6,5,3,2,1],5:[15,10,7,6,4,3,2]
}

EXPECTED = {
    "82179501": {"ulb": 53850, "sb": 35700, "min_pt": 10200},
    "44504701": {"ulb": 44850, "sb": 122400, "min_pt": 30600},
    "86820601": {"ulb": 98550, "sb": 16200, "min_pt": 4050},
    "93713601": {"ulb": 52650, "sb": 4200, "min_pt": 1200},
    "89248801": {"ulb": 19950, "sb": 122400, "min_pt": 30600},
}

def is_wd(s, fa):
    if fa: return False
    return s in ("withdrawn", "lapsed")

def is_act(s, pt, req, fa):
    if fa: return True
    if s in ("withdrawn", "lapsed"): return False
    return req and pt > 0

def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    cur.execute("""SELECT id, "memberCode", status, "uplineId", "referrerId",
                   "currentLevel", "forceActive", "forceLevel"
                   FROM mlm_members WHERE "memberCode" IS NOT NULL""")
    member_map = {}
    for r in cur.fetchall():
        mid, code, st, upid, refid, lv, fa, fl = r
        member_map[mid] = {"code":code,"status":st,"upline_id":upid,"referrer_id":refid,
                           "current_level":lv or 0,"force_active":bool(fa),"force_level":fl}

    cur.execute("""SELECT p."mlmMemberId",
        SUM(CASE WHEN p."productCode" IN ('1000','2000') AND p."order_id" IS NOT NULL 
            THEN p."totalPoints" ELSE 0 END),
        BOOL_OR(p."productCode" IN ('1000','2000') AND p."order_id" IS NOT NULL),
        BOOL_OR(p."productCode" = '1000')
        FROM mlm_purchases p
        WHERE p."purchaseMonth" = %s AND p."purchaseStatus" NOT IN ('cooling_off','canceled')
        GROUP BY p."mlmMemberId" """, (BONUS_MONTH,))
    purchase_map = {}
    for r in cur.fetchall():
        mid, spt, req, h1000 = r
        purchase_map[mid] = {"self_pt":int(spt or 0),"purchased_required":bool(req),"has_1000":bool(h1000)}

    cur.close()
    conn.close()

    upline_map = defaultdict(list)
    referrer_map = defaultdict(list)
    for mid, m in member_map.items():
        if m["upline_id"]: upline_map[m["upline_id"]].append(mid)
        if m["referrer_id"]: referrer_map[m["referrer_id"]].append(mid)

    def get_act(mid):
        m = member_map.get(mid, {})
        p = purchase_map.get(mid, {})
        return is_act(m.get("status",""), p.get("self_pt",0), p.get("purchased_required",False), m.get("force_active",False))

    def calc_dp(root_id, lv):
        max_d = UNILEVEL_MAX_DEPTH.get(lv, 0)
        if max_d == 0: return {}
        dp = defaultdict(int)
        stack = [(root_id, 1)]
        while stack:
            cid, d = stack.pop()
            if d > max_d: continue
            for chid in upline_map.get(cid, []):
                ch = member_map.get(chid)
                if not ch: continue
                p = purchase_map.get(chid, {})
                if is_wd(ch["status"], ch["force_active"]):
                    stack.append((chid, d))
                else:
                    child_act = is_act(ch["status"],p.get("self_pt",0),p.get("purchased_required",False),ch["force_active"])
                    if child_act:
                        if p.get("self_pt",0) > 0: dp[d] += p["self_pt"]
                        stack.append((chid, d+1))
                    else:
                        stack.append((chid, d))
        return dict(dp)

    def calc_series(root_id):
        series = []
        for cid in upline_map.get(root_id, []):
            visited, stack, total = set(), [cid], 0
            while stack:
                nid = stack.pop()
                if nid in visited: continue
                visited.add(nid)
                ch = member_map.get(nid)
                if not ch: continue
                p = purchase_map.get(nid, {})
                if is_act(ch["status"],p.get("self_pt",0),p.get("purchased_required",False),ch["force_active"]):
                    total += p.get("self_pt", 0)
                for gc in upline_map.get(nid, []): stack.append(gc)
            series.append(total)
        return series

    payout_count = 0
    results = []

    for mid, m in member_map.items():
        p = purchase_map.get(mid, {})
        self_pt = p.get("self_pt", 0)
        fa = m["force_active"]
        act = is_act(m["status"], self_pt, p.get("purchased_required",False), fa)
        lv = m["force_level"] if m["force_level"] is not None else m["current_level"]
        code = m["code"]

        dac = sum(1 for c in referrer_map.get(mid, []) if get_act(c))

        # ULB
        ulb = 0
        if dac >= 2 and (self_pt > 0 or fa):
            dp = calc_dp(mid, lv)
            rates = UNILEVEL_RATES.get(lv, UNILEVEL_RATES[0])
            max_d = UNILEVEL_MAX_DEPTH.get(lv, 0)
            for d in range(1, max_d+1):
                pt = dp.get(d, 0)
                rate = rates[d-1] if d-1 < len(rates) else 0
                if pt > 0 and rate > 0:
                    ulb += int(pt * (rate/100) * POINT_RATE)

        # SB
        sb = 0
        min_pt = 0
        if act and dac >= 2 and lv >= 3 and code.endswith("01"):
            series_pts = calc_series(mid)
            pos_series = sorted([s for s in series_pts if s > 0], reverse=True)
            req_series = 1 if code in ORG_EXCEPTION_CODES else 3
            if len(pos_series) >= req_series:
                min_pt = pos_series[req_series-1]
                SB_RATES = {3:3, 4:5, 5:10}
                sb_rate = SB_RATES.get(lv, 0)
                sb = int(min_pt * (sb_rate/100) * POINT_RATE)

        # DB
        db = 0
        for c in referrer_map.get(mid, []):
            cp = purchase_map.get(c, {})
            if cp.get("has_1000", False) and get_act(c):
                db += 2000

        total = db + ulb + sb
        if total >= MIN_PAYOUT:
            payout_count += 1
            results.append((code, db, ulb, sb, min_pt, total))

    print(f"=== 支払対象者数 ===")
    print(f"計算値: {payout_count}名")
    print(f"期待値: 37名")
    print(f"一致: {'✅' if payout_count == 37 else '❌'}")
    
    print(f"\n=== 5名の計算値 ===")
    target_codes = set(EXPECTED.keys())
    for code, db, ulb, sb, min_pt, total in sorted(results, key=lambda x: x[0]):
        if code in target_codes:
            exp = EXPECTED.get(code, {})
            ulb_s = "✅" if ulb == exp["ulb"] else f"❌(差={ulb-exp['ulb']:+d})"
            sb_s = "✅" if sb == exp["sb"] else f"❌(差={sb-exp['sb']:+d})"
            mpt_s = "✅" if min_pt == exp["min_pt"] else f"❌(差={min_pt-exp['min_pt']:+d})"
            print(f"  {code}: ULB={ulb:,}({ulb_s}) SB={sb:,}({sb_s}) minPt={min_pt}({mpt_s})")

    print(f"\n=== 支払対象者一覧（{payout_count}名） ===")
    for code, db, ulb, sb, min_pt, total in sorted(results, key=lambda x: -x[5]):
        print(f"  {code}: DB={db:,} ULB={ulb:,} SB={sb:,} 合計={total:,}")

if __name__ == "__main__":
    main()
