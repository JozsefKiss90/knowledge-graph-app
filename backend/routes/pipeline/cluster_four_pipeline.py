from base_pipeline import DocumentPipeline
from components.chunker import PDFChunker
import os
import json
from components.entity_extractor import EntityExtractor

class ClusterFourPipeline(DocumentPipeline):
    def __init__(self, document_path: str):
        super().__init__(document_path)

    def chunk(self):
        chunks_path = "routes/pipeline/output_files/chunks.json"
        if os.path.exists(chunks_path):
            print("Chunks already exist, loading from file...")
            with open(chunks_path, "r", encoding="utf-8") as f:
                self.chunks = json.load(f)
        else:
            chunker = PDFChunker(
                document_path=self.document_path,
                output_dir="routes/pipeline/output_files"
            )
            self.chunks = chunker.run()
            print(f"Chunked {len(self.chunks)} chunks successfully.")


    def extract_entities(self):
        extractor = EntityExtractor(
            chunks_path="routes/pipeline/output_files/chunks.json",
            output_path="routes/pipeline/output_files/full_extracted_entities.json"
        )
        self.extracted_entities = extractor.run()


    def postprocess_entities(self):
        # To be implemented: EntityPostprocessor
        pass

    def match_contexts(self):
        # To be implemented: ContextMatcher
        pass

    def summarize_nodes(self):
        # To be implemented: NodeSummarizer
        pass

    def clean_summaries(self):
        # To be implemented: SummaryCleaner
        pass

    def build_topics_and_relationships(self):
        # To be implemented: TopicModeler
        pass
