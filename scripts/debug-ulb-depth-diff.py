#!/usr/bin/env python3
"""
debug-ulb-depth-diff.py
82179501のULB段別ズレの原因を特定する。

現在の誤り vs 期待値:
  2段:  150pt ✅
  3段:  750pt ✅
  4段: 2,100pt ❌ (期待1,950pt, +150pt)
  5段: 7,200pt ❌ (期待5,100pt, +2,100pt)
  6段: 7,950pt ❌ (期待8,100pt, -150pt)
  7段: 4,200pt ❌ (期待6,750pt, -2,550pt)

仮説: 圧縮ロジックでFA（forceActive）のdepth処理が間違っている可能性
- FA会員はdepth消費あり・selfPt=0
- しかしFAのchildren探索ではdepth+1が正しく行われているか?
"""
import csv
from collections import defaultdict

MATRIX_CSV = "/home/user/uploaded_files/matrix_892488_full.csv"
BONUS_CSV  = "/home/user/uploaded_files/bonus_list_full.csv"
FORCE_CSV  = "/home/user/uploaded_files/強制設定会員一覧_2026-06-02 - コピー (2).csv"

def ti(v):
    try: return int(str(v).strip().replace(",", ""))
    except: return 0

# データロード
force_info = {}
with open(FORCE_CSV, "r", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        code = row["会員コード"].strip()
        upline_override = row["直上者コード"].strip()
        fa = row["強制アクティブ"].strip() == "有効"
        force_info[code] = {"uplineOverride": upline_override, "forceActive": fa}

bonus_data = {}
with open(BONUS_CSV, "r", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        mid = row["会員番号"].strip()
        bonus_data[mid] = {
            "active": row["ｱｸﾃｨﾌﾞ"].strip() == "○",
            "selfPt": ti(row["自己購入pt"]),
        }

members = {}
with open(MATRIX_CSV, "r", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        mid = row["会員ID"].strip()
        ref_id = row["紹介者ID"].strip()
        b = bonus_data.get(mid, {})
        members[mid] = {
            "id": mid, "uplineId": ref_id, "referrerId": ref_id,
            "selfPt": b.get("selfPt", ti(row["前月ポイント"])),
            "status": row["ステイタス"].strip(),
            "isActive": b.get("active", False),
            "forceActive": False,
        }

for code, info in force_info.items():
    if code not in members:
        b = bonus_data.get(code, {})
        members[code] = {
            "id": code, "uplineId": info["uplineOverride"],
            "referrerId": info["uplineOverride"],
            "selfPt": b.get("selfPt", 0), "status": "活動中",
            "isActive": b.get("active", False), "forceActive": info["forceActive"]
        }
    else:
        m = members[code]
        if info["uplineOverride"]:
            m["uplineId"] = info["uplineOverride"]
        m["forceActive"] = info["forceActive"]
        if info["forceActive"]:
            m["isActive"] = True

upline_ch = defaultdict(list)
for mid, m in members.items():
    uid = m.get("uplineId", "")
    if uid and uid != mid:
        upline_ch[uid].append(mid)

# ──────────────────────────────────────────────────────
# 圧縮後のdepth別メンバーをすべてトレース
# ──────────────────────────────────────────────────────
MAX_DEPTH = 7
depth_pts = defaultdict(int)
depth_members_list = defaultdict(list)
visit_log = []

def traverse(curr_id, depth):
    if depth > MAX_DEPTH:
        return
    for ch_id in upline_ch.get(curr_id, []):
        m = members.get(ch_id, {})
        wd = m.get("status", "") in ("退会", "失効") and not m.get("forceActive", False)
        fa = m.get("forceActive", False)
        ac = m.get("isActive", False)
        pt = m.get("selfPt", 0)

        if wd:
            visit_log.append({"depth": depth, "id": ch_id, "consumed_depth": False, "pt": 0, "mark": "WD"})
            depth_members_list[depth].append({"id": ch_id, "mark": "WD", "pt": 0})
            traverse(ch_id, depth)  # depth消費なし
        elif ac:
            if fa:
                visit_log.append({"depth": depth, "id": ch_id, "consumed_depth": True, "pt": 0, "mark": "FA"})
                depth_members_list[depth].append({"id": ch_id, "mark": "FA", "pt": 0})
                traverse(ch_id, depth + 1)  # depth消費あり
            else:
                visit_log.append({"depth": depth, "id": ch_id, "consumed_depth": True, "pt": pt, "mark": "ACT"})
                depth_pts[depth] += pt
                depth_members_list[depth].append({"id": ch_id, "mark": "ACT", "pt": pt})
                traverse(ch_id, depth + 1)  # depth消費あり
        else:
            visit_log.append({"depth": depth, "id": ch_id, "consumed_depth": False, "pt": 0, "mark": "非ACT"})
            depth_members_list[depth].append({"id": ch_id, "mark": "非ACT", "pt": 0})
            traverse(ch_id, depth)  # depth消費なし

traverse("82179501", 1)

print("=" * 100)
print("【82179501 ULB圧縮トレース】")
print("=" * 100)
print()

ULB_RATES_LV4 = [15, 9, 6, 5, 3, 2, 1]

print(f"{'段':>3} {'PT合計':>10} {'レート':>6} {'ボーナス':>10} {'ACT':>6} {'FA':>4} {'WD':>4} {'非ACT':>6}")
print("-" * 60)
total_ulb = 0
for d in range(1, 8):
    pts = depth_pts[d]
    rate = ULB_RATES_LV4[d-1]
    bonus = int(pts * rate / 100 * 100)  # POINT_RATE=100
    total_ulb += bonus
    mems = depth_members_list[d]
    act_c  = sum(1 for x in mems if x["mark"] == "ACT")
    fa_c   = sum(1 for x in mems if x["mark"] == "FA")
    wd_c   = sum(1 for x in mems if x["mark"] == "WD")
    non_c  = sum(1 for x in mems if x["mark"] == "非ACT")
    total_c = act_c + fa_c + wd_c + non_c
    print(f"{d:>3}段 {pts:>10,}pt {rate:>5}% {bonus:>10,}円 {act_c:>6}名 {fa_c:>4}名 {wd_c:>4}名 {non_c:>6}名  (計{total_c}名)")

print("-" * 60)
print(f"合計ULB: {total_ulb:,}円  (期待: 53,850円)")
print()

# ──────────────────────────────────────────────────────
# 各FA会員の圧縮depth確認
# 82179501の直下はFA: 40431001, 82179502, 95446801 → depth=1で消費
# 56926801 は非ACT → depth消費なし
# ──────────────────────────────────────────────────────
print("=" * 100)
print("【FA・ACT会員のdepth確認（82179501の直下）】")
for ch_id in upline_ch.get("82179501", []):
    m = members.get(ch_id, {})
    entries = [v for v in visit_log if v["id"] == ch_id]
    for e in entries:
        print(f"  {ch_id}: depth={e['depth']}, mark={e['mark']}, consumed={e['consumed_depth']}, selfPt={m.get('selfPt',0)}")

# ──────────────────────────────────────────────────────
# 深い圧縮: 各depthのACTメンバーを確認
# ──────────────────────────────────────────────────────
print()
print("=" * 100)
print("【depth別ACT（selfPt>0）メンバー一覧】")
for d in range(1, 8):
    mems = [x for x in depth_members_list[d] if x["mark"] == "ACT" and x["pt"] > 0]
    if mems:
        print(f"\n  {d}段（ACT+pt: {len(mems)}名, 合計{sum(x['pt'] for x in mems):,}pt）:")
        for x in mems:
            print(f"    {x['id']}: {x['pt']}pt")

# ──────────────────────────────────────────────────────
# 期待値との差: どのメンバーが違うdepthにいるか
# ──────────────────────────────────────────────────────
expected_depth_pts = {
    2: 150, 3: 750, 4: 1950, 5: 5100, 6: 8100, 7: 6750
}
print()
print("=" * 100)
print("【期待値との差分】")
print(f"{'段':>3} {'現在PT':>10} {'期待PT':>10} {'差':>10}")
for d in range(1, 8):
    cur = depth_pts[d]
    exp = expected_depth_pts.get(d, 0)
    diff = cur - exp
    flag = "✅" if diff == 0 else f"❌ {diff:+,}"
    print(f"{d:>3}段 {cur:>10,}pt {exp:>10,}pt {diff:>10,}pt {flag}")

# ──────────────────────────────────────────────────────
# 段別差の原因特定:
# 4段: +150pt → どのメンバーが4段に来ているが期待は5段以降?
# 5段: +2100pt → 同様
# ──────────────────────────────────────────────────────
print()
print("=" * 100)
print("【FA会員の位置確認 - 全FAのdepth一覧】")
fa_entries = [v for v in visit_log if v["mark"] == "FA"]
for e in fa_entries:
    m = members.get(e["id"], {})
    print(f"  {e['id']}: depth={e['depth']}, uplineId={m.get('uplineId','?')}")

print()
print("=" * 100)
print("【82179501系列の直下4名の確認】")
for ch_id in upline_ch.get("82179501", []):
    m = members.get(ch_id, {})
    entry = next((v for v in visit_log if v["id"] == ch_id), {})
    print(f"  {ch_id}: isActive={m.get('isActive')}, FA={m.get('forceActive')}, selfPt={m.get('selfPt')}, status={m.get('status')}")
    print(f"    → visited at depth={entry.get('depth','?')}, consumed_depth={entry.get('consumed_depth','?')}")
    print(f"    → childrenが次のdepthに進む: {entry.get('consumed_depth',False)}")
    print(f"    → 直下children: {[c for c in upline_ch.get(ch_id, [])]}")
