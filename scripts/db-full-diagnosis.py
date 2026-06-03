#!/usr/bin/env python3
"""
db-full-diagnosis.py
=====================
DB接続を使って5名の完全診断を実施

【実行方法】
  DATABASE_URL="postgresql://user:pass@host/db?sslmode=require" python3 scripts/db-full-diagnosis.py

【出力】
  ① 実ツリーデータCSV (position_id/upline_id/referrer_id/self_pt/active/force_active)
  ② ULB depth1-7 完全計算途中値
  ③ SB seriesDetail (全系列 + ACTメンバー)
  ④ CSVに存在しない会員 (DB only)
  ⑤ uplineId ≠ referrerId の会員一覧
  ⑥ V1エンジン vs 期待値 差分検証
"""

import os
import sys
import csv
import json
from collections import defaultdict

# DB接続
try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("psycopg2 not found. Install: pip install psycopg2-binary")
    sys.exit(1)

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    print("Usage: DATABASE_URL='postgresql://...' python3 scripts/db-full-diagnosis.py")
    sys.exit(1)

BONUS_MONTH = "2026-04"
ACTIVE_REQUIRED_PRODUCTS = ["1000", "2000"]
POINT_RATE = 100

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
ORG_EXCEPTION_CODES = {"44504701", "89248801"}

EXPECTED = {
    "82179501": {"ulb": 53850,  "sb": 35700,  "minPt": 10200, "level": 4},
    "44504701": {"ulb": 44850,  "sb": 122400, "minPt": 30600, "level": 5},
    "86820601": {"ulb": 98550,  "sb": 16200,  "minPt": 4050,  "level": 5},
    "93713601": {"ulb": 52650,  "sb": 4200,   "minPt": 1200,  "level": 4},
    "89248801": {"ulb": 19950,  "sb": 122400, "minPt": 30600, "level": 5},
}

TARGET_CODES = ["82179501", "44504701", "86820601", "93713601", "89248801"]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# V1エンジン ロジック（bonus-calculation-engine-v1.ts と完全一致）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def v1_is_active(status, self_pt, purchased_required, force_active):
    if force_active: return True
    if status in ("withdrawn", "lapsed"): return False
    return purchased_required and self_pt > 0

def v1_is_withdrawn(status, force_active):
    if force_active: return False
    return status in ("withdrawn", "lapsed")

def calc_depth_pts_v1(root_id, achieved_level, upline_ch, purchase_map, member_map):
    max_depth = UNILEVEL_MAX_DEPTH.get(achieved_level, 0)
    if max_depth == 0:
        return {}, []

    depth_pts = defaultdict(int)
    trace = []

    def traverse(curr_id, depth):
        if depth > max_depth:
            return
        for child_id in upline_ch.get(curr_id, []):
            m = member_map.get(child_id)
            if not m:
                continue
            pur = purchase_map.get(child_id, {})
            self_pt = pur.get("self_pt", 0)
            pur_req = pur.get("purchased_required", False)
            fa = m["force_active"]
            wd = v1_is_withdrawn(m["status"], fa)
            ac = v1_is_active(m["status"], self_pt, pur_req, fa)

            if wd:
                action = "WD透過"
                traverse(child_id, depth)  # depth消費なし
            elif ac:
                if not fa and self_pt > 0:
                    depth_pts[depth] += self_pt
                    action = f"ACT+pt({self_pt})"
                elif fa:
                    action = "FA(depth消費・pt=0)"
                else:
                    action = "ACT(pt=0)"
                traverse(child_id, depth + 1)  # depth+1
            else:
                action = "非ACT透過"
                traverse(child_id, depth)  # depth消費なし

            trace.append({
                "depth": depth,
                "position_id": child_id,
                "member_code": m["member_code"],
                "self_pt": self_pt,
                "active": ac,
                "withdrawn": wd,
                "force_active": fa,
                "status": m["status"],
                "action": action,
                "upline_id": m["upline_id"],
                "referrer_id": m["referrer_id"],
            })

    traverse(root_id, 1)
    return dict(depth_pts), trace


def calc_series_v1(root_id, upline_ch, purchase_map, member_map):
    direct_children = upline_ch.get(root_id, [])
    series_list = []

    for child_id in direct_children:
        series_total = [0]
        members_in_series = []

        def traverse_series(curr_id, compressed_depth):
            m = member_map.get(curr_id)
            if not m:
                return
            pur = purchase_map.get(curr_id, {})
            self_pt = pur.get("self_pt", 0)
            pur_req = pur.get("purchased_required", False)
            fa = m["force_active"]
            wd = v1_is_withdrawn(m["status"], fa)
            ac = v1_is_active(m["status"], self_pt, pur_req, fa)

            members_in_series.append({
                "position_id": curr_id,
                "member_code": m["member_code"],
                "self_pt": self_pt,
                "active": ac,
                "withdrawn": wd,
                "force_active": fa,
                "status": m["status"],
                "upline_id": m["upline_id"],
                "referrer_id": m["referrer_id"],
                "compressed_depth": compressed_depth,
            })

            if wd:
                for desc_id in upline_ch.get(curr_id, []):
                    traverse_series(desc_id, compressed_depth)  # depth変わらず
                return
            if fa:
                for desc_id in upline_ch.get(curr_id, []):
                    traverse_series(desc_id, compressed_depth + 1)  # depth+1
                return
            # 通常: ACTならpt加算
            if ac and self_pt > 0:
                series_total[0] += self_pt
            for desc_id in upline_ch.get(curr_id, []):
                traverse_series(desc_id, compressed_depth + 1)

        traverse_series(child_id, 1)

        child_m = member_map.get(child_id, {})
        series_list.append({
            "series_root": child_id,
            "series_root_code": child_m.get("member_code", str(child_id)),
            "series_pt": series_total[0],
            "member_count": len(members_in_series),
            "act_member_count": sum(
                1 for m in members_in_series
                if m["active"] and m["self_pt"] > 0 and not m["force_active"]
            ),
            "members": members_in_series,
        })

    return series_list


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DB接続・データ取得
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def main():
    print("=" * 80)
    print("DB完全診断スクリプト")
    print(f"BONUS_MONTH: {BONUS_MONTH}")
    print("=" * 80)

    conn = psycopg2.connect(DATABASE_URL)
    conn.set_client_encoding("UTF8")
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # ── 全会員取得 ──
    print("\n[1/5] 会員データ取得中...")
    cur.execute("""
        SELECT id, "memberCode", status, "uplineId", "referrerId",
               "forceActive", "forceLevel", "currentLevel"
        FROM mlm_members
        ORDER BY id
    """)
    all_members_raw = cur.fetchall()
    print(f"  → {len(all_members_raw)}件取得")

    member_map = {}
    id_to_code = {}
    code_to_id = {}
    for m in all_members_raw:
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
        id_to_code[mid] = m["memberCode"]
        code_to_id[m["memberCode"]] = mid

    # ── childrenMap構築 ──
    upline_ch = defaultdict(list)   # uplineId → children (ULB/SB計算用)
    referrer_ch = defaultdict(list) # referrerId → children (DAC計算用)
    for mid, m in member_map.items():
        if m["upline_id"]:
            upline_ch[m["upline_id"]].append(mid)
        if m["referrer_id"]:
            referrer_ch[m["referrer_id"]].append(mid)

    # ── 購入データ取得 ──
    print("[2/5] 購入データ取得中...")
    cur.execute("""
        SELECT p."mlmMemberId", p."productCode", p."totalPoints",
               p.order_id,
               (p.order_id IS NOT NULL) as has_order
        FROM mlm_purchases p
        WHERE p."purchaseMonth" = %s
          AND p."purchaseStatus" NOT IN ('cooling_off', 'canceled')
    """, (BONUS_MONTH,))
    purchases_raw = cur.fetchall()
    null_order_count = sum(1 for p in purchases_raw if not p["has_order"])
    print(f"  → {len(purchases_raw)}件取得 (order_id=NULL: {null_order_count}件)")

    purchase_map = {}
    for p in purchases_raw:
        mid = int(p["mlmMemberId"])
        has_order = bool(p["has_order"])
        if mid not in purchase_map:
            purchase_map[mid] = {"self_pt": 0, "purchased_required": False}
        # order_id=NULLの購入はselfPtにカウントしない（V1エンジンと同仕様）
        if p["productCode"] in ACTIVE_REQUIRED_PRODUCTS and has_order:
            purchase_map[mid]["self_pt"] += (p["totalPoints"] or 0)
            purchase_map[mid]["purchased_required"] = True

    cur.close()
    conn.close()

    # ── CSVデータとの比較用 ──
    csv_member_codes = set()
    try:
        with open("/home/user/uploaded_files/matrix_892488_full.csv", "r", encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                csv_member_codes.add(row["会員ID"].strip())
        print(f"\nCSVメンバー数: {len(csv_member_codes)}")
    except FileNotFoundError:
        print("CSVファイルが見つかりません")

    db_member_codes = set(id_to_code.values())
    db_only_codes = db_member_codes - csv_member_codes
    csv_only_codes = csv_member_codes - db_member_codes

    print(f"DBメンバー数: {len(db_member_codes)}")
    print(f"DBのみ(CSVに存在しない): {len(db_only_codes)}件")
    print(f"CSVのみ(DBに存在しない): {len(csv_only_codes)}件")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # ④ DBのみ会員 (CSVに存在しない)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    print("\n" + "=" * 80)
    print("④ DBのみ会員（CSVに存在しない）一覧")
    print("=" * 80)
    db_only_with_pt = []
    db_only_no_pt = []
    for code in sorted(db_only_codes):
        mid = code_to_id.get(code)
        if not mid:
            continue
        m = member_map[mid]
        pur = purchase_map.get(mid, {})
        self_pt = pur.get("self_pt", 0)
        upline_code = id_to_code.get(m["upline_id"], str(m["upline_id"])) if m["upline_id"] else ""
        fa = m["force_active"]
        ac = v1_is_active(m["status"], self_pt, pur.get("purchased_required", False), fa)
        rec = {
            "member_code": code,
            "position_id": mid,
            "status": m["status"],
            "upline_id": m["upline_id"],
            "upline_code": upline_code,
            "self_pt": self_pt,
            "active": ac,
            "force_active": fa,
        }
        if self_pt > 0:
            db_only_with_pt.append(rec)
        else:
            db_only_no_pt.append(rec)

    print(f"  selfPt>0 の会員: {len(db_only_with_pt)}件")
    for r in db_only_with_pt:
        print(f"    {r['member_code']} (id={r['position_id']}): upline={r['upline_code']}, selfPt={r['self_pt']}, active={r['active']}, fa={r['force_active']}, status={r['status']}")

    print(f"\n  selfPt=0 の会員: {len(db_only_no_pt)}件 (先頭20件)")
    for r in db_only_no_pt[:20]:
        print(f"    {r['member_code']} (id={r['position_id']}): upline={r['upline_code']}, status={r['status']}, fa={r['force_active']}")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # ⑤ uplineId ≠ referrerId 会員一覧
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    print("\n" + "=" * 80)
    print("⑤ uplineId ≠ referrerId 会員一覧（全DB）")
    print("=" * 80)
    diff_members = []
    for mid, m in member_map.items():
        if m["upline_id"] and m["referrer_id"] and m["upline_id"] != m["referrer_id"]:
            pur = purchase_map.get(mid, {})
            self_pt = pur.get("self_pt", 0)
            upline_code  = id_to_code.get(m["upline_id"],  str(m["upline_id"]))
            referrer_code = id_to_code.get(m["referrer_id"], str(m["referrer_id"]))
            diff_members.append({
                "member_code":   m["member_code"],
                "position_id":   mid,
                "upline_id":     m["upline_id"],
                "upline_code":   upline_code,
                "referrer_id":   m["referrer_id"],
                "referrer_code": referrer_code,
                "self_pt":       self_pt,
                "status":        m["status"],
                "force_active":  m["force_active"],
            })

    print(f"  uplineId≠referrerId: {len(diff_members)}件")
    for r in sorted(diff_members, key=lambda x: x["member_code"]):
        print(f"  {r['member_code']}: upline={r['upline_code']}, referrer={r['referrer_code']}, pt={r['self_pt']}, status={r['status']}, fa={r['force_active']}")

    # uplineId≠referrerIdをCSVに保存
    diff_csv_path = "/home/user/webapp/scripts/db-upline-referrer-diff.csv"
    with open(diff_csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["member_code","position_id","upline_id","upline_code","referrer_id","referrer_code","self_pt","status","force_active"])
        writer.writeheader()
        writer.writerows(sorted(diff_members, key=lambda x: x["member_code"]))
    print(f"\n  → {diff_csv_path} に保存")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # ⑤ 5名のV1エンジン計算 + 期待値差分
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    print("\n" + "=" * 80)
    print("⑤ V1エンジン正当性証明 - 5名全員の計算途中値")
    print("=" * 80)

    all_ok = True
    for mc in TARGET_CODES:
        mid = code_to_id.get(mc)
        if not mid:
            print(f"\n  {mc}: DBに存在しない！")
            continue

        m = member_map[mid]
        pur = purchase_map.get(mid, {})
        self_pt = pur.get("self_pt", 0)
        pur_req = pur.get("purchased_required", False)
        fa = m["force_active"]
        ac = v1_is_active(m["status"], self_pt, pur_req, fa)

        achieved_level = m["force_level"] if m["force_level"] is not None else m["current_level"]

        # DAC (referrerIdベース)
        dac = sum(
            1 for ch_id in referrer_ch.get(mid, [])
            if not v1_is_withdrawn(member_map[ch_id]["status"], member_map[ch_id]["force_active"])
            and v1_is_active(
                member_map[ch_id]["status"],
                purchase_map.get(ch_id, {}).get("self_pt", 0),
                purchase_map.get(ch_id, {}).get("purchased_required", False),
                member_map[ch_id]["force_active"]
            )
        )

        # ULB計算
        depth_pts, ulb_trace = calc_depth_pts_v1(mid, achieved_level, upline_ch, purchase_map, member_map)
        rates = UNILEVEL_RATES.get(achieved_level, [])
        max_depth = UNILEVEL_MAX_DEPTH.get(achieved_level, 0)

        ulb_total = 0
        ulb_detail = {}
        for d in range(1, max_depth + 1):
            pt = depth_pts.get(d, 0)
            rate = rates[d-1] if d-1 < len(rates) else 0
            bonus = int(pt * rate / 100 * POINT_RATE) if pt > 0 and rate > 0 else 0
            ulb_total += bonus
            ulb_detail[d] = {"pt": pt, "rate": rate, "bonus": bonus,
                             "act": sum(1 for t in ulb_trace if t["depth"]==d and t["active"] and t["self_pt"]>0 and not t["force_active"]),
                             "fa": sum(1 for t in ulb_trace if t["depth"]==d and t["force_active"]),
                             "wd": sum(1 for t in ulb_trace if t["depth"]==d and t["withdrawn"]),
                             "non": sum(1 for t in ulb_trace if t["depth"]==d and not t["active"] and not t["withdrawn"])}

        ulb_qualified = (self_pt > 0 or fa) and dac >= 2
        ulb_final = ulb_total if ulb_qualified else 0

        # SB計算
        series_list = calc_series_v1(mid, upline_ch, purchase_map, member_map)
        series_pts = [s["series_pt"] for s in series_list]
        non_zero_pts = [p for p in series_pts if p > 0]
        min_series_pt = min(non_zero_pts) if non_zero_pts else 0
        series_count = len(series_list)

        is_exception = mc in ORG_EXCEPTION_CODES
        min_required = 1 if is_exception else 3
        sb_rate = STRUCTURE_BONUS_RATES.get(achieved_level, 0)
        is_first_pos = len(mc) >= 8 and mc[-2:] == "01"

        sb_qualified = (
            ac and dac >= 2 and achieved_level >= 3 and
            is_first_pos and series_count >= min_required and min_series_pt > 0
        )
        sb_total = int(min_series_pt * sb_rate / 100 * POINT_RATE) if sb_qualified else 0

        exp = EXPECTED.get(mc, {})
        exp_ulb  = exp.get("ulb", None)
        exp_sb   = exp.get("sb", 0)
        exp_minpt = exp.get("minPt", 0)

        ulb_ok   = (ulb_final == exp_ulb) if exp_ulb is not None else True
        sb_ok    = sb_total == exp_sb
        minpt_ok = min_series_pt == exp_minpt

        if not ulb_ok or not sb_ok:
            all_ok = False

        print(f"\n{'─'*70}")
        print(f"【{mc}】 LV{achieved_level}, active={ac}, fa={fa}, selfPt={self_pt}, dac={dac}")
        print(f"  position_id={mid}, upline={id_to_code.get(m['upline_id'],'?')}, referrer={id_to_code.get(m['referrer_id'],'?')}")
        print(f"  upline_id={m['upline_id']}, referrer_id={m['referrer_id']}, diff={'★' if m['upline_id']!=m['referrer_id'] else '='}")
        print()
        print(f"  ULB計算途中値 (V1エンジン同一ロジック):")
        print(f"  {'段':>3} {'PT':>10} {'rate':>5} {'bonus':>10} {'ACT':>5} {'FA':>4} {'WD':>4} {'非ACT':>6}")
        for d in range(1, max_depth + 1):
            dd = ulb_detail.get(d, {})
            print(f"  {d:>3}段 {dd.get('pt',0):>10,}pt {dd.get('rate',0):>4}% {dd.get('bonus',0):>10,}円 {dd.get('act',0):>5}名 {dd.get('fa',0):>4}名 {dd.get('wd',0):>4}名 {dd.get('non',0):>6}名")
        print(f"  合計: {ulb_total:,}円 (qualified={ulb_qualified})")
        print(f"  ULB最終: {ulb_final:,}円")
        print(f"  ULB期待: {exp_ulb}円  {'✅' if ulb_ok else f'❌ 差={ulb_final-(exp_ulb or 0):+,}円'}")

        print()
        print(f"  SB系列詳細 (全{series_count}系列, minRequired={min_required}):")
        for s in series_list:
            act_m = [m for m in s["members"] if m["active"] and m["self_pt"]>0 and not m["force_active"]]
            diff_m = [m for m in s["members"] if m["upline_id"] and m["referrer_id"] and m["upline_id"]!=m["referrer_id"]]
            print(f"    [{s['series_root_code']}]: {s['series_pt']:,}pt ({s['act_member_count']}名ACT) upline≠referrer:{len(diff_m)}件")
        print(f"  series_pts={series_pts}")
        print(f"  non_zero={non_zero_pts}, minSeriesPt={min_series_pt:,}pt")
        print(f"  SB: rate={sb_rate}%, calc={sb_total:,}円 (qualified={sb_qualified})")
        print(f"  SB期待: {exp_sb:,}円  {'✅' if sb_ok else f'❌ 差={sb_total-exp_sb:+,}円'}")
        print(f"  minPt期待: {exp_minpt:,}pt  {'✅' if minpt_ok else f'❌ 差={min_series_pt-exp_minpt:+,}pt'}")

    print(f"\n{'='*80}")
    print(f"総合: {'✅ 全員期待値と一致' if all_ok else '❌ 不一致あり → 下記の差分を確認'}")
    print(f"{'='*80}")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # ① 82179501の全子孫をCSVに出力
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    print("\n" + "=" * 80)
    print("① 82179501の全ダウンラインCSV出力")
    print("=" * 80)

    root_id = code_to_id.get("82179501")
    if root_id:
        visited = set()
        def get_descendants(curr_id):
            if curr_id in visited:
                return
            visited.add(curr_id)
            for ch_id in upline_ch.get(curr_id, []):
                yield ch_id
                yield from get_descendants(ch_id)

        desc_ids = list(get_descendants(root_id))

        csv_path = "/home/user/webapp/scripts/db-82179501-tree.csv"
        with open(csv_path, "w", encoding="utf-8", newline="") as f:
            fieldnames = ["position_id","member_code","status","upline_id","upline_code",
                         "referrer_id","referrer_code","self_pt","active","force_active","parent_source"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for child_id in desc_ids:
                m = member_map.get(child_id)
                if not m:
                    continue
                pur = purchase_map.get(child_id, {})
                self_pt = pur.get("self_pt", 0)
                pur_req = pur.get("purchased_required", False)
                fa = m["force_active"]
                ac = v1_is_active(m["status"], self_pt, pur_req, fa)
                upline_code  = id_to_code.get(m["upline_id"], "")  if m["upline_id"] else ""
                referrer_code = id_to_code.get(m["referrer_id"], "") if m["referrer_id"] else ""
                diff = "DIFF" if (m["upline_id"] and m["referrer_id"] and m["upline_id"] != m["referrer_id"]) else "SAME"

                writer.writerow({
                    "position_id":   child_id,
                    "member_code":   m["member_code"],
                    "status":        m["status"],
                    "upline_id":     m["upline_id"] or "",
                    "upline_code":   upline_code,
                    "referrer_id":   m["referrer_id"] or "",
                    "referrer_code": referrer_code,
                    "self_pt":       self_pt,
                    "active":        1 if ac else 0,
                    "force_active":  1 if fa else 0,
                    "parent_source": diff,
                })

        act_count = sum(1 for d in desc_ids if v1_is_active(
            member_map.get(d, {}).get("status",""),
            purchase_map.get(d, {}).get("self_pt", 0),
            purchase_map.get(d, {}).get("purchased_required", False),
            member_map.get(d, {}).get("force_active", False)
        ) and not member_map.get(d, {}).get("force_active", False)
          and purchase_map.get(d, {}).get("self_pt", 0) > 0)

        total_act_pt = sum(
            purchase_map.get(d, {}).get("self_pt", 0)
            for d in desc_ids
            if v1_is_active(
                member_map.get(d, {}).get("status",""),
                purchase_map.get(d, {}).get("self_pt", 0),
                purchase_map.get(d, {}).get("purchased_required", False),
                member_map.get(d, {}).get("force_active", False)
            ) and not member_map.get(d, {}).get("force_active", False)
              and purchase_map.get(d, {}).get("self_pt", 0) > 0
        )
        diff_count = sum(
            1 for d in desc_ids
            if member_map.get(d, {}).get("upline_id") and member_map.get(d, {}).get("referrer_id")
            and member_map.get(d, {}).get("upline_id") != member_map.get(d, {}).get("referrer_id")
        )

        print(f"  → {len(desc_ids)}名のダウンライン")
        print(f"  → ACT会員: {act_count}名 ({total_act_pt:,}pt)")
        print(f"  → upline≠referrer: {diff_count}件")
        print(f"  → CSV保存: {csv_path}")


if __name__ == "__main__":
    main()
