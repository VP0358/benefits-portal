#!/usr/bin/env python3
"""
investigate-act-basis-comprehensive.py
=============================================
【調査①②③統合版】ACT判定基準の確定

目的：
  1. bonusCSVの「ｱｸﾃｨﾌﾞ」判定ルールをmatrixCSVと突合して確定
  2. 3者（V1 / matrixCSV / bonusCSV）のACT判定比較表を作成
  3. 2026-04 vs 2026-05の2パターンでULB/SB計算し5名を比較

【既確定事実からの整理】
  - bonusCSV: 前月pt(2026-04)>0 → ○(ACT)
  - matrixCSV: 当月pt = 2026-05購入, 前月pt = 2026-04購入
  - 「当月pt>0かつ前月pt=0」の22名 → bonusで全員×(非ACT)
  - 「前月pt>0」の202名 → bonusで全員○(ACT) (FA7名除く)
"""

import os, sys, csv
from collections import defaultdict

try:
    import psycopg2, psycopg2.extras
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

DATABASE_URL = os.environ.get("DATABASE_URL", "")
BONUS_MONTH = "2026-04"
CURRENT_MONTH = "2026-05"
ACTIVE_REQUIRED_PRODUCTS = ["1000", "2000"]
POINT_RATE = 100
UNILEVEL_RATES = {4: [15, 9, 6, 5, 3, 2, 1], 5: [15, 10, 7, 6, 4, 3, 2]}

# FA会員リスト（forceActive=True）
FA_MEMBERS = {
    "40431001": 3,
    "44504701": 5,
    "64150101": None,
    "82179501": 4,
    "82179502": None,
    "89248801": 5,
    "95446801": None,
}

EXPECTED = {
    "82179501": {"ulb": 53850, "sb": 35700, "minPt": 10200, "level": 4},
    "44504701": {"ulb": 44850, "sb": 122400, "minPt": 30600, "level": 5},
    "86820601": {"ulb": 98550, "sb": 16200, "minPt": 4050, "level": 5},
    "93713601": {"ulb": 52650, "sb": 4200, "minPt": 1200, "level": 4},
    "89248801": {"ulb": 19950, "sb": 122400, "minPt": 30600, "level": 5},
}

TARGET_5 = list(EXPECTED.keys())

# ─────────────────────────────────────────
# CSV 読み込み
# ─────────────────────────────────────────
def load_bonus_csv():
    bonus = {}
    with open('/home/user/uploaded_files/bonus_list_full.csv', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            mid = row['会員番号'].strip()
            bonus[mid] = {
                'active': row['ｱｸﾃｨﾌﾞ'].strip(),
                'grp_act': int(row['グループACT'] or 0),
                'grp_pt': int(row['グループpt'] or 0),
                'min_pt': int(row['最小系列pt'] or 0),
                'self_pt': int(row['自己購入pt'] or 0),
                'level': row['当月判定レベル'].strip(),
                'direct_act': int(row['直ACT'] or 0),
                'ulb': int(row['ユニレベルB'] or 0),
                'sb': int(row['シェアB'] or 0),
            }
    return bonus

def load_matrix_csv():
    matrix = {}
    with open('/home/user/uploaded_files/matrix_892488_full.csv', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            mid = row['会員ID'].strip()
            matrix[mid] = {
                'dan': int(row['段数']),
                'act_col': int(row['Act'] or 0),  # 直ACT数
                'tuki_pt': int(row['当月ポイント'] or 0),   # 2026-05
                'mae_pt': int(row['前月ポイント'] or 0),    # 2026-04
                'status': row['ステイタス'].strip(),
                'name': row['氏名（表示名）'].strip(),
                'shokai_id': row['紹介者ID'].strip(),
            }
    return matrix

# ─────────────────────────────────────────
# DB なしでの V1 ACT 判定（matrixCSVを使う）
# ─────────────────────────────────────────
def v1_is_active_from_matrix(mid, mae_pt, status, use_month='2026-04'):
    """
    V1エンジンのACT判定（DBなし版）
    use_month='2026-04': 前月pt（mae_pt）を使う
    use_month='2026-05': 当月pt（tuki_pt）を使う
    """
    # FA判定
    if mid in FA_MEMBERS:
        return True
    # 退会/失効
    if status in ('退会', '失効', 'withdrawn', 'lapsed'):
        return False
    # 必須商品購入 + selfPt>0
    # matrixCSVではproductCodeが不明なので「pt>0」を「必須商品購入+selfPt>0」と見なす
    return mae_pt > 0

def v1_is_active_05(mid, tuki_pt, status):
    """2026-05基準のACT判定"""
    if mid in FA_MEMBERS:
        return True
    if status in ('退会', '失効', 'withdrawn', 'lapsed'):
        return False
    return tuki_pt > 0

# ─────────────────────────────────────────
# 調査① 差異48名の詳細一覧
# ─────────────────────────────────────────
def investigation_1(matrix, bonus):
    print("\n" + "="*80)
    print("【調査①】差異一覧 - ACT判定の差異がある会員")
    print("="*80)

    # bonusCSVのACT判定とV1（前月pt基準）の差異を分析
    disagreements = []
    
    for mid in matrix:
        if mid not in bonus:
            continue
        m = matrix[mid]
        b = bonus[mid]
        
        # V1 ACT判定（2026-04基準）
        v1_act_04 = v1_is_active_from_matrix(mid, m['mae_pt'], m['status'], '2026-04')
        # V1 ACT判定（2026-05基準）
        v1_act_05 = v1_is_active_05(mid, m['tuki_pt'], m['status'])
        # bonusCSV ACT判定
        bonus_act = (b['active'] == '○')
        
        if v1_act_04 != bonus_act:
            disagreements.append({
                'mid': mid,
                'dan': m['dan'],
                'tuki_pt': m['tuki_pt'],
                'mae_pt': m['mae_pt'],
                'status': m['status'],
                'v1_act_04': v1_act_04,
                'v1_act_05': v1_act_05,
                'bonus_act': bonus_act,
                'matrix_act_col': m['act_col'],
            })
    
    disagreements.sort(key=lambda x: (x['dan'], x['mid']))
    
    print(f"\n不一致会員数: {len(disagreements)} 名")
    print()
    
    # 重点6名を先に表示
    priority_6 = ['49509601', '74317601', '90822701', '65902401', '55686101', '42587701']
    print("--- 重点6名 ---")
    print(f"{'会員ID':<12} {'段':>3} {'当月pt':>7} {'前月pt':>7} {'status':<12} {'V1_04':>6} {'V1_05':>6} {'bonus':>6}")
    print("-"*70)
    for mid in priority_6:
        if mid in matrix and mid in bonus:
            m = matrix[mid]
            b = bonus[mid]
            v1_04 = '○' if v1_is_active_from_matrix(mid, m['mae_pt'], m['status']) else '×'
            v1_05 = '○' if v1_is_active_05(mid, m['tuki_pt'], m['status']) else '×'
            bon = b['active']
            print(f"{mid:<12} {m['dan']:>3} {m['tuki_pt']:>7} {m['mae_pt']:>7} {m['status']:<12} {v1_04:>6} {v1_05:>6} {bon:>6}")
    
    print()
    print("--- 全差異会員（V1_04 vs bonus が異なる） ---")
    print(f"{'会員ID':<12} {'段':>3} {'当月pt':>7} {'前月pt':>7} {'status':<12} {'V1_04':>6} {'V1_05':>6} {'bonus':>6}")
    print("-"*70)
    for d in disagreements:
        v104 = '○' if d['v1_act_04'] else '×'
        v105 = '○' if d['v1_act_05'] else '×'
        bon = '○' if d['bonus_act'] else '×'
        print(f"{d['mid']:<12} {d['dan']:>3} {d['tuki_pt']:>7} {d['mae_pt']:>7} {d['status']:<12} {v104:>6} {v105:>6} {bon:>6}")
    
    # パターン分析
    print()
    print("--- パターン分析 ---")
    # V1_04=ACT だが bonus=非ACT
    v1_yes_bonus_no = [d for d in disagreements if d['v1_act_04'] and not d['bonus_act']]
    # V1_04=非ACT だが bonus=ACT
    v1_no_bonus_yes = [d for d in disagreements if not d['v1_act_04'] and d['bonus_act']]
    
    print(f"V1_04=○ だが bonus=× : {len(v1_yes_bonus_no)} 名")
    for d in v1_yes_bonus_no[:10]:
        print(f"  {d['mid']}: 段{d['dan']}, 当月pt={d['tuki_pt']}, 前月pt={d['mae_pt']}, {d['status']}")
    
    print(f"V1_04=× だが bonus=○ : {len(v1_no_bonus_yes)} 名")
    for d in v1_no_bonus_yes[:10]:
        print(f"  {d['mid']}: 段{d['dan']}, 当月pt={d['tuki_pt']}, 前月pt={d['mae_pt']}, {d['status']}")
    
    return disagreements

# ─────────────────────────────────────────
# 調査② 3者ACT比較表
# ─────────────────────────────────────────
def investigation_2(matrix, bonus):
    print("\n" + "="*80)
    print("【調査②】V1 / matrixCSV_Act / bonusCSV の3者ACT比較")
    print("="*80)
    
    # matrixCSV の「Act列」の解釈
    # Act = 直ACT数（0でも会員自身がACTの場合はある）
    # bonusCSVの ｱｸﾃｨﾌﾞ が最も信頼できるACT判定

    results = []
    for mid in matrix:
        if mid not in bonus:
            continue
        m = matrix[mid]
        b = bonus[mid]
        
        # V1 2026-04基準
        v1_04 = v1_is_active_from_matrix(mid, m['mae_pt'], m['status'])
        # V1 2026-05基準
        v1_05 = v1_is_active_05(mid, m['tuki_pt'], m['status'])
        # bonusCSV
        bon = (b['active'] == '○')
        
        results.append({
            'mid': mid,
            'v1_04': v1_04,
            'v1_05': v1_05,
            'bonus': bon,
            'mae_pt': m['mae_pt'],
            'tuki_pt': m['tuki_pt'],
        })
    
    total = len(results)
    
    # V1_04 vs bonus 一致率
    v104_vs_bon = sum(1 for r in results if r['v1_04'] == r['bonus'])
    # V1_05 vs bonus 一致率
    v105_vs_bon = sum(1 for r in results if r['v1_05'] == r['bonus'])
    
    print(f"\n総比較会員数: {total}")
    print()
    print(f"V1_04 vs bonusCSV 一致: {v104_vs_bon}/{total} ({v104_vs_bon/total*100:.1f}%)")
    print(f"V1_05 vs bonusCSV 一致: {v105_vs_bon}/{total} ({v105_vs_bon/total*100:.1f}%)")
    print()
    
    # 3者の組み合わせ別集計
    combo = defaultdict(int)
    for r in results:
        key = (
            '○' if r['v1_04'] else '×',
            '○' if r['v1_05'] else '×',
            '○' if r['bonus'] else '×'
        )
        combo[key] += 1
    
    print("3者組み合わせ別集計 (V1_04 / V1_05 / bonus):")
    print(f"  {'V1_04':>6} {'V1_05':>6} {'bonus':>6} {'件数':>6}")
    for k in sorted(combo.keys()):
        print(f"  {k[0]:>6} {k[1]:>6} {k[2]:>6} {combo[k]:>6}")
    
    # 重要: V1_04=× かつ bonus=○ (bonusがACTでV1_04が非ACT)
    critical = [r for r in results if not r['v1_04'] and r['bonus']]
    print(f"\n【重要】V1_04=× だが bonus=○ の会員: {len(critical)} 名")
    if critical:
        print(f"  {'会員ID':<12} {'mae_pt':>7} {'tuki_pt':>8} {'v1_05':>6}")
        for r in sorted(critical, key=lambda x: x['mid'])[:20]:
            v05 = '○' if r['v1_05'] else '×'
            print(f"  {r['mid']:<12} {r['mae_pt']:>7} {r['tuki_pt']:>8} {v05:>6}")
    
    # 重要: V1_04=○ かつ bonus=× (V1がACTでbonusが非ACT)
    over_count = [r for r in results if r['v1_04'] and not r['bonus']]
    print(f"\n【重要】V1_04=○ だが bonus=× の会員: {len(over_count)} 名")
    if over_count:
        print(f"  {'会員ID':<12} {'mae_pt':>7} {'tuki_pt':>8}")
        for r in sorted(over_count, key=lambda x: x['mid'])[:30]:
            print(f"  {r['mid']:<12} {r['mae_pt']:>7} {r['tuki_pt']:>8}")
    
    return results

# ─────────────────────────────────────────
# ULB / SB 計算（DBなし版：matrixCSVのツリーを使用）
# ─────────────────────────────────────────
def build_upline_tree_from_matrix(matrix):
    """
    matrixCSVからアップラインツリーを構築
    注：matrixCSVは89248801起点のツリーのみ
    紹介者IDでchildrenMapを構築（DAC用）
    段数から親子関係を推定するが不完全なので、uplineChildrenMapは構築できない

    ※ 注意: matrixCSVにはuplineIdがないため、
      V1エンジンの完全再現はDBなしでは不可能
    """
    # 紹介者IDでDAC用ツリー構築
    dac_children = defaultdict(list)
    for mid, m in matrix.items():
        if m['shokai_id']:
            dac_children[m['shokai_id']].append(mid)
    return dac_children

def calc_ulb_from_bonus_csv(target_mid, matrix, bonus, act_month='2026-04'):
    """
    bonusCSVのgrp_ptとgrp_actを使った推定
    完全計算はDBなしでは不可能なので、差分分析を行う
    """
    if target_mid not in bonus:
        return None
    b = bonus[target_mid]
    return {
        'grp_act': b['grp_act'],
        'grp_pt': b['grp_pt'],
        'min_pt': b['min_pt'],
        'self_pt': b['self_pt'],
        'level': b['level'],
        'ulb': b['ulb'],
        'sb': b['sb'],
    }

# ─────────────────────────────────────────
# 調査③ 2パターン計算（DB不要部分の確認）
# ─────────────────────────────────────────
def investigation_3_csv_analysis(matrix, bonus):
    """
    DB なしで CSVデータから
    「ACT判定月 2026-04 vs 2026-05」の影響を分析する

    bonusCSVはすでに2026-04基準でACT判定済み
    → 2026-05基準でACTが変わる会員を特定し、影響を推定
    """
    print("\n" + "="*80)
    print("【調査③】ACT判定月 2026-04 vs 2026-05 の差異分析（CSVデータから）")
    print("="*80)

    print("\n--- 前提確認 ---")
    print("bonusCSVは既に「前月pt（2026-04）>0」でACT判定済み")
    print("matrixCSVの「当月pt（2026-05）>0 かつ 前月pt（2026-04）=0」の会員が")
    print("2026-05基準だと追加でACTになる会員")
    print()

    # 2026-05基準でACTになる追加会員（当月>0, 前月=0, bonus=×）
    added_by_05 = []
    for mid in matrix:
        if mid not in bonus:
            continue
        m = matrix[mid]
        b = bonus[mid]
        if m['tuki_pt'] > 0 and m['mae_pt'] == 0 and b['active'] == '×':
            added_by_05.append({
                'mid': mid,
                'dan': m['dan'],
                'tuki_pt': m['tuki_pt'],
                'mae_pt': m['mae_pt'],
                'status': m['status'],
            })
    
    added_by_05.sort(key=lambda x: (x['dan'], x['mid']))
    
    print(f"2026-05基準なら追加でACTになる会員: {len(added_by_05)} 名")
    print(f"{'会員ID':<12} {'段':>3} {'当月pt':>8} {'前月pt':>8} {'status':<12}")
    print("-"*60)
    for a in added_by_05:
        print(f"{a['mid']:<12} {a['dan']:>3} {a['tuki_pt']:>8} {a['mae_pt']:>8} {a['status']:<12}")
    
    # この22名のうち5名（82/44/86/93/89）のupline段に何名いるか確認
    print()
    print("--- 5名のターゲットごとの影響分析 ---")
    print("（段1-7に位置するACT追加会員がULBに影響する）")
    print()
    
    # matrixCSVには89248801起点のツリーのみ存在
    # 5名のターゲットのうち89248801だけが分析可能
    # 他の4名（82,44,86,93）はツリー上段にいるので、
    # 89248801のツリー内での22名の位置を確認
    
    matrix_89_tree = {mid: m for mid, m in matrix.items()}  # 全員89起点
    
    target_in_89_tree = {
        '82179501': matrix.get('82179501', {}).get('dan'),
        '44504701': matrix.get('44504701', {}).get('dan'),
        '86820601': matrix.get('86820601', {}).get('dan'),
        '93713601': matrix.get('93713601', {}).get('dan'),
        '89248801': matrix.get('89248801', {}).get('dan'),
    }
    
    print("5名の89248801ツリー内での段数:")
    for mid, dan in target_in_89_tree.items():
        exp = EXPECTED[mid]
        bon = bonus.get(mid, {})
        print(f"  {mid}: 段{dan}, ULB期待={exp['ulb']}, bonusULB={bon.get('ulb',0)}, bonusSB={bon.get('sb',0)}")
    
    print()
    print("22名の89248801ツリー内での分布（89248801のULB計算に影響）:")
    print("89248801はLV5なので段1-7がULB対象")
    print()
    
    for a in added_by_05:
        dan = a['dan']
        if 1 <= dan <= 7:
            print(f"  ★ {a['mid']}: 段{dan} - 89のULB段{dan}に影響！")
        else:
            print(f"    {a['mid']}: 段{dan} - 89のULB範囲外")
    
    return added_by_05

# ─────────────────────────────────────────
# 核心分析: bonusCSV ACT判定ルールの最終確認
# ─────────────────────────────────────────
def analyze_bonus_act_rule(matrix, bonus):
    print("\n" + "="*80)
    print("【核心分析】bonusCSV ACT判定ルールの最終確認")
    print("="*80)

    # 分析1: 前月pt vs bonus_active の完全対応
    mae_gt0_act = sum(1 for mid in matrix if mid in bonus and matrix[mid]['mae_pt'] > 0 and bonus[mid]['active'] == '○')
    mae_gt0_batu = sum(1 for mid in matrix if mid in bonus and matrix[mid]['mae_pt'] > 0 and bonus[mid]['active'] == '×')
    mae_eq0_act = sum(1 for mid in matrix if mid in bonus and matrix[mid]['mae_pt'] == 0 and bonus[mid]['active'] == '○')
    mae_eq0_batu = sum(1 for mid in matrix if mid in bonus and matrix[mid]['mae_pt'] == 0 and bonus[mid]['active'] == '×')
    
    print("\n前月pt（2026-04）とbonusACT判定の対応:")
    print(f"  前月pt>0 かつ bonus=○: {mae_gt0_act} 名  ← 期待: 202名全員")
    print(f"  前月pt>0 かつ bonus=×: {mae_gt0_batu} 名  ← 期待: 0名")
    print(f"  前月pt=0 かつ bonus=○: {mae_eq0_act} 名  ← FA会員のみ（7名）")
    print(f"  前月pt=0 かつ bonus=×: {mae_eq0_batu} 名")
    
    tuki_gt0_act = sum(1 for mid in matrix if mid in bonus and matrix[mid]['tuki_pt'] > 0 and bonus[mid]['active'] == '○')
    tuki_gt0_batu = sum(1 for mid in matrix if mid in bonus and matrix[mid]['tuki_pt'] > 0 and bonus[mid]['active'] == '×')
    
    print("\n当月pt（2026-05）とbonusACT判定の対応:")
    print(f"  当月pt>0 かつ bonus=○: {tuki_gt0_act} 名")
    print(f"  当月pt>0 かつ bonus=×: {tuki_gt0_batu} 名")
    
    print()
    print("【結論】")
    if mae_gt0_batu == 0 and mae_eq0_act <= 7:
        print("✅ bonusCSV ACT判定 = 「前月pt（2026-04）>0」基準で完全一致")
        print("   （前月pt=0でもACT=○の会員はFA会員7名のみ）")
    else:
        print("❌ 前月pt基準では説明できない例外あり")
    
    if tuki_gt0_batu > 0:
        print(f"⚠️  当月pt>0 だが bonus=× の会員が {tuki_gt0_batu} 名")
        print("   → bonusCSVは当月pt（2026-05）をACT判定に使っていない")
    
    # FA会員の確認
    print()
    print("前月pt=0でもbonusで○のFA会員:")
    fa_found = []
    for mid in matrix:
        if mid not in bonus:
            continue
        m = matrix[mid]
        b = bonus[mid]
        if m['mae_pt'] == 0 and b['active'] == '○':
            fa_status = "FA" if mid in FA_MEMBERS else "非FA"
            fa_found.append((mid, m['tuki_pt'], m['mae_pt'], m['status'], fa_status))
    for f in sorted(fa_found, key=lambda x: x[0]):
        print(f"  {f[0]}: 当月pt={f[1]}, 前月pt={f[2]}, {f[3]}, {f[4]}")

# ─────────────────────────────────────────
# 差異確認: 22名（当月>0,前月=0）のV1影響
# ─────────────────────────────────────────
def analyze_22_impact(matrix, bonus):
    print("\n" + "="*80)
    print("【重要】22名（当月pt>0,前月pt=0）のV1計算への影響")
    print("="*80)
    print()
    print("bonusCSV: 22名は全員 ×（非ACT）")
    print("V1エンジン（2026-04基準）: 前月pt=0 → 非ACT（bonusと同じ）")
    print("V1エンジン（2026-05基準）: 当月pt=150 → ACT（bonusと異なる）")
    print()
    print("→ V1エンジンが2026-04基準なら、22名については bonus と同じ判定になる")
    print()

    # 22名の段数分布
    twenty_two = []
    for mid in matrix:
        if mid not in bonus:
            continue
        m = matrix[mid]
        b = bonus[mid]
        if m['tuki_pt'] > 0 and m['mae_pt'] == 0 and b['active'] == '×':
            twenty_two.append(mid)
    
    dan_dist = defaultdict(list)
    for mid in twenty_two:
        dan_dist[matrix[mid]['dan']].append(mid)
    
    print("22名の段数分布（89248801起点のツリー内）:")
    for dan in sorted(dan_dist.keys()):
        members = dan_dist[dan]
        ulb_impact = "ULB段1-7対象" if 1 <= dan <= 7 else "ULB範囲外"
        print(f"  段{dan:>2}: {len(members)} 名  [{ulb_impact}]")
        for mid in members:
            print(f"    → {mid}: 当月pt={matrix[mid]['tuki_pt']}")
    
    print()
    print("【89248801のULBへの影響（もし22名が2026-05基準でACTになった場合）】")
    print("LV5 rates: [15, 10, 7, 6, 4, 3, 2]")
    total_extra = 0
    for dan in sorted(dan_dist.keys()):
        if 1 <= dan <= 7:
            rate = UNILEVEL_RATES[5][dan-1]
            members = dan_dist[dan]
            extra_pt = len(members) * 150  # 全員150pt
            extra_bonus = extra_pt * rate // 100 * POINT_RATE
            total_extra += extra_bonus
            print(f"  段{dan}: {len(members)}名 × 150pt × {rate}% × 100 = {extra_bonus:,}円")
    print(f"  合計追加ボーナス（もし2026-05基準なら）: {total_extra:,}円")
    print()
    print("→ 89248801の現在の差異（期待値との差）は 0円（完全一致）")
    print("→ 89248801については22名がどちらの基準でも結果は変わらない（前月pt=0なのでV1_04でも非ACT）")

# ─────────────────────────────────────────
# V1エンジンとbonusCSVの差異要因特定
# ─────────────────────────────────────────
def analyze_v1_vs_bonus_discrepancy(matrix, bonus):
    print("\n" + "="*80)
    print("【差異分析】V1エンジン vs bonusCSV の差異要因")
    print("="*80)
    
    print("""
既知の状況:
  - 86/93/89: V1 = bonusCSV（完全一致）
  - 82179501: V1_ULB=52800 vs 期待53850（差-1050円）
  - 44504701: V1_ULB=44550 vs 期待44850（差-300円）

grp_act（ACT人数）は全5名で一致
grp_pt（グループpt合計）に差異あり:
  - 82179501: V1_seg1-7=21900 vs CSV=22800（差-900pt）
  - 44504701: V1_seg1-7=15900 vs CSV=16050（差-150pt）

差異 = ACT人数は同じなのに、pt合計が異なる
→ 「同一会員でV1のselfPtとbonusのselfPtが異なる」可能性

仮説:
  1. V1はDBの購入データから「2026-04のorder有り購入」でselfPt計算
  2. bonusCSVは何らかの別の方法でselfPt計算
  
具体的に何が違うか:
  - 差が900ptなら6人分（6人×150pt）
  - 差が150ptなら1人分
""")
    
    # 82179501の段1-7のACT会員のpt分布をbonusCSVから確認
    # bonusCSVのgrp_ptとselfPtの対応
    print("bonusCSVの 5名のデータ確認:")
    for mid in TARGET_5:
        if mid in bonus:
            b = bonus[mid]
            print(f"  {mid}: grp_act={b['grp_act']}, grp_pt={b['grp_pt']}, self_pt={b['self_pt']}, ulb={b['ulb']}, sb={b['sb']}")
    
    print()
    print("--- matrixCSV内のACT会員のptサマリ ---")
    act_members = []
    for mid in matrix:
        if mid not in bonus:
            continue
        m = matrix[mid]
        b = bonus[mid]
        if b['active'] == '○':
            act_members.append({
                'mid': mid,
                'dan': m['dan'],
                'mae_pt': m['mae_pt'],
                'tuki_pt': m['tuki_pt'],
                'bonus_self_pt': b['self_pt'],
            })
    
    # bonus_self_ptとmae_ptの一致確認
    match = sum(1 for a in act_members if a['bonus_self_pt'] == a['mae_pt'])
    mismatch = [a for a in act_members if a['bonus_self_pt'] != a['mae_pt']]
    
    print(f"ACT会員数: {len(act_members)} 名")
    print(f"bonus_self_pt == mae_pt（前月pt）: {match} 名")
    print(f"bonus_self_pt != mae_pt（前月pt）: {len(mismatch)} 名")
    
    if mismatch:
        print()
        print("不一致会員（bonus_self_pt ≠ 前月pt）:")
        print(f"  {'会員ID':<12} {'段':>3} {'mae_pt':>8} {'tuki_pt':>8} {'bonus_self_pt':>14}")
        for a in sorted(mismatch, key=lambda x: (x['dan'], x['mid']))[:30]:
            print(f"  {a['mid']:<12} {a['dan']:>3} {a['mae_pt']:>8} {a['tuki_pt']:>8} {a['bonus_self_pt']:>14}")
        
        print()
        # bonus_self_pt = tuki_pt（当月pt）と一致するか確認
        match_tuki = sum(1 for a in mismatch if a['bonus_self_pt'] == a['tuki_pt'])
        print(f"bonus_self_pt == tuki_pt（当月pt）: {match_tuki} / {len(mismatch)} 名")

# ─────────────────────────────────────────
# メイン
# ─────────────────────────────────────────
def main():
    print("VIOLA Pure MLM ボーナス計算 - ACT判定基準 総合調査")
    print(f"BONUS_MONTH: {BONUS_MONTH}")
    print()

    # CSV読み込み
    bonus = load_bonus_csv()
    matrix = load_matrix_csv()
    
    print(f"bonusCSV: {len(bonus)} 名")
    print(f"matrixCSV: {len(matrix)} 名 (89248801起点)")
    
    # ── 核心分析: bonusCSV ACT判定ルール確認 ──
    analyze_bonus_act_rule(matrix, bonus)
    
    # ── 調査① 差異会員一覧 ──
    investigation_1(matrix, bonus)
    
    # ── 調査② 3者比較 ──
    investigation_2(matrix, bonus)
    
    # ── 22名の影響分析 ──
    analyze_22_impact(matrix, bonus)
    
    # ── 調査③ 2パターン分析 ──
    investigation_3_csv_analysis(matrix, bonus)
    
    # ── V1 vs bonus 差異分析 ──
    analyze_v1_vs_bonus_discrepancy(matrix, bonus)
    
    # ── DBありの場合の追加調査指示 ──
    if HAS_PSYCOPG2 and DATABASE_URL:
        print("\n" + "="*80)
        print("【DB接続あり】追加調査を実行...")
        print("="*80)
        do_db_analysis(DATABASE_URL, bonus, matrix)
    else:
        print("\n" + "="*80)
        print("【注意】DB接続なし - CSVデータのみで分析")
        print("="*80)
        print("""
DB接続があれば追加で確認できること:
  1. 82179501の段1-7のACT会員それぞれのDB selfPt（purchaseMonth=2026-04のorder有り）
  2. bonusCSV self_ptとDBのselfPtの会員別比較
  3. V1エンジンがACTと判定した会員のうちbonusCSVで非ACTの会員の詳細
  
DB接続方法:
  DATABASE_URL='postgresql://...' python3 scripts/investigate-act-basis-comprehensive.py
""")

def do_db_analysis(db_url, bonus, matrix):
    """DB接続時の追加分析"""
    conn = psycopg2.connect(db_url)
    conn.set_client_encoding("UTF8")
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        # 全会員の基本データ取得
        cur.execute("""
            SELECT
                m.id,
                m."memberCode",
                m.status,
                m."forceActive",
                m."forceLevel",
                m."uplineId",
                m."referrerId",
                m."matrixPosition",
                COALESCE(SUM(CASE
                    WHEN p."purchaseMonth" = %s
                      AND p."productCode" IN ('1000','2000')
                      AND p."orderId" IS NOT NULL
                    THEN p."totalPoints" ELSE 0 END), 0) AS self_pt_04,
                COALESCE(SUM(CASE
                    WHEN p."purchaseMonth" = %s
                      AND p."productCode" IN ('1000','2000')
                      AND p."orderId" IS NOT NULL
                    THEN p."totalPoints" ELSE 0 END), 0) AS self_pt_05,
                BOOL_OR(CASE
                    WHEN p."purchaseMonth" = %s
                      AND p."productCode" IN ('1000','2000')
                      AND p."orderId" IS NOT NULL
                    THEN TRUE ELSE FALSE END) AS has_req_04,
                BOOL_OR(CASE
                    WHEN p."purchaseMonth" = %s
                      AND p."productCode" IN ('1000','2000')
                      AND p."orderId" IS NOT NULL
                    THEN TRUE ELSE FALSE END) AS has_req_05
            FROM "mlm_members" m
            LEFT JOIN "mlm_purchases" p ON p."memberId" = m.id
            GROUP BY m.id, m."memberCode", m.status, m."forceActive", m."forceLevel",
                     m."uplineId", m."referrerId", m."matrixPosition"
        """, (BONUS_MONTH, CURRENT_MONTH, BONUS_MONTH, CURRENT_MONTH))
        
        members = {r['memberCode']: dict(r) for r in cur.fetchall()}
        print(f"DB総会員数: {len(members)}")
        
        # V1 ACT判定（2026-04基準）
        def v1_is_active_db(m):
            if m['forceActive']:
                return True
            if m['status'] in ('withdrawn', 'lapsed'):
                return False
            return bool(m['has_req_04']) and m['self_pt_04'] > 0
        
        def v1_is_active_db_05(m):
            if m['forceActive']:
                return True
            if m['status'] in ('withdrawn', 'lapsed'):
                return False
            return bool(m['has_req_05']) and m['self_pt_05'] > 0
        
        # V1_04 vs bonus 比較（DB版）
        print("\n=== DB版 V1_04 vs bonusCSV ACT比較 ===")
        db_in_bonus = {mc: m for mc, m in members.items() if mc in bonus}
        
        v104_bon_agree = sum(1 for mc, m in db_in_bonus.items()
                             if v1_is_active_db(m) == (bonus[mc]['active'] == '○'))
        v105_bon_agree = sum(1 for mc, m in db_in_bonus.items()
                             if v1_is_active_db_05(m) == (bonus[mc]['active'] == '○'))
        
        total = len(db_in_bonus)
        print(f"V1_04（DB） vs bonusCSV 一致: {v104_bon_agree}/{total} ({v104_bon_agree/total*100:.1f}%)")
        print(f"V1_05（DB） vs bonusCSV 一致: {v105_bon_agree}/{total} ({v105_bon_agree/total*100:.1f}%)")
        
        # 不一致会員の詳細
        disagreements_db = {mc: m for mc, m in db_in_bonus.items()
                            if v1_is_active_db(m) != (bonus[mc]['active'] == '○')}
        
        print(f"\nV1_04 vs bonus 不一致: {len(disagreements_db)} 名")
        if disagreements_db:
            print(f"{'会員コード':<12} {'status':<12} {'FA':>5} {'self_04':>8} {'self_05':>8} {'V1_04':>6} {'bonus':>6}")
            print("-"*70)
            for mc, m in sorted(disagreements_db.items())[:30]:
                v104 = '○' if v1_is_active_db(m) else '×'
                bon = bonus[mc]['active']
                fa = '○' if m['forceActive'] else '×'
                print(f"{mc:<12} {str(m['status']):<12} {fa:>5} {m['self_pt_04']:>8} {m['self_pt_05']:>8} {v104:>6} {bon:>6}")
        
        # 5名のself_pt比較
        print("\n=== 5名のself_pt 詳細確認 ===")
        print(f"{'会員コード':<12} {'DB_self_04':>11} {'DB_self_05':>11} {'bonus_self':>11} {'matrix_mae':>11} {'V1_04':>6} {'bon':>5}")
        print("-"*75)
        for mc in TARGET_5:
            m = members.get(mc, {})
            b = bonus.get(mc, {})
            mat = matrix.get(mc, {})
            if m:
                v104 = '○' if v1_is_active_db(m) else '×'
                bon = b.get('active', '?')
                print(f"{mc:<12} {m['self_pt_04']:>11} {m['self_pt_05']:>11} "
                      f"{b.get('self_pt',0):>11} {mat.get('mae_pt',0):>11} {v104:>6} {bon:>5}")
        
        # ULB計算（完全版）
        print("\n=== 5名のULB完全計算（DB版） ===")
        compute_full_ulb(cur, members, bonus, '2026-04')
        
    finally:
        cur.close()
        conn.close()

def compute_full_ulb(cur, members, bonus, act_month):
    """完全なULB計算"""
    # uplineChildrenMapを構築
    upline_children = defaultdict(list)
    member_by_id = {}
    for mc, m in members.items():
        member_by_id[m['id']] = mc
        if m['uplineId']:
            upline_children[m['uplineId']].append(m['id'])
    
    def v1_is_active(mc):
        m = members.get(mc, {})
        if m.get('forceActive'):
            return True
        if m.get('status') in ('withdrawn', 'lapsed'):
            return False
        return bool(m.get('has_req_04')) and (m.get('self_pt_04', 0) > 0)
    
    def v1_is_withdrawn(mc):
        m = members.get(mc, {})
        if m.get('forceActive'):
            return False
        return m.get('status') in ('withdrawn', 'lapsed')
    
    def calc_ulb_for(target_mc, level):
        target_m = members.get(target_mc, {})
        target_id = target_m.get('id')
        if not target_id or level not in UNILEVEL_RATES:
            return 0, {}
        
        rates = UNILEVEL_RATES[level]
        total_ulb = 0
        depth_detail = {}
        
        # BFSでツリーを走査
        queue = [(target_id, 0)]  # (member_id, compressed_depth)
        
        while queue:
            current_id, depth = queue.pop(0)
            current_mc = member_by_id.get(current_id)
            if not current_mc:
                continue
            
            children_ids = upline_children.get(current_id, [])
            
            for child_id in children_ids:
                child_mc = member_by_id.get(child_id)
                if not child_mc:
                    continue
                
                child_m = members.get(child_mc, {})
                child_is_act = v1_is_active(child_mc)
                child_is_wd = v1_is_withdrawn(child_mc)
                
                if child_is_wd:
                    # WD → 透過（depth消費なし）
                    queue.append((child_id, depth))
                elif child_is_act:
                    # ACT → depth+1消費
                    new_depth = depth + 1
                    if new_depth <= len(rates):
                        rate = rates[new_depth - 1]
                        self_pt = child_m.get('self_pt_04', 0)
                        ulb_bonus = self_pt * rate // 100 * POINT_RATE
                        total_ulb += ulb_bonus
                        if new_depth not in depth_detail:
                            depth_detail[new_depth] = {'count': 0, 'pt': 0, 'bonus': 0}
                        depth_detail[new_depth]['count'] += 1
                        depth_detail[new_depth]['pt'] += self_pt
                        depth_detail[new_depth]['bonus'] += ulb_bonus
                    queue.append((child_id, new_depth))
                else:
                    # FA（非ACT）→ depth+1消費
                    new_depth = depth + 1
                    if new_depth <= len(rates):
                        # pt=0なのでボーナスなし
                        pass
                    queue.append((child_id, new_depth))
        
        return total_ulb, depth_detail
    
    print(f"\n{'会員コード':<12} {'計算ULB':>10} {'期待ULB':>10} {'差':>8} {'level':>6}")
    print("-"*55)
    
    for mc in TARGET_5:
        exp = EXPECTED[mc]
        level = exp['level']
        ulb, detail = calc_ulb_for(mc, level)
        diff = ulb - exp['ulb']
        status = '✅' if diff == 0 else f'❌ {diff:+,}'
        print(f"{mc:<12} {ulb:>10,} {exp['ulb']:>10,} {diff:>+8,}  {status}")
        
        # 段別詳細
        for d in sorted(detail.keys()):
            info = detail[d]
            print(f"  段{d}: {info['count']}名, pt={info['pt']:,}, bonus={info['bonus']:,}")

if __name__ == "__main__":
    main()
