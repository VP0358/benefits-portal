#!/usr/bin/env python3
"""
investigate-monthly-pt-diff.py
====================================
matrixCSVの「当月ポイント」とDB購入データの差異を調査
- 44504701: 当月購入額=4180, 当月ポイント=0 → DB selfPt=?
- 82179501 ツリー内会員のmatrixPt vs DB selfPt の差異

核心目的:
  82179501(-1,050円)と44504701(-300円)の差分原因を特定
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

def v1_is_active(status, self_pt, purchased_required, force_active):
    if force_active: return True
    if status in ("withdrawn","lapsed"): return False
    return purchased_required and self_pt > 0

def v1_is_withdrawn(status, force_active):
    if force_active: return False
    return status in ("withdrawn","lapsed")

def main():
    # matrixCSV読み込み
    matrix_rows = {}
    with open('/home/user/uploaded_files/matrix_892488_full.csv', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            mid = row['会員ID']
            matrix_rows[mid] = {
                'seg': int(row['段数']),
                'act': int(row['Act']),
                'monthly_pt': int(row['当月ポイント'] or 0),
                'monthly_yen': int(row['当月購入額'] or 0),
                'prev_pt': int(row['前月ポイント'] or 0),
                'prev_yen': int(row['前月購入額'] or 0),
                'status': row['ステイタス'],
            }
    print(f"matrix CSV 読み込み: {len(matrix_rows)}行")

    # DB接続
    conn = psycopg2.connect(DATABASE_URL)
    conn.set_client_encoding("UTF8")
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # 全会員情報
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

    # 全購入情報（order_idあり・なし両方）
    cur.execute("""
        SELECT p."mlmMemberId", p."productCode", p."totalPoints",
               p.order_id, (p.order_id IS NOT NULL) as has_order
        FROM mlm_purchases p
        WHERE p."purchaseMonth" = %s
          AND p."purchaseStatus" NOT IN ('cooling_off','canceled')
    """, (BONUS_MONTH,))
    purchase_map_with_order = {}  # has_order=True のみ（V1計算）
    purchase_map_all = {}         # order_idなし含む全て
    for p in cur.fetchall():
        mid = int(p["mlmMemberId"])
        if mid not in purchase_map_with_order:
            purchase_map_with_order[mid] = {"self_pt":0, "purchased_required":False}
        if mid not in purchase_map_all:
            purchase_map_all[mid] = {"self_pt":0, "purchased_required":False}
        if p["productCode"] in ACTIVE_REQUIRED_PRODUCTS:
            if p["has_order"]:
                purchase_map_with_order[mid]["self_pt"] += (p["totalPoints"] or 0)
                purchase_map_with_order[mid]["purchased_required"] = True
            # order_id問わず
            purchase_map_all[mid]["self_pt"] += (p["totalPoints"] or 0)
            purchase_map_all[mid]["purchased_required"] = True

    cur.close(); conn.close()

    # matrixCSVに出てくる全会員のDB selfPt vs matrix 当月ポイントの差異
    print("\n" + "="*80)
    print("matrixCSV会員: DB selfPt vs matrix当月ポイント の差異")
    print("="*80)
    
    diff_members = []
    no_order_members = []  # order_idなし購入があるがmatrix当月ポイントと一致する会員
    
    for code, mrow in matrix_rows.items():
        db_id = code_to_id.get(code)
        if not db_id: continue
        
        db_self_pt_v1 = purchase_map_with_order.get(db_id, {}).get("self_pt", 0)  # V1計算(order必要)
        db_self_pt_all = purchase_map_all.get(db_id, {}).get("self_pt", 0)       # order問わず全て
        matrix_pt = mrow['monthly_pt']
        
        if db_self_pt_v1 != matrix_pt:
            diff_members.append({
                'code': code,
                'matrix_pt': matrix_pt,
                'db_v1_pt': db_self_pt_v1,
                'db_all_pt': db_self_pt_all,
                'matrix_yen': mrow['monthly_yen'],
                'seg': mrow['seg'],
                'status': mrow['status'],
                'act': mrow['act'],
                'diff': matrix_pt - db_self_pt_v1,
            })
    
    print(f"\n差異がある会員数: {len(diff_members)}名")
    print("\nPt差異詳細 (matrix当月pt ≠ DB V1 selfPt):")
    print(f"{'会員CD':<12} {'段':>3} {'matrix_pt':>10} {'db_v1_pt':>10} {'db_all_pt':>10} {'diff':>7} {'yen':>7} {'status':<15}")
    print("-"*85)
    
    for d in sorted(diff_members, key=lambda x: (x['seg'], x['code'])):
        print(f"{d['code']:<12} {d['seg']:>3} {d['matrix_pt']:>10} {d['db_v1_pt']:>10} {d['db_all_pt']:>10} {d['diff']:>+7} {d['matrix_yen']:>7} {d['status']:<15}")
    
    # 重要: matrix当月ポイント>0 かつ db_v1_pt=0 かつ db_all_pt>0 の会員
    print("\n" + "="*80)
    print("【重要】matrix当月Pt>0 かつ V1 selfPt=0 かつ 全購入selfPt>0 (order_id=NULL購入のみで活性化)")
    print("="*80)
    special = [d for d in diff_members if d['matrix_pt'] > 0 and d['db_v1_pt'] == 0 and d['db_all_pt'] > 0]
    print(f"該当会員数: {len(special)}名")
    for d in special:
        print(f"  {d['code']} 段{d['seg']}: matrix={d['matrix_pt']}pt, db_all={d['db_all_pt']}pt, yen={d['matrix_yen']}")
    
    # matrix当月ポイント>0 かつ db_v1_pt=0 かつ db_all_pt=0
    print("\n" + "="*80)
    print("【重要】matrix当月Pt>0 かつ DB selfPt=0 (DBにポイントがない会員)")
    print("="*80)
    missing = [d for d in diff_members if d['matrix_pt'] > 0 and d['db_all_pt'] == 0]
    print(f"該当会員数: {len(missing)}名")
    for d in missing:
        print(f"  {d['code']} 段{d['seg']}: matrix={d['matrix_pt']}pt, yen={d['matrix_yen']}")
    
    # ── 82179501ツリーのみ ──
    print("\n" + "="*80)
    print("【82179501 UPLINEツリー内の差異会員】")
    print("="*80)
    
    # 82179501のuplineツリーを構築
    upline_ch = defaultdict(list)
    for mid, m in member_map.items():
        if m["upline_id"]: upline_ch[m["upline_id"]].append(mid)
    
    def get_all_descendants(root_id):
        result = set()
        stack = [root_id]
        while stack:
            curr = stack.pop()
            for child in upline_ch.get(curr, []):
                result.add(child)
                stack.append(child)
        return result
    
    mc82_id = code_to_id.get("82179501")
    mc44_id = code_to_id.get("44504701")
    
    desc_82 = get_all_descendants(mc82_id)
    desc_44 = get_all_descendants(mc44_id)
    
    print(f"\n82179501のuplineツリー内 ({len(desc_82)}名) の差異会員:")
    diff_82 = [d for d in diff_members if code_to_id.get(d['code']) in desc_82]
    if diff_82:
        for d in sorted(diff_82, key=lambda x: x['seg']):
            print(f"  {d['code']} 段{d['seg']}: matrix={d['matrix_pt']}pt, db_v1={d['db_v1_pt']}pt, db_all={d['db_all_pt']}pt, diff={d['diff']:+}, yen={d['matrix_yen']}")
    else:
        print("  差異なし")
    
    print(f"\n44504701のuplineツリー内 ({len(desc_44)}名) の差異会員:")
    diff_44 = [d for d in diff_members if code_to_id.get(d['code']) in desc_44]
    if diff_44:
        for d in sorted(diff_44, key=lambda x: x['seg']):
            print(f"  {d['code']} 段{d['seg']}: matrix={d['matrix_pt']}pt, db_v1={d['db_v1_pt']}pt, db_all={d['db_all_pt']}pt, diff={d['diff']:+}, yen={d['matrix_yen']}")
    else:
        print("  差異なし")
    
    # ── 44504701自身のmatrixとDB比較 ──
    print("\n" + "="*80)
    print("【44504701自身のmatrix vs DB詳細】")
    print("="*80)
    mc44_row = matrix_rows.get("44504701", {})
    mc44_v1 = purchase_map_with_order.get(mc44_id, {})
    mc44_all = purchase_map_all.get(mc44_id, {})
    print(f"  matrix: 当月Pt={mc44_row.get('monthly_pt')}, 当月Yen={mc44_row.get('monthly_yen')}, seg={mc44_row.get('seg')}")
    print(f"  DB V1 selfPt={mc44_v1.get('self_pt',0)}, purchased_required={mc44_v1.get('purchased_required',False)}")
    print(f"  DB ALL selfPt={mc44_all.get('self_pt',0)}")
    
    # ── 44504701のuniレベルULB計算（V1現行 vs CSV期待）──
    # ここで「CSVがorder_id=NULLも含めてアクティブ判定している」かを確認
    print("\n" + "="*80)
    print("【V1 isActive比較: DB V1 vs DB ALL vs matrix Act】")
    print("(matrix Act=csvでアクティブカウントされる会員数)")
    print("="*80)
    
    for mc, target_id, desc_set in [("82179501", mc82_id, desc_82), ("44504701", mc44_id, desc_44)]:
        v1_acts = 0
        all_acts = 0
        matrix_acts = matrix_rows.get(mc, {}).get('act', 0)
        
        for db_id in desc_set:
            code = id_to_code.get(db_id)
            m = member_map.get(db_id)
            if not m: continue
            
            v1_pur = purchase_map_with_order.get(db_id, {})
            all_pur = purchase_map_all.get(db_id, {})
            fa = m["force_active"]
            
            v1_act = v1_is_active(m["status"], v1_pur.get("self_pt",0), v1_pur.get("purchased_required",False), fa)
            all_act = v1_is_active(m["status"], all_pur.get("self_pt",0), all_pur.get("purchased_required",False), fa)
            
            if v1_act: v1_acts += 1
            if all_act: all_acts += 1
        
        print(f"\n{mc}: V1_acts={v1_acts}, ALL_acts={all_acts}, matrix_Act={matrix_acts}")
        if v1_acts != all_acts:
            print(f"  → V1とALLでアクティブ数が異なる! 差={all_acts-v1_acts}名")

