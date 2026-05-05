from pathlib import Path

from .cluster_routes_factory import make_cluster_router
from .euratom_builder import EURATOMGraphBuilder


router = make_cluster_router(
    prefix="/euratom",
    tags=["EURATOM Graph Population"],
    source="euratom",
    cluster_id="EURATOM",
    cluster_name="Euratom Research and Training Programme",
    builder_cls=EURATOMGraphBuilder,
    default_grouped_path="output_files/EURATOM.grouped.json",
    default_summaries_path="output_files/destination_summaries_euratom.json",
    base_dir=str(Path(__file__).resolve().parent),
)
