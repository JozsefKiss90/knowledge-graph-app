from .base_cluster_builder import BaseClusterBuilder

class ERCGraphBuilder(BaseClusterBuilder):
    @property
    def cluster_id(self) -> str:
        return "ERC"

    @property
    def cluster_name(self) -> str:
        return "Horizon Europe – ERC"

    @property
    def source_tag(self) -> str:
        return "erc"
