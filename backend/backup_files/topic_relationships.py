import json
from typing import List, Dict, Tuple
from itertools import combinations
from sklearn.feature_extraction.text import CountVectorizer
from sentence_transformers import SentenceTransformer
from umap import UMAP
from hdbscan import HDBSCAN
from bertopic import BERTopic
import numpy as np


def generate_canonical_topic_links(
    input_json_path: str,
    relationships_output_path: str = "canonical_topic_relationships.json",
    topic_nodes_output_path: str = "canonical_topic_nodes.json",
    similarity_threshold: float = 0.35,
    top_n_keywords: int = 5
) -> Tuple[List[Dict], List[Dict]]:
    """
    Generate a structured topic-based knowledge graph using BERTopic with fine-tuned clustering.

    Parameters:
        input_json_path: Path to the cleaned node JSON file.
        relationships_output_path: Where to save the node-node and node-topic relationships.
        topic_nodes_output_path: Where to save the canonical topic nodes.
        similarity_threshold: Cosine similarity threshold to link nodes within the same topic.
        top_n_keywords: How many keywords to use in each topic node.

    Returns:
        (relationships, topic_nodes)
    """

    # Load input
    with open(input_json_path, "r", encoding="utf-8") as f:
        nodes = json.load(f)

    texts = [node["summary"] for node in nodes]
    node_ids = [node["id"] for node in nodes]

    # Embeddings
    embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = embedding_model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)

    # BERTopic model setup
    umap_model = UMAP(n_neighbors=15, n_components=5, min_dist=0.0, metric="cosine")
    hdbscan_model = HDBSCAN(min_cluster_size=2, metric="euclidean", prediction_data=True)
    vectorizer_model = CountVectorizer(ngram_range=(1, 2), stop_words="english")

    topic_model = BERTopic(
        embedding_model=embedding_model,
        umap_model=umap_model,
        hdbscan_model=hdbscan_model,
        vectorizer_model=vectorizer_model,
        calculate_probabilities=True,
        verbose=True
    )

    topics, probs = topic_model.fit_transform(texts, embeddings)

    # Assign topic IDs to each node
    for i, node in enumerate(nodes):
        node["topic"] = topics[i]

    # Collect valid topics and build topic nodes
    topic_nodes = []
    topic_id_to_keywords = {}
    valid_topic_ids = [t for t in set(topics) if t != -1]

    for topic_id in valid_topic_ids:
        keywords = [term for term, _ in topic_model.get_topic(topic_id)[:top_n_keywords]]
        topic_node = {
            "id": f"topic_{topic_id}",
            "label": f"Topic {topic_id}",
            "keywords": keywords
        }
        topic_nodes.append(topic_node)
        topic_id_to_keywords[topic_id] = keywords

    # Relationships
    relationships = []

    # Node-to-topic links
    for node in nodes:
        topic = node["topic"]
        if topic != -1:
            relationships.append({
                "source": node["id"],
                "target": f"topic_{topic}",
                "relation": "belongs_to_topic",
                "keywords": topic_id_to_keywords[topic]
            })

    # Node-to-node links within the same topic
    for (i, a), (j, b) in combinations(enumerate(nodes), 2):
        topic_a = a["topic"]
        topic_b = b["topic"]

        if topic_a == -1 or topic_a != topic_b:
            continue

        similarity = float(embeddings[i] @ embeddings[j])  # cosine similarity
        if similarity >= similarity_threshold:
            relationships.append({
                "source": a["id"],
                "target": b["id"],
                "relation": "shared_topic",
                "score": round(similarity, 3),
                "topic_id": topic_a,
                "keywords": topic_id_to_keywords[topic_a]
            })

    # Save output files
    with open(relationships_output_path, "w", encoding="utf-8") as f:
        json.dump(relationships, f, indent=2, ensure_ascii=False)

    with open(topic_nodes_output_path, "w", encoding="utf-8") as f:
        json.dump(topic_nodes, f, indent=2, ensure_ascii=False)

    print(f"✅ Generated {len(relationships)} relationships and {len(topic_nodes)} topic nodes.")
    return relationships, topic_nodes