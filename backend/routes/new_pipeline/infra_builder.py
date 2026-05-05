from .base_cluster_builder import BaseClusterBuilder

class INFRAGraphBuilder(BaseClusterBuilder):
    @property
    def cluster_id(self) -> str:
        return "INFRA" 

    @property
    def cluster_name(self) -> str:
        return "Horizon Europe – Research Infrastructures"

    @property
    def source_tag(self) -> str:
        return "infra"
