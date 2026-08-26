#!/usr/bin/env python3
"""Topic -> Destination map, read from a work programme's own call budget tables.

Why this exists
---------------
The graph's `Destination` node comes from the *bucket* a call sits in
(`base_cluster_builder.py`: `dest.get("destination") or dest.get("destination_title")`),
NOT from the call's own `destination` field. The portal API leaves `destination` as
`_unknown_destination` for topics it cannot resolve - every 2027 topic in CL4, and
*all 47* calls in CL3 - and where it does resolve one it sometimes uses a name that
appears nowhere in the work programme. The document is the authority.

In the "Call - X" sections each budget table is introduced by a destination heading
(`Destination: <name>` in CL4, `Destination - <name>` in CL3) and then lists every
topic that belongs to it. That mapping is what this module extracts.

The canonical destination names are read from `destination_summaries_<cluster>.json`
rather than hardcoded, so the names this module returns are exactly the ones
`BaseClusterBuilder._get_summary` can resolve. Keep those two in step: if a name in
the summaries file does not appear in the PDF, its destination will map to nothing
and the run fails loudly rather than misfiling topics.

Usage:
    from wp_destinations import destination_map
    m = destination_map("CL3")           # {call_id: destination_title}
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / "_refs"))

import he_wp_parser_merged_patched_with_dates as pa  # prior-art engine (header/footer strip)
import wp_clusters

try:
    import pymupdf as fitz
except ImportError:  # older installs
    import fitz

# "Destination: X" (CL4) / "Destination - X" (CL3), including en/em dashes.
HEADING_RE = re.compile(r'Destination\s*[-:–—]\s*((?:[^\n]+\n){1,4})')
# The table of contents repeats the same headings with dot leaders.
TOC_LEADER = re.compile(r'\.{4,}')


def _key(s: str) -> str:
    """Comparison key that survives PDF line wrapping and stray hyphens.

    The document breaks long destination names mid-word ("Space-\\nBased") and
    hyphenates inconsistently ("data-services" / "data- services"), so compare on
    letters and digits only.
    """
    return re.sub(r'[^a-z0-9]', '', (s or '').lower())


def clean_text(pdf_path) -> str:
    """Document text, running headers/footers stripped, wrapped topic ids repaired."""
    doc = fitz.open(str(pdf_path))
    parts = []
    for i in range(doc.page_count):
        page = doc.load_page(i)
        lines = [ln for ln in page.get_text("text").splitlines() if ln.strip()]
        parts.append("\n".join(pa.strip_headers_footers(page, lines)))
    text = "\n".join(parts).replace("­", "")
    # In the budget tables an id is split mid-token across a line break, e.g.
    # "HORIZON-CL4-2027-04-DIGITAL-\nEMERGING-11:". Rejoin so the ids are matchable.
    return re.sub(r'(HORIZON-[0-9A-Za-z\-]*?-)\n([0-9A-Za-z])', r'\1\2', text)


def canonical_destinations(cfg) -> list[str]:
    """The destination names the builder can resolve a summary for, in file order.

    `_get_summary` accepts both "X" and "Destination - X", so the stored key may
    carry that prefix (CL3 does, CL4 does not). Strip it for matching; the value
    returned is what goes into the graph as the Destination name.
    """
    data = json.load(open(cfg.summaries, encoding="utf-8"))
    blocks = [v for v in data.values() if isinstance(v, dict)]
    if len(blocks) != 1:
        raise RuntimeError(f"{cfg.summaries.name}: expected one cluster block, got {len(blocks)}")
    block = blocks[0]
    names = [re.sub(r'^\s*Destination\s*[-:–—]\s*', '', k).strip() for k in block]
    if not names:
        raise RuntimeError(f"{cfg.summaries.name}: no destinations")
    return names


def real_definitions(text: str, cfg) -> list[tuple[int, str]]:
    """[(offset, call_id)] for every CURRENT-edition topic the document defines.

    A real definition is a topic-id header immediately followed by the
    Specific-conditions table. Anything else is a cross-reference in prose.
    Prior-edition ids are dropped even when they carry a full table of their own.
    """
    out, seen = [], set()
    for m in cfg.id_re.finditer(text):
        cid = m.group(1)
        if cid in seen or cid in cfg.crossref_only or not cfg.edition_re.match(cid):
            continue
        window = text[m.end(): m.end() + 700]
        if re.search(r"Specific\s+conditions", window) and re.search(
            r"Call:|Expected\s+EU\s+contribution|Type\s+of\s+Action", window
        ):
            seen.add(cid)
            out.append((m.start(), cid))
    return out


def _table_headings(text: str, body_start: int, names: list[str]):
    """[(offset, canonical_name)] for destination headings that introduce a budget table."""
    keyed = sorted(((_key(n), n) for n in names), key=lambda kn: -len(kn[0]))
    heads = []
    for m in HEADING_RE.finditer(text[:body_start]):
        raw = m.group(1)
        if TOC_LEADER.search(raw):          # table-of-contents entry, not a table heading
            continue
        hk = _key(raw)
        for nk, name in keyed:              # longest name first, so prefixes can't shadow
            if hk.startswith(nk):
                heads.append((m.start(), name))
                break
    return heads


def destination_map(cluster: str) -> dict[str, str]:
    """{call_id: destination title} for every topic the work programme defines."""
    cfg = wp_clusters.get(cluster)
    text = clean_text(cfg.pdf)
    defs = real_definitions(text, cfg)
    if not defs:
        raise RuntimeError(f"no topic definitions found in {cfg.pdf.name}")
    body_start = defs[0][0]

    names = canonical_destinations(cfg)
    heads = _table_headings(text, body_start, names)
    if not heads:
        raise RuntimeError(
            f"{cfg.pdf.name}: no destination headings found before the first topic "
            f"definition. Either the budget-table layout changed, or the names in "
            f"{cfg.summaries.name} no longer match the document."
        )
    unseen = sorted(set(names) - {n for _, n in heads})
    if unseen:
        raise RuntimeError(
            f"{cfg.summaries.name} names destinations the document's budget tables "
            f"never mention: {unseen}. Fix the summaries file before merging."
        )

    first = heads[0][0]
    mapping: dict[str, str] = {}
    for m in cfg.id_re.finditer(text[:body_start]):
        if m.start() < first:
            continue
        prior = [n for pos, n in heads if pos < m.start()]
        if prior:
            mapping.setdefault(m.group(1), prior[-1])

    for cid, title in cfg.destination_fallback.items():
        mapping.setdefault(cid, title)

    defined = [cid for _, cid in defs]
    missing = [cid for cid in defined if cid not in mapping]
    if missing:
        raise RuntimeError(
            f"{cfg.key}: these defined topics have no destination in the budget tables "
            f"and no verified fallback - the layout has changed, fix wp_clusters.py "
            f"before merging: {missing}"
        )
    stale = [cid for cid in cfg.destination_fallback if cid not in defined]
    if stale:
        raise RuntimeError(
            f"{cfg.key}: destination_fallback names topics this edition does not define "
            f"({stale}) - re-verify the fallbacks against the current document"
        )
    return {cid: mapping[cid] for cid in defined}


if __name__ == "__main__":
    import collections

    key = sys.argv[1] if len(sys.argv) > 1 else "CL4"
    cfg = wp_clusters.get(key)
    m = destination_map(key)
    print(f"{cfg.key}  {cfg.pdf.name}")
    print(f"{len(m)} topics mapped to {len(set(m.values()))} destinations\n")
    for dest, n in collections.Counter(m.values()).most_common():
        print(f"  {n:3d}  {dest[:92]}")
    if len(sys.argv) > 2 and sys.argv[2] == "-v":
        print()
        for cid in sorted(m):
            print(f"  {cid:<50} {m[cid][:56]}")
