from .base_cluster_builder import BaseClusterBuilder


class DEPGraphBuilder(BaseClusterBuilder):
    @property
    def cluster_id(self) -> str:
        return "DEP"

    @property
    def cluster_name(self) -> str:
        # Must match the top-level key used in destination_summaries_dep.json
        return "Digital Europe Programme"

    @property
    def source_tag(self) -> str:
        return "dep"
