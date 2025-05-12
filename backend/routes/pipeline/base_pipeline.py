from abc import ABC, abstractmethod

class DocumentPipeline(ABC):
    def __init__(self, document_path: str):
        self.document_path = document_path

    @abstractmethod
    def chunk(self): pass

    @abstractmethod
    def extract_entities(self): pass

    @abstractmethod
    def postprocess_entities(self): pass

    @abstractmethod
    def match_contexts(self): pass

    @abstractmethod
    def summarize_nodes(self): pass

    @abstractmethod
    def clean_summaries(self): pass

    @abstractmethod
    def build_topics_and_relationships(self): pass
