from pathlib import Path

from .cluster_routes_factory import make_cluster_router
from .dep_builder import DEPGraphBuilder


router = make_cluster_router(
    prefix="/dep",
    tags=["DEP Graph Population"],
    source="dep",
    cluster_id="DEP",
    cluster_name="Digital Europe Programme",
    builder_cls=DEPGraphBuilder,
    default_grouped_path="output_files/DEP.grouped.json",
    default_summaries_path="output_files/destination_summaries_dep.json",
    base_dir=str(Path(__file__).resolve().parent),
)
