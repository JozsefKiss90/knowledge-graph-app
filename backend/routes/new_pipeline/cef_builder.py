from .base_cluster_builder import BaseClusterBuilder


class CEFGraphBuilder(BaseClusterBuilder):
    @property
    def cluster_id(self) -> str:
        return "CEF"

    @property
    def cluster_name(self) -> str:
        # Must match the top-level key used in the destination_summaries_*.json file
        return "Connecting Europe Facility"

    @property
    def source_tag(self) -> str:
        return "cef"
