
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re, json, argparse
from typing import List, Tuple, Dict, Optional
import fitz  # PyMuPDF


from pathlib import Path
from datetime import datetime

def _infer_cluster_from_filename(pdf_path: str) -> Optional[str]:
    """Infer cluster code like 'CL2' from a file name such as 'HORIZON-CL2-2026-2027.pdf'."""
    m = re.search(r'\bCL\s*([1-6])\b', pdf_path, flags=re.IGNORECASE)
    if m:
        return f"CL{m.group(1)}"
    m = re.search(r'CL([1-6])', Path(pdf_path).name, flags=re.IGNORECASE)
    if m:
        return f"CL{m.group(1)}"
    return None

def _load_destination_dates(path: str) -> Optional[dict]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return None
    except Exception as e:
        print(f"WARNING: Failed to load destination dates file '{path}': {e}")
        return None

def _norm_title(s: str) -> str:
    """Normalize destination titles for loose matching."""
    if not s:
        return ""
    s = s.lower().strip()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[’'`]", "", s)
    s = re.sub(r"[^a-z0-9 ]+", "", s)
    return s.strip()

def _iter_date_destinations(destination_dates: dict):
    """
    Yield (dest_title, calls_dict) from either supported schema:

    A) New schema (your generated files):
       {
         "<destination title>": { "calls": { "<CALL_PREFIX>": {dates...}, ... } },
         ...
       }

    B) Old schema:
       { "destinations": [ { "destination_title": "...", "call_windows": [ {"call_prefix": "...", ...}, ... ] }, ... ] }
    """
    if not isinstance(destination_dates, dict):
        return

    # Schema B
    if "destinations" in destination_dates and isinstance(destination_dates["destinations"], list):
        for d in destination_dates["destinations"]:
            title = d.get("destination_title") or d.get("destination") or ""
            calls = {}
            for w in d.get("call_windows", []) or []:
                cp = (w.get("call_prefix") or "").strip()
                if cp:
                    calls[cp] = w
            if title or calls:
                yield (title, calls)
        return

    # Schema A
    for title, payload in destination_dates.items():
        if not isinstance(payload, dict):
            continue
        calls = payload.get("calls")
        if isinstance(calls, dict):
            yield (title, calls)

def _build_prefix_index(calls_dict: dict) -> dict:
    """
    Build {call_prefix: window_dict} and keep the *first* window per prefix.
    """
    idx = {}
    if not isinstance(calls_dict, dict):
        return idx
    for cp, w in calls_dict.items():
        cp2 = (cp or "").strip()
        if not cp2:
            continue
        if isinstance(w, dict) and cp2 not in idx:
            idx[cp2] = w
    return idx

def _call_prefix_4(call_id: str) -> str:
    """
    Return first 4 dash-separated tokens of call_id:
    e.g. HORIZON-HLTH-2027-01 from HORIZON-HLTH-2027-01-STAYHLTH-01
    """
    if not call_id:
        return ""
    parts = call_id.split("-")
    if len(parts) < 4:
        return call_id.strip()
    return "-".join(parts[:4]).strip()


def _pick_window_for_call(call_id: str, prefix_index: dict):
    """
    Deterministic O(1) lookup by 4-token prefix.
    (No scanning across all prefixes; avoids wrong matches and is faster.)
    """
    if not call_id or not prefix_index:
        return None
    pfx = _call_prefix_4(call_id)
    return prefix_index.get(pfx)


def apply_destination_dates_to_grouped(grouped: dict, destination_dates: dict) -> dict:
    """
    Mutates grouped json by adding opening_date/deadline* fields to each call.

    Rule:
    - Build a per-destination {CALL_PREFIX_4 -> window_dict} index.
    - Match calls within the same destination first (by destination title).
    - If destination title matching fails, fall back to a global prefix index.
    """
    if not destination_dates or not isinstance(grouped, dict):
        return grouped

    # Build destination lookup from destination-dates file
    dd_by_norm_title: dict = {}
    dd_dest_list = []

    for title, calls_dict in _iter_date_destinations(destination_dates):
        idx = _build_prefix_index(calls_dict)  # expects keys like HORIZON-HLTH-2027-01
        ntitle = _norm_title(title)
        dd_dest_list.append((title, ntitle, idx))
        if ntitle:
            dd_by_norm_title[ntitle] = idx

    # Global fallback index = first-seen window per prefix across all destinations
    global_idx = {}
    for _, _, idx in dd_dest_list:
        for cp, w in idx.items():
            global_idx.setdefault(cp, w)

    def _find_best_dest_index(grouped_dest_title: str):
        """
        Best-effort destination-title alignment:
        1) exact normalized match
        2) truncation/containment match (handles titles cut by PDF extraction)
        """
        nt = _norm_title(grouped_dest_title)
        if nt in dd_by_norm_title:
            return dd_by_norm_title[nt]

        best = None
        best_len = -1
        for _, ndd, idx in dd_dest_list:
            if not ndd:
                continue
            if nt.startswith(ndd) or ndd.startswith(nt):
                L = min(len(nt), len(ndd))
                if L > best_len:
                    best = idx
                    best_len = L
        return best

    updated = 0
    total = 0

    for dest in grouped.get("destinations", []) or []:
        dest_title = dest.get("destination_title") or ""
        dest_idx = _find_best_dest_index(dest_title)

        for call in dest.get("calls", []) or []:
            total += 1
            cid = call.get("call_id") or ""
            if not cid:
                continue

            # 1) same-destination match
            w = _pick_window_for_call(cid, dest_idx) if dest_idx else None
            # 2) global fallback
            if not w:
                w = _pick_window_for_call(cid, global_idx)

            if not w:
                continue

            # Apply fields
            if w.get("opening_date") is not None:
                call["opening_date"] = w.get("opening_date")

            # If your date-json provides two-stage fields, keep them;
            # always also set a best-effort single "deadline" for frontend convenience.
            if w.get("deadline_first_stage") is not None:
                call["deadline_first_stage"] = w.get("deadline_first_stage")
            if w.get("deadline_second_stage") is not None:
                call["deadline_second_stage"] = w.get("deadline_second_stage")

            if w.get("deadline") is not None:
                call["deadline"] = w.get("deadline")
            else:
                # derive a deadline if only staged deadlines exist
                call["deadline"] = (
                    w.get("deadline_second_stage")
                    or w.get("deadline_first_stage")
                    or call.get("deadline")
                )

            updated += 1

    print(f"Date enrichment: updated {updated}/{total} calls")
    return grouped


def _join_wrapped_title(parts):
    """Join soft-wrapped destination title lines, handling hyphen breaks and spaces."""
    out = ""
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if out.endswith("-"):
            out = out[:-1] + p  # hyphenated wrap: no space
        else:
            out = (out + " " + p).strip() if out else p
    # squeeze whitespace
    return re.sub(r"\s+", " ", out).strip()
HEADER_PATS = [
    re.compile(r'^Horizon Europe - Work Programme', re.I),
    re.compile(r'^Digital, Industry and Space', re.I),
    re.compile(r'^Food, Bioeconomy, Natural Resources, Agriculture and Environment', re.I),
    re.compile(r'^Civil Security for Society', re.I),
    re.compile(r'^Part\s*\d+\s*-\s*Page\s*\d+\s*of\s*\d+', re.I),
]
BODY_DEST_RE = re.compile(r'^\s*Destination\s*[:\-–]\s*(.+)$', re.I)
END_MARK_RE = re.compile(r'^\s*Other actions not subject to calls for proposals\b', re.I)
CALL_ID_HEADER_RE = re.compile(r'^(HORIZON-[A-Z0-9]+-\d{4}-[0-9A-Za-z\-]+)\s*:\s*(.*)$', re.I | re.M)
TOPIC_ID_LINE = re.compile(r'^(HORIZON-[A-Z0-9]+-\d{4}-[0-9A-Za-z\-]+)\s*:\s*(.+)$', re.I)
TYPE_OF_ACTION_IN_TITLE = re.compile(r'\((RIA|IA|CSA|COFUND|MSCA|EIC|ERA)\)')

SOFT_HYPHEN = '\u00ad'
MONEY_ANY = re.compile(r'(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|\d+(?:[.,]\d+)?)')

def norm(s: str) -> str:
    return re.sub(r'\s+', ' ', s).strip()

def _to_float(num_txt: str):
    if not num_txt:
        return None
    s = num_txt.strip().replace(' ', '')
    if ',' in s and '.' in s:
        if s.rfind(',') > s.rfind('.'):
            s = s.replace('.', '').replace(',', '.')
        else:
            s = s.replace(',', '')
    else:
        if ',' in s:
            s = s.replace(',', '.')
    try:
        return float(s)
    except:
        return None

def cleanup_title(title: str) -> str:
    if not title:
        return title
    t = title.replace(SOFT_HYPHEN, '')
    t = re.sub(r'(\w)-\s+(\w)', r'\1\2', t)
    return norm(t)

def normalize_procedure(proc: str) -> str:
    if not proc:
        return ""
    p = proc.strip()
    m = re.fullmatch(r'[\(\[\{]?\s*([A-Za-z0-9\-/& ]{2,15})\s*[\)\]\}]?\.?', p)
    if m and len(p) <= 20 and not re.search(r'\b(General|Annex|page|limits|Outcome|Scope)\b', p, re.I):
        return m.group(1).upper().strip()
    if re.search(r'General\s+Annex\s+F', p, re.I):
        return "General Annex F"
    if re.search(r'General\s+Annex', p, re.I):
        return "General Annexes"
    sent = re.split(r'(?<=[.!?])\s+', p)[0]
    return norm(sent)

def strip_headers_footers(page, lines):
    h = page.rect.height
    TOP = 60.0; BOTTOM = 60.0
    kept = []
    blocks = page.get_text("blocks", sort=True)
    for (x0,y0,x1,y1,txt,*_) in blocks:
        if y0 < TOP or y1 > h - BOTTOM:
            continue
        if txt and txt.strip():
            for ln in txt.splitlines():
                lnc = norm(ln)
                if not lnc:
                    continue
                if any(p.match(lnc) for p in HEADER_PATS):
                    continue
                kept.append(lnc)
    if kept:
        return kept
    out = []
    for ln in lines:
        lnc = norm(ln)
        if not lnc:
            continue
        if any(p.match(lnc) for p in HEADER_PATS):
            continue
        if re.fullmatch(r'\d+\s*', lnc):
            continue
        out.append(lnc)
    return out

def extract_sections(text: str) -> Dict[str, str]:
    sections = {}
    patterns = [
        (r'Expected\s*EU\s*contribution\s*per\s*project', 'expected_eu_contribution'),
        (r'Indicative\s*budget', 'indicative_budget'),
        (r'Type\s*of\s*Action', 'type_of_action'),
        (r'Admissibility\s*conditions', 'admissibility_conditions'),
        (r'Eligibility\s*conditions', 'eligibility_conditions'),
        (r'Technology\s*Readiness\s*Level', 'technology_readiness_level'),
        (r'Procedure', 'procedure'),
        (r'Legal\s*and\s*financial\s*set-up\s*of\s*the\s*Grant\s*Agreements', 'legal_and_financial_setup'),
        (r'Exceptional\s*page\s*limits', 'exceptional_page_limits'),
    ]
    hits = []
    for pat, key in patterns:
        for m in re.finditer(pat, text, re.I | re.S):
            hits.append((m.start(), m.end(), key))
    hits.sort(key=lambda x: x[0])
    for i,(s,e,key) in enumerate(hits):
        nxt = hits[i+1][0] if i+1 < len(hits) else len(text)
        block = text[e:nxt]
        stopper = re.search(r'(?:\bExpected\s*Outcome\s*:|\bScope\s*:|\bSpecific\s*conditions\b|\bGeneral\s*conditions\b)', block, re.I)
        if stopper:
            block = block[:stopper.start()]
        sections[key] = norm(block)

    def pick_block(head_regex):
        m = re.search(head_regex + r'\s*:\s*(.*)', text, re.I | re.S)
        if not m:
            return ""
        tail = m.group(1)
        stop = re.search(r'\n\s*(Scope|Expected Outcome|Specific conditions|General conditions)\b', tail, re.I)
        return norm(tail[:stop.start()] if stop else tail)

    sections['expected_outcome'] = pick_block(r'Expected\s*Outcome')
    sections['scope'] = pick_block(r'Scope')
    return sections

def extract_indicative_budget_fallback(text: str):
    pats = [
        r'total\s+indicative\s+budget\s+for\s+the\s+topic\s+is\s+(?:EUR\s+)?' + MONEY_ANY.pattern,
        r'the\s+indicative\s+budget\s+for\s+this\s+topic\s+is\s+(?:EUR\s+)?' + MONEY_ANY.pattern,
        r'\bIndicative\s*budget\b\s*[:\-–]?\s*(?:EUR\s+)?' + MONEY_ANY.pattern,
        r'\bBudget\b\s*[:\-–]?\s*(?:EUR\s+)?' + MONEY_ANY.pattern + r'\s*(?:million|mio)?',
        r'\bTotal\b.*?\bIndicative\s*budget\b.*?(?:EUR\s+)?' + MONEY_ANY.pattern,
    ]
    for pat in pats:
        m = re.search(pat, text, re.I | re.S)
        if m:
            val = _to_float(m.group(1))
            if val is not None:
                return val
    return None

def discover_destinations(doc) -> List[Tuple[str,int,int]]:
    titles_pages = []
    end_page = len(doc)
    # detect end-of-body page
    for i in range(len(doc)):
        lines = [ln.rstrip() for ln in doc.load_page(i).get_text('text').splitlines()]
        for ln in lines:
            if END_MARK_RE.match(ln) and not re.search(r'\b\d{1,4}\s*$', ln.strip()):
                end_page = i
                break
        if end_page != len(doc):
            break
    # collect destination titles with possible wrapped lines
    for i in range(end_page):
        raw_lines = [ln.rstrip() for ln in doc.load_page(i).get_text('text').splitlines()]
        # strip headers/footers early to avoid false positives
        page = doc.load_page(i)
        raw_lines = strip_headers_footers(page, raw_lines)
        for idx, ln in enumerate(raw_lines):
            m = BODY_DEST_RE.match(ln)
            if m:
                # ignore ToC style lines with trailing page number
                if re.search(r'\b\d{1,4}\s*$', ln.strip()):
                    continue
                parts = [m.group(1).strip()]
                # collect continuation lines (soft-wraps) until a stopper
                j = idx + 1
                while j < len(raw_lines):
                    nxt = raw_lines[j].strip()
                    if not nxt:
                        break
                    # Only accept if it's obviously a wrapped continuation:
                    prev = parts[-1] if parts else ""
                    if prev.endswith("-") or (nxt and nxt[0].islower()):
                        parts.append(nxt)
                        j += 1
                        continue
                    break
                title = _join_wrapped_title(parts)
                if not titles_pages or titles_pages[-1][0] != title:
                    titles_pages.append((title, i))
                break
    ranges = []
    for idx,(title,start_p) in enumerate(titles_pages):
        stop_p = titles_pages[idx+1][1] if idx+1 < len(titles_pages) else end_page
        ranges.append((title, start_p, stop_p))
    return ranges

def destination_text(doc, start_p: int, stop_p: int) -> str:
    parts = []
    for pno in range(start_p, stop_p):
        page = doc.load_page(pno)
        txt = page.get_text('text')
        lines = [ln for ln in txt.splitlines() if ln.strip()]
        lines = strip_headers_footers(page, lines)
        parts.append("\n".join(lines))
    return "\n".join(parts)

def split_calls(text: str) -> List[str]:
    headers = list(CALL_ID_HEADER_RE.finditer(text))
    blocks = []
    for i,m in enumerate(headers):
        start = m.start()
        end = headers[i+1].start() if i+1 < len(headers) else len(text)
        blocks.append(text[start:end])
    return blocks

def is_real_call_block(block: str) -> bool:
    has_specific = re.search(r'\bSpecific\s+conditions\b', block, re.I)
    has_eo_or_scope = re.search(r'\bExpected\s*Outcome\b|\bScope\b', block, re.I)
    return bool(has_specific and has_eo_or_scope and len(block) > 400)

def parse_call_block(raw_text: str) -> Dict[str, Optional[str]]:
    out = {
        "call_id": "",
        "call_title": "",
        "type_of_action": "",
        "expected_eu_contribution": "",
        "min__contribution": None,
        "max_contribution": None,
        "indicative_budget": None,
        "indicative_number_of_projects": None,
        "admissibility_conditions": "",
        "eligibility_conditions": "",
        "technology_readiness_level": "",
        "procedure": "",
        "legal_and_financial_setup": "",
        "exceptional_page_limits": "",
        "expected_outcome": "",
        "scope": ""
    }
    lines = raw_text.splitlines()
    found = False
    for ln in lines:
        m = TOPIC_ID_LINE.match(ln.strip())
        if m:
            out["call_id"] = m.group(1).strip()
            out["call_title"] = cleanup_title(m.group(2).strip())
            mt = TYPE_OF_ACTION_IN_TITLE.search(out["call_title"])
            if mt:
                out["type_of_action"] = mt.group(1).upper()
            found = True
            break
    if not found:
        id_only_pat = re.compile(r'^(HORIZON-[A-Z0-9]+-\d{4}-[0-9A-Za-z\-]+)\s*:\s*$', re.I)
        for i, ln in enumerate(lines):
            m = id_only_pat.match(ln.strip())
            if m:
                out["call_id"] = m.group(1).strip()
                title_parts = []
                for j in range(i+1, min(i+12, len(lines))):
                    t = lines[j].strip()
                    if not t:
                        continue
                    if t.startswith("Call:") or t.lower().startswith("specific conditions"):
                        break
                    title_parts.append(t)
                out["call_title"] = cleanup_title(" ".join(title_parts))
                mt = TYPE_OF_ACTION_IN_TITLE.search(out["call_title"])
                if mt:
                    out["type_of_action"] = mt.group(1).upper()
                found = True
                break
    if out["call_id"] and (not out["call_title"] or len(out["call_title"]) < 40 or "(" not in out["call_title"]):
        ml_pat = re.compile(rf"{re.escape(out['call_id'])}\s*:\s*(.*?)(?=\n\s*Call:|\n\s*Specific conditions)", re.S | re.I)
        mm = ml_pat.search(raw_text)
        if mm:
            out["call_title"] = cleanup_title(mm.group(1))
            mt = TYPE_OF_ACTION_IN_TITLE.search(out["call_title"])
            if mt:
                out["type_of_action"] = mt.group(1).upper()

    sections = extract_sections(raw_text)
    exp = sections.get("expected_eu_contribution", "")
    out["expected_eu_contribution"] = exp

    nums = []
    m_between = re.search(r"between\s+EUR\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)", exp, re.I)
    if m_between:
        a, b = float(m_between.group(1)), float(m_between.group(2))
        nums = [a, b]
    else:
        m_range = re.search(r"(\d+(?:\.\d+)?)\s*(?:to|-|–)\s*(\d+(?:\.\d+)?)", exp, re.I)
        if m_range:
            a, b = float(m_range.group(1)), float(m_range.group(2))
            nums = [a, b]
        else:
            m_around = re.search(r"around\s+EUR\s+(\d+(?:\.\d+)?)", exp, re.I)
            if m_around:
                a = float(m_around.group(1)); nums = [a]
    if nums:
        out["min__contribution"] = min(nums)
        out["max_contribution"] = max(nums)

    ind = sections.get("indicative_budget", "")
    m = MONEY_ANY.search(ind)
    if m:
        val = _to_float(m.group(1))
        if val is not None:
            out["indicative_budget"] = val
    if out["indicative_budget"] is None:
        fb = extract_indicative_budget_fallback(raw_text)
        if fb is not None:
            out["indicative_budget"] = fb

    toa = sections.get("type_of_action", "")
    if toa:
        if "Research and Innovation Actions" in toa: out["type_of_action"] = "RIA"
        elif "Innovation Actions" in toa: out["type_of_action"] = "IA"
        elif "Coordination and Support Actions" in toa: out["type_of_action"] = "CSA"

    out["admissibility_conditions"] = sections.get("admissibility_conditions", "")
    out["eligibility_conditions"] = sections.get("eligibility_conditions", "")
    out["technology_readiness_level"] = sections.get("technology_readiness_level", "")

    out["procedure"] = normalize_procedure(sections.get("procedure", ""))

    out["legal_and_financial_setup"] = sections.get("legal_and_financial_setup", "")
    exc = sections.get("exceptional_page_limits", "")
    exc = re.sub(r"^to\s+proposals/applications\s*", "", exc, flags=re.I)
    exc = re.split(r'\bExpected\s*Outcome\s*:', exc, flags=re.I)[0].strip()
    out["exceptional_page_limits"] = exc

    eo = sections.get("expected_outcome", "")
    sc = sections.get("scope", "")
    out["expected_outcome"] = eo
    out["scope"] = sc

    return out


def _dest_from_call_id(call_id: str) -> Optional[int]:
    """
    Extract destination number from a call_id like:
    - HORIZON-CL5-2026-03-D3-19
    - HORIZON-CL5-2026-08-Two-Stage-D1-06
    - HORIZON-CL5-2027-06-D6-04
    Returns an integer destination (e.g., 3, 1, 6) or None if not present.
    """
    if not call_id:
        return None
    # Prefer the last occurrence of -D<digits>- pattern
    m = re.findall(r'-D(\d+)-', call_id)
    if m:
        try:
            return int(m[-1])
        except ValueError:
            return None
    # Fallback: end anchored -D<digits>
    m2 = re.search(r'-D(\d+)$', call_id)
    if m2:
        try:
            return int(m2.group(1))
        except ValueError:
            return None
    return None

def main():
    ap = argparse.ArgumentParser(description="Parse Horizon Europe WP PDFs into Destinations and Calls (robust budgets).")
    ap.add_argument("--input", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--pretty", action="store_true")
    ap.add_argument("--destination-dates", default=None, help="Path to destination_dates_clX.json to enrich calls with opening/deadline dates. If omitted, attempts auto-detection.")
    args = ap.parse_args()

    doc = fitz.open(args.input)

    # --- Parse using header-based ranges first (works for CL3/4/6) ---
    dest_ranges = discover_destinations(doc)
    all_calls = []
    for title, s, e in dest_ranges:
        raw = destination_text(doc, s, e)
        blocks = [b for b in split_calls(raw) if is_real_call_block(b)]
        calls = [parse_call_block(b) for b in blocks]
        seen = set()
        uniq = []
        for c in calls:
            cid = c.get("call_id") or ""
            if not cid or cid in seen:
                continue
            seen.add(cid)
            uniq.append(c)
        # We still collect all calls; we will regroup below.
        all_calls.extend(uniq)

    # Deduplicate globally (some PDFs repeat topics in ToC or summaries)
    dedup = {}
    for c in all_calls:
        cid = c.get("call_id") or ""
        if cid and cid not in dedup:
            dedup[cid] = c
    all_calls = list(dedup.values())

    # If nothing was found (e.g., CL5 where headers vary), scan the whole document
    if not all_calls:
        raw_all = []
        for pg in range(len(doc)):
            page = doc[pg]
            lines = strip_headers_footers(page, page.get_text("text").splitlines())
            raw_all.append("\n".join(lines))
        whole = "\n".join(raw_all)
        blocks = [b for b in split_calls(whole) if is_real_call_block(b)]
        calls = [parse_call_block(b) for b in blocks]
        # Dedup
        seen = set(); uniq = []
        for c in calls:
            cid = c.get("call_id") or ""
            if not cid or cid in seen:
                continue
            seen.add(cid); uniq.append(c)
        all_calls = uniq


    # --- Destination regrouping based on call_id pattern for CL5 ---
    grouped = {}
    used_dest_id = False
    for c in all_calls:
        cid = c.get("call_id") or ""
        dnum = _dest_from_call_id(cid)
        if dnum is not None:
            used_dest_id = True
            key = f"Destination {dnum}"
        else:
            # Fallback bucket for calls without D<digit> code in ID (e.g., many CL4 topics)
            key = "Destination (Unknown)"
        grouped.setdefault(key, []).append(c)

    result = {"destinations": []}
    if used_dest_id:
        # Sort destinations by numeric value when possible
        def sort_key(k: str):
            m = re.search(r'(\d+)$', k)
            return int(m.group(1)) if m else 9999
        for key in sorted(grouped.keys(), key=sort_key):
            # Within each destination, sort by call_id for stable output
            calls_sorted = sorted(grouped[key], key=lambda x: x.get("call_id",""))
            result["destinations"].append({"destination_title": key, "calls": calls_sorted})
    else:
        # Fall back to header-based destinations (legacy behaviour for CL3/4/6)
        for title, s, e in dest_ranges:
            raw = destination_text(doc, s, e)
            blocks = [b for b in split_calls(raw) if is_real_call_block(b)]
            calls = [parse_call_block(b) for b in blocks]
            seen = set(); uniq = []
            for c in calls:
                cid = c.get("call_id") or ""
                if not cid or cid in seen:
                    continue
                seen.add(cid); uniq.append(c)
            if uniq:
                result["destinations"].append({"destination_title": title, "calls": uniq})

    # Enrich calls with opening/deadline dates (optional)
    dd_path = args.destination_dates
    if not dd_path:
        cl = _infer_cluster_from_filename(args.input)
        if cl:
            # Try common locations: alongside input PDF, and current working directory
            cand1 = str(Path(args.input).with_name(f"destination_dates_{cl.lower()}.json"))
            cand2 = str(Path.cwd() / f"destination_dates_{cl.lower()}.json")
            for c in (cand1, cand2):
                if Path(c).exists():
                    dd_path = c
                    break
    destination_dates = _load_destination_dates(dd_path) if dd_path else None
    if destination_dates:
        apply_destination_dates_to_grouped(result, destination_dates)
    with open(args.out, "w", encoding="utf-8") as f:
        if args.pretty:
            json.dump(result, f, ensure_ascii=False, indent=2)
        else:
            json.dump(result, f, ensure_ascii=False)

    total_calls = sum(len(d['calls']) for d in result['destinations'])
    print(f"OK: {total_calls} calls in {len(result['destinations'])} destinations -> {args.out}")

if __name__ == "__main__":
    main()