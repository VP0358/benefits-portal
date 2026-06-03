#!/usr/bin/env python3
"""
【核心調査】WD会員の子の深度計算に関するbonusCSVとV1の違いを特定

前セッションの結論:
  V1の非ACT透過ロジックでは:
    ACT(d=7) → 子WD(透過,d=7のまま) → 子非ACT(透過,d=7のまま) → 子ACT(d=8) → 計算対象外

  bonusCSVでは：
    上記の最後のACT(本来d=8)が段7にカウントされている

仮説を検証:
  仮説A: WD会員の子をWD会員のdepthで計算（親ACTのdepthから再スタート）
  仮説B: 透過後のACTのdepthがWD会員の「元の」親ACTのdepth+1に固定される
  仮説C: uplineIdが違う（DB vs CSV）
  仮説D: WD会員は透過するが、WD会員の子はdepth=WD親のdepth（WDが計算されるとしたらdepth）のまま

  今から具体的にチェックする:
    82の不足7名 = 14578101, 32647101, 48743401, 54619301, 61225401, 64072801, 92993201
    これらの最近のACT先祖を追跡し、正しいdepthを逆算する
"""
import os, sys, math, csv
from collections import defaultdict

try:
    import psycopg2, psycopg2.extras
except ImportError:
    print("pip install psycopg2-binary"); sys.exit(1)

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: set DATABASE_URL"); sys.exit(1)

BONUS_MONTH = "2026-04"
POINT_RATE = 100
UNILEVEL_RATES = {4: [15, 9, 6, 5, 3, 2, 1], 5: [15, 10, 7, 6, 4, 3, 2]}

# 82の不足7名
MISSING_82 = ['14578101', '32647101', '48743401', '54619301', '61225401', '64072801', '92993201']

def is_active(status, self_pt, has_req, force_active):
    if force_active: return True
    if status in ('withdrawn','lapsed'): return False
    return has_req and self_pt > 0

def is_withdrawn(status, force_active):
    if force_active: return False
    return status in ('withdrawn','lapsed')

def get_ancestor_chain(mid, members_by_id, upline_parent, depth_limit=15):
    """uplineチェーンを遡って先祖リストを返す (id, depth_from_self)"""
    chain = []
    cur = mid
    depth = 0
    while cur and depth < depth_limit:
        par = upline_parent.get(cur)
        if par is None:
            break
        depth += 1
        m = members_by_id.get(par)
        if m:
            chain.append({'id': par, 'mc': m['member_code'], 'depth': depth,
                          'act': is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active']),
                          'wd': is_withdrawn(m['status'], m['force_active']),
                          'pt': m['self_pt_04'], 'status': m['status']})
        cur = par
    return chain

def main():
    conn = psycopg2.connect(DATABASE_URL)
    conn.set_client_encoding("UTF8")
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute("""
        SELECT
            m.id, m."memberCode", m.status, m."forceActive", m."forceLevel",
            m."uplineId", m."referrerId",
            COALESCE(SUM(CASE
                WHEN p."purchaseMonth" = %s
                 AND p."productCode" IN ('1000','2000')
                 AND p."order_id" IS NOT NULL
                THEN p."totalPoints" ELSE 0 END), 0)::int AS self_pt_04,
            BOOL_OR(p."purchaseMonth" = %s
                AND p."productCode" IN ('1000','2000')
                AND p."order_id" IS NOT NULL) AS has_req_04
        FROM "mlm_members" m
        LEFT JOIN "mlm_purchases" p ON p."mlmMemberId" = m.id
        GROUP BY m.id, m."memberCode", m.status, m."forceActive", m."forceLevel",
                 m."uplineId", m."referrerId"
    """, (BONUS_MONTH, BONUS_MONTH))

    rows = cur.fetchall()
    members_by_id   = {}
    members_by_code = {}
    upline_children = defaultdict(list)
    upline_parent   = {}  # id -> parent_id (upline)
    for r in rows:
        m = {
            'id': r['id'], 'member_code': r['memberCode'],
            'status': r['status'], 'force_active': r['forceActive'],
            'upline_id': r['uplineId'], 'referrer_id': r['referrerId'],
            'self_pt_04': r['self_pt_04'], 'has_req_04': bool(r['has_req_04']),
        }
        members_by_id[m['id']] = m
        members_by_code[m['member_code']] = m
        if m['upline_id']:
            upline_children[m['upline_id']].append(m['id'])
            upline_parent[m['id']] = m['upline_id']

    cur.close(); conn.close()

    # 82179501のidを取得
    m82 = members_by_code['82179501']
    m82_id = m82['id']

    print("=" * 80)
    print("【82179501】不足7名の先祖チェーン分析")
    print("=" * 80)

    for mc in MISSING_82:
        m = members_by_code.get(mc)
        if not m:
            print(f"  {mc}: NOT FOUND")
            continue
        mid = m['id']

        # 先祖チェーンを遡る
        chain = get_ancestor_chain(mid, members_by_id, upline_parent)

        print(f"\n  [{mc}] ACT={is_active(m['status'],m['self_pt_04'],m['has_req_04'],m['force_active'])} pt={m['self_pt_04']} status={m['status']}")
        print(f"  先祖チェーン (upline方向, 自分から遠い順に表示):")

        # 82179501が現れる位置を探す
        depth_from_82 = None
        for i, anc in enumerate(chain):
            if anc['id'] == m82_id:
                depth_from_82 = anc['depth']
                break

        # チェーンを逆順（82から降順）で表示
        if depth_from_82:
            # 82からこの会員まで
            print(f"  82179501 → ... ({depth_from_82}段) → {mc}")
            print(f"  ⭐ 82からの素直なdepth={depth_from_82}")
        else:
            print(f"  ※ チェーン内に82179501が見つからない（深度不足の可能性）")

        # チェーン表示（最初の15先祖）
        for anc in chain[:15]:
            act_str = "ACT" if anc['act'] else ("WD" if anc['wd'] else "非ACT")
            arrow = "↑"
            print(f"    {arrow} d={anc['depth']:2d}: [{anc['mc']}] {act_str} status={anc['status']} pt={anc['pt']}")
            if anc['id'] == m82_id:
                print(f"    ★ = 82179501 HERE")
                break

    # ----- 「圧縮depth」の計算: 先祖チェーンのうちACT会員のみカウント -----
    print("\n" + "=" * 80)
    print("【仮説検証】圧縮depth = ACTのみカウント方式")
    print("  WD/非ACTを完全スキップしてACTのみカウントすれば82から何段目か")
    print("=" * 80)

    for mc in MISSING_82:
        m = members_by_code.get(mc)
        if not m:
            continue
        mid = m['id']

        chain = get_ancestor_chain(mid, members_by_id, upline_parent, depth_limit=20)

        # ACTのみカウント（82179501まで）
        compressed_depth = 0
        for anc in chain:
            if anc['act']:
                compressed_depth += 1
            if anc['id'] == m82_id:
                break

        print(f"\n  [{mc}]")
        print(f"  チェーン内ACT先祖数（82を含む）: {compressed_depth}")
        print(f"  → 圧縮後のdepth(82から見て): {compressed_depth}")

        # チェーンを全部表示
        for anc in chain:
            act_str = "ACT✓" if anc['act'] else ("WD " if anc['wd'] else "非ACT")
            cnt = "✓カウント" if anc['act'] else "（スキップ）"
            print(f"    d_raw={anc['depth']:2d}: [{anc['mc']}] {act_str} status={anc['status']} pt={anc['pt']} {cnt}")
            if anc['id'] == m82_id:
                print(f"    ↑ = 82179501 (TARGET)")
                break

    # ----- 44の不足1名も調査 -----
    print("\n" + "=" * 80)
    print("【44504701】不足1名の調査")
    print("=" * 80)

    m44 = members_by_code.get('44504701')
    m44_id = m44['id'] if m44 else None

    # 44の段7のACT会員を取得（非ACT透過ロジック）
    rates_lv5 = UNILEVEL_RATES[5]
    depth_act_44 = defaultdict(list)
    stack = [(child_id, 1) for child_id in upline_children.get(m44_id, [])]
    while stack:
        cur_id, depth = stack.pop()
        cm = members_by_id.get(cur_id)
        if not cm: continue
        wd  = is_withdrawn(cm['status'], cm['force_active'])
        act = is_active(cm['status'], cm['self_pt_04'], cm['has_req_04'], cm['force_active'])
        if wd or not act:
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))
        else:
            depth_act_44[depth].append(cm['member_code'])
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth+1))

    print(f"\n  44の段8 ACT会員数: {len(depth_act_44.get(8, []))}名")
    print(f"  44の段7 ACT会員数: {len(depth_act_44.get(7, []))}名")

    # 段7のACT会員の子を調べ、WD/非ACT経由で段8になっているACTを探す
    d7_mcs_44 = depth_act_44.get(7, [])
    d8_mcs_44 = set(depth_act_44.get(8, []))

    # 段8のACTのうち、段7ACTの直接の子でないもの（WD/非ACT経由）
    d7_ids_44 = {members_by_code[mc]['id'] for mc in d7_mcs_44 if mc in members_by_code}
    d7_act_direct_children_44 = set()
    for d7_id in d7_ids_44:
        for c in upline_children.get(d7_id, []):
            cm = members_by_id.get(c)
            if cm:
                act = is_active(cm['status'], cm['self_pt_04'], cm['has_req_04'], cm['force_active'])
                if act:
                    d7_act_direct_children_44.add(cm['member_code'])

    # 段8のACT - 段7ACTの直接ACT子 = WD/非ACT経由の段8ACT
    wd_nonact_derived_d8_44 = d8_mcs_44 - d7_act_direct_children_44
    print(f"\n  段7ACTの直接ACT子（本来段8）: {len(d7_act_direct_children_44)}名")
    print(f"  段8ACTのうちWD/非ACT経由（本来は段7にカウントされるべき）: {len(wd_nonact_derived_d8_44)}名")

    if wd_nonact_derived_d8_44:
        print(f"\n  WD/非ACT経由の段8ACT会員（44504701視点）:")
        for mc in sorted(wd_nonact_derived_d8_44):
            m = members_by_code.get(mc)
            if m:
                # 先祖チェーンを確認
                chain = get_ancestor_chain(m['id'], members_by_id, upline_parent, depth_limit=15)
                print(f"\n    [{mc}] pt={m['self_pt_04']}")
                for anc in chain[:10]:
                    act_str = "ACT✓" if anc['act'] else ("WD " if anc['wd'] else "非ACT")
                    print(f"      d_raw={anc['depth']:2d}: [{anc['mc']}] {act_str} status={anc['status']}")
                    if anc['id'] == m44_id:
                        print(f"      ↑ = 44504701 (TARGET)")
                        break

    # ===== 仮説検証: WD透過で圧縮depthが変わる =====
    print("\n" + "=" * 80)
    print("【核心仮説】WD透過 vs 非ACT透過の違い")
    print("  V1現行: WD透過でdepth変わらず = WD会員は存在しないかのようにスキップ")
    print("  bonusCSV仮説: WD会員はACTとして「depth消費する」が、ポイントは0 →")
    print("    実際には非ACTだが、depth計算上は存在するとみなされる？")
    print("  別仮説: WD会員のdepthはスキップするが、WD会員の「非ACT子」は")
    print("    WDの元の先祖ACTのdepth+1からカウント開始する")
    print("=" * 80)

    # 仮説: WDはdepth消費する（透過しない）が、ボーナスには加算されない
    # つまり WD = depth+1するが bonus加算なし
    def calc_ulb_wd_consumes_depth(target_id, members_by_id, upline_children, level):
        """WD会員はdepth消費するが、非ACT（非WD）は透過"""
        rates = UNILEVEL_RATES[level]
        total = 0
        detail = defaultdict(lambda: {'count':0,'pt':0,'bonus':0,'mcs':[]})

        stack = [(child_id, 1) for child_id in upline_children.get(target_id, [])]
        while stack:
            cur_id, depth = stack.pop()
            m = members_by_id.get(cur_id)
            if not m: continue
            wd  = is_withdrawn(m['status'], m['force_active'])
            act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])

            if wd:
                # WDはdepth+1消費するが、bonus加算なし
                for c in upline_children.get(cur_id, []):
                    stack.append((c, depth+1))
            elif not act:
                # 非ACT(非WD)は透過（depth変わらず）
                for c in upline_children.get(cur_id, []):
                    stack.append((c, depth))
            else:
                # ACT: bonus加算
                if depth <= len(rates):
                    rate = rates[depth-1]
                    b = math.floor(m['self_pt_04'] * (rate/100) * POINT_RATE)
                    total += b
                    detail[depth]['count'] += 1
                    detail[depth]['pt']    += m['self_pt_04']
                    detail[depth]['bonus'] += b
                    detail[depth]['mcs'].append(m['member_code'])
                for c in upline_children.get(cur_id, []):
                    stack.append((c, depth+1))
        return total, dict(detail)

    EXPECTED = {
        '82179501': {'ulb': 53850, 'level': 4},
        '44504701': {'ulb': 44850, 'level': 5},
        '86820601': {'ulb': 98550, 'level': 5},
        '93713601': {'ulb': 52650, 'level': 4},
        '89248801': {'ulb': 19950, 'level': 5},
    }

    print("\n  WD=depth消費(bonus0), 非ACT=透過 の計算結果:")
    print(f"  {'会員':12s} {'計算値':>10s} {'期待値':>10s} {'差':>8s} {'判定'}")
    for mc, exp in EXPECTED.items():
        m = members_by_code.get(mc)
        if not m: continue
        ulb, detail = calc_ulb_wd_consumes_depth(m['id'], members_by_id, upline_children, exp['level'])
        diff = ulb - exp['ulb']
        judge = "✅" if diff == 0 else f"❌({diff:+,})"
        print(f"  {mc:12s} {ulb:>10,} {exp['ulb']:>10,} {diff:>+8,} {judge}")

    # 追加仮説: WDも透過するが、WDの次の非ACTはWDのdepth-1から継続
    # → 「WD会員の直下は、WD会員の1段前の扱い」
    print()

    # 仮説: depth_adjust = WD会員を「-1」調整する
    # WDが出たときにdepthを増やさず、次の非ACT子はdepthをさらに調整しない
    # → 実質的に V1と同じなので却下

    # 仮説2: WD会員は「depth消費なし」だが、WDの子への伝達もdepth変わらず
    # ただし、WDの子のACTはdepth=WD親のdepthからカウント（WD親がいたらその深さ）
    # これがV1と全く同じなので却下

    # -----
    # 別の観点: V1は「非ACT透過」だがbonusCSVは「ACT会員のみ」でdepth計算する場合
    # = WD,非ACTをスキップしてACTだけでdepth計算
    # つまりbonusCSV depth = 自分より上流にいるACT先祖の数
    # これが「圧縮depth」仮説

    print("\n" + "=" * 80)
    print("【仮説】圧縮depth = 上流ACT先祖の数でdepth計算")
    print("  各会員のdepth = 82179501（または対象会員）からACT先祖のみカウント")
    print("=" * 80)

    def calc_ulb_compressed_depth(target_id, target_mc, members_by_id, upline_children, upline_parent, level):
        """
        圧縮depth: 各会員のdepth = target_idから見て、ACT先祖のみカウント
        実装: DFSで探索, depthはACT会員を通過した回数
        """
        rates = UNILEVEL_RATES[level]
        max_d = len(rates)
        total = 0
        detail = defaultdict(lambda: {'count':0,'pt':0,'bonus':0,'mcs':[]})

        # DFS: (cur_id, compressed_depth = ACT通過回数)
        # target_id自身はACT(depth=0), その直接ACT子がdepth=1
        # WD/非ACTは透過（depth変わらず）
        # ACTはdepth+1

        # V1の非ACT透過ロジックと同じ... → 同じ結果になる
        # 違いは何か？

        # もしかして: WDを「透過しない」でdepthを消費させる
        # でもそうすると段7のWDの子が段8になってしまう

        # 別のアイデア: 
        # WD会員は透過するが、その間は「親のdepth」を保持
        # WD後のACT会員のdepthは「WDが来る前の最後のdepth+1」ではなく
        # 「WDの親のdepth+1」（つまり同じ）

        # ...やっぱり全部同じ結果になる

        # では: 探索の打ち切り条件が違う？
        # V1: depth > max_d(7) の場合、子を探索しない
        # bonusCSV: depth > max_d(7) でも探索を続ける？（子のdepthが7以下になりえるなら）

        # これが鍵かもしれない！
        # 非ACT透過でdepth=7のACTが子にWD/非ACT連鎖を持ち、
        # その先のACTがdepth=8になる場合:
        # V1では depth=8でカット（子も探索しない）
        # もしかしてbonusCSVでは depth=8のACTの子がdepth=8のまま探索続ける？
        # でもそれだと段7のカウントに影響しない

        # 正解はまだ不明

        return total, dict(detail)

    # ===== 最終仮説: uplineIdが違う =====
    # DBのuplineIdとCSVのuplineIdが違う場合
    # matrix_892488_full.csvで確認

    print("\n" + "=" * 80)
    print("【仮説】matrix CSVの段数を使って不足7名の「正しい段数」を確認")
    print("matrix_892488_full.csvから82の不足7名の段数を取得")
    print("=" * 80)

    # matrix_892488_full.csvを読み込む（89起点のツリー）
    matrix_file = '/home/user/uploaded_files/matrix_892488_full.csv'
    try:
        with open(matrix_file, encoding='utf-8-sig') as f:
            matrix_rows = list(csv.DictReader(f))
        print(f"  matrix_892488_full.csv: {len(matrix_rows)}行")
        if matrix_rows:
            print(f"  カラム: {list(matrix_rows[0].keys())[:10]}")

        # 82の不足7名がmatrixに存在するか確認
        for mc in MISSING_82:
            found = [r for r in matrix_rows if r.get('会員番号','').strip() == mc]
            if found:
                print(f"\n  {mc} in matrix: あり")
                for r in found:
                    print(f"    段数={r.get('段数','?')}, スポンサー={r.get('スポンサー','?')}, ルート={r.get('ルート','?')}")
            else:
                print(f"\n  {mc}: matrix内に不在（89起点ツリーに含まれないのかも）")
    except Exception as e:
        print(f"  ERROR: {e}")

    # bonus_list_full.csvから不足7名のデータを確認
    print("\n" + "=" * 80)
    print("【bonus_list_full.csvから不足7名のデータ確認】")
    print("=" * 80)
    bonus_data = {}
    with open('/home/user/uploaded_files/bonus_list_full.csv', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            bonus_data[row['会員番号'].strip()] = row

    for mc in MISSING_82:
        b = bonus_data.get(mc)
        if b:
            print(f"\n  {mc}: grp_act={b.get('グループACT','?')}, grp_pt={b.get('グループpt','?')}, ulb={b.get('ユニレベルB','?')}, active={b.get('ｱｸﾃｨﾌﾞ','?')}")
            print(f"    self_pt={b.get('自己購入pt','?')}, ref={b.get('直ACT','?')}, lv={b.get('称号レベル','?')}")
        else:
            print(f"\n  {mc}: bonus_listに不在（非ボーナス対象）")

    # ダウンラインレポートを確認
    print("\n" + "=" * 80)
    print("【ダウンラインCSVの確認】")
    print("  82179501起点のダウンラインCSVがあれば不足7名の段数を確認できる")
    print("=" * 80)

    import glob
    for f_path in glob.glob('/home/user/uploaded_files/ダウン*'):
        print(f"\n  ファイル: {f_path}")
        try:
            with open(f_path, encoding='utf-8-sig') as f:
                rows = list(csv.DictReader(f))
            print(f"  行数: {len(rows)}, カラム: {list(rows[0].keys())[:10] if rows else []}")
            # 不足7名を探す
            found_any = False
            for mc in MISSING_82:
                for r in rows:
                    mc_field = r.get('会員番号','').strip() or r.get('memberCode','').strip()
                    if mc_field == mc:
                        print(f"  {mc}: 段数={r.get('段数','?')}, {r}")
                        found_any = True
                        break
            if not found_any:
                print(f"  不足7名は見つからなかった")
        except Exception as e:
            print(f"  ERROR: {e}")

    print("\n✅ 調査完了")

if __name__ == "__main__":
    main()
