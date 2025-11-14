# backend/routes/new_pipleline/cl3_routes_.py
from .cluster_routes_factory import make_cluster_router
from .cl4_cluster_builder import ClusterGraphBuilderCL4
from pathlib import Path

router = make_cluster_router(
    prefix="/cluster4",
    tags=["Cluster 4 Graph Population ()"],
    source="cluster_4",
    cluster_id="CL4",
    cluster_name="Cluster 4 - Health",
    builder_cls=ClusterGraphBuilderCL4,
    default_grouped_path="output_files/cluster_CL4.grouped.json",
    default_summaries_path="output_files/destination_summaries_cl4.json",
    base_dir=str(Path(__file__).resolve().parent)
)
