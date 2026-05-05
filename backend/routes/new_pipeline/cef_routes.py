from pathlib import Path

from .cluster_routes_factory import make_cluster_router
from .cef_builder import CEFGraphBuilder


router = make_cluster_router(
    prefix="/cef",
    tags=["CEF Graph Population"],
    source="cef",
    cluster_id="CEF",
    cluster_name="Connecting Europe Facility",
    builder_cls=CEFGraphBuilder,
    default_grouped_path="output_files/CEF.grouped.json",
    default_summaries_path="output_files/destination_summaries_cef.json",
    base_dir=str(Path(__file__).resolve().parent),
)
