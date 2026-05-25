"""
prepare_p0_decisions.py
-----------------------
Generate final approval decisions for a consolidated enhancement wave.

用法：
  python scripts/prepare_p0_decisions.py --consolidated data/p0_candidates_consolidated.json
"""

import json
import argparse
from pathlib import Path


BASE_DIR = Path(__file__).parent.parent


def prepare_decisions(consolidated_file: Path):
    """
    審核規則：
    1. 分數上升 >= 4 分：自動批准
    2. 分數上升 2-3 分：審核後批准
    3. 分數下降或上升 < 2 分：標記人工檢查
    """
    with open(consolidated_file, encoding="utf-8") as f:
        data = json.load(f)
    
    review_table = data.get("review_table", [])
    decisions = []
    wave_label = consolidated_file.stem.replace("_consolidated", "").upper()
    
    for item in review_table:
        improvement = item["improvement"]
        
        if improvement >= 4:
            decision = "APPROVE"
            reason = f"Strong improvement (+{improvement} points): automatically approved"
        elif improvement >= 2:
            decision = "APPROVE"
            reason = f"Moderate improvement (+{improvement} points): approved with review"
        elif improvement >= 0:
            decision = "REVIEW"
            reason = f"Minimal improvement (+{improvement} points): requires manual review"
        else:
            decision = "REVIEW"
            reason = f"Score declined ({improvement} points): requires analysis and possible revert"
        
        decisions.append({
            "node_id": item["node_id"],
            "label": item["label"],
            "decision": decision,
            "reason": reason,
            "score_before": item["before_score"],
            "score_after": item["after_score"],
            "improvement": improvement,
            "diagnostics_before": item["before_diagnostics"],
            "diagnostics_after": item["after_diagnostics"]
        })
    
    # Statistics
    approve_count = sum(1 for d in decisions if d["decision"] == "APPROVE")
    review_count = sum(1 for d in decisions if d["decision"] == "REVIEW")
    
    print(f"\n{'='*70}")
    print(f"{wave_label} DECISION SUMMARY")
    print(f"{'='*70}")
    print(f"Total: {len(decisions)}")
    print(f"Auto-approve: {approve_count} ({100*approve_count/len(decisions):.1f}%)")
    print(f"Manual review: {review_count} ({100*review_count/len(decisions):.1f}%)")
    
    if review_count > 0:
        print(f"\nNodes requiring manual review:")
        for d in decisions:
            if d["decision"] == "REVIEW":
                print(f"  - {d['label']}: {d['score_before']} → {d['score_after']} ({d['improvement']:+d})")
                print(f"    Reason: {d['reason']}")
    
    return decisions


def main():
    parser = argparse.ArgumentParser(description="Prepare decisions for P0 enhancements")
    parser.add_argument("--consolidated", type=Path,
                        default=BASE_DIR / "data" / "p0_candidates_consolidated.json",
                        help="Consolidated results file")
    parser.add_argument("--output", type=Path, default=None,
                        help="Output decisions JSON")
    args = parser.parse_args()
    
    decisions = prepare_decisions(args.consolidated)
    
    # Save decisions
    if not args.output:
        args.output = args.consolidated.parent / f"{args.consolidated.stem}_decisions.json"
    
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump({
            "source": args.consolidated.name,
            "total_decisions": len(decisions),
            "approve": len([d for d in decisions if d["decision"] == "APPROVE"]),
            "review": len([d for d in decisions if d["decision"] == "REVIEW"]),
            "decisions": decisions
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\nDecisions saved to: {args.output}")


if __name__ == "__main__":
    main()
