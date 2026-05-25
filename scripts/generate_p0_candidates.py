"""
generate_p0_candidates.py
------------------------
Generate enhancement candidate lists for score bands such as P0/P1.

Usage:
    python scripts/generate_p0_candidates.py
    python scripts/generate_p0_candidates.py --min-score 18 --max-score 19 --label P1
    python scripts/generate_p0_candidates.py --require-diagnostic WHAT --require-diagnostic SIGNIFICANCE
"""

import json
import argparse
from pathlib import Path
from collections import defaultdict
from quality_check import load_nodes, score_description, score_node, VALID_DOMAINS

BASE_DIR = Path(__file__).parent.parent
NODES_FILE = BASE_DIR / "data" / "all_nodes.json"


def matches_required_diagnostics(desc_diags: list[str], required_terms: list[str]) -> bool:
    if not required_terms:
        return True

    lowered = [diag.lower() for diag in desc_diags]
    for term in required_terms:
        if not any(term.lower() in diag for diag in lowered):
            return False
    return True


def generate_candidates(
    min_total_score: int | None = None,
    max_total_score: int | None = None,
    max_description_score: int | None = None,
    required_diagnostics: list[str] | None = None,
):
    """Generate enhancement candidates filtered by score band and diagnostics."""
    with open(NODES_FILE, encoding="utf-8") as f:
        data = json.load(f)
    
    nodes = data.get("nodes", [])
    node_lookup = {n.get("id"): n for n in nodes}
    candidates = []
    diagnostics_count = defaultdict(int)
    
    print(
        f"Scanning {len(nodes)} nodes for candidates "
        f"(total between {min_total_score if min_total_score is not None else '-inf'} "
        f"and {max_total_score if max_total_score is not None else '+inf'})..."
    )
    
    for i, node in enumerate(nodes):
        node_id = node.get("id")
        desc_result = score_description(node)
        total_result = score_node(node, node_lookup)
        
        desc_score = desc_result.get("total", 0)
        desc_diags = desc_result.get("diagnostics", [])
        total_score = total_result.get("total_score", 0)
        
        in_range = (
            (min_total_score is None or total_score >= min_total_score)
            and (max_total_score is None or total_score <= max_total_score)
        )
        desc_ok = max_description_score is None or desc_score <= max_description_score
        diag_ok = matches_required_diagnostics(desc_diags, required_diagnostics or [])

        if in_range and desc_ok and diag_ok:
            # 記錄所有診斷
            for diag in desc_diags:
                diagnostics_count[diag] += 1
            
            candidate = {
                "node_id": node_id,
                "label": node.get("label", ""),
                "domain": node.get("domain", []),
                "type": node.get("type", ""),
                "current_score": {
                    "description": desc_score,
                    "total": total_score
                },
                "diagnostics": desc_diags,
                "original_description": node.get("description", "")[:100] + "..."
                    if node.get("description") else "",
                "connection_count": len(node.get("connections", []))
            }
            candidates.append(candidate)
        
        if (i + 1) % 100 == 0:
            print(f"  Processed {i + 1}/{len(nodes)}...")
    
    # 按總分升序排列（最低分優先）
    candidates.sort(key=lambda x: (x["current_score"]["total"], x["current_score"]["description"]))
    
    return candidates, diagnostics_count


def main():
    parser = argparse.ArgumentParser(description="Generate enhancement candidates for targeted score bands")
    parser.add_argument("--label", type=str, default="P0", help="Candidate set label used in summary/output metadata")
    parser.add_argument("--min-score", type=int, default=None, help="Minimum total score threshold")
    parser.add_argument("--max-score", type=int, default=17, help="Maximum total score threshold")
    parser.add_argument("--max-description-score", type=int, default=None, help="Optional maximum description score")
    parser.add_argument(
        "--require-diagnostic",
        action="append",
        default=[],
        help="Require a diagnostic substring; can be repeated",
    )
    parser.add_argument("--output", type=Path, default=BASE_DIR / "data" / "p0_candidates.json",
                        help="Output JSON path")
    args = parser.parse_args()
    
    candidates, diag_counts = generate_candidates(
        min_total_score=args.min_score,
        max_total_score=args.max_score,
        max_description_score=args.max_description_score,
        required_diagnostics=args.require_diagnostic,
    )
    
    print(f"\n{'='*70}")
    print(f"{args.label} CANDIDATES SUMMARY")
    print(f"{'='*70}")
    print(f"Total {args.label} nodes: {len(candidates)}")
    if candidates:
        print(f"Score range: {candidates[-1]['current_score']['total']:.1f} - {candidates[0]['current_score']['total']:.1f}")
        print(f"Avg description score: {sum(c['current_score']['description'] for c in candidates) / len(candidates):.1f}/10")
        print(f"Avg total score: {sum(c['current_score']['total'] for c in candidates) / len(candidates):.1f}/25")
    
    print(f"\nTOP DIAGNOSTICS ({args.label} layer):")
    for diag, count in sorted(diag_counts.items(), key=lambda x: -x[1])[:10]:
        pct = 100 * count / len(candidates) if candidates else 0
        print(f"  {count:3d}x ({pct:5.1f}%) {diag}")
    
    # 按 domain 分組
    domain_groups = defaultdict(int)
    for c in candidates:
        for d in c["domain"]:
            domain_groups[d] += 1
    
    print(f"\nBY DOMAIN:")
    for d in sorted(VALID_DOMAINS):
        count = domain_groups[d]
        if count > 0:
            print(f"  {d}: {count:3d}")
    
    # 儲存清單
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": __import__("datetime").datetime.now(
                __import__("datetime").timezone.utc
            ).isoformat(),
            "label": args.label,
            "threshold_min_total_score": args.min_score,
            "threshold_max_total_score": args.max_score,
            "threshold_max_description_score": args.max_description_score,
            "required_diagnostics": args.require_diagnostic,
            "total_count": len(candidates),
            "candidates": candidates,
            "diagnostics_distribution": dict(diag_counts)
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved to: {args.output}")
    return candidates


if __name__ == "__main__":
    main()
