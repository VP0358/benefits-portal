#!/usr/bin/env python3
"""
【最終仮説検証】WD/非ACT連鎖後のACTは同じdepthに属する

現状分析:
  10885801(ACT,d=7) → 10885802(WD) → 57251401(非ACT) → 14578101(ACT)
  
  V1: 14578101はd=8（10885801のdepth+1）
  bonusCSV: 14578101はd=7（10885801と同じdepth）

仮説:
  「ACTの子をdepth+1で探索するが、その子が全てWD/非ACTならば、
   WD/非ACT連鎖の先のACTは親ACTと同じdepthでカウントする」
   
  = より正確に: ACTの子のWD/非ACT連鎖の先は「同じdepth」扱い
    → 「ACTからの透過は現在のdepth+1でなく現在のdepthを保持する」

  別の考え方: 「depth+1 はACTからACTへの直接接続時のみ」
  つまり:
    - ACTの直接の子がACT → depth+1
    - ACTの直接の子が非ACT/WD → その子のACT（間接）は depth（同じ）でカウント
  
  でもこれだと51556601(非ACT)の子10885801がd=6にカウントされてしまい、
  10885802(WD)の子57251401の子14578101が...
  
  10885801(ACT,d=6)のcase:
    10885801の直接の子: 10885802(WD)
    → 10885802はWDなので、10885802の子はdepth=6(10885801と同じ)で探索
    → 57251401(非ACT,d=6)の子: 14578101(ACT) → depth=6でカウント?
    
  でもこれだと期待値(d=7)と合わない...

  別仮説: 「WD会員のみdepth消費しない（透過）、非ACT会員はdepth消費する」
  つまり:
    - WD → 透過（depth変わらず）
    - 非ACT(非WD) → depth+1 消費（ACTと同じ扱いだがbonus=0）
    - ACT → depth+1, bonus加算

  この場合:
    82938301(ACT,d=6) → 51556601(非ACT,d=7) → 10885801(ACT,d=7+1=8?)
  いや、非ACTが「depth消費」するなら:
    82938301(d=6) → 51556601(非ACT,d=7) → 10885801(d=8?) これは期待と合わない

  逆の仮説: 「非ACT会員のみdepth消費しない（透過）、WD会員はdepth消費する」
  つまり:
    - WD → depth+1 消費（bonus=0）
    - 非ACT(非WD) → 透過
    - ACT → depth+1, bonus加算

  この場合:
    10885801(ACT,d=7) → 10885802(WD,d=8) → 57251401(非ACT,d=8透過) → 14578101(ACT,d=8+1=9?)
  これもダメ

  正確に考えると:
    bonusCSV = 14578101 が d=7
    10885801 が d=7 (先祖ACT数=7)
    
  もし14578101もd=7なら、「10885801と14578101は同じACT段」
  = 10885801のWD/非ACT子孫のACTは全部10885801と同じd=7
  = 「ACTの子のACT後継者がWD/非ACT連鎖で繋がれている場合、同一段扱い」
  
  これは「仮想ACT子」の概念:
    10885802(WD)は10885801のdepthで「仮想的に存在」し、
    57251401(非ACT)もdepth変わらず、
    14578101がWD/非ACT連鎖の出口なのでd=7でカウント
    
  = WD/非ACTは全部スキップして、チェーン末尾のACTを「元のACTと同じ段」でカウント
  = 「WD/非ACT連鎖の深度は計算されない」
  
  この実装:
    ACTがdepthカウントされたら、その子を探索:
      直接ACT子: depth+1でカウント
      WD/非ACT子: それ以降のACT子孫を全部 depth+1 でカウント（WD/非ACTを完全スキップ）
      
  これはV1の実装と同じでは??
  
  違いを再確認:
  V1: 非ACT/WDは「スキップ」するがdepth変わらず → 子は同じdepthでキューに追加
      ACTは「カウント」してdepth+1 → 子はdepth+1でキューに追加
  
  bonusCSV仮説: 
    「ACTに到達したとき、その次のACTへの距離が1段」
    「ACTの子がWD/非ACT→WD/非ACT→...→ACT の場合、そのチェーン末尾ACTは depth+1」
    
  これは... V1と全く同じ実装になる。なぜ差が生じるのか？

  ==========================================================================
  
  違う角度から考える: bonusCSVのULBの計算は私が思っている「非ACT透過」と
  微妙に違うアルゴリズムを使っているのではないか？
  
  bonusCSV の grp_pt = 22,800 (82179501の場合)
  V1の段1-7 grp_pt = 21,900
  差 = 900pt
  
  7名 × 150pt = 1,050pt → ULB差=1,050円だがgrp_pt差=900
  これは何故? grp_ptとULBの計算が別々なのか?
  
  bonusCSV grp_pt: 「7段以内のACT会員のpt合計」
  もしbonusCSVのgrp_ptが「期待ULB/rate」ではなく別に計算されているなら...
  
  期待ULB/rate:
    段1~7の各段でpt×rate計算してULB
    grp_ptは「7段以内のACT会員のpt合計」= 段1-7のACT全員のpt合計
    
  bonusCSV grp_pt = 22,800
  V1の段1-7 grp_pt = 21,900 (差900)
  不足7名のpt = 7×150 = 1,050
  → grp_pt差=900 < 1,050
  
  これは不思議。grp_pt=22,800ならV1比+900ptのACTがいるが、
  ULBの差=1,050円 (1段7% = 1%レートで1,050pt×100×1% = 1,050円)
  
  grp_pt差=900 (=6名分150pt) vs ULB差1,050円 (=7名分150pt×1%)
  一致しない...
  
  もしかして: grp_ptとULBは別の「段」基準で計算されている
  例えばgrp_pt = 「LV4は6段(rate=[15,9,6,5,3,2]の範囲)」?
  いや、レートは7段ある
  
  実はbonusCSVのULB=53,850 = 期待値
  V1 ULB=52,800 = 差-1,050
  
  grp_pt: bonusCSV=22,800、V1=21,900、差=900
  
  これらの関係が一致しないということは、bonusCSVのgrp_ptとULBは
  完全に独立した計算かもしれない（または段制限が違う）
  
  bonusCSVのgrp_ptが何段まで集計しているか確認しよう:
  V1の段1-7=21,900、段1-8=25,950
  bonusCSV=22,800 → V1の段1-7+一部の段8?
  
  差=900 → 段8の一部(6名分)がgrp_ptに含まれている？
  これは: grp_ptが「ULB計算と同じ段」ではない可能性
  
  OR: grp_ptの定義が「ULBの段より1段少ない」?
  V1 grp_pt=30,600 (全206名) >> bonusCSV=22,800 (差=7,800)
  V1の段1-7=21,900 ≈ bonusCSV=22,800 (差=900)
  
  もしかして: grp_ptはV1の段1-7よりも少し多い(+900)
  = 「段8のうち6名(900pt)が含まれる」
  
  V1段8=4,050ptのうち900pt=6名分がgrp_ptに含まれる?
  残り7名(1,050pt)はgrp_ptに含まれない?
  
  これは不思議な計算...
  
  ==========================================================================
  
  全く新しいアプローチ: bonusCSVの計算元データが違うかもしれない
  → 2026-04のメンバーデータとV1のDBデータが違う
  → つまり不足7名のuplineが違う可能性
  
  DBでは 14578101のupline=57251401だが
  bonusCSVシステムでは 14578101のupline=10885801(または別の会員)?

  CSVファイルから member_mst を確認する
"""
import os, sys, math, csv
from collections import defaultdict, deque

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
MISSING_82 = ['14578101', '32647101', '48743401', '54619301', '61225401', '64072801', '92993201']

def is_active(status, self_pt, has_req, force_active):
    if force_active: return True
    if status in ('withdrawn','lapsed'): return False
    return has_req and self_pt > 0

def is_withdrawn(status, force_active):
    if force_active: return False
    return status in ('withdrawn','lapsed')

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
    upline_parent   = {}
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

    m82 = members_by_code['82179501']
    m82_id = m82['id']

    # member_mstからuplineを確認
    print("=" * 80)
    print("【member_mstからuplineId確認】")
    print("DBと外部CSVのuplineIdが違う可能性を確認")
    print("=" * 80)

    import glob
    mst_files = glob.glob('/home/user/uploaded_files/*member_mst*')
    for f_path in mst_files:
        print(f"\n  ファイル: {f_path}")
        try:
            with open(f_path, encoding='utf-8-sig') as f:
                sample_row = None
                for i, row in enumerate(csv.DictReader(f)):
                    if i == 0:
                        print(f"  カラム: {list(row.keys())[:15]}")
                        sample_row = row
                    break

            # 不足7名と関連会員のuplineを確認
            check_mcs = MISSING_82 + ['10885801', '10885802', '57251401', '51556601', '82938301']
            with open(f_path, encoding='utf-8-sig') as f:
                for row in csv.DictReader(f):
                    mc_val = None
                    for col in ['会員コード', '会員番号', 'memberCode', 'code']:
                        if col in row:
                            mc_val = row[col].strip()
                            break
                    if mc_val in check_mcs:
                        # uplineに関係するカラムを探す
                        up_cols = [k for k in row.keys() if 'upline' in k.lower() or '上位' in k or 'up' in k.lower() or 'スポンサー' in k]
                        up_vals = {c: row[c] for c in up_cols}
                        print(f"  {mc_val}: {up_vals}")
        except Exception as e:
            print(f"  ERROR: {e}")

    # 追加の追跡: 不足7名とその上流の「ACT後継者」の数
    # 特に10885801のdown子の中でACTになるものを調べる
    print("\n" + "=" * 80)
    print("【10885801の全子孫のACT会員】")
    print("10885801の子孫にどのACTがいて、それぞれのdepthは？")
    print("= V1の非ACT透過ロジックで82から見たdepthを確認")
    print("=" * 80)

    m10885801 = members_by_code.get('10885801')
    if m10885801:
        descendants = []
        stack = [(child_id, 1) for child_id in upline_children.get(m10885801['id'], [])]
        while stack:
            cur_id, d = stack.pop()
            m = members_by_id.get(cur_id)
            if not m: continue
            wd  = is_withdrawn(m['status'], m['force_active'])
            act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
            if act:
                descendants.append({'mc': m['member_code'], 'd_from_10885801': d})
            if wd or not act:
                for c in upline_children.get(cur_id, []):
                    stack.append((c, d))
            else:
                for c in upline_children.get(cur_id, []):
                    stack.append((c, d+1))

        print(f"\n  10885801の子孫ACT:")
        for info in descendants:
            print(f"    {info['mc']}: d_from_10885801={info['d_from_10885801']}")

    # =====
    # 一番根本的なチェック: 期待ULBの逆算
    # bonusCSV ULB=53,850円 の段別内訳を逆算してみる
    # =====
    print("\n" + "=" * 80)
    print("【期待ULBの段別内訳逆算（UNILEVEL_RATES[4]=[15,9,6,5,3,2,1]）】")
    print("bonusCSV ULB=53,850円を各段のレートで分解する")
    print("V1の各段pt × rate = bonus を計算し、bonus合計が期待値になる組み合わせを探す")
    print("=" * 80)

    # V1の段別分布（確定データ）
    rates = UNILEVEL_RATES[4]
    # V1の段別ACT: 3,2,5,13,34,52,40 (d=1..7)
    # 各段のpt（全員150pt前提）
    v1_counts_by_depth = {1:3, 2:2, 3:5, 4:13, 5:34, 6:52, 7:40}
    v1_pts = {d: cnt*150 for d, cnt in v1_counts_by_depth.items()}
    # ただし段1-3はFA会員でpt=0の人もいる
    # 実際のpt: V1の段別詳細から取得

    # BFSで全5名の段別を再確認
    def get_depth_act_info(target_id, members_by_id, upline_children, level):
        rates = UNILEVEL_RATES[level]
        from collections import deque
        queue = deque()
        for child_id in upline_children.get(target_id, []):
            queue.append((child_id, 1))
        bfs_d = {}
        while queue:
            cur_id, depth = queue.popleft()
            if cur_id in bfs_d and bfs_d[cur_id] <= depth:
                continue
            bfs_d[cur_id] = depth
            m = members_by_id.get(cur_id)
            if not m: continue
            wd  = is_withdrawn(m['status'], m['force_active'])
            act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
            if wd or not act:
                for c in upline_children.get(cur_id, []):
                    if c not in bfs_d or bfs_d[c] > depth:
                        queue.append((c, depth))
            else:
                for c in upline_children.get(cur_id, []):
                    if c not in bfs_d or bfs_d[c] > depth+1:
                        queue.append((c, depth+1))

        depth_acts = defaultdict(list)
        for cid, d in bfs_d.items():
            m = members_by_id.get(cid)
            if not m: continue
            act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
            if act:
                depth_acts[d].append({'mc': m['member_code'], 'pt': m['self_pt_04']})
        return depth_acts

    m82 = members_by_code['82179501']
    depth_acts = get_depth_act_info(m82['id'], members_by_id, upline_children, 4)

    print(f"\n  V1(BFS同等)の82の段別ACT:")
    v1_ulb = 0
    for d in range(1, 10):
        acts = depth_acts.get(d, [])
        rate = rates[d-1] if d <= len(rates) else 0
        pt = sum(a['pt'] for a in acts)
        bonus = math.floor(pt * (rate/100) * POINT_RATE) if d <= len(rates) else 0
        if d <= len(rates): v1_ulb += bonus
        print(f"    段{d}(rate={rate}%): {len(acts)}名, pt={pt:,} bonus={bonus:,}")
    print(f"    ULB合計: {v1_ulb:,}円 (期待: 53,850円, 差={v1_ulb-53850:+,})")

    # bonusCSVのgrp_ptから段別内訳を逆算
    # 期待ULB=53,850円
    # 現在V1 ULB=52,800円
    # 差=1,050円 → 段7(rate=1%)で1,050pt追加

    # 段7のpt不足=1,050pt → 7名×150pt
    # grp_pt差=22,800-21,900=900pt → 6名×150pt
    # ??? 

    print(f"\n  ULB差: {53850-v1_ulb:+,}円 → 段7(rate=1%)で {(53850-v1_ulb)/(1/100*POINT_RATE):.0f}pt追加が必要")
    print(f"  grp_pt差: {22800-sum(a['pt'] for acts in [depth_acts.get(d,[]) for d in range(1,8)] for a in acts):+,}pt")
    
    total_pt_1_7 = sum(a['pt'] for d in range(1,8) for a in depth_acts.get(d,[]))
    print(f"  V1 段1-7 ACT pt合計: {total_pt_1_7:,}pt")
    print(f"  bonusCSV grp_pt: 22,800pt")
    print(f"  差: {total_pt_1_7 - 22800:+,}pt")

    # 最終確認: bonusCSVのgrp_ptとULBの計算が「別の段数制限」を使っているか？
    # grp_pt計算: 段1-6のACT pt合計 + 段7の一部？
    # いや、grp_ptはV1の段1-7より「900pt多い」= bonusCSVでは「段1-7に900pt多い会員がいる」

    # 次の仮説: 7名(1,050pt)のうち6名(900pt)は「実は段6以前のACT」として計算されている
    # 1名(150pt)だけが段7追加でULB=+150×1%=1.5円... いや150円

    # むしろ: grp_pt差900とULB差1,050の関係
    # grp_ptはULBと独立に計算されている可能性が高い

    print(f"\n✅ 完了")

if __name__ == "__main__":
    main()
