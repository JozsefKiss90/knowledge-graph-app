"""Generate the CORDIS curated-query authoring workflow (.js) by embedding the live subject
lists + a worked cluster_3 template + the methodology guardrails as JS constants. JSON is valid
JS, so json.dumps() handles all escaping safely (no hand-transcription)."""
import json, os

WORK = r"C:\Code\knowledge-graph-app\_cordis_work"
CURATED = r"C:\Code\knowledge-graph-app\backend\routes\new_pipeline\cordis\curated_queries"

THEMES = {
    1: "Cluster 1 - Health (biomedical, clinical, public health, health systems)",
    2: "Cluster 2 - Culture, Creativity and Inclusive Society (social sciences & humanities, "
       "democracy, cultural heritage, creative industries, inequality, migration)",
    4: "Cluster 4 - Digital, Industry and Space (AI, computing, electronics/photonics, "
       "advanced manufacturing, materials, robotics, space)",
    5: "Cluster 5 - Climate, Energy and Mobility (climate science, renewable energy, grids, "
       "batteries, transport, aviation, automotive, hydrogen)",
    6: "Cluster 6 - Food, Bioeconomy, Natural Resources, Agriculture and Environment "
       "(agriculture, forestry, biodiversity, oceans, circular bioeconomy, water, soil)",
}

# Build CLUSTERS = [{source, theme, items:[{idx, subject}]}] with a stable per-cluster idx.
clusters = []
for n in [1, 2, 4, 5, 6]:
    rows = json.load(open(os.path.join(WORK, f"cluster_{n}_subjects.json"), encoding="utf-8"))
    items = [{"idx": i, "subject": r["subject"]} for i, r in enumerate(rows)]
    clusters.append({"source": f"cluster_{n}", "theme": THEMES[n], "items": items})

# A diverse worked template from the reviewed cluster_3 file (proves the required style).
cl3 = json.load(open(os.path.join(CURATED, "cluster_3.json"), encoding="utf-8"))["queries"]
keys = list(cl3.keys())
pick = [keys[i] for i in range(0, len(keys), max(1, len(keys)//12))][:12]
template = "\n".join(f'  "{k}"\n     -> {cl3[k]}' for k in pick)

GUARDRAILS = (
    "You are authoring search queries for the CORDIS Data-Extraction (DET) API. Each query is sent to "
    "CORDIS to retrieve EU-funded research PROJECTS whose topic matches a Horizon Europe call's subject; "
    "the funded projects' EuroSciVoc research-field classifications are then aggregated into that call's "
    "tags. So a query MUST return projects genuinely ABOUT the subject — not a broad keyword soup and not "
    "off-topic noise. A wrong query stamps WRONG research fields on the call, which is worse than no tag.\n\n"
    "CORDIS DET query syntax — follow EXACTLY, mirror the worked examples:\n"
    "- Always begin with `contenttype=project AND ...`.\n"
    "- Phrase-quote EVERY multi-word domain term: \"renewable energy\", \"gene therapy\", \"precision agriculture\".\n"
    "- Group synonyms / closely related terms with OR inside parentheses: (\"solid-state battery\" OR \"all-solid-state battery\").\n"
    "- AND together 1-3 concept groups so the result set is bounded AND on-topic. Too broad/too few terms -> "
    "over the 25000-result cap (the extraction fails) or generic noise; too many ANDs -> empty.\n"
    "- Prefer specific domain nouns. NEVER use a bare ambiguous single word as the main filter "
    "(\"open\", \"topic\", \"advanced\", \"innovative\", \"system\", \"platform\", \"support\", \"new\") — these pull "
    "biomedical/irrelevant noise (a verified failure: the bare phrase 'missing persons' returned oncology/"
    "nutrition projects).\n"
    "- Query the SUBJECT/DOMAIN, not the administrative wording. Strip boilerplate before deriving terms: "
    "'Open topic on ...', trailing '(RIA)'/'(IA)'/'(CSA)', partnership/programme names in parentheses, "
    "'Made in Europe', call-identifier fragments.\n"
    "- Use `frameworkProgramme=HORIZON` only when the subject is recent/HE-specific AND your domain terms are "
    "otherwise broad (use sparingly; most queries need only domain terms).\n"
    "- The cluster theme is the relevance anchor: when a subject term is ambiguous, bias the synonyms toward "
    "this cluster's domain."
)

CLUSTERS_JS = json.dumps(clusters, ensure_ascii=False)
TEMPLATE_JS = json.dumps(template, ensure_ascii=False)
GUARDRAILS_JS = json.dumps(GUARDRAILS, ensure_ascii=False)

JS = r'''export const meta = {
  name: 'cordis-curated-queries',
  description: 'Author curated CORDIS DET queries for Horizon Europe clusters 1,2,4,5,6 (subject->query maps consumed by POST /cordis/tag-calls)',
  phases: [
    { title: 'Author', detail: 'one agent per ~20-subject chunk drafts CORDIS DET queries grounded in the cluster theme + worked CL3 template' },
    { title: 'Verify', detail: 'adversarial pass fixes off-topic / over-broad / unquoted / over-constrained queries' },
  ],
}

const CLUSTERS = __CLUSTERS__;
const TEMPLATE = __TEMPLATE__;
const GUARDRAILS = __GUARDRAILS__;

const CHUNK = 20;
function chunk(a, n) { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; }

const AUTHOR_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { queries: { type: 'array', items: {
    type: 'object', additionalProperties: false,
    properties: { idx: { type: 'integer' }, query: { type: 'string' },
                  confidence: { type: 'string', enum: ['high', 'medium', 'low'] }, note: { type: 'string' } },
    required: ['idx', 'query'] } } },
  required: ['queries'],
};
const VERIFY_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { queries: { type: 'array', items: {
    type: 'object', additionalProperties: false,
    properties: { idx: { type: 'integer' }, query: { type: 'string' }, ok: { type: 'boolean' }, issue: { type: 'string' } },
    required: ['idx', 'query', 'ok'] } } },
  required: ['queries'],
};

function subjLines(items) { return items.map(it => '[' + it.idx + '] ' + it.subject).join('\n'); }

function authorPrompt(cl, items) {
  return GUARDRAILS + '\n\nHorizon Europe ' + cl.theme + '. Every subject below is a CALL in this cluster — ground your domain terms in this theme.\n\n' +
    'Worked examples (subject -> query) from a reviewed cluster, showing the REQUIRED style:\n' + TEMPLATE + '\n\n' +
    'Write ONE CORDIS DET query for EACH subject below. Copy each idx exactly; never invent, merge, or skip an idx. ' +
    'Return {queries:[{idx, query, confidence, note}]} covering every idx.\n\nSubjects:\n' + subjLines(items);
}

function verifyPrompt(cl, items, authored) {
  const byIdx = {}; ((authored && authored.queries) || []).forEach(q => { byIdx[q.idx] = q.query; });
  const lines = items.map(it => '[' + it.idx + '] SUBJECT: ' + it.subject + '\n      QUERY: ' + (byIdx[it.idx] || '(MISSING)')).join('\n');
  return GUARDRAILS + '\n\nAdversarially REVIEW and FIX these CORDIS DET queries for the "' + cl.theme + '" cluster. ' +
    'For each: will it retrieve EU-funded projects genuinely about the subject, bounded (not over the 25000-result cap, not empty), ' +
    'and syntactically valid (begins contenttype=project, every multi-word term phrase-quoted, synonyms OR-grouped)? ' +
    'FIX: off-topic / over-broad terms, unquoted multi-word phrases, bare single-word filters, over-constrained (too many ANDs) queries, ' +
    'a missing contenttype=project, or a MISSING query. Preserve the subject\'s domain intent and keep the cluster theme as the anchor.\n\n' +
    'Return {queries:[{idx, query, ok, issue}]} for EVERY idx: query = the corrected query (echo verbatim if already good), ' +
    'ok = true iff you left it unchanged and it is good, issue = short note when you changed it.\n\n' + lines;
}

const units = [];
for (const cl of CLUSTERS) for (const ch of chunk(cl.items, CHUNK)) units.push({ cl, items: ch });
const totalSubjects = CLUSTERS.reduce((n, c) => n + c.items.length, 0);
log('Authoring ' + totalSubjects + ' CORDIS queries across ' + CLUSTERS.length + ' clusters in ' + units.length + ' chunks');

const verified = await pipeline(units,
  u => agent(authorPrompt(u.cl, u.items), { label: 'author:' + u.cl.source + '#' + u.items[0].idx, phase: 'Author', schema: AUTHOR_SCHEMA }),
  (authored, u) => agent(verifyPrompt(u.cl, u.items, authored || { queries: [] }), { label: 'verify:' + u.cl.source + '#' + u.items[0].idx, phase: 'Verify', schema: VERIFY_SCHEMA }),
);

const out = {};
for (const cl of CLUSTERS) out[cl.source] = {};
units.forEach((u, i) => {
  const v = verified[i];
  if (!v || !v.queries) return;
  for (const q of v.queries) {
    if (q && Number.isInteger(q.idx) && q.query && q.query.trim()) out[u.cl.source][String(q.idx)] = q.query.trim();
  }
});

const coverage = CLUSTERS.map(cl => {
  const have = Object.keys(out[cl.source]).length;
  const missingIdx = cl.items.filter(it => !(String(it.idx) in out[cl.source])).map(it => it.idx);
  return { source: cl.source, total: cl.items.length, authored: have, missingIdx };
});
log('Coverage: ' + coverage.map(c => c.source + ' ' + c.authored + '/' + c.total).join(', '));

return { byIdx: out, coverage };
'''

JS = (JS.replace("__CLUSTERS__", CLUSTERS_JS)
        .replace("__TEMPLATE__", TEMPLATE_JS)
        .replace("__GUARDRAILS__", GUARDRAILS_JS))

out_path = os.path.join(WORK, "author_queries.workflow.js")
open(out_path, "w", encoding="utf-8").write(JS)
print("Wrote", out_path, "(", len(JS), "chars )")
print("Clusters:", [(c["source"], len(c["items"])) for c in clusters])
print("Total subjects:", sum(len(c["items"]) for c in clusters))
print("Template pairs:", len(pick))
