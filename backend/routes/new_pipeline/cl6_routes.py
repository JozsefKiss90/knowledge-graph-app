# backend/routes/new_pipleline/cl5_routes_.py
from .cluster_routes_factory import make_cluster_router
from .cl6_cluster_builder import ClusterGraphBuilderCL6
from pathlib import Path

router = make_cluster_router(
    prefix="/cluster6",
    tags=["Cluster 6 Graph Population ()"],
    source="cluster_6",
    cluster_id="CL6",
    cluster_name="Cluster 6 - Food, Bioeconomy, Natural Resources, Agriculture and Environment",
    builder_cls=ClusterGraphBuilderCL6,
    default_grouped_path="output_files/cluster_CL6.grouped.json",
    default_summaries_path="output_files/destination_summaries_cl6.json",
    base_dir=str(Path(__file__).resolve().parent)  # resolves relative defaults next to this file
)
