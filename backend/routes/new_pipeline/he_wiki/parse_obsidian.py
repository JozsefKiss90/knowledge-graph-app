"""
Parse Obsidian wiki .md files from backend/he_graph/ into JSON node & relationship files.

Usage (standalone):
    cd backend
    python -m routes.new_pipeline.he_wiki.parse_obsidian

Or from project root:
    python backend/routes/new_pipeline/he_wiki/parse_obsidian.py
"""

import json
import os
import re
import yaml
from pathlib import Path
from typing import Dict, List, Tuple

# Directories
SCRIPT_DIR = Path(__file__).resolve().parent
HE_GRAPH_DIR = SCRIPT_DIR.parents[2] / "he_graph"
OUTPUT_DIR = SCRIPT_DIR / "output"

SKIP_FILES = {"index.md", "log.md"}

CATEGORY_FOLDERS = [
    "strategies",
    "clusters",
    "institutions",
    "policies",
    "research_themes",
    "topics",
    "syntheses",
]


def _slugify(text: str) -> str:
    text = re.sub(r"\s+", " ", (text or "").strip())
    text = re.sub(r"[^a-zA-Z0-9\-._() ]+", "", text)
    return re.sub(r"[ ]+", "-", text).lower()


def _parse_frontmatter(content: str) -> Tuple[dict, str]:
    """Split YAML frontmatter from markdown body."""
    if not content.startswith("---"):
        return {}, content

    end = content.find("---", 3)
    if end == -1:
        return {}, content

    fm_text = content[3:end].strip()
    body = content[end + 3:].strip()

    try:
        fm = yaml.safe_load(fm_text) or {}
    except yaml.YAMLError:
        fm = {}

    return fm, body


def _extract_wikilinks(body: str) -> List[str]:
    """Extract all [[wikilink]] targets from markdown body."""
    return list(dict.fromkeys(re.findall(r"\[\[([^\]]+)\]\]", body)))


def _extract_summary(body: str) -> str:
    """Extract the first paragraph after the first heading, or the Overview section."""
    # Try to find an Overview section first
    overview_match = re.search(
        r"^#\s+Overview\s*\n(.*?)(?=\n#|\Z)",
        body,
        re.MULTILINE | re.DOTALL,
    )
    if overview_match:
        text = overview_match.group(1).strip()
        # Take first paragraph
        para = text.split("\n\n")[0].strip()
        if para:
            return para

    # Fallback: first non-heading, non-empty paragraph
    lines = body.split("\n\n")
    for block in lines:
        block = block.strip()
        if block and not block.startswith("#") and not block.startswith("---"):
            return block

    return ""


def parse_all() -> Tuple[List[dict], List[dict]]:
    """Parse all .md files and return (nodes, relationships)."""

    # First pass: build title -> id lookup from all files
    title_to_id: Dict[str, str] = {}
    file_entries: List[Tuple[Path, dict, str]] = []

    for folder in CATEGORY_FOLDERS:
        folder_path = HE_GRAPH_DIR / folder
        if not folder_path.is_dir():
            continue

        for md_file in sorted(folder_path.glob("*.md")):
            if md_file.name in SKIP_FILES:
                continue

            content = md_file.read_text(encoding="utf-8")
            fm, body = _parse_frontmatter(content)

            # ID from filename (without extension)
            name = md_file.stem
            node_id = _slugify(name)

            # Register title and aliases for lookup
            title_to_id[name] = node_id
            title = fm.get("title", name)
            if title != name:
                title_to_id[title] = node_id
            for alias in (fm.get("aliases") or []):
                title_to_id[alias] = node_id

            file_entries.append((md_file, fm, body))

    # Second pass: build nodes and relationships
    nodes: List[dict] = []
    relationships: List[dict] = []
    seen_edges = set()

    for md_file, fm, body in file_entries:
        name = md_file.stem
        node_id = _slugify(name)
        title = fm.get("title", name)
        category = fm.get("category", md_file.parent.name)

        node = {
            "id": node_id,
            "name": title,
            "type": category,
            "source": "he_wiki",
            "category": category,
            "summary": _extract_summary(body),
            "keywords": fm.get("keywords") or [],
            "aliases": fm.get("aliases") or [],
            "source_documents": fm.get("source_documents") or [],
            "body": body,
            "status": fm.get("status", "active"),
        }
        nodes.append(node)

        # Relationships from frontmatter related_nodes (RELATES_TO)
        related_nodes = fm.get("related_nodes") or []
        related_ids = set()

        for target_name in related_nodes:
            target_id = title_to_id.get(target_name)
            if not target_id or target_id == node_id:
                continue
            edge_key = (node_id, target_id)
            if edge_key not in seen_edges:
                seen_edges.add(edge_key)
                relationships.append({
                    "source": node_id,
                    "target": target_id,
                    "type": "RELATES_TO",
                    "origin": "frontmatter",
                })
            related_ids.add(target_id)

        # Relationships from body wikilinks (WIKI_LINK), excluding already-added
        for link_target in _extract_wikilinks(body):
            target_id = title_to_id.get(link_target)
            if not target_id or target_id == node_id:
                continue
            if target_id in related_ids:
                continue
            edge_key = (node_id, target_id)
            if edge_key not in seen_edges:
                seen_edges.add(edge_key)
                relationships.append({
                    "source": node_id,
                    "target": target_id,
                    "type": "WIKI_LINK",
                    "origin": "body",
                })

    return nodes, relationships


def write_output(nodes: List[dict], relationships: List[dict]):
    """Write JSON files to output directory."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    nodes_path = OUTPUT_DIR / "he_wiki_nodes.json"
    rels_path = OUTPUT_DIR / "he_wiki_relationships.json"

    with open(nodes_path, "w", encoding="utf-8") as f:
        json.dump(nodes, f, indent=2, ensure_ascii=False)

    with open(rels_path, "w", encoding="utf-8") as f:
        json.dump(relationships, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(nodes)} nodes to {nodes_path}")
    print(f"Wrote {len(relationships)} relationships to {rels_path}")


def main():
    if not HE_GRAPH_DIR.is_dir():
        print(f"ERROR: he_graph directory not found at {HE_GRAPH_DIR}")
        return

    nodes, relationships = parse_all()
    write_output(nodes, relationships)

    # Print stats
    categories = {}
    for n in nodes:
        cat = n["category"]
        categories[cat] = categories.get(cat, 0) + 1
    print(f"\nCategories: {categories}")

    rel_types = {}
    for r in relationships:
        t = r["type"]
        rel_types[t] = rel_types.get(t, 0) + 1
    print(f"Relationship types: {rel_types}")


if __name__ == "__main__":
    main()
