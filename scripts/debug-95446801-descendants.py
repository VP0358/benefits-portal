#!/usr/bin/env python3
"""
debug-95446801-descendants.py
95446801系列の全子孫を出力し、series_pt不足の原因を特定する
"""
import csv
from collections import defaultdict

MATRIX_CSV = "/home/user/uploaded_files/matrix_892488_full.csv"
BONUS_CSV  = "/home/user/uploaded_files/bonus_list_full.csv"
FORCE_CSV  = "/home/user/uploaded_files/強制設定会員一覧_2026-06-02 - コピー (2).csv"

def ti(v):
    try: return int(str(v).strip().replace(",", ""))
    except: return 0

# 強制設定CSV
force_info = {}
with open(FORCE_CSV, "r", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        code = row["会員コード"].strip()
        upline_override = row["直上者コード"].strip()
        fa = row["強制アクティブ"].strip() == "有効"
        force_info[code] = {"uplineOverride": upline_override, "forceActive": fa}

# ボーナスCSV
bonus_data = {}
with open(BONUS_CSV, "r", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        mid = row["会員番号"].strip()
        bonus_data[mid] = {
            "active": row["ｱｸﾃｨﾌﾞ"].strip() == "○",
            "selfPt": ti(row["自己購入pt"]),
        }

# マトリックスCSV
members = {}
with open(MATRIX_CSV, "r", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        mid = row["会員ID"].strip()
        ref_id = row["紹介者ID"].strip()
        status = row["ステイタス"].strip()
        b = bonus_data.get(mid, {})
        members[mid] = {
            "id": mid,
            "uplineId": ref_id,
            "referrerId": ref_id,
            "selfPt": b.get("selfPt", ti(row["前月ポイント"])),
            "status": status,
            "isActive": b.get("active", False),
            "forceActive": False,
        }

# 強制設定上書き
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

# childrenMap構築
upline_ch = defaultdict(list)
for mid, m in members.items():
    uid = m.get("uplineId", "")
    if uid and uid != mid:
        upline_ch[uid].append(mid)

# ──────────────────────────────────────────────────────
# 95446801系列の全子孫を出力
# ──────────────────────────────────────────────────────
def get_all_descendants(root_id):
    result = []
    def dfs(curr_id, depth=0):
        for ch_id in sorted(upline_ch.get(curr_id, [])):
            m = members.get(ch_id, {})
            result.append({
                "depth": depth,
                "id": ch_id,
                "uplineId": m.get("uplineId", "?"),
                "isActive": m.get("isActive", False),
                "forceActive": m.get("forceActive", False),
                "selfPt": m.get("selfPt", 0),
                "status": m.get("status", "?"),
            })
            dfs(ch_id, depth + 1)
    dfs(root_id, 0)
    return result

desc_95 = get_all_descendants("95446801")
print(f"95446801の全子孫: {len(desc_95)}名")
print()
print(f"{'position_id':<14} {'uplineId':<14} {'active':<8} {'forceActive':<12} {'selfPt':>8}  status")
print("-" * 80)

total_pt = 0
act_count = 0
for d in desc_95:
    indent = "  " * d["depth"]
    act_flag = ""
    if d["isActive"] and not d["forceActive"] and d["selfPt"] > 0:
        total_pt += d["selfPt"]
        act_count += 1
        act_flag = " ← ACT+pt"
    elif d["forceActive"]:
        act_flag = " (FA)"
    print(f"{indent}{d['id']:<14} {d['uplineId']:<14} {str(d['isActive']):<8} {str(d['forceActive']):<12} {d['selfPt']:>8}  {d['status']}{act_flag}")

print("-" * 80)
print(f"ACTメンバー（FA除く・selfPt>0）のselfPt合計: {total_pt:,}pt  ({act_count}名)")
print(f"期待値: 10,200pt  差: {total_pt - 10200:+,}pt")

# ──────────────────────────────────────────────────────
# 42845501の詳細確認（強制設定でuplineId=64150101に変更）
# ──────────────────────────────────────────────────────
print()
print("=" * 80)
print("【重要: 42845501の確認】")
m42 = members.get("42845501", {})
print(f"42845501: uplineId={m42.get('uplineId')}, referrerId={m42.get('referrerId')}, isActive={m42.get('isActive')}, forceActive={m42.get('forceActive')}, selfPt={m42.get('selfPt')}")
print(f"  → uplineId=64150101（強制設定で変更）→ 64150101の子として扱われる")
m64 = members.get("64150101", {})
print(f"64150101: uplineId={m64.get('uplineId')}, forceActive={m64.get('forceActive')}")
print(f"  64150101はuplineId=95446801なので、42845501は95446801系列内に含まれるはず")

# 64150101の子一覧
print(f"\n64150101の直下（upline_ch）: {upline_ch.get('64150101', [])}")
# 42845501の子孫
desc_42 = get_all_descendants("42845501")
print(f"42845501の全子孫: {len(desc_42)}名")
total_42 = sum(d["selfPt"] for d in desc_42 if d["isActive"] and not d["forceActive"])
print(f"  ACTselfPt合計: {total_42:,}pt")

# ──────────────────────────────────────────────────────
# 95446801系列 vs 期待値の差分分析
# ──────────────────────────────────────────────────────
print()
print("=" * 80)
print("【差分分析】")
print(f"現在の95446801系列PT: {total_pt:,}pt")
print(f"期待値: 10,200pt")
print(f"差: {total_pt - 10200:+,}pt = {(10200 - total_pt) // 150}名分（1名=150pt）")

# 42845501の子孫でACTになっているメンバーのselfPtを確認
print()
print("42845501系列のACT+ptメンバー:")
for d in desc_42:
    if d["isActive"] and not d["forceActive"] and d["selfPt"] > 0:
        print(f"  {d['id']}: {d['selfPt']}pt (uplineId={d['uplineId']})")

# 95446801系列に含まれているACT+ptメンバーのIDリスト
print()
ids_in_95 = {d["id"] for d in desc_95}
ids_in_42 = {d["id"] for d in desc_42}
print(f"95446801系列内のメンバー数: {len(ids_in_95)}")
print(f"42845501の子孫数: {len(ids_in_42)}")

# 42845501が95446801系列内にいるか確認
print(f"42845501は95446801系列内に含まれるか: {'42845501' in ids_in_95}")
