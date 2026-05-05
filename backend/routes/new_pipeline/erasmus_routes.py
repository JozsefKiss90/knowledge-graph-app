from pathlib import Path

from .cluster_routes_factory import make_cluster_router
from .erasmus_builder import ErasmusGraphBuilder


router = make_cluster_router(
    prefix="/erasmus",
    tags=["Erasmus+ Graph Population"],
    source="erasmus",
    cluster_id="ERASMUS",
    cluster_name="Erasmus+",
    builder_cls=ErasmusGraphBuilder,
    default_grouped_path="output_files/ERASMUS.grouped.json",
    default_summaries_path="output_files/destination_summaries_erasmus.json",
    base_dir=str(Path(__file__).resolve().parent),
)
