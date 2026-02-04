from pathlib import Path
from .cluster_routes_factory import make_cluster_router
from .infra_builder import INFRAGraphBuilder

router = make_cluster_router(
    prefix="/infra",
    tags=["INFRA Graph Population"],
    source="infra",
    cluster_id="INFRA",
    cluster_name="Horizon Europe – Research Infrastructures",
    builder_cls=INFRAGraphBuilder,
    default_grouped_path="output_files/HORIZON-INFRA.json",
    default_summaries_path="output_files/destination_summaries_infra.json",
    base_dir=str(Path(__file__).resolve().parent),
)
