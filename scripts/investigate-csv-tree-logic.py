#!/usr/bin/env python3
"""
investigate-csv-tree-logic.py
=============================
CSVが使うツリー構築ロジックを徹底調査

今回の核心的な発見:
- ACT判定: V1=CSV（完全一致）
- 差の本質: どこかの1〜6人が「別の段」に計上される

新しいアプローチ: ハイブリッド計算
- 段1-6は現行V1と同じ
- 段7のみ差分分析

具体的に:
44504701の段7:
  V1: 52名×150pt = 7950pt
  CSV: 53名相当 = 7950+150=8100pt（1人増）

この「増えた1人」が誰かを特定するには、
CSVのgrpPt=16050からULBを再構築する

別アプローチ: matrixCSVの段数を使ってULBを計算してみる
matrix_892488_full.csvは「44504701起点のmatrix段数」が入っている
これを使ってULBを再計算し、期待値と一致するか確認
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
            "force_level":m["forceLevel"],
            "current_level":m["currentLevel"] or 0,
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

    # ── matrix_892488_full.csvの段数を使ってULB計算 ──
    print("="*80)
    print("matrix段数ベースのULB計算")
    print("="*80)

    # matrixCSVを読み込む
    # 列名を確認
    matrix_rows = []
    try:
        with open("/home/user/uploaded_files/matrix_892488_full.csv","r",encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames
            print(f"\nmatrix CSV列名: {headers}")
            matrix_rows = list(reader)
        print(f"matrix CSV行数: {len(matrix_rows)}")
    except Exception as e:
        print(f"Error: {e}")
        return

    # データ確認
    print(f"\nサンプル（最初の5行）:")
    for row in matrix_rows[:5]:
        print(f"  {dict(row)}")

    # 会員コードと段数のマップ作成（44504701ツリー）
    # 「Act」列もある（V1 active判定と比較用）
    matrix_depth_map = {}
    matrix_act_map = {}
    for row in matrix_rows:
        code = row.get("会員ID","").strip()
        depth_str = row.get("段","0") or "0"
        act_str = row.get("Act","") or ""
        # Actが数値の場合、そのACT会員数を示している
        try:
            depth = int(depth_str)
        except:
            depth = 0
        matrix_depth_map[code] = depth
        matrix_act_map[code] = act_str

    # 44504701のツリーメンバー全員のmatrix段数を確認
    mid_44 = code_to_id["44504701"]
    visited = set()
    tree_44 = []

    def collect(curr_id):
        if curr_id in visited: return
        visited.add(curr_id)
        for child_id in upline_ch.get(curr_id, []):
            m = member_map.get(child_id)
            if not m: continue
            pur = purchase_map.get(child_id, {})
            self_pt = pur.get("self_pt", 0)
            pur_req = pur.get("purchased_required", False)
            fa = m["force_active"]
            ac = v1_is_active(m["status"], self_pt, pur_req, fa)
            code = m["member_code"]
            mat_d = matrix_depth_map.get(code, 0)
            tree_44.append({"id":child_id, "code":code, "self_pt":self_pt,
                             "active":ac, "fa":fa, "matrix_depth":mat_d})
            collect(child_id)

    collect(mid_44)

    # matrixにある会員 vs V1ツリーの会員
    in_matrix = [m for m in tree_44 if m["matrix_depth"] > 0]
    not_in_matrix = [m for m in tree_44 if m["matrix_depth"] == 0]
    print(f"\n44504701ツリー総数: {len(tree_44)}名")
    print(f"matrix段数あり: {len(in_matrix)}名")
    print(f"matrix段数なし(0): {len(not_in_matrix)}名")

    # matrix段数ベースのULB計算（LV5）
    rates = UNILEVEL_RATES[5]
    max_d = 7

    # V1深度マップを構築
    v1_depth_map = {}
    def build_v1_depth(curr_id, depth):
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
            if wd: build_v1_depth(child_id, depth)
            elif ac:
                v1_depth_map[code] = depth
                build_v1_depth(child_id, depth+1)
            else:
                build_v1_depth(child_id, depth)

    build_v1_depth(mid_44, 1)

    # matrix段数とV1深度の比較（ACT会員のみ）
    print(f"\nACT会員のV1深度 vs matrix段数の比較:")
    act_members_44 = [m for m in tree_44 if m["active"] and m["self_pt"]>0 and not m["fa"]]
    diff_depth = [(m["code"], v1_depth_map.get(m["code"],0), m["matrix_depth"])
                  for m in act_members_44
                  if v1_depth_map.get(m["code"],0) != m["matrix_depth"] and m["matrix_depth"] > 0]
    print(f"  V1深度 ≠ matrix段数のACT会員: {len(diff_depth)}名")
    for code, v1d, matd in sorted(diff_depth, key=lambda x: x[1]):
        print(f"  {code}: V1={v1d}段, matrix={matd}段, diff={matd-v1d:+}")

    # matrix段数がV1より1小さい(=CSVでは1段浅い)ACT会員
    deeper_in_v1 = [(c, v, m) for c, v, m in diff_depth if v > m]
    shallower_in_v1 = [(c, v, m) for c, v, m in diff_depth if v < m]
    print(f"\n  V1の方が深い(matrix<v1): {len(deeper_in_v1)}名")
    for c, v, m in deeper_in_v1:
        print(f"    {c}: V1={v}段 > matrix={m}段")
    print(f"  V1の方が浅い(matrix>v1): {len(shallower_in_v1)}名")
    for c, v, m in shallower_in_v1:
        print(f"    {c}: V1={v}段 < matrix={m}段")

    # matrixにある会員でACTかつ段7のもの
    matrix_d7_act = [m for m in in_matrix if m["matrix_depth"]==7 and m["active"] and m["self_pt"]>0 and not m["fa"]]
    v1_d7_act = [m for m in act_members_44 if v1_depth_map.get(m["code"],0)==7]
    print(f"\n段7のACT会員:")
    print(f"  matrix段7 ACT: {len(matrix_d7_act)}名, 合計pt: {sum(m['self_pt'] for m in matrix_d7_act)}pt")
    print(f"  V1段7 ACT: {len(v1_d7_act)}名, 合計pt: {sum(m['self_pt'] for m in v1_d7_act)}pt")

    # matrix段7にいてV1段7にいない会員（=CSVでは段7だがV1では段8以降）
    v1_d7_codes = {m["code"] for m in v1_d7_act}
    matrix_d7_codes = {m["code"] for m in matrix_d7_act}
    in_mat_not_v1 = matrix_d7_codes - v1_d7_codes
    in_v1_not_mat = v1_d7_codes - matrix_d7_codes
    print(f"\n  matrix段7にいてV1段7にいない（CSVで段7、V1で段8以降）: {len(in_mat_not_v1)}名")
    for code in sorted(in_mat_not_v1):
        v1d = v1_depth_map.get(code, 0)
        sp = next((m["self_pt"] for m in act_members_44 if m["code"]==code), 0)
        print(f"    {code}: V1={v1d}段, matrix=7段, sp={sp}")
    print(f"\n  V1段7にいてmatrix段7にいない（V1で段7、matrixで段8以降）: {len(in_v1_not_mat)}名")
    for code in sorted(in_v1_not_mat):
        mat_d = matrix_depth_map.get(code, 0)
        sp = next((m["self_pt"] for m in v1_d7_act if m["code"]==code), 0)
        print(f"    {code}: V1=7段, matrix={mat_d}段, sp={sp}")

    # matrix段数ベースのULB計算
    if matrix_rows:
        matrix_depth_pts = defaultdict(int)
        for m in act_members_44:
            mat_d = m["matrix_depth"]
            if 1 <= mat_d <= max_d and m["self_pt"] > 0:
                matrix_depth_pts[mat_d] += m["self_pt"]

        matrix_ulb = sum(int(matrix_depth_pts.get(d,0)*rates[d-1]/100*POINT_RATE) for d in range(1,max_d+1))
        print(f"\nmatrix段数ベースULB計算 (44504701, LV5):")
        for d in range(1, max_d+1):
            pt = matrix_depth_pts.get(d,0)
            r = rates[d-1]
            b = int(pt*r/100*POINT_RATE)
            print(f"  段{d}: {pt}pt × {r}% = {b}円")
        print(f"  合計: {matrix_ulb:,}円 (期待: 44850円 {'OK' if matrix_ulb==44850 else f'NG diff={matrix_ulb-44850:+}'})")

    # ── 44504701の段7不足の正確な特定 ──
    print(f"\n{'='*80}")
    print("44504701の段7不足の正確な特定")
    print(f"{'='*80}")

    # matrix段数がないがV1では段8のACT会員でmatrixにある会員
    print(f"\nmatrix段数=7かつV1段8の会員（CSVでは段7に計上されているはず）:")
    for code in in_mat_not_v1:
        v1d = v1_depth_map.get(code, 0)
        sp = next((m["self_pt"] for m in act_members_44 if m["code"]==code), 0)
        # uplineチェーン追跡
        pid = code_to_id.get(code)
        chain = []
        if pid:
            curr = member_map[pid]["upline_id"]
            for _ in range(10):
                if not curr: break
                m = member_map.get(curr)
                if not m: break
                chain.append(f"{m['member_code']}(fa={m['force_active']})")
                curr = m["upline_id"]
        print(f"  {code}: V1={v1d}段, sp={sp}pt")
        print(f"    uplineチェーン: {' → '.join(chain[:5])}")

    print(f"\n{'='*80}")
    print("調査完了")
    print(f"{'='*80}")

if __name__ == "__main__":
    main()
