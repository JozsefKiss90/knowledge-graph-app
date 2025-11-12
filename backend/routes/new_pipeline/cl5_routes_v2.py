# backend/routes/new_pipleline/cl5_routes_v2.py
from .cluster_routes_factory import make_cluster_router
from .cl5_cluster_builder_v2 import ClusterGraphBuilderCL5v2
from pathlib import Path

router = make_cluster_router(
    prefix="/cluster5-v2",
    tags=["Cluster 5 Graph Population (v2)"],
    source="cluster_5",
    cluster_id="CL5",
    cluster_name="Cluster 5 - Climate, Energy and Mobility",
    builder_cls=ClusterGraphBuilderCL5v2,
    default_grouped_path="output_files/cluster_CL5.grouped.json",
    default_summaries_path="output_files/destination_summaries_cl5.json",
    base_dir=str(Path(__file__).resolve().parent)  # resolves relative defaults next to this file
)
