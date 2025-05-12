#test_runner.py
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))  
# run_pipeline.py
from cluster_four_pipeline import ClusterFourPipeline

if __name__ == "__main__":
    pipeline = ClusterFourPipeline("/pdf_files/HE_CL4_2025.pdf")
    #pipeline.chunk()
    pipeline.extract_entities()
    
    '''pipeline.extract_entities()
    pipeline.postprocess_entities()
    pipeline.match_contexts()
    pipeline.summarize_nodes()
    pipeline.clean_summaries()
    pipeline.build_topics_and_relationships()'''
