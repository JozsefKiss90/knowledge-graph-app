# backend/routes/new_pipleline/cl1_cluster_builder_v2.py
from .base_cluster_builder import BaseClusterBuilder

class ClusterGraphBuilderCL1(BaseClusterBuilder):
    @property
    def cluster_id(self) -> str: return "CL1"
    @property
    def cluster_name(self) -> str: return "Cluster 1 - Health"
    @property
    def source_tag(self) -> str: return "cluster_1"
