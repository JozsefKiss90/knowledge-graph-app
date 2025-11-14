# backend/routes/new_pipleline/cl4_cluster_builder_v2.py
from .base_cluster_builder import BaseClusterBuilder

class ClusterGraphBuilderCL4(BaseClusterBuilder):
    @property
    def cluster_id(self) -> str: return "CL4"
    @property
    def cluster_name(self) -> str: return "Cluster 4 - Digital, Industry and Space"
    @property
    def source_tag(self) -> str: return "cluster_4"
