from .base_cluster_builder import BaseClusterBuilder


class EURATOMGraphBuilder(BaseClusterBuilder):
    @property
    def cluster_id(self) -> str:
        return "EURATOM"

    @property
    def cluster_name(self) -> str:
        # Must match the top-level key used in the destination_summaries_*.json file
        return "Euratom Research and Training Programme"

    @property
    def source_tag(self) -> str:
        return "euratom"
