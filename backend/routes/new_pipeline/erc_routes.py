from pathlib import Path
from .cluster_routes_factory import make_cluster_router
from .erc_builder import ERCGraphBuilder

router = make_cluster_router(
    prefix="/erc",
    tags=["ERC Graph Population"],
    source="erc",
    cluster_id="ERC",
    cluster_name="Horizon Europe – ERC",
    builder_cls=ERCGraphBuilder,
    default_grouped_path="output_files/HORIZON-ERC.json",
    default_summaries_path="output_files/destination_summaries_erc.json",
    base_dir=str(Path(__file__).resolve().parent),
)
