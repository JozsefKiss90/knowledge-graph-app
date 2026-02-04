# backend/routes/new_pipleline/mission_cluster_builder.py
from .base_cluster_builder import BaseClusterBuilder

class MissionsGraphBuilder(BaseClusterBuilder):
    @property
    def cluster_id(self) -> str: return "MISS"
    @property
    def cluster_name(self) -> str: return "Horizon Missions"
    @property
    def source_tag(self) -> str: return "horizon_miss"
