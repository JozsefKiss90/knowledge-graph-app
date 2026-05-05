export function computeEffectiveLayout({ base, userLayout }) {
  return {
    ...base,
    ...userLayout,
    name: userLayout?.name || base?.name || "cose-bilkent",
  };
}
