from .base_cluster_builder import BaseClusterBuilder


class ErasmusGraphBuilder(BaseClusterBuilder):
    @property
    def cluster_id(self) -> str:
        return "ERASMUS"

    @property
    def cluster_name(self) -> str:
        # Must match the top-level key used in destination_summaries_erasmus.json
        return "Erasmus+"

    @property
    def source_tag(self) -> str:
        return "erasmus"
