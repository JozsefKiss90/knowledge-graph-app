#!/usr/bin/env python3
"""CL4 topic -> Destination map, read from the work programme's own call budget tables.

Why this exists
---------------
The graph's `Destination` node comes from the *bucket* a call sits in
(`base_cluster_builder.py`: `dest.get("destination") or dest.get("destination_title")`),
NOT from the call's own `destination` field. The portal API leaves `destination` as
`_unknown_destination` for forthcoming 2027 topics, and it labels the destinations it does
resolve with portal-specific names that do not appear in the work programme at all
(e.g. "Achieving technological leadership for Europe's open strategic autonomy in raw
materials, chemicals and innovative materials (2026-27)"), which then miss every key in
`destination_summaries_cl4.json`.

The work programme itself is authoritative and complete. In the "Call - X" sections each
budget table is introduced by a `Destination: <name>` line and then lists every topic that
belongs to it. That mapping is what this module extracts.

The five destination names returned here match `destination_summaries_cl4.json` exactly, so
`BaseClusterBuilder._get_summary` resolves all of them.

Usage:
    from cl4_destinations import destination_map
    m = destination_map()            # {call_id: destination_title}
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / "_refs"))

import he_wp_parser_merged_patched_with_dates as pa  # prior-art engine (header/footer strip)

try:
    import pymupdf as fitz
except ImportError:  # older installs
    import fitz

ROOT = HERE.parents[1]
DEFAULT_PDF = ROOT / "pdf_files/2027 draft_20260824/HORIZON-CL4-2026-2027_2026-07-28 final.pdf"

# Canonical destination titles. Keys are lowercase prefixes of what the PDF prints (the PDF
# hyphenates "data-services" / "data- services" inconsistently and wraps long names), values
# are the exact titles used in destination_summaries_cl4.json.
CANONICAL = [
    ("leadership in materials",
     "Leadership in materials and production for Europe"),
    ("developing an agile",
     "Developing an agile and secure single market and infrastructure for data-services "
     "and trustworthy artificial intelligence services"),
    ("achieving open strategic autonomy",
     "Achieving open strategic autonomy in digital and emerging enabling technologies"),
    ("open strategic autonomy in developing",
     "Open Strategic Autonomy in Developing, Deploying and Using Global Space-Based "
     "Infrastructure, Services, Applications and Data"),
    ("digital and industrial technologies",
     "Digital and industrial technologies driving human-centric innovation"),
]

# A topic id header. EUSPA topics use HORIZON-YYYY-EUSPA-... rather than HORIZON-CL4-...
ID_RE = re.compile(r'(HORIZON-(?:CL4-20\d\d|20\d\d-EUSPA)-[0-9A-Za-z\-]+?)\s*:')

# Appears only as an in-prose cross-reference to a prior-year CSA, never as a real definition.
# The 700-char "Specific conditions" window otherwise catches the *next* topic's table and
# promotes it to a phantom topic. (Same class of bug as CL3's phantom 2025-01-INFRA-01.)
CROSSREF_ONLY = {"HORIZON-CL4-2025-03-HUMAN-18"}

# Two topics cannot be read from the budget tables. Both were verified by hand against the
# document; each entry says why the table scan cannot see it. If the PDF edition changes,
# re-verify rather than trusting these.
FALLBACK = {
    # The table row for this (CANCELLED) topic has an entire interleaved footnote block
    # dropped into the middle of its id: "HORIZON-CL4-2026-04-DIGITAL-" / "CSA Around 0 18"
    # / "Nonetheless, this does not preclude..." / "0.00" / "EMERGING-11:". No line-rejoin
    # rule can repair that. Verified: the nearest preceding Destination heading in the table
    # region is "Achieving open strategic autonomy...", and its 2027 sibling
    # (2027-04-DIGITAL-EMERGING-11) resolves there from the tables.
    "HORIZON-CL4-2026-04-DIGITAL-EMERGING-11":
        "Achieving open strategic autonomy in digital and emerging enabling technologies",
    # This topic sits in its own call section at the very end of the document with its own
    # budget table and NO Destination heading. The ToC lists it under "Indirectly managed
    # actions" ("4. EUSPA.1 - Applications for EGNSS and for Copernicus"), i.e. the work
    # programme deliberately places it outside the destination structure. Filed under the
    # Space destination so it is findable with the other space topics; the merge stamps a
    # provenance_note saying so.
    "HORIZON-2027-EUSPA-SPACE-51":
        "Open Strategic Autonomy in Developing, Deploying and Using Global Space-Based "
        "Infrastructure, Services, Applications and Data",
}

# Topics whose destination is an editorial choice rather than something the document states.
OUTSIDE_DESTINATION_STRUCTURE = {"HORIZON-2027-EUSPA-SPACE-51"}



def clean_text(pdf_path=DEFAULT_PDF) -> str:
    """Full document text, running headers/footers stripped, wrapped topic ids repaired.

    In the budget tables a topic id is split across a line break mid-token, e.g.
    ``HORIZON-CL4-2027-04-DIGITAL-\\nEMERGING-11:``. Rejoin those so the ids are matchable.
    """
    doc = fitz.open(str(pdf_path))
    parts = []
    for i in range(doc.page_count):
        page = doc.load_page(i)
        lines = [ln for ln in page.get_text("text").splitlines() if ln.strip()]
        parts.append("\n".join(pa.strip_headers_footers(page, lines)))
    text = "\n".join(parts).replace("­", "")
    # rejoin ids broken across a line: "...DIGITAL-\nEMERGING-11:" -> "...DIGITAL-EMERGING-11:"
    text = re.sub(r'(HORIZON-[0-9A-Za-z\-]*?-)\n([0-9A-Za-z])', r'\1\2', text)
    return text


def _canonical(raw: str):
    s = re.sub(r"\s+", " ", raw).strip().lower()
    for prefix, title in CANONICAL:
        if s.startswith(prefix):
            return title
    return None


def real_definitions(text: str):
    """[(offset, call_id)] for every topic the document actually *defines*, in document order.

    A real definition is a topic-id header immediately followed by the Specific-conditions
    table. Anything else is a cross-reference in prose.
    """
    out, seen = [], set()
    for m in ID_RE.finditer(text):
        cid = m.group(1)
        if cid in CROSSREF_ONLY or cid in seen:
            continue
        window = text[m.end(): m.end() + 700]
        if re.search(r"Specific\s+conditions", window) and re.search(
            r"Call:|Expected\s+EU\s+contribution|Type\s+of\s+Action", window
        ):
            seen.add(cid)
            out.append((m.start(), cid))
    return out


def destination_map(pdf_path=DEFAULT_PDF):
    """{call_id: canonical destination title} for every topic defined in the work programme."""
    text = clean_text(pdf_path)
    defs = real_definitions(text)
    if not defs:
        raise RuntimeError("no topic definitions found in %s" % pdf_path)
    body_start = defs[0][0]

    # `Destination:` lines that introduce a budget table. Everything before the tables is the
    # table of contents (dot leaders, page numbers) - skip those by rejecting dot leaders.
    headings = []
    for m in re.finditer(r"Destination\s*:\s*((?:[^\n]+\n){1,4})", text[:body_start]):
        title = _canonical(m.group(1))
        if title and "...." not in m.group(1):
            headings.append((m.start(), title))
    if not headings:
        raise RuntimeError("no Destination headings found in the call budget tables")
    table_start = headings[0][0]

    mapping = {}
    for m in ID_RE.finditer(text[:body_start]):
        if m.start() < table_start:
            continue
        prior = [t for pos, t in headings if pos < m.start()]
        if prior:
            mapping.setdefault(m.group(1), prior[-1])

    defined = [cid for _, cid in defs]
    for cid, title in FALLBACK.items():
        mapping.setdefault(cid, title)
    missing = [cid for cid in defined if cid not in mapping]
    if missing:
        raise RuntimeError(
            "these defined topics have no destination in the budget tables and no verified "
            "FALLBACK entry - the document layout has changed, fix this module before "
            "merging: %s" % missing
        )
    stale = [cid for cid in FALLBACK if cid not in defined]
    if stale:
        raise RuntimeError(
            "FALLBACK names topics this PDF does not define (%s) - re-verify the fallbacks "
            "against the current edition" % stale
        )
    return {cid: mapping[cid] for cid in defined}


if __name__ == "__main__":
    import collections

    pdf = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF
    m = destination_map(pdf)
    print("%s\n%d topics mapped to %d destinations\n" % (Path(pdf).name, len(m), len(set(m.values()))))
    for dest, n in collections.Counter(m.values()).most_common():
        print("  %3d  %s" % (n, dest))
    print()
    for cid in sorted(m):
        print("  %-52s %s" % (cid, m[cid][:60]))
