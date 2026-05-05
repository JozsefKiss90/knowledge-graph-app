from pathlib import Path

from .cluster_routes_factory import make_cluster_router
from .crea_builder import CREAGraphBuilder


router = make_cluster_router(
    prefix="/crea",
    tags=["CREA Graph Population"],
    source="crea",
    cluster_id="CREA",
    cluster_name="Creative Europe Programme",
    builder_cls=CREAGraphBuilder,
    default_grouped_path="output_files/CREA.grouped.json",
    default_summaries_path="output_files/destination_summaries_crea.json",
    base_dir=str(Path(__file__).resolve().parent),
)
