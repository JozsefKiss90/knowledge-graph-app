/**
 * Safe truncation helper (character-based).
 */
export const truncate = (text, max = 80) => {
  if (!text) return "";
  const s = String(text);
  return s.length > max ? `${s.slice(0, Math.max(0, max - 1))}…` : s;
};

export const safeId = (node) => {
  if (!node) return "";
  const v =
    node?.id ??
    node?.call_id ??
    node?.callId ??
    node?.ID ??
    node?.node_id ??
    node?.data?.id ??
    node?.data?.call_id ??
    node?.data?.callId;

  return v == null ? "" : String(v);
};

export const safeLabel = (node) => {
  if (!node) return "";
  const v =
    node?.title ??
    node?.name ??
    node?.label ??
    node?.display_name ??
    node?.data?.title ??
    node?.data?.name ??
    node?.data?.label ??
    node?.id;
  return v == null ? "" : String(v);
};

export const safeType = (node) => {
  if (!node) return "";
  const v =
    node?.type ??
    node?.node_type ??
    node?.kind ??
    node?.group ??
    node?.category ??
    node?.label_type ??
    node?.data?.type ??
    node?.data?.node_type ??
    "";
  return v == null ? "" : String(v);
};
