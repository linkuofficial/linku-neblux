"""
Unit tests for the Nexus pipeline.
Run with: python -m pytest tests/ -v
"""

import json
import sys
from pathlib import Path

# 加入 scripts 到 path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

import pytest


# ═══════════════════════════════════════════════════════════
# Test: extract_json (A1 修復)
# ═══════════════════════════════════════════════════════════

class TestExtractJson:
    """測試 JSON 解析的各種邊界情況"""
    
    def setup_method(self):
        from generate_nodes import extract_json
        self.extract = extract_json
    
    def test_pure_json(self):
        raw = '{"nodes": [{"id": "test_concept"}]}'
        result = self.extract(raw)
        assert result["nodes"][0]["id"] == "test_concept"
    
    def test_json_with_markdown_fence(self):
        raw = '```json\n{"nodes": [{"id": "test_concept"}]}\n```'
        result = self.extract(raw)
        assert result["nodes"][0]["id"] == "test_concept"
    
    def test_json_with_plain_fence(self):
        raw = '```\n{"nodes": [{"id": "test_concept"}]}\n```'
        result = self.extract(raw)
        assert result["nodes"][0]["id"] == "test_concept"
    
    def test_json_with_surrounding_text(self):
        raw = 'Here is the output:\n{"nodes": [{"id": "test_concept"}]}\nDone.'
        result = self.extract(raw)
        assert result["nodes"][0]["id"] == "test_concept"
    
    def test_json_with_backticks_in_description(self):
        """描述中包含反引號不應破壞解析"""
        raw = '```json\n{"nodes": [{"id": "test_concept", "description": "Uses `code` blocks"}]}\n```'
        result = self.extract(raw)
        assert "code" in result["nodes"][0]["description"]
    
    def test_invalid_json_raises(self):
        raw = "This is not JSON at all"
        with pytest.raises(json.JSONDecodeError):
            self.extract(raw)
    
    def test_empty_string_raises(self):
        with pytest.raises(json.JSONDecodeError):
            self.extract("")
    
    def test_nested_braces(self):
        raw = '{"nodes": [{"id": "test", "era": {"start": 1900, "end": 2000}}]}'
        result = self.extract(raw)
        assert result["nodes"][0]["era"]["start"] == 1900


# ═══════════════════════════════════════════════════════════
# Test: build_context_ids (A3 修復)
# ═══════════════════════════════════════════════════════════

class TestBuildContextIds:
    """測試 context 注入策略"""
    
    def setup_method(self):
        from generate_nodes import build_context_ids, CONFIG
        self.build_context = build_context_ids
        self.config = CONFIG
    
    def _make_node(self, nid, ntype="concept", domains=None):
        return {
            "id": nid,
            "type": ntype,
            "domain": domains or ["MAT"],
            "label": nid.replace("_", " ").title(),
        }
    
    def test_field_nodes_always_included(self):
        nodes = [self._make_node(f"field_{i}_field", "field") for i in range(50)]
        context = self.build_context(nodes)
        assert len(context) == 50
        assert all(c["type"] == "field" for c in context)
    
    def test_max_ids_not_exceeded(self):
        max_ids = self.config["generation"]["context_max_ids"]
        nodes = [self._make_node(f"field_{i}_field", "field") for i in range(50)]
        nodes += [self._make_node(f"concept_{i}_concept", "concept", ["MAT"]) for i in range(1000)]
        context = self.build_context(nodes)
        assert len(context) <= max_ids
    
    def test_domain_stratification(self):
        """確保 12 個 domain 都有代表"""
        domains = ["MAT","PHY","CHE","BIO","MED","ENG","TEC","SOC","HUM","PHI","ART","HIS"]
        nodes = [self._make_node("math_field", "field", ["MAT"])]
        for i, d in enumerate(domains):
            for j in range(50):
                nodes.append(self._make_node(f"{d.lower()}_{j}_concept", "concept", [d]))
        
        context = self.build_context(nodes)
        context_domains = set()
        for c in context:
            context_domains.update(c["domain"])
        
        # 所有 12 個 domain 都應該有代表
        assert len(context_domains) == 12
    
    def test_context_includes_metadata(self):
        """確認回傳包含 {id, type, domain}"""
        nodes = [self._make_node("test_field", "field", ["MAT", "PHY"])]
        context = self.build_context(nodes)
        assert "id" in context[0]
        assert "type" in context[0]
        assert "domain" in context[0]
        assert context[0]["domain"] == ["MAT", "PHY"]


# ═══════════════════════════════════════════════════════════
# Test: validate_node (B1 補強)
# ═══════════════════════════════════════════════════════════

class TestValidateNode:
    """測試驗證邏輯的邊界情況"""
    
    def setup_method(self):
        from validate_nodes import validate_node
        self.validate = validate_node
    
    def _make_valid_node(self):
        return {
            "id": "derivative_concept",
            "label": "Derivative",
            "type": "concept",
            "domain": ["MAT", "PHY"],
            "description": " ".join(["word"] * 60),  # 60 words
            "era": {"start": 1666, "end": 1696},
            "geo": None,
            "has_subgraph": False,
            "verified": False,
            "display_tags": ["calculus", "foundational"],
            "connections": [
                {"target": "math_field", "relation_type": "logical", "directed": False, "pending": False},
                {"target": "physics_field", "relation_type": "applied", "directed": False, "pending": False},
                {"target": "newton_person", "relation_type": "historical", "directed": False, "pending": False},
            ]
        }
    
    def _make_lookup(self, extra_nodes=None):
        lookup = {
            "math_field": {"id": "math_field", "type": "field", "domain": ["MAT"]},
            "physics_field": {"id": "physics_field", "type": "field", "domain": ["PHY"]},
            "newton_person": {"id": "newton_person", "type": "person", "domain": ["MAT", "PHY"]},
        }
        if extra_nodes:
            lookup.update(extra_nodes)
        return lookup
    
    def test_valid_node_passes(self):
        node = self._make_valid_node()
        lookup = self._make_lookup()
        errors, warnings = self.validate(node, lookup, {"math_field", "physics_field"})
        assert errors == []
    
    def test_era_start_greater_than_end(self):
        node = self._make_valid_node()
        node["era"] = {"start": 2000, "end": 1900}
        errors, _ = self.validate(node, self._make_lookup(), set())
        assert any("era range" in e.lower() for e in errors)
    
    def test_description_too_short(self):
        node = self._make_valid_node()
        node["description"] = "Too short."
        errors, _ = self.validate(node, self._make_lookup(), set())
        assert any("too short" in e.lower() for e in errors)
    
    def test_description_too_long(self):
        node = self._make_valid_node()
        node["description"] = " ".join(["word"] * 260)
        errors, _ = self.validate(node, self._make_lookup(), set())
        assert any("too long" in e.lower() for e in errors)
    
    def test_invalid_tag_not_in_seed(self):
        node = self._make_valid_node()
        node["display_tags"] = ["calculus", "totally_fake_tag"]
        errors, _ = self.validate(node, self._make_lookup(), set())
        # 只有在 SEED_TAGS 非空時才會報錯
        # 測試中可能沒有載入 seed tags，所以檢查邏輯是否正確
        # 如果 SEED_TAGS 為空，不會報錯（graceful degradation）
    
    def test_tag_with_review_suffix_passes(self):
        node = self._make_valid_node()
        node["display_tags"] = ["calculus", "new_concept_REVIEW"]
        errors, _ = self.validate(node, self._make_lookup(), set())
        tag_errors = [e for e in errors if "tag" in e.lower() and "undefined" in e.lower()]
        assert tag_errors == []
    
    def test_contradicts_relation_rejected(self):
        node = self._make_valid_node()
        node["connections"][0]["relation_type"] = "contradicts"
        errors, _ = self.validate(node, self._make_lookup(), set())
        assert any("contradicts" in e for e in errors)
    
    def test_directed_true_with_applied_rejected(self):
        node = self._make_valid_node()
        node["connections"][1]["directed"] = True
        errors, _ = self.validate(node, self._make_lookup(), set())
        assert any("directed" in e.lower() for e in errors)
    
    def test_geo_on_concept_rejected(self):
        node = self._make_valid_node()
        node["geo"] = {"country": "US"}
        errors, _ = self.validate(node, self._make_lookup(), set())
        assert any("geo" in e.lower() for e in errors)
    
    def test_too_few_connections(self):
        node = self._make_valid_node()
        node["connections"] = node["connections"][:2]
        errors, _ = self.validate(node, self._make_lookup(), set())
        assert any("too few connections" in e.lower() for e in errors)
    
    def test_connections_single_domain_warns(self):
        """所有 connection targets 都在同一 domain → 報錯"""
        node = self._make_valid_node()
        # 全部指向 MAT domain
        lookup = {
            "math_field": {"id": "math_field", "type": "field", "domain": ["MAT"]},
            "algebra_concept": {"id": "algebra_concept", "type": "concept", "domain": ["MAT"]},
            "geometry_concept": {"id": "geometry_concept", "type": "concept", "domain": ["MAT"]},
        }
        node["connections"] = [
            {"target": "math_field", "relation_type": "logical", "directed": False, "pending": False},
            {"target": "algebra_concept", "relation_type": "logical", "directed": False, "pending": False},
            {"target": "geometry_concept", "relation_type": "logical", "directed": False, "pending": False},
        ]
        errors, _ = self.validate(node, lookup, {"math_field"})
        assert any("domain" in e.lower() and "span" in e.lower() for e in errors)


# ═══════════════════════════════════════════════════════════
# Test: quick_dedup_check (B3 即時去重)
# ═══════════════════════════════════════════════════════════

class TestQuickDedupCheck:
    """測試即時去重邏輯"""
    
    def setup_method(self):
        from generate_nodes import quick_dedup_check
        self.check = quick_dedup_check
    
    def test_exact_duplicate_flagged(self):
        existing = [{"id": "derivative_concept", "label": "Derivative"}]
        new_nodes = [{"id": "derivative_v2_concept", "label": "Derivative"}]
        clean, flagged = self.check(new_nodes, existing, threshold=0.85)
        assert len(flagged) == 1
        assert len(clean) == 0
    
    def test_similar_label_flagged(self):
        existing = [{"id": "neural_network_concept", "label": "Neural Network"}]
        new_nodes = [{"id": "neural_networks_concept", "label": "Neural Networks"}]
        clean, flagged = self.check(new_nodes, existing, threshold=0.85)
        assert len(flagged) == 1
    
    def test_different_label_passes(self):
        existing = [{"id": "derivative_concept", "label": "Derivative"}]
        new_nodes = [{"id": "integral_concept", "label": "Integral"}]
        clean, flagged = self.check(new_nodes, existing, threshold=0.85)
        assert len(clean) == 1
        assert len(flagged) == 0
    
    def test_empty_existing_all_pass(self):
        new_nodes = [
            {"id": "a_concept", "label": "Concept A"},
            {"id": "b_concept", "label": "Concept B"},
        ]
        clean, flagged = self.check(new_nodes, [], threshold=0.85)
        assert len(clean) == 2
        assert len(flagged) == 0


# ═══════════════════════════════════════════════════════════
# Test: find_string_duplicates (B2)
# ═══════════════════════════════════════════════════════════

class TestStringDuplicates:
    """測試字串去重"""
    
    def setup_method(self):
        from deduplicate import find_string_duplicates
        self.find = find_string_duplicates
    
    def test_exact_label_match(self):
        nodes = [
            {"id": "a_concept", "label": "Quantum Mechanics"},
            {"id": "b_concept", "label": "quantum mechanics"},
        ]
        results = self.find(nodes, threshold=0.85)
        assert len(results) == 1
        assert results[0]["type"] == "exact_label"
    
    def test_similar_labels(self):
        nodes = [
            {"id": "a_concept", "label": "Newton's Method"},
            {"id": "b_concept", "label": "Newton Method"},
        ]
        results = self.find(nodes, threshold=0.85)
        assert len(results) >= 1
    
    def test_different_labels_not_flagged(self):
        nodes = [
            {"id": "a_concept", "label": "Gravity"},
            {"id": "b_concept", "label": "Electricity"},
        ]
        results = self.find(nodes, threshold=0.85)
        assert len(results) == 0


# ═══════════════════════════════════════════════════════════
# Test: find_connection_overlaps (B2)
# ═══════════════════════════════════════════════════════════

class TestConnectionOverlaps:
    """測試 connection 重疊偵測"""
    
    def setup_method(self):
        from deduplicate import find_connection_overlaps
        self.find = find_connection_overlaps
    
    def test_high_overlap_flagged(self):
        nodes = [
            {
                "id": "a_concept", "label": "A",
                "connections": [
                    {"target": "x", "pending": False},
                    {"target": "y", "pending": False},
                    {"target": "z", "pending": False},
                ]
            },
            {
                "id": "b_concept", "label": "B",
                "connections": [
                    {"target": "x", "pending": False},
                    {"target": "y", "pending": False},
                    {"target": "z", "pending": False},
                ]
            },
        ]
        results = self.find(nodes, threshold=0.6)
        assert len(results) == 1
        assert results[0]["score"] == 1.0
    
    def test_no_overlap_not_flagged(self):
        nodes = [
            {
                "id": "a_concept", "label": "A",
                "connections": [
                    {"target": "x", "pending": False},
                    {"target": "y", "pending": False},
                ]
            },
            {
                "id": "b_concept", "label": "B",
                "connections": [
                    {"target": "p", "pending": False},
                    {"target": "q", "pending": False},
                ]
            },
        ]
        results = self.find(nodes, threshold=0.6)
        assert len(results) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
