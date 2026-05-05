import json
from collections import defaultdict

# Load parsed CL2 calls
with open("../../output_files/parsed_cl2_call_tables.json", "r", encoding="utf-8") as f:
    parsed_calls = json.load(f)

# Destination → Theme → Call IDs mapping
DESTINATION_TOPICS = {
    "Destination Innovative Research on Democracy and Governance": {
        "Democracy and Governance": [
            "HORIZON-CL2-2025-01-DEMOCRACY-01",
            "HORIZON-CL2-2025-01-DEMOCRACY-02",
            "HORIZON-CL2-2025-01-DEMOCRACY-03",
            "HORIZON-CL2-2025-01-DEMOCRACY-04",
            "HORIZON-CL2-2025-01-DEMOCRACY-05",
            "HORIZON-CL2-2025-01-DEMOCRACY-06",
            "HORIZON-CL2-2025-01-DEMOCRACY-07",
            "HORIZON-CL2-2025-01-DEMOCRACY-08",
            "HORIZON-CL2-2025-01-DEMOCRACY-09",
            "HORIZON-CL2-2025-01-DEMOCRACY-10", 
            "HORIZON-CL2-2025-01-DEMOCRACY-11",
            "HORIZON-CL2-2025-01-DEMOCRACY-12"
        ]
    },
    "Destination Innovative Research on European Cultural Heritage and Cultural and Creative Industries": {
        "Heritage and Creative Industries": [
            "HORIZON-CL2-2025-03-HERITAGE-01",
            "HORIZON-CL2-2025-02-HERITAGE-02-two-stage",
            "HORIZON-CL2-2025-01-HERITAGE-03",
            "HORIZON-CL2-2025-01-HERITAGE-04",
            "HORIZON-CL2-2025-01-HERITAGE-05",
            "HORIZON-CL2-2025-01-HERITAGE-06",
            "HORIZON-CL2-2025-01-HERITAGE-07",
            "HORIZON-CL2-2025-01-HERITAGE-08",
            "HORIZON-CL2-2025-01-HERITAGE-09"
        ]
    },
    "Destination Innovative Research on Social and Economic Transformations": {
        "Social and Economic Transformations": [
            "HORIZON-CL2-2025-01-TRANSFO-01",
            "HORIZON-CL2-2025-01-TRANSFO-02",
            "HORIZON-CL2-2025-01-TRANSFO-03",
            "HORIZON-CL2-2025-01-TRANSFO-05",
            "HORIZON-CL2-2025-01-TRANSFO-06",
            "HORIZON-CL2-2025-01-TRANSFO-07",
            "HORIZON-CL2-2025-01-TRANSFO-08",
            "HORIZON-CL2-2025-01-TRANSFO-09",
            "HORIZON-CL2-2025-01-TRANSFO-10",
            "HORIZON-CL2-2025-01-TRANSFO-11"
        ]
    }
}

# Reverse map: call_id → destination
call_to_dest = {}
for dest, themes in DESTINATION_TOPICS.items():
    for call_ids in themes.values():
        for cid in call_ids:
            call_to_dest[cid] = dest

# Group calls directly under their destination
destination_calls = defaultdict(list)
for call in parsed_calls:
    call_id = call.get("call_id", "")
    dest = call_to_dest.get(call_id)
    if dest:
        destination_calls[dest].append(call)

# Format output: [{"destination": ..., "calls": [...]}, ...]
flattened_output = [
    {"destination": dest, "calls": calls}
    for dest, calls in destination_calls.items()
]

# Save
with open("../../output_files/nested_parsed_cl2_call_tables.json", "w", encoding="utf-8") as f:
    json.dump(flattened_output, f, indent=2, ensure_ascii=False)

print("✅ Flattened nested_parsed_cl2_call_tables.json created.")
