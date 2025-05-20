from abc import ABC, abstractmethod
import os

class DocumentPipeline(ABC):
    def __init__(self, document_path: str):
        self.document_path = document_path

    @abstractmethod
    def extract_call_blocks(self):
        pass

    @abstractmethod
    def parse_calls(self):
        pass

    @abstractmethod
    def parse_destinations_and_themes(self):
        pass

    def run_all(self):
        self.extract_call_blocks()
        self.parse_calls()
        self.parse_destinations_and_themes()
        print("\n✅ Pipeline execution completed.")
