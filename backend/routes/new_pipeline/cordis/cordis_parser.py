"""Parse a real CORDIS Data-Extraction (DET) export into normalised project records.

A DET export is a ZIP containing a nested ``json.zip`` that holds one ``project-rcn-*_en.json`` per
project. This module reads those project JSONs and normalises them into flat dicts the graph builder
can ingest. It is PURE — no database, no network — so it can be unit-tested offline against a real
extraction.

Field paths were verified against actual CORDIS output (see CORDIS_PLANS/00-data-backbone.md §2):
- organisations are associations whose ``attributes.type`` is the consortium role
  (coordinator / participant / associatedPartner / thirdParty);
- the call link is ``relatedMasterCall.identifier``; the topic/framework-programme come from
  ``relatedTopic``; research fields and the funding scheme come from ``relations.categories``;
- every ``attributes`` value arrives as a *stringified* Python dict and is parsed with ``ast.literal_eval``.
"""
import ast
import json
import os
import zipfile
from typing import Any, Dict, List, Optional

ORG_ROLES = {"coordinator", "participant", "associatedPartner", "thirdParty"}


def _attrs(item: Dict[str, Any]) -> Dict[str, Any]:
    a = item.get("attributes")
    if isinstance(a, dict):
        return a
    if isinstance(a, str):
        try:
            v = ast.literal_eval(a)
            return v if isinstance(v, dict) else {}
        except Exception:
            return {}
    return {}


def _num(v: Any) -> Optional[float]:
    if v in (None, "", "null"):
        return None
    try:
        return float(str(v).replace(",", ""))
    except Exception:
        return None


def _addr_field(org: Dict[str, Any], key: str) -> str:
    addr = org.get("address")
    if isinstance(addr, dict):
        return str(addr.get(key) or "").strip()
    if isinstance(addr, str):
        try:
            d = ast.literal_eval(addr)
            if isinstance(d, dict):
                return str(d.get(key) or "").strip()
        except Exception:
            pass
    return ""


def normalise_project(rec: Dict[str, Any]) -> Dict[str, Any]:
    """One raw CORDIS project record -> one flat normalised dict."""
    relations = rec.get("relations") or {}
    associations = relations.get("associations") or []
    categories = relations.get("categories") or []

    organisations: List[Dict[str, Any]] = []
    master_call = sub_call = topic_code = framework_programme = ""

    for a in associations:
        if not isinstance(a, dict):
            continue
        t = _attrs(a).get("type")
        if t in ORG_ROLES:
            at = _attrs(a)
            organisations.append({
                "id": str(a.get("id") or a.get("rcn") or "").strip(),
                "name": (a.get("legalName") or a.get("title") or "").strip(),
                "shortName": (a.get("shortName") or "").strip(),
                "country": _addr_field(a, "country"),
                "city": _addr_field(a, "city"),
                "role": t,
                "ecContribution": _num(at.get("ecContribution")),
                "order": at.get("order"),
            })
        elif t == "relatedMasterCall":
            master_call = (a.get("identifier") or a.get("title") or "").strip()
        elif t == "relatedSubCall":
            sub_call = (a.get("identifier") or a.get("title") or "").strip()
        elif t == "relatedTopic":
            topic_code = (a.get("code") or "").strip()
            framework_programme = (a.get("frameworkProgramme") or "").strip()

    fields: List[Dict[str, str]] = []
    funding_scheme = ""
    for c in categories:
        if not isinstance(c, dict):
            continue
        cl = _attrs(c).get("classification")
        if cl == "euroSciVoc":
            code = (c.get("code") or "").strip()
            title = (c.get("title") or "").strip()
            if code or title:
                fields.append({"code": code, "title": title})
        elif cl == "projectFundingSchemeCategory" and not funding_scheme:
            funding_scheme = (c.get("title") or "").strip()

    return {
        "id": str(rec.get("id") or rec.get("rcn") or "").strip(),
        "acronym": (rec.get("acronym") or "").strip(),
        "title": (rec.get("title") or "").strip(),
        "status": (rec.get("status") or "").strip(),
        "startDate": (rec.get("startDate") or "").strip(),
        "endDate": (rec.get("endDate") or "").strip(),
        "objective": (rec.get("objective") or "").strip(),
        "totalCost": _num(rec.get("totalCost")),
        "ecContribution": _num(rec.get("ecMaxContribution")),
        "frameworkProgramme": framework_programme,
        "fundingScheme": funding_scheme,
        "masterCall": master_call,
        "subCall": sub_call,
        "topicCode": topic_code,
        "organisations": organisations,
        "fields": fields,
    }


def _iter_project_json(json_zip_path: str):
    with zipfile.ZipFile(json_zip_path) as zf:
        for name in zf.namelist():
            if name.lower().endswith(".json"):
                with zf.open(name) as f:
                    try:
                        yield json.load(f)
                    except Exception:
                        continue


def _resolve_json_zip(path: str) -> str:
    """Accept a path to json.zip directly, or to an extraction directory containing json.zip."""
    if os.path.isdir(path):
        cand = os.path.join(path, "json.zip")
        if os.path.isfile(cand):
            return cand
        raise FileNotFoundError(f"No json.zip found in directory: {path}")
    return path


def parse_extraction(path: str) -> List[Dict[str, Any]]:
    """Path to a json.zip (or an extraction dir containing it) -> list of normalised projects."""
    json_zip = _resolve_json_zip(path)
    out: List[Dict[str, Any]] = []
    for rec in _iter_project_json(json_zip):
        if isinstance(rec, list):
            out.extend(normalise_project(r) for r in rec if isinstance(r, dict))
        elif isinstance(rec, dict):
            out.append(normalise_project(rec))
    return out
