from pathlib import Path
from .cluster_routes_factory import make_cluster_router
from .eie_builder import EIEGraphBuilder

router = make_cluster_router(
    prefix="/eie",
    tags=["EIE Graph Population"],
    source="eie",
    cluster_id="EIE",
    cluster_name="Horizon Europe – EIE",
    builder_cls=EIEGraphBuilder,
    default_grouped_path="output_files/HORIZON-EIE.json",
    default_summaries_path="output_files/destination_summaries_eie.json",
    base_dir=str(Path(__file__).resolve().parent),
)
