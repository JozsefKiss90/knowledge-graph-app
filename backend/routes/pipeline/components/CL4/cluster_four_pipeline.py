from base_pipeline import DocumentPipeline
import os
import json
from components.extract_table_blocks import extract_call_blocks
from components.parse_calls import parse_enhanced_call_blocks
from components.merge_outcomes_and_scopes import *  # will execute on import
from backend.routes.pipeline.components.CL4.parse_cl4_destinations import *  # will execute on import

class ClusterFourPipeline(DocumentPipeline):
    def __init__(self, document_path: str):
        super().__init__(document_path)

        self.call_blocks_path = "routes/pipeline/output_files/enhanced_raw_call_blocks.json"
        self.parsed_calls_path = "routes/pipeline/output_files/parsed_call_tables.json"
        self.nested_output_path = "routes/pipeline/output_files/nested_parsed_call_tables.json"

    def extract_call_blocks(self, start_page: int = 26, end_page: int = 292):
        print("\n🧩 Step 1: Extracting call blocks from PDF...")
        extract_call_blocks(
            pdf_path=self.document_path,
            output_path=self.call_blocks_path,
            start_page=start_page,
            end_page=end_page
        )

    def parse_calls(self):
        print("\n🧩 Step 2: Parsing structured data from call blocks...")
        parse_enhanced_call_blocks(
            input_json=self.call_blocks_path,
            output_json=self.parsed_calls_path
        )

    def parse_destinations_and_themes(self):
        print("\n🧩 Step 3: Mapping calls to destinations and themes...")
        # creates nested_parsed_call_tables.json via side-effect
        pass  # already executed on import

    def run_all(self):
        self.extract_call_blocks()
        self.parse_calls()
        self.parse_destinations_and_themes()
        print("\n✅ Cluster Four pipeline completed.")
