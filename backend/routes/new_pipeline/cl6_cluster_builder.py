# backend/routes/new_pipleline/cl6_cluster_builder.py
from .base_cluster_builder import BaseClusterBuilder

class ClusterGraphBuilderCL6(BaseClusterBuilder):
    @property
    def cluster_id(self) -> str: return "CL6"
    @property
    def cluster_name(self) -> str: return "Cluster 6 - Food, Bioeconomy, Natural Resources, Agriculture and Environment"
    @property
    def source_tag(self) -> str: return "cluster_6"
