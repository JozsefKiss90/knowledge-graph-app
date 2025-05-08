#test_runner.py
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))  
# run_pipeline.py
from horizon_pipeline import HorizonEuropePipeline

pipeline = HorizonEuropePipeline("data/HE_2025.pdf")
pipeline.chunk()
pipeline.extract_entities()
pipeline.summarize()
pipeline.build_graph()