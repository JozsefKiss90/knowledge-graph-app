from .base_cluster_builder import BaseClusterBuilder

class MSCAGraphBuilder(BaseClusterBuilder):
    @property
    def cluster_id(self) -> str:
        return "MSCA"

    @property
    def cluster_name(self) -> str:
        return "Horizon Europe – MSCA"

    @property
    def source_tag(self) -> str:
        return "msca"
