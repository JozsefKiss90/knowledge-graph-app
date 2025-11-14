from .base_cluster_builder import BaseClusterBuilder

class ClusterGraphBuilderCL5(BaseClusterBuilder):
    @property
    def cluster_id(self) -> str: return "CL5"
    @property
    def cluster_name(self) -> str: return "Cluster 5 - Climate, Energy and Mobility"
    @property
    def source_tag(self) -> str: return "cluster_5"
