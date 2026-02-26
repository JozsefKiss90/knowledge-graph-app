# backend/routes/new_pipleline/cl3_routes_.py
from .cluster_routes_factory import make_cluster_router
from .cl3_cluster_builder import ClusterGraphBuilderCL3
from pathlib import Path

router = make_cluster_router(
    prefix="/cluster3",
    tags=["Cluster 3 Graph Population ()"],
    source="cluster_3",
    cluster_id="CL3",
    cluster_name="Cluster 3 - Civil Security for Society",
    builder_cls=ClusterGraphBuilderCL3,
    default_grouped_path="output_files/cluster_CL3.grouped.json",
    default_summaries_path="output_files/destination_summaries_cl3.json",
    base_dir=str(Path(__file__).resolve().parent)
)
