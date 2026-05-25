"""Deterministically polish Japanese descriptions without external APIs.

This script normalizes mixed CJK terminology and wording consistency in
`data/i18n/ja_descriptions.json`.
"""

from __future__ import annotations

import json
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent.parent
JA_DESC_PATH = BASE_DIR / "data" / "i18n" / "ja_descriptions.json"

# Reuse high-impact terminology normalizations from prior manual JA label polish.
PHRASE_MAP = {
    "語言学": "言語学",
    "音樂理論": "音楽理論",
    "資訊理論": "情報理論",
    "熱力学定律": "熱力学の法則",
    "狹義相対論": "特殊相対性理論",
    "守恆定律": "保存則",
    "電磁輻射": "電磁放射",
    "化学鍵": "化学結合",
    "催化作用": "触媒作用",
    "週期律": "周期律",
    "天擇": "自然選択",
    "細胞学說": "細胞説",
    "生態系統": "生態系",
    "免疫系統": "免疫系",
    "神経傳導": "神経伝達",
    "回饋控制": "フィードバック制御",
    "訊號處理": "信号処理",
    "演算法": "アルゴリズム",
    "機器学習": "機械学習",
    "密碼学": "暗号学",
    "網路理論": "ネットワーク理論",
    "供給と需求": "需要と供給",
    "符號学": "記号論",
    "敘事": "ナラティブ",
    "心靈哲学": "心の哲学",
    "一手史料": "一次史料",
    "機率論": "確率論",
    "線性代数": "線形代数",
    "対稱性": "対称性",
    "最佳化": "最適化",
    "複雑系統": "複雑系",
    "資訊": "情報",
    "量測": "計測",
    "能量轉換": "エネルギー変換",
    "回饋迴路": "フィードバックループ",
    "合作演化": "協力の進化",
    "隨機過程": "確率過程",
    "網路效応": "ネットワーク効果",
    "還原論と整体論": "還元主義と全体論",
    "辺界條件": "境界条件",
    "擴散": "拡散",
    "倫理框架": "倫理フレームワーク",
    "訊號と雑訊": "信号と雑音",
    "線性と非線性": "線形と非線形",
    "穩定性と不穩定性": "安定性と不安定性",
    "認知建模": "認知モデリング",
    "約束滿足": "制約充足",
    "語言と思維": "言語と思考",
    "韌性": "レジリエンス",
    "隨機性と決定論": "ランダム性と決定論",
    "典範轉移": "パラダイムシフト",
    "仿生学": "バイオミメティクス",
    "資訊不対稱": "情報の非対称性",
    "空間推理": "空間推論",
    "量子糾纏": "量子もつれ",
    "分子結構": "分子構造",
    "蛋白質結構": "タンパク質構造",
    "基因調控": "遺伝子制御",
    "生物医学影像": "生体医用画像",
    "系統工程": "システム工学",
    "再生能源": "再生可能エネルギー",
    "通訊網路": "通信ネットワーク",
    "分散式運算": "分散コンピューティング",
    "人機互動": "ヒューマンコンピュータインタラクション",
    "網路安全": "サイバーセキュリティ",
    "社会網絡分析": "社会ネットワーク分析",
    "集体行動": "集団行動",
    "行為経済学": "行動経済学",
    "權力結構": "権力構造",
    "媒体理論": "メディア理論",
    "口傳傳統": "口承伝統",
    "数位人文": "デジタル・ヒューマニティーズ",
    "存在主義": "実存主義",
    "藝術運動": "芸術運動",
    "即興創作": "即興",
    "跨文化交流": "異文化交流",
    "復健医学": "リハビリテーション医学",
    "傳染病": "感染症",
    "羅馬文明": "ローマ文明",
    "中国古代文明": "中国古代文明",
}


def _load_json(path: Path) -> Any:
    with open(path, encoding="utf-8-sig") as f:
        return json.load(f)


def _save_json(path: Path, data: Any) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def _polish_text(text: str) -> str:
    out = text
    for old, new in PHRASE_MAP.items():
        if old in out:
            out = out.replace(old, new)

    out = re.sub(r"[ \t]+", " ", out).strip()
    out = out.replace("，", "、")

    if out and not out.endswith("。"):
        out = out + "。"

    return out


def main() -> None:
    if not JA_DESC_PATH.exists():
        raise SystemExit(f"Missing file: {JA_DESC_PATH}")

    payload = _load_json(JA_DESC_PATH)
    if not isinstance(payload, dict):
        raise SystemExit("Expected ja_descriptions.json to be a JSON object.")

    backup = JA_DESC_PATH.with_name(
        f"ja_descriptions_backup_polish_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    )
    shutil.copy2(JA_DESC_PATH, backup)

    changed = 0
    for key, value in list(payload.items()):
        if not isinstance(value, str):
            continue
        new_value = _polish_text(value)
        if new_value != value:
            payload[key] = new_value
            changed += 1

    _save_json(JA_DESC_PATH, payload)

    print(f"backup_file={backup}")
    print(f"changed_entries={changed}")
    print(f"total_entries={len(payload)}")
    print(f"output_file={JA_DESC_PATH}")


if __name__ == "__main__":
    main()
