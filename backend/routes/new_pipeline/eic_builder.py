from .base_cluster_builder import BaseClusterBuilder

class EICGraphBuilder(BaseClusterBuilder):
    @property
    def cluster_id(self) -> str:
        return "EIC"

    @property
    def cluster_name(self) -> str:
        return "Horizon Europe – EIC"

    @property
    def source_tag(self) -> str:
        return "eic"
