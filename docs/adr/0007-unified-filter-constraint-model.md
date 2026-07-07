# Graph visibility has a single source of truth: the unified constraint model

Everything that filters or dims the graph — search, type toggles, timeline, country paint, compare
selection, assistant highlights, and any future control — writes a *constraint* into one store, and
one place computes node/edge visibility from that store. The store renders as a visible bar of
individually removable constraint chips, so the user can always answer "why does the graph look like
this?" and undo any single part; "Reset" empties the store and therefore provably resets the graph.

Recorded because the tempting shortcut is the pattern this replaces: before this decision, ~5
controls each toggled their own Cytoscape classes/visibility layers directly. The layers conflicted,
the combined state was invisible, and "Reset All Filters" could not reset what it didn't know about.
A contributor adding a filter will reach for a three-line `addClass` toggle unless told that path is
closed: **every visibility writer goes through the store**, even when a direct toggle is shorter. The
source-tracked highlight channel shipped with the assistant (ai/find) is the seed of the pattern —
this decision generalises it.

Trade-offs accepted: an abstraction layer (constraints + one visibility reducer) and a retrofit cost
for the existing controls, in exchange for legible, composable, undoable filter state. Adoption is
immediate for **new** work (call-level compare must not add a sixth layer); the retrofit of existing
controls is sequenced in the phase plan — until it lands, the old layers remain but gain no new
writers.
