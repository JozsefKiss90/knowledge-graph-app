# backend/routes/new_pipleline/cl2_cluster_builder_v2.py
from .base_cluster_builder import BaseClusterBuilder

class ClusterGraphBuilderCL2(BaseClusterBuilder):
    @property
    def cluster_id(self) -> str: return "CL2"
    @property
    def cluster_name(self) -> str: return "Cluster 2 - Culture, Creativity and Inclusive Society"
    @property
    def source_tag(self) -> str: return "cluster_2"
