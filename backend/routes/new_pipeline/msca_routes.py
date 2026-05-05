from pathlib import Path
from .cluster_routes_factory import make_cluster_router
from .msca_builder import MSCAGraphBuilder

router = make_cluster_router(
    prefix="/msca",
    tags=["MSCA Graph Population"],
    source="msca",
    cluster_id="MSCA",
    cluster_name="Horizon Europe – MSCA",
    builder_cls=MSCAGraphBuilder,
    default_grouped_path="output_files/HORIZON-MSCA.json",
    default_summaries_path="output_files/destination_summaries_msca.json",
    base_dir=str(Path(__file__).resolve().parent),
)
