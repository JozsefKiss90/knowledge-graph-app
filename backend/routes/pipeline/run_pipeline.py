# run_pipeline.py

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))

from cluster_four_pipeline import ClusterFourPipeline

if __name__ == "__main__":
    pdf_path = "pdf_files/HE_CL4_2025.pdf"
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF not found at {pdf_path}")
    
    pipeline = ClusterFourPipeline(pdf_path)
    pipeline.run_all()
