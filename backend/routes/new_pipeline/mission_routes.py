# backend/routes/new_pipleline/mission_routes.py
from .cluster_routes_factory import make_cluster_router
from .missions_builder import MissionsGraphBuilder
from pathlib import Path

router = make_cluster_router(
    prefix="/missions",
    tags=["Horizon Missions Graph Population"],
    source="horizon_miss",
    cluster_id="MISS",
    cluster_name="Horizon Missions",
    builder_cls=MissionsGraphBuilder,
    default_grouped_path="output_files/HORIZON-MISS.json",
    default_summaries_path="output_files/destination_summaries_miss.json",
    base_dir=str(Path(__file__).resolve().parent),
)
