# backend/routes/new_pipleline/cl1_routes_.py
from .cluster_routes_factory import make_cluster_router
from .cl1_cluster_builder import ClusterGraphBuilderCL1
from pathlib import Path

router = make_cluster_router(
    prefix="/cluster1",
    tags=["Cluster 1 Graph Population ()"],
    source="cluster_1",
    cluster_id="CL1",
    cluster_name="Cluster 1 - Health",
    builder_cls=ClusterGraphBuilderCL1,
    default_grouped_path="output_files/cluster_CL1.grouped.json",
    default_summaries_path="output_files/destination_summaries_cl1.json",
    base_dir=str(Path(__file__).resolve().parent)
)
