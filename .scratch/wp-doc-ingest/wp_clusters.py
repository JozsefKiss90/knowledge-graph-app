#!/usr/bin/env python3
"""Per-cluster configuration for the work-programme document ingest (ADR-0008).

One entry per cluster. Everything the generalised scripts need to know that is
NOT derivable from the files themselves lives here, and nothing else does.

Deliberately NOT configured here, because it is read from the data:
  * the canonical destination names  -> destination_summaries_<c>.json
  * the topic set                    -> the work-programme PDF
  * the API state                    -> the pristine grouped snapshot
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
PDF_DIR = ROOT / "pdf_files/2027 draft_20260824"
OUT_DIR = ROOT / "backend/routes/new_pipeline/output_files"


@dataclass(frozen=True)
class ClusterConfig:
    key: str                       # "CL3"
    cluster_id: str                # Cluster node id, as the builder writes it
    cluster_name: str              # must match the top-level key in the summaries file
    source_tag: str                # Call/Destination `source` property
    populate_path: str             # e.g. "/cluster3/populate"
    pdf: Path
    base: Path                     # pristine portal snapshot (no document content)
    grouped: Path                  # the file the backend ingests
    summaries: Path
    wp_edition: str

    # A topic-id header in this cluster's documents.
    id_pattern: str
    # Which of those belong to the CURRENT edition (drops prior-year cross-refs).
    edition_pattern: str

    # Ids that appear only as in-prose cross-references but still pass the
    # "followed by Specific conditions" test, because the window catches the NEXT
    # topic's table. Verified per cluster; see the report for each.
    crossref_only: frozenset = frozenset()

    # Topic -> destination that the budget tables cannot yield. Verify by hand and
    # say why in a comment before adding an entry.
    destination_fallback: dict = field(default_factory=dict)

    # Topics filed under a destination as an editorial choice rather than because
    # the document says so. Gets a provenance_note.
    outside_destination_structure: frozenset = frozenset()

    # Portal id -> current work-programme id, for topics the edition renamed.
    renames: dict = field(default_factory=dict)

    @property
    def id_re(self):
        return re.compile(self.id_pattern)

    @property
    def edition_re(self):
        return re.compile(self.edition_pattern)

    @property
    def merged_out(self) -> Path:
        return HERE / f"cluster_{self.key}.merged.v2.json"


_SPACE_DEST = ("Open Strategic Autonomy in Developing, Deploying and Using Global Space-Based "
               "Infrastructure, Services, Applications and Data")

CLUSTERS = {
    "CL3": ClusterConfig(
        key="CL3", cluster_id="CL3", source_tag="cluster_3",
        cluster_name="Civil Security for Society (Cluster 3)",
        populate_path="/cluster3/populate",
        pdf=PDF_DIR / "HORIZON-CL3-2026-2027_07_28_2026.pdf",
        base=HERE / "cluster_CL3.grouped.PREPILOT.bak",
        grouped=OUT_DIR / "cluster_CL3.grouped.json",
        summaries=OUT_DIR / "destination_summaries_cl3.json",
        wp_edition="HORIZON 2026-2027 / Part 6 - Civil Security for Society (2026-07-28)",
        id_pattern=r'(HORIZON-CL3-20\d\d-[0-9A-Za-z\-]+?)\s*:',
        edition_pattern=r'HORIZON-CL3-20(?:26|27)-',
        # Prior-year topics that the 2026-27 document reproduces in full (they carry a
        # Specific-conditions table of their own) but that are NOT part of this edition.
        # The edition filter already drops them; listed for the record.
        crossref_only=frozenset({
            "HORIZON-CL3-2025-01-INFRA-01",
            "HORIZON-CL3-2025-01-INFRA-02",
            "HORIZON-CL3-2024-DRS-01-04",
        }),
    ),
    "CL4": ClusterConfig(
        key="CL4", cluster_id="CL4", source_tag="cluster_4",
        cluster_name="Digital, Industry and Space (Cluster 4)",
        populate_path="/cluster4/populate",
        pdf=PDF_DIR / "HORIZON-CL4-2026-2027_2026-07-28 final.pdf",
        base=HERE / "cluster_CL4.grouped.PREPILOT.bak",
        grouped=OUT_DIR / "cluster_CL4.grouped.json",
        summaries=OUT_DIR / "destination_summaries_cl4.json",
        wp_edition="HORIZON 2026-2027 / Part 7 - Digital, Industry and Space (2026-07-28 final)",
        # EUSPA topics use HORIZON-YYYY-EUSPA-... rather than HORIZON-CL4-...
        id_pattern=r'(HORIZON-(?:CL4-20\d\d|20\d\d-EUSPA)-[0-9A-Za-z\-]+?)\s*:',
        edition_pattern=r'HORIZON-(?:CL4-20(?:26|27)|20(?:26|27)-EUSPA)-',
        # Only ever an in-prose reference to a prior-year CSA ("...and the CSA
        # HORIZON-CL4-2025-03-HUMAN-18: GenAI4EU central Hub"); the 700-char window
        # catches the NEXT topic's Specific-conditions table.
        crossref_only=frozenset({"HORIZON-CL4-2025-03-HUMAN-18"}),
        destination_fallback={
            # Its table row has a footnote block dropped inside the id
            # ("HORIZON-CL4-2026-04-DIGITAL-" / "CSA Around 0 18" / ... / "EMERGING-11:"),
            # so no line-rejoin rule can repair it. Verified: the enclosing budget-table
            # heading is "Achieving open strategic autonomy...".
            "HORIZON-CL4-2026-04-DIGITAL-EMERGING-11":
                "Achieving open strategic autonomy in digital and emerging enabling technologies",
            # Own call section at the end of the document, with a budget table but NO
            # destination heading: the ToC lists it under "Indirectly managed actions",
            # i.e. the work programme puts it outside the destination structure.
            "HORIZON-2027-EUSPA-SPACE-51": _SPACE_DEST,
        },
        outside_destination_structure=frozenset({"HORIZON-2027-EUSPA-SPACE-51"}),
        renames={
            "HORIZON-CL4-2027-SPACE-03-83": "HORIZON-CL4-2027-SPACE-07-83",
            "HORIZON-CL4-2027-SPACE-03-84": "HORIZON-CL4-2027-SPACE-07-84",
        },
    ),
}


def get(key: str) -> ClusterConfig:
    k = (key or "").strip().upper()
    if k not in CLUSTERS:
        raise SystemExit(f"unknown cluster {key!r}; known: {', '.join(sorted(CLUSTERS))}")
    return CLUSTERS[k]
