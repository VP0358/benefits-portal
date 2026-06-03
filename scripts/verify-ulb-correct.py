#!/usr/bin/env python3
"""
verify-ulb-correct.py
=====================
正しいuplineId（直上者ID）ベースでULB・SBを計算し、検証値と一致させる

【決定的なルール】
- uplineId = マトリックスCSVの「紹介者ID」列（≠ 強制設定CSVの直上者コードで上書き）
- isActive  = ボーナスCSVの「ｱｸﾃｨﾌﾞ」列 (○=ACT / ×=非ACT / 未掲載=非ACT)
- selfPt    = マトリックスCSVの「前月ポイント」列（ボーナスCSVと完全一致）
- forceActive = 強制設定CSVの「強制アクティブ」=="有効" → isActive=True強制
- isWithdrawn = status in ("退会", "失効") AND NOT forceActive → depth消費なし
- 非ACT (withdrawn以外) → depth消費なし（透過）← calcDepthPointsV1 と同一
- FA → depth消費あり・selfPt=0

【ツリー構築ルール】
- uplineChildrenMap: uplineId（直上者ID）ベース → ULB・SB・GP計算
- referrerChildrenMap: 紹介者ID ベース → 直接紹介ACT数（DAC）計算のみ

【uplineId決定優先順位】
1. 強制設定CSVの「直上者コード」（空でない場合）
2. マトリックスCSVの「紹介者ID」
"""

import csv
import json
from collections import defaultdict

MATRIX_CSV = "/home/user/uploaded_files/matrix_892488_full.csv"
BONUS_CSV  = "/home/user/uploaded_files/bonus_list_full.csv"
FORCE_CSV  = "/home/user/uploaded_files/強制設定会員一覧_2026-06-02 - コピー (2).csv"

POINT_RATE = 100

# lib/mlm-bonus.ts UNILEVEL_RATES と完全一致
ULB_RATES = {
    0: [15, 7, 3,  0,  0,  0,  0],
    1: [15, 7, 3,  0,  0,  0,  0],
    2: [15, 7, 4,  3,  1,  0,  0],
    3: [15, 8, 5,  4,  2,  2,  1],
    4: [15, 9, 6,  5,  3,  2,  1],
    5: [15, 10, 7, 6,  4,  3,  2],
}
ULB_DEPTHS = {0: 0, 1: 3, 2: 5, 3: 7, 4: 7, 5: 7}
STRUCTURE_BONUS_RATES = {3: 3, 4: 3.5, 5: 4}
ORG_EXCEPTION_CODES = {"44504701", "89248801"}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# データロード（正しいuplineId構築）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def load_all():
    # Step1: 強制設定CSV
    force_info = {}
    with open(FORCE_CSV, "r", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            code = row["会員コード"].strip()
            upline_override = row["直上者コード"].strip()
            fa = row["強制アクティブ"].strip() == "有効"
            lv_str = row["強制タイトル"].strip()
            lv = None
            if "LV." in lv_str:
                try: lv = int(lv_str.replace("LV.", ""))
                except: pass
            force_info[code] = {
                "uplineOverride": upline_override,  # 空文字の場合はoverride不要
                "forceActive": fa,
                "forceLevel": lv,
            }

    # Step2: ボーナスCSV → isActive・selfPt
    bonus_data = {}
    with open(BONUS_CSV, "r", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            mid = row["会員番号"].strip()
            def ti(v):
                v = v.strip().replace(",", "")
                try: return int(v)
                except: return 0
            bonus_data[mid] = {
                "active":         row["ｱｸﾃｨﾌﾞ"].strip() == "○",
                "selfPt":         ti(row["自己購入pt"]),
                "ulb":            ti(row["ユニレベルB"]),
                "sb":             ti(row["組織構築B"]),
                "min_series_pt":  ti(row["最小系列pt"]),
                "series_count":   ti(row["系列"]),
                "group_pt":       ti(row["グループpt"]),
                "direct_act":     ti(row["直ACT"]),
                "level":          row["称号レベル"].strip(),
                "force_level":    row["強制レベル"].strip(),
            }

    # Step3: マトリックスCSV → uplineId(紹介者IDベース) + status
    members = {}
    with open(MATRIX_CSV, "r", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            mid = row["会員ID"].strip()
            ref_id = row["紹介者ID"].strip()
            # uplineId = 紹介者ID（あとでforceで上書き）
            upline_id = ref_id
            status = row["ステイタス"].strip()
            self_pt = int(row["前月ポイント"].strip() or 0)

            # ボーナスCSVのアクティブ・selfPt（優先）
            b = bonus_data.get(mid)
            if b:
                is_active = b["active"]
                final_selfpt = b["selfPt"]  # マトリックスCSVと同一だが念のためボーナスCSVを使う
            else:
                # ボーナスCSVにない会員（マトリックスのみ3名）= 非ACT
                is_active = False
                final_selfpt = self_pt

            members[mid] = {
                "id":          mid,
                "uplineId":    upline_id,    # 初期値=紹介者ID
                "referrerId":  ref_id,
                "selfPt":      final_selfpt,
                "status":      status,
                "isActive":    is_active,    # ボーナスCSVのｱｸﾃｨﾌﾞ列
                "forceActive": False,
                "forceLevel":  None,
            }

    # Step4: 強制設定CSVでuplineId・forceActive・forceLevelを上書き
    for code, info in force_info.items():
        if code not in members:
            # 強制設定CSVにあるがマトリックスCSVにない会員（通常ないはず）
            b = bonus_data.get(code, {})
            members[code] = {
                "id": code, "uplineId": info["uplineOverride"],
                "referrerId": info["uplineOverride"],
                "selfPt": b.get("selfPt", 0),
                "status": "活動中",
                "isActive": b.get("active", False),
                "forceActive": info["forceActive"],
                "forceLevel": info["forceLevel"],
            }
        else:
            m = members[code]
            # 直上者コードが空でない場合のみuplineIdを上書き
            if info["uplineOverride"]:
                m["uplineId"] = info["uplineOverride"]
            m["forceActive"] = info["forceActive"]
            m["forceLevel"] = info["forceLevel"]
            # forceActive=True の場合はisActive=True強制
            if info["forceActive"]:
                m["isActive"] = True

    # Step5: childrenMap構築
    upline_ch = defaultdict(list)    # uplineIdベース（ULB・SB用）
    referrer_ch = defaultdict(list)  # referrerIdベース（DAC用）
    for mid, m in members.items():
        uid = m.get("uplineId", "")
        if uid and uid != mid:
            upline_ch[uid].append(mid)
        rid = m.get("referrerId", "")
        if rid and rid != mid:
            referrer_ch[rid].append(mid)

    return members, upline_ch, referrer_ch, bonus_data


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 判定関数
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def is_withdrawn(mid, members):
    """退会/失効（transparentノード）判定"""
    m = members.get(mid)
    if not m: return True
    if m["forceActive"]: return False
    return m["status"] in ("退会", "失効")

def is_active(mid, members):
    """アクティブ判定（ボーナスCSVのｱｸﾃｨﾌﾞ列ベース）"""
    m = members.get(mid)
    if not m: return False
    return m["isActive"]  # ボーナスCSVのｱｸﾃｨﾌﾞ列（○=True）


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ULB計算（calcDepthPointsV1 完全再現）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def calc_ulb_v1(root_id, members, upline_ch, achieved_level):
    max_depth = ULB_DEPTHS.get(achieved_level, 0)
    rates     = ULB_RATES.get(achieved_level, [])
    if max_depth == 0:
        return 0, defaultdict(int), defaultdict(list), {}, []

    depth_pts     = defaultdict(int)
    depth_members = defaultdict(list)
    ul_trace      = []

    def traverse(curr_id, depth):
        if depth > max_depth: return
        for ch_id in upline_ch.get(curr_id, []):
            m = members.get(ch_id, {})
            wd = is_withdrawn(ch_id, members)
            fa = m.get("forceActive", False)
            ac = is_active(ch_id, members)
            pt = m.get("selfPt", 0)

            info = {
                "id":     ch_id,
                "pt":     pt,
                "depth":  depth,
                "fa":     fa,
                "wd":     wd,
                "ac":     ac,
                "status": m.get("status", "?"),
            }

            if wd:
                # 退会/失効 → depth消費なし（透過）
                info["mark"] = "WD透過"
                depth_members[depth].append(info)
                ul_trace.append({"depth": depth, "id": ch_id, "action": "withdrawn_passthrough"})
                traverse(ch_id, depth)
            elif ac:
                # アクティブ → selfPtを段に積む・depth+1
                if not fa and pt > 0:
                    info["mark"] = "ACT+pt"
                    depth_pts[depth] += pt
                    ul_trace.append({"depth": depth, "id": ch_id, "pt": pt, "action": "active_counted"})
                elif fa:
                    info["mark"] = "FA(depth消費・pt=0)"
                    ul_trace.append({"depth": depth, "id": ch_id, "pt": 0, "action": "fa_no_pt"})
                else:
                    info["mark"] = "ACT(pt=0)"
                    ul_trace.append({"depth": depth, "id": ch_id, "pt": 0, "action": "active_no_pt"})
                depth_members[depth].append(info)
                traverse(ch_id, depth + 1)
            else:
                # 非アクティブ → depth消費なし（透過）← calcDepthPointsV1 行190-192
                info["mark"] = "非ACT透過"
                depth_members[depth].append(info)
                ul_trace.append({"depth": depth, "id": ch_id, "action": "inactive_passthrough"})
                traverse(ch_id, depth)

    traverse(root_id, 1)

    total = 0
    detail = {}
    for d in range(1, max_depth + 1):
        pt   = depth_pts[d]
        rate = rates[d - 1] if d - 1 < len(rates) else 0
        bonus = int(pt * rate / 100 * POINT_RATE) if pt > 0 and rate > 0 else 0
        if bonus > 0:
            detail[d] = bonus
        total += bonus

    return total, depth_pts, depth_members, detail, ul_trace


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 系列PT計算（SB用）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def calc_series_points(root_id, members, upline_ch):
    direct_children = upline_ch.get(root_id, [])
    series_pt_list  = []
    series_detail   = {}

    for child_id in direct_children:
        series_total    = [0]
        members_in_series = []

        def traverse_series(curr_id):
            m = members.get(curr_id)
            if not m: return
            wd = is_withdrawn(curr_id, members)
            fa = m.get("forceActive", False)
            ac = is_active(curr_id, members)
            pt = m.get("selfPt", 0)

            if wd:
                # 退会透過
                for desc in upline_ch.get(curr_id, []):
                    traverse_series(desc)
                return
            if fa:
                # FA: depth消費あり・pt加算なし
                members_in_series.append({"id": curr_id, "pt": 0, "mark": "FA(透過)"})
                for desc in upline_ch.get(curr_id, []):
                    traverse_series(desc)
                return
            if ac and pt > 0:
                series_total[0] += pt
                members_in_series.append({"id": curr_id, "pt": pt, "mark": "ACT+pt"})
            else:
                members_in_series.append({"id": curr_id, "pt": 0, "mark": "ACT(pt=0)" if ac else "非ACT"})
            for desc in upline_ch.get(curr_id, []):
                traverse_series(desc)

        traverse_series(child_id)
        series_pt_list.append(series_total[0])
        series_detail[child_id] = {
            "seriesPt":    series_total[0],
            "memberCount": len(members_in_series),
            "members":     members_in_series,
        }

    series_count = len(direct_children)
    non_zero_pts = [p for p in series_pt_list if p > 0]
    min_pt       = min(non_zero_pts) if non_zero_pts else 0

    return series_pt_list, min_pt, series_count, series_detail


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SB計算
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def calc_sb(member_code, members, upline_ch, referrer_ch, achieved_level):
    mid = member_code
    if not is_active(mid, members): return 0, 0, 0, [], {}

    # 直接紹介ACT数 = referrerChildrenを使用
    direct_act = sum(
        1 for ch in referrer_ch.get(mid, [])
        if not is_withdrawn(ch, members) and is_active(ch, members)
    )
    if direct_act < 2: return 0, 0, 0, [], {}
    if achieved_level < 3: return 0, 0, 0, [], {}

    # 01ポジション判定
    if len(member_code) >= 8 and member_code[-2:] != "01": return 0, 0, 0, [], {}

    series_pt_list, min_pt, series_count, series_detail = calc_series_points(mid, members, upline_ch)

    is_exception = member_code in ORG_EXCEPTION_CODES
    min_required = 1 if is_exception else 3

    # ソースコード(calcStructureBonusV1)と同じく seriesCount で判定（positive_seriesではない）
    if series_count < min_required or min_pt == 0:
        return 0, min_pt, series_count, series_pt_list, series_detail

    rate = STRUCTURE_BONUS_RATES.get(achieved_level, 0)
    sb   = int(min_pt * (rate / 100) * POINT_RATE)
    return sb, min_pt, series_count, series_pt_list, series_detail


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# メイン検証
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def main():
    members, upline_ch, referrer_ch, bonus_data = load_all()

    print("=" * 100)
    print("verify-ulb-correct.py")
    print("正しいuplineId（直上者ID）ベースでULB・SBを計算")
    print("=" * 100)

    # ── ツリー構造の確認 ──────────────────────────────
    print("\n【uplineIdツリー確認】")
    print("82179501の直下（uplineChildren）:")
    for ch in sorted(upline_ch.get("82179501", [])):
        m = members.get(ch, {})
        print(f"  {ch}: uplineId={m.get('uplineId','?')}, isActive={m.get('isActive','?')}, selfPt={m.get('selfPt','?')}, FA={m.get('forceActive','?')}")

    print("\n95446801の直下（uplineChildren）:")
    for ch in sorted(upline_ch.get("95446801", [])):
        m = members.get(ch, {})
        print(f"  {ch}: uplineId={m.get('uplineId','?')}, isActive={m.get('isActive','?')}, selfPt={m.get('selfPt','?')}, FA={m.get('forceActive','?')}")

    # ── 95446801系列のSB系列PT確認 ──────────────────
    print("\n【82179501のSB系列PT（uplineChildrenベース）】")
    series_pt_list, min_pt, series_count, series_detail = calc_series_points("82179501", members, upline_ch)
    direct_ch = upline_ch.get("82179501", [])
    for i, (ch, pt) in enumerate(zip(direct_ch, series_pt_list)):
        print(f"  {ch}系列: {pt:,}pt")
    print(f"  系列数: {series_count}, minPt(0pt除外): {min_pt:,}pt")
    print(f"  SB計算: {min_pt:,} × 3.5% × 100 = {int(min_pt*3.5/100*100):,}円")
    b = bonus_data.get("82179501", {})
    print(f"  期待値: minPt={b.get('min_series_pt',0):,}pt, SB={b.get('sb',0):,}円")

    # ── 95446801系列のメンバー詳細（SBに含まれるはずのPT確認）──
    print("\n【95446801系列のACTメンバー（selfPt>0）一覧】")
    sd_95 = series_detail.get("95446801", {})
    act_members = [m for m in sd_95.get("members", []) if m.get("pt", 0) > 0]
    print(f"  系列PT合計: {sd_95.get('seriesPt',0):,}pt, ACT+pt人数: {len(act_members)}名")
    for m in act_members:
        print(f"    {m['id']}: {m['pt']:,}pt")

    # ── ULB段別証跡（82179501）──────────────────────
    print("\n" + "=" * 100)
    print("【82179501 ULB段別証跡】")
    achieved_level = 4
    ulb_total, depth_pts, depth_members, detail, ul_trace = calc_ulb_v1(
        "82179501", members, upline_ch, achieved_level
    )
    # 資格チェック（selfPt=0 かつ forceActive=True → OK）
    m82 = members.get("82179501", {})
    direct_act_82 = sum(
        1 for ch in referrer_ch.get("82179501", [])
        if not is_withdrawn(ch, members) and is_active(ch, members)
    )
    print(f"  forceActive={m82.get('forceActive')}, selfPt={m82.get('selfPt')}, directAct={direct_act_82}")

    rates = ULB_RATES.get(achieved_level, [])
    total = 0
    print(f"\n  {'段':>3} {'PT合計':>10} {'レート':>6} {'ボーナス':>10} {'ACT+pt':>8} {'FA':>4} {'WD透過':>6} {'非ACT透過':>9}")
    print(f"  {'-'*70}")
    for d in range(1, 8):
        pt   = depth_pts[d]
        rate = rates[d - 1] if d - 1 < len(rates) else 0
        b    = int(pt * rate / 100 * POINT_RATE) if pt > 0 and rate > 0 else 0
        total += b
        mems_at_d = depth_members.get(d, [])
        act_ct = sum(1 for x in mems_at_d if x.get("mark") == "ACT+pt")
        fa_ct  = sum(1 for x in mems_at_d if "FA" in x.get("mark", ""))
        wd_ct  = sum(1 for x in mems_at_d if "WD" in x.get("mark", ""))
        non_ct = sum(1 for x in mems_at_d if "非ACT" in x.get("mark", ""))
        print(f"  {d:>3}段 {pt:>10,}pt {rate:>5}% {b:>10,}円 {act_ct:>8}名 {fa_ct:>4}名 {wd_ct:>6}名 {non_ct:>9}名")

    print(f"  {'-'*70}")
    print(f"  合計 {sum(depth_pts[d] for d in range(1,8)):>10,}pt        {total:>10,}円")
    b82 = bonus_data.get("82179501", {})
    print(f"\n  CSV計算ULB:        {total:,}円")
    print(f"  ボーナスCSV期待値: {b82.get('ulb', 0):,}円")
    diff = total - b82.get('ulb', 0)
    print(f"  差:               {diff:+,}円  {'✅ 一致' if diff == 0 else '❌ 不一致'}")

    # ── 5名全員検証 ──────────────────────────────────
    print("\n" + "=" * 100)
    print("【5名全員検証】")
    # 最新の期待値（ユーザー提示、2026-06-03更新）
    # 86820601: ULB=161,250（前セッションの98,550から更新）
    # 93713601: ULB=110,100（前セッションの52,650から更新）
    # 89248801: ULB=0（ULB自体は0、SB=122,400が期待値）
    targets = [
        # (memberCode, level, exp_ulb, exp_sb, exp_minpt, exp_seriescount)
        ("82179501", 4, 53850, 35700, 10200, 4),
        ("44504701", 5, 44850, 122400, 30600, 1),
        ("86820601", 5, 161250, 16200, 4050, 0),   # SBのseriesCount不明・ULBは161,250に更新
        ("93713601", 4, 110100, 4200, 1200, 0),    # SBのseriesCount不明・ULBは110,100に更新
        ("89248801", 5, 0,      122400, 30600, 1), # ULB=0（SBのみ）
    ]

    all_ok = True
    for mc, lv, exp_ulb, exp_sb, exp_minpt, exp_sc in targets:
        m = members.get(mc, {})
        fa = m.get("forceActive", False)
        sp = m.get("selfPt", 0)

        ulb_total_m, depth_pts_m, _, _, _ = calc_ulb_v1(mc, members, upline_ch, lv)

        # ULB資格チェック
        direct_act_m = sum(
            1 for ch in referrer_ch.get(mc, [])
            if not is_withdrawn(ch, members) and is_active(ch, members)
        )
        if direct_act_m < 2 or (sp == 0 and not fa):
            ulb_total_m = 0

        sb_m, min_pt_m, sc_m, spl_m, _ = calc_sb(mc, members, upline_ch, referrer_ch, lv)

        b = bonus_data.get(mc, {})
        ulb_ok  = "✅" if ulb_total_m == exp_ulb else f"❌ 差={ulb_total_m - exp_ulb:+,}"
        sb_ok   = "✅" if sb_m == exp_sb else f"❌ 差={sb_m - exp_sb:+,}"
        minpt_ok = "✅" if min_pt_m == exp_minpt else f"❌ 差={min_pt_m - exp_minpt:+,}"
        sc_ok   = "✅" if sc_m == exp_sc else f"❌ 差={sc_m - exp_sc:+,}"

        if ulb_total_m != exp_ulb or sb_m != exp_sb:
            all_ok = False

        print(f"\n  {mc} (LV{lv}) directAct={direct_act_m}")
        print(f"    ULB: 計算={ulb_total_m:,}円, 期待={exp_ulb:,}円  {ulb_ok}")
        print(f"    SB:  計算={sb_m:,}円, 期待={exp_sb:,}円  {sb_ok}")
        print(f"    minPt: 計算={min_pt_m:,}pt, 期待={exp_minpt:,}pt  {minpt_ok}")
        print(f"    series: [{', '.join(str(p) for p in spl_m)}]  系列数: 計算={sc_m}, 期待={exp_sc}  {sc_ok}")

        rates_m = ULB_RATES.get(lv, [])
        seg = [f"{d+1}段:{depth_pts_m.get(d+1,0)}pt" for d in range(7) if d < len(rates_m) and rates_m[d] > 0]
        print(f"    段別: {', '.join(seg)}")

    print(f"\n{'='*100}")
    print(f"全体結果: {'✅ 全員一致' if all_ok else '❌ 不一致あり'}")

    # ── uplineId一覧（差分確認用）──────────────────
    print("\n" + "=" * 100)
    print("【uplineId設定（強制上書き会員のみ）】")
    print(f"  {'会員ID':<14} {'uplineId（使用）':<16} {'元紹介者ID':<16} {'変更'}")
    print("  " + "-" * 65)
    with open(MATRIX_CSV, "r", encoding="utf-8-sig") as f:
        orig_ref = {r["会員ID"]: r["紹介者ID"] for r in csv.DictReader(f)}

    for code, fr in load_force_only():
        override = fr["uplineOverride"]
        if not override: continue
        orig = orig_ref.get(code, "")
        changed = "★ 変更" if override != orig else "=="
        print(f"  {code:<14} {override:<16} {orig:<16} {changed}")


def load_force_only():
    """強制設定CSVだけ返すヘルパー"""
    with open(FORCE_CSV, "r", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            code = row["会員コード"].strip()
            upline_override = row["直上者コード"].strip()
            fa = row["強制アクティブ"].strip() == "有効"
            lv_str = row["強制タイトル"].strip()
            lv = None
            if "LV." in lv_str:
                try: lv = int(lv_str.replace("LV.", ""))
                except: pass
            yield code, {"uplineOverride": upline_override, "forceActive": fa, "forceLevel": lv}


if __name__ == "__main__":
    main()
