from pathlib import Path
from .cluster_routes_factory import make_cluster_router
from .widera_builder import WIDERAGraphBuilder

router = make_cluster_router(
    prefix="/widera",
    tags=["WIDERA Graph Population"],
    source="widera",
    cluster_id="WIDERA",
    cluster_name="Horizon Europe – WIDERA",
    builder_cls=WIDERAGraphBuilder,
    default_grouped_path="output_files/HORIZON-WIDERA.json",
    default_summaries_path="output_files/destination_summaries_widera.json",
    base_dir=str(Path(__file__).resolve().parent),
)
