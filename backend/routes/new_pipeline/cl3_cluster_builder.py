from .base_cluster_builder import BaseClusterBuilder

class ClusterGraphBuilderCL3(BaseClusterBuilder):
    @property
    def cluster_id(self) -> str: return "CL3"
    @property
    def cluster_name(self) -> str: return "Cluster 3 - Civil Security for Society"
    @property
    def source_tag(self) -> str: return "cluster_3"
