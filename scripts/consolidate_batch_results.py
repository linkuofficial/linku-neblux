"""
consolidate_batch_results.py
----------------------------
合併所有批次優化結果，產生統一的審核表與決策報告。

用法：
  python scripts/consolidate_batch_results.py --batches 5 --output data/p0_consolidated_enhancements.json
"""

import json
import argparse
from pathlib import Path
from datetime import datetime, timezone
from collections import defaultdict


BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"


def consolidate_results(num_batches: int, candidates_file: str = "p0_candidates"):
    """合併多批次結果"""
    all_results = []
    all_errors = []
    
    for batch_num in range(1, num_batches + 1):
        batch_file = DATA_DIR / f"{candidates_file}_batch{batch_num}_enhancements.json"
        if not batch_file.exists():
            print(f"WARNING: {batch_file.name} not found")
            continue
        
        print(f"Loading batch {batch_num}...", end=" ")
        with open(batch_file, encoding="utf-8") as f:
            data = json.load(f)
        
        batch_results = data.get("batch_results", [])
        all_results.extend(batch_results)
        
        errors = [r for r in batch_results if r["status"] == "error"]
        if errors:
            all_errors.extend(errors)
            print(f"✓ ({len(batch_results)} results, {len(errors)} errors)")
        else:
            print(f"✓ ({len(batch_results)} results)")
    
    return all_results, all_errors


def generate_review_table(results: list) -> dict:
    """產生審核表格式"""
    review_items = []
    
    for r in results:
        if r["status"] != "completed":
            continue
        
        review_items.append({
            "node_id": r["node_id"],
            "label": r["label"],
            "decision": "PENDING",  # 待審核決定
            "reason": "",  # 審核人評語
            "before_score": r["before"]["total_score"],
            "after_score": r["after"]["total_score"],
            "improvement": r["improvement"]["score_delta"],
            "before_diagnostics": r["before"]["diagnostics"],
            "after_diagnostics": r["after"]["diagnostics"],
            "original_description": r["original_description"][:150] + "..."
                if len(r["original_description"]) > 150 else r["original_description"],
            "enhanced_description": r["enhanced_description"][:200] + "..."
                if len(r["enhanced_description"]) > 200 else r["enhanced_description"]
        })
    
    return review_items


def generate_summary(results: list, errors: list) -> dict:
    """產生統計摘要"""
    completed = [r for r in results if r["status"] == "completed"]
    
    if not completed:
        return {"error": "No completed results"}
    
    improvements = [r["improvement"]["score_delta"] for r in completed]
    desc_improvements = [r["improvement"]["description_delta"] for r in completed]
    
    # 按改善幅度分類
    by_improvement = defaultdict(int)
    for imp in improvements:
        if imp >= 6:
            by_improvement["excellent"] += 1
        elif imp >= 5:
            by_improvement["very_good"] += 1
        elif imp >= 4:
            by_improvement["good"] += 1
        elif imp >= 2:
            by_improvement["moderate"] += 1
        elif imp >= 0:
            by_improvement["neutral"] += 1
        else:
            by_improvement["declined"] += 1
    
    return {
        "total_processed": len(results),
        "completed": len(completed),
        "errors": len(errors),
        "success_rate": f"{100 * len(completed) / len(results):.1f}%",
        "score_improvements": {
            "min": min(improvements),
            "max": max(improvements),
            "mean": sum(improvements) / len(improvements),
            "median": sorted(improvements)[len(improvements) // 2]
        },
        "description_improvements": {
            "min": min(desc_improvements),
            "max": max(desc_improvements),
            "mean": sum(desc_improvements) / len(desc_improvements)
        },
        "distribution": dict(by_improvement),
        "recommendations": generate_recommendations(improvements, len(completed))
    }


def generate_recommendations(improvements: list, total: int) -> list:
    """提出應用建議"""
    recommendations = []
    
    avg_improvement = sum(improvements) / len(improvements)
    if avg_improvement >= 4.5:
        recommendations.append("✓ 建議全數套用：平均提升達 +4.5 分以上，品質提升顯著")
    else:
        recommendations.append("⊙ 建議逐筆審核後套用：平均提升未達 +4.5 分")
    
    excellent_count = sum(1 for i in improvements if i >= 6)
    if excellent_count / total >= 0.3:
        recommendations.append(f"✓ 優化品質一致：{100*excellent_count/total:.0f}% 的節點提升 >= 6 分")
    else:
        recommendations.append(f"⊙ 提升幅度變化較大：從 {min(improvements)} 到 {max(improvements)} 分不等")
    
    declined = sum(1 for i in improvements if i < 0)
    if declined > 0:
        recommendations.append(f"⚠ 注意：{declined} 個節點分數下降，請逐筆審查原因")
    
    return recommendations


def main():
    parser = argparse.ArgumentParser(description="Consolidate batch enhancement results")
    parser.add_argument("--batches", type=int, default=5, help="Number of batches to consolidate")
    parser.add_argument("--candidates", type=str, default="p0_candidates",
                        help="Candidates file prefix")
    parser.add_argument("--output", type=Path, default=None,
                        help="Consolidated output JSON")
    args = parser.parse_args()
    
    # Consolidate
    print(f"Consolidating {args.batches} batches...")
    results, errors = consolidate_results(args.batches, args.candidates)
    
    print(f"\nTotal results: {len(results)}")
    
    # Generate review table
    review_table = generate_review_table(results)
    print(f"Review items: {len(review_table)}")
    
    # Generate summary
    summary = generate_summary(results, errors)
    print(f"\nSummary:")
    print(f"  Completed: {summary['completed']}/{summary['total_processed']}")
    print(f"  Success rate: {summary['success_rate']}")
    print(f"  Avg score improvement: +{summary['score_improvements']['mean']:.2f}")
    print(f"  Distribution: {summary['distribution']}")
    
    print(f"\nRecommendations:")
    for rec in summary["recommendations"]:
        print(f"  {rec}")
    
    # Save consolidated
    if not args.output:
        args.output = DATA_DIR / f"{args.candidates}_consolidated.json"
    
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "consolidation": {
                "source_prefix": args.candidates,
                "num_batches": args.batches
            },
            "summary": summary,
            "review_table": review_table,
            "raw_results": results,
            "errors": errors
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\nConsolidated results saved to: {args.output}")


if __name__ == "__main__":
    main()
