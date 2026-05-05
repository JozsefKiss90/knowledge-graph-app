from .base_cluster_builder import BaseClusterBuilder

class EIEGraphBuilder(BaseClusterBuilder):
    @property
    def cluster_id(self) -> str:
        return "EIE"

    @property
    def cluster_name(self) -> str:
        return "Horizon Europe – EIE"

    @property
    def source_tag(self) -> str:
        return "eie"
