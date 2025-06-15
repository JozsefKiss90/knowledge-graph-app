
import json
from collections import defaultdict

# Load parsed call data
with open("routes/pipeline/output_files/parsed_call_tables_v2.json", "r", encoding="utf-8") as f:
    parsed_calls = json.load(f)

# Hardcoded theme mapping under each destination
DESTINATION_TOPICS = {
    "Destination 1": {
        "Manufacturing": [
            "HORIZON-CL4-INDUSTRY-2025-01-TWIN-TRANSITION-01",
            "HORIZON-CL4-INDUSTRY-2025-01-TWIN-TRANSITION-02",
            "HORIZON-CL4-INDUSTRY-2025-01-TWIN-TRANSITION-05"
        ],
        "Construction": [
            "HORIZON-CL4-2025-05-TWIN-TRANSITION-11-two-stage"
        ],
        "Energy-Intensive Industries - Decarbonisation and Energy Efficiency": [
            "HORIZON-CL4-INDUSTRY-2025-01-TWIN-TRANSITION-31",
            "HORIZON-CL4-INDUSTRY-2025-01-TWIN-TRANSITION-32",
            "HORIZON-CL4-INDUSTRY-2025-01-TWIN-TRANSITION-33",
            "HORIZON-CL4-INDUSTRY-2025-01-TWIN-TRANSITION-34",
            "HORIZON-CL4-INDUSTRY-2025-01-TWIN-TRANSITION-37"
        ],
        "Energy-intensive Industries - Circularity and Zero Pollution": [
            "HORIZON-CL4-2025-05-TWIN-TRANSITION-35-two-stage",
            "HORIZON-CL4-INDUSTRY-2025-01-TWIN-TRANSITION-36",
            "HORIZON-CL4-INDUSTRY-2025-01-TWIN-TRANSITION-38",
            "HORIZON-CL4-INDUSTRY-2025-01-TWIN-TRANSITION-39"
        ],
        "Social Circular Enterprises": [
            "HORIZON-CL4-2025-05-TWIN-TRANSITION-21-two-stage"
        ]
    },
    "Destination 2": {
        "Raw Materials": [
            "HORIZON-CL4-INDUSTRY-2025-01-MATERIALS-61",
            "HORIZON-CL4-INDUSTRY-2025-01-MATERIALS-62",
            "HORIZON-CL4-INDUSTRY-2025-01-MATERIALS-63",
            "HORIZON-CL4-INDUSTRY-2025-01-MATERIALS-64"
        ],
        "Innovative Advanced Materials": [
            "HORIZON-CL4-2025-05-MATERIALS-42-two-stage",
            "HORIZON-CL4-2025-05-MATERIALS-43-two-stage",
            "HORIZON-CL4-INDUSTRY-2025-01-MATERIALS-44",
            "HORIZON-CL4-INDUSTRY-2025-01-MATERIALS-45",
            "HORIZON-CL4-2025-03-MATERIALS-46",
            "HORIZON-CL4-2025-03-MATERIALS-47"
        ],
        "Safe and Sustainable by Design": [
            "HORIZON-CL4-2025-05-MATERIALS-51-two-stage",
            "HORIZON-CL4-INDUSTRY-2025-01-MATERIALS-52"
        ],
        "Textiles": [
            "HORIZON-CL4-INDUSTRY-2025-01-MATERIALS-31"
        ]
    },
    "Destination 3": {
        "Connected Collaborative Computing Networks (3C networks)": [
            "HORIZON-CL4-2025-03-DATA-08",
            "HORIZON-CL4-2025-03-DATA-09",
            "HORIZON-CL4-2025-03-DATA-10",
            "HORIZON-CL4-2025-03-DATA-11",
            "HORIZON-CL4-2025-03-DATA-12"
        ],
        "AI-GenAI / Data / Robotics": [
            "HORIZON-CL4-2025-03-DATA-13"
        ]
    },
    "Destination 4": {
        "Quantum and High Performance Computing": [
            "HORIZON-CL4-2025-03-DIGITAL-EMERGING-01",
            "HORIZON-CL4-2025-03-DIGITAL-EMERGING-02",
            "HORIZON-CL4-2025-03-DIGITAL-EMERGING-03",
            "HORIZON-CL4-2025-03-DIGITAL-EMERGING-04"
        ],
        "Photonics": [
            "HORIZON-CL4-2025-04-DIGITAL-EMERGING-01"
        ],
        "Semiconductors": [
            "HORIZON-CL4-2025-03-DIGITAL-EMERGING-08"
        ],
        "AI-GenAI / Data / Robotics": [
            "HORIZON-CL4-2025-03-DIGITAL-EMERGING-07",
            "HORIZON-CL4-2025-03-DIGITAL-EMERGING-09",
            "HORIZON-CL4-2025-04-DIGITAL-EMERGING-04",
            "HORIZON-CL4-2025-04-DIGITAL-EMERGING-05",
            "HORIZON-CL4-2025-04-DIGITAL-EMERGING-07"
        ],
        "Artificial Intelligence in Science": [
            "HORIZON-CL4-INDUSTRY-2025-01-DIGITAL-61",
            "HORIZON-CL4-INDUSTRY-2025-01-DIGITAL-62"
        ]
    },
    "Destination 5": {
        "Accessing Space": [
            "HORIZON-CL4-2025-02-SPACE-11",
            "HORIZON-CL4-2025-02-SPACE-12",
            "HORIZON-CL4-2025-02-SPACE-13"
        ],
        "Acting in Space": [
            "HORIZON-CL4-2025-02-SPACE-21",
            "HORIZON-CL4-2025-02-SPACE-22",
            "HORIZON-CL4-2025-02-SPACE-23",
            "HORIZON-CL4-2025-02-SPACE-24"
        ],
        "Using Space on Earth – Telecommunications and Earth Observation": [
            "HORIZON-CL4-2025-02-SPACE-31",
            "HORIZON-CL4-2025-02-SPACE-32"
        ],
        "Using Space on Earth – Earth Observation": [
            "HORIZON-CL4-2025-02-SPACE-41",
            "HORIZON-CL4-2025-02-SPACE-42",
            "HORIZON-CL4-2025-02-SPACE-43",
            "HORIZON-CL4-2025-02-SPACE-44",
            "HORIZON-CL4-2025-02-SPACE-45",
            "HORIZON-CL4-2025-02-SPACE-46"
        ],
        "Boosting Space through non-dependence of the EU": [
            "HORIZON-CL4-2025-02-SPACE-71",
            "HORIZON-CL4-2025-02-SPACE-72",
            "HORIZON-CL4-2025-02-SPACE-73",
            "HORIZON-CL4-2025-02-SPACE-74"
        ],
        "Boosting Space through international cooperation": [
            "HORIZON-CL4-2025-02-SPACE-81"
        ]
    },
    "Destination 6": {
        "Virtual Worlds": [
            "HORIZON-CL4-2025-03-HUMAN-14",
            "HORIZON-CL4-2025-03-HUMAN-15",
            "HORIZON-CL4-2025-03-HUMAN-16",
            "HORIZON-CL4-2025-03-HUMAN-17"
        ],
        "AI-GenAI / Data / Robotics": [
            "HORIZON-CL4-2025-03-HUMAN-18"
        ],
        "Standardisation and Knowledge Valorisation": [
            "HORIZON-CL4-INDUSTRY-2025-01-HUMAN-60",
            "HORIZON-CL4-INDUSTRY-2025-01-HUMAN-61",
            "HORIZON-CL4-INDUSTRY-2025-01-HUMAN-62",
            "HORIZON-CL4-INDUSTRY-2025-01-HUMAN-63",
            "HORIZON-CL4-INDUSTRY-2025-01-HUMAN-64",
            "HORIZON-CL4-INDUSTRY-2025-01-HUMAN-65",
            "HORIZON-CL4-INDUSTRY-2025-01-HUMAN-66"
        ],
        "International Cooperation": [
            "HORIZON-CL4-2025-03-HUMAN-19"
        ]
    }
}

# Reverse lookup map: call_id → (destination, theme)
call_to_dest_topic = {}
for dest, themes in DESTINATION_TOPICS.items():
    for theme, ids in themes.items():
        for cid in ids:
            call_to_dest_topic[cid] = (dest, theme)

# Build nested output
nested = defaultdict(lambda: defaultdict(list))
for entry in parsed_calls:
    call_id = entry.get("call_id", "")
    if call_id in call_to_dest_topic:
        dest, theme = call_to_dest_topic[call_id]
        nested[dest][theme].append(entry)

# Structure final output
final_output = []
for dest, themes in nested.items():
    final_output.append({
        "destination": dest,
        "themes": [
            {"theme": theme, "calls": calls} for theme, calls in themes.items()
        ]
    })

# Save result
with open("routes/pipeline/output_files/nested_parsed_call_tables.json", "w", encoding="utf-8") as f:
    json.dump(final_output, f, indent=2, ensure_ascii=False)
print("✅ nested_parsed_call_tables_final.json created")