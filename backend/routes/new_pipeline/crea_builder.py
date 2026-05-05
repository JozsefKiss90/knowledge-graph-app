from .base_cluster_builder import BaseClusterBuilder


class CREAGraphBuilder(BaseClusterBuilder):
    @property
    def cluster_id(self) -> str:
        return "CREA"

    @property
    def cluster_name(self) -> str:
        # Must match the top-level key used in the destination_summaries_*.json file
        return "Creative Europe Programme"

    @property
    def source_tag(self) -> str:
        return "crea"
