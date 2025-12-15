# backend/routes/new_pipleline/cl2_routes_.py
from .cluster_routes_factory import make_cluster_router
from .cl2_cluster_builder import ClusterGraphBuilderCL2
from pathlib import Path

router = make_cluster_router(
    prefix="/cluster2",
    tags=["Cluster 2 Graph Population ()"], 
    source="cluster_2",
    cluster_id="CL2",
    cluster_name="Cluster 2 - Culture, Creativity and Inclusive Society",
    builder_cls=ClusterGraphBuilderCL2,
    default_grouped_path="output_files/cluster_CL2.grouped.json",
    default_summaries_path="output_files/destination_summaries_cl2.json",
    base_dir=str(Path(__file__).resolve().parent)
)
