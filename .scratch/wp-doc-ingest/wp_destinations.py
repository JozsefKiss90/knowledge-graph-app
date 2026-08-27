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

# "Destination: X" (CL4), "Destination - X" (CL3/CL1), "Destination X" (CL2 - no
# separator at all). The separator is therefore optional; the guards in
# _table_headings are what keep the looser pattern honest.
HEADING_RE = re.compile(r'Destination\s*[-:–—]?\s*((?:[^\n]+\n){1,4})')
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


def _candidate_headings(text: str, body_start: int, names: list[str]):
    """Every place in the pre-body region that reads as a destination heading.

    Three layouts are in use across the clusters and all three are accepted:
      CL4   `Destination: <name>`
      CL3   `Destination - <name>`
      CL5   the bare `<name>` on its own line, under "Proposals are invited
            against the following Destinations and topic(s):"
    Names wrap across lines, so each candidate line is joined with the next few
    before matching, and matching is on letters and digits only.
    """
    keyed = sorted(((_key(n), n) for n in names), key=lambda kn: -len(kn[0]))
    region = text[:body_start]
    heads = []

    for m in HEADING_RE.finditer(region):
        hk = _key(m.group(1))
        for nk, name in keyed:              # longest name first, so prefixes can't shadow
            if hk.startswith(nk):
                heads.append((m.start(), name))
                break

    lines, pos = [], 0
    for ln in region.split("\n"):
        lines.append((pos, ln))
        pos += len(ln) + 1
    for i, (p, _) in enumerate(lines):
        window = _key(" ".join(l for _, l in lines[i:i + 4]))
        for nk, name in keyed:
            if window.startswith(nk):
                heads.append((p, name))
                break

    heads.sort()
    deduped = []
    for p, name in heads:                   # the same heading can match both ways
        if deduped and deduped[-1][1] == name and p - deduped[-1][0] < 200:
            continue
        deduped.append((p, name))
    return deduped


def _table_headings(text: str, body_start: int, names: list[str], id_re):
    """Keep only the candidates that actually introduce a budget table.

    Two things must be excluded, and a positional cut-off is not enough because
    the layouts differ:
      * the table of contents - it repeats every heading, followed by dot leaders;
      * the destination narrative sections and the strategic-plan mapping table -
        real headings, but no topic rows under them.
    So: reject a candidate whose immediate neighbourhood carries ToC dot leaders,
    and require a topic id to appear soon after it.
    """
    out = []
    for p, name in _candidate_headings(text, body_start, names):
        if TOC_LEADER.search(text[p: p + 400]):
            continue
        if not id_re.search(text[p: p + 1500]):
            continue
        out.append((p, name))
    return out


def destination_map(cluster: str) -> dict[str, str]:
    """{call_id: destination title} for every topic the work programme defines."""
    cfg = wp_clusters.get(cluster)
    text = clean_text(cfg.pdf)
    defs = real_definitions(text, cfg)
    if not defs:
        raise RuntimeError(f"no topic definitions found in {cfg.pdf.name}")
    body_start = defs[0][0]

    names = canonical_destinations(cfg)
    heads = _table_headings(text, body_start, names, cfg.id_re)
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

    # A topic can be defined in the body yet missing from the budget tables - CL6's
    # `2027-01-CIRCBIO-01-two-stage` is introduced under a sub-heading ("Enabling a
    # circular economy transition") and appears in the tables only via the table of
    # contents. Where the cluster encodes the destination in the topic id, place it
    # with the rule LEARNED from the topics the tables did map, so this stays
    # evidence rather than a guess.
    still = [cid for cid in defined if cid not in mapping]
    if still and cfg.id_destination_re:
        rule = id_rule_map(cluster, {c: mapping[c] for c in defined if c in mapping})
        for cid in still:
            m = cfg.id_destination_re.search(cid)
            if m and m.group(1) in rule:
                mapping[cid] = rule[m.group(1)]
                _log_id_rule_placement(cfg.key, cid, m.group(1), rule[m.group(1)])

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


def _log_id_rule_placement(key, cid, token, dest):
    print(f"  [{key}] {cid} is not in the budget tables; placed by its id token "
          f"{token!r} -> {dest[:60]!r}", file=sys.stderr)


def id_rule_map(cluster: str, documented: dict) -> dict:
    """{id key -> destination}, learned from the topics the document DOES define.

    Only for clusters whose topic ids encode the destination (see
    `id_destination_pattern`). Refuses an ambiguous mapping rather than guessing,
    so this can be trusted to place calls the document does not define.
    """
    cfg = wp_clusters.get(cluster)
    rx = cfg.id_destination_re
    if not rx:
        return {}
    seen: dict[str, set] = {}
    for cid, dest in documented.items():
        m = rx.search(cid)
        if m:
            seen.setdefault(m.group(1), set()).add(dest)
    bad = {k: sorted(v) for k, v in seen.items() if len(v) > 1}
    if bad:
        raise RuntimeError(
            f"{cfg.key}: id_destination_pattern {cfg.id_destination_pattern!r} is "
            f"ambiguous - these keys map to more than one destination: {bad}. "
            f"Remove the pattern or fix it before merging."
        )
    return {k: next(iter(v)) for k, v in seen.items()}


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
