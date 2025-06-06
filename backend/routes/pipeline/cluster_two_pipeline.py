# cluster_two_pipeline.py
from base_pipeline import DocumentPipeline
from components.CL2.parse_cl2_destinations import *

class ClusterTwoPipeline(DocumentPipeline):
    def __init__(self, document_path: str):
        super().__init__(document_path)
        self.call_blocks_path = "routes/pipeline/output_files/enhanced_raw_cl2_call_blocks.json"
        self.parsed_calls_path = "routes/pipeline/output_files/parsed_cl2_call_tables.json"
        self.nested_output_path = "routes/pipeline/output_files/nested_parsed_cl2_call_tables.json"

    def extract_call_blocks(self):
        from components.CL2.extract_cl2_table_blocks import parse_cleaned_blocks
        parse_cleaned_blocks(self.document_path, self.call_blocks_path)

    def parse_calls(self):
        from components.CL2.parse_cl2_calls import parse_enhanced_call_blocks
        parse_enhanced_call_blocks(self.call_blocks_path, self.parsed_calls_path)

    def enrich_with_expected_outcomes_and_scopes(self):
        pass  # handled within extraction already

    def parse_destinations_and_themes(self):
        print("\n🧩 Step 3: Mapping calls to destinations and themes...") 
        # creates nested_parsed_call_tables.json via side-effect
        pass  # already executed on import
 
    def run_all(self):
        self.extract_call_blocks()
        self.parse_calls()
        self.enrich_with_expected_outcomes_and_scopes()
        self.parse_destinations_and_themes()
        print("\n✅ Cluster Two pipeline completed.")
