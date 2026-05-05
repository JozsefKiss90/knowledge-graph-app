from .base_cluster_builder import BaseClusterBuilder


class WIDERAGraphBuilder(BaseClusterBuilder):
    """Graph builder for WIDERA (Widening participation & strengthening the ERA)."""

    @property
    def cluster_id(self) -> str:
        return "WIDERA"

    @property
    def cluster_name(self) -> str:
        return "Horizon Europe – WIDERA"

    @property
    def source_tag(self) -> str:
        return "widera"
