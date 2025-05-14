
import json

with open("routes/pipeline/output_files/parsed_call_tables.json", "r", encoding="utf-8") as f:
    parsed_calls = json.load(f)

with open("routes/pipeline/output_files/enhanced_raw_call_blocks.json", "r", encoding="utf-8") as f:
    enhanced_blocks = json.load(f)

# Index enhanced blocks by call_id_line
enhanced_map = {}
for entry in enhanced_blocks:
    raw_id_line = entry.get("call_id_line", "")
    for parsed in parsed_calls:
        if parsed.get("call_id") and parsed["call_id"] in raw_id_line:
            enhanced_map[parsed["call_id"]] = {
                "expected_outcome": entry.get("expected_outcome"),
                "scope": entry.get("scope")
            }
            break

# Append the values to the parsed entries
for call in parsed_calls:
    call_id = call.get("call_id")
    if call_id and call_id in enhanced_map:
        call["expected_outcome"] = enhanced_map[call_id].get("expected_outcome")
        call["scope"] = enhanced_map[call_id].get("scope")

with open("routes/pipeline/output_files/parsed_call_tables.json", "w", encoding="utf-8") as f:
    json.dump(parsed_calls, f, indent=2, ensure_ascii=False)

print("✅ updated parsed_call_tables.json written with expected_outcome and scope")
