from pathlib import Path
from .cluster_routes_factory import make_cluster_router
from .eic_builder import EICGraphBuilder

router = make_cluster_router(
    prefix="/eic",
    tags=["EIC Graph Population"],
    source="eic",
    cluster_id="EIC",
    cluster_name="Horizon Europe – EIC",
    builder_cls=EICGraphBuilder,
    default_grouped_path="output_files/HORIZON-EIC.json",
    default_summaries_path="output_files/destination_summaries_eic.json",
    base_dir=str(Path(__file__).resolve().parent),
)
