import React, { useEffect, useCallback } from "react";
import TimelineBarChart from "./TimelineBarChart";
import { useTimelineData } from "./useTimelineData";
import { useTimelineSelection } from "./useTimelineSelection";
import { formatRangeLabel } from "./utils";

/**
 * Timeline scrubber: shows open calls over time as a bar chart
 * with a draggable range selection.
 */
export default function TimelineScrubber({
  loadFromStore,
  currentKey,
  levels,
  isOpen,
  onSelectionChange,
}) {
  const { buckets, totalCalls, callsInYear } = useTimelineData(loadFromStore, currentKey, levels);

  const {
    range,
    startDrag,
    onDragMove,
    endDrag,
    jumpTo,
  } = useTimelineSelection(buckets.length);

  // Notify parent when selection changes
  const notifySelection = useCallback(() => {
    if (!onSelectionChange || buckets.length === 0) return;

    const startDate = buckets[range.start]?.date || null;
    const endBucket = buckets[range.end];
    // End date = last day of the end month
    const endDate = endBucket
      ? new Date(endBucket.date.getFullYear(), endBucket.date.getMonth() + 1, 0)
      : null;

    const isFullRange = range.start === 0 && range.end === buckets.length - 1;
    onSelectionChange(isFullRange ? null : { start: startDate, end: endDate });
  }, [onSelectionChange, buckets, range]);

  useEffect(() => {
    notifySelection();
  }, [notifySelection]);

  // Build range label
  const rangeLabel =
    buckets.length > 0
      ? formatRangeLabel(buckets[range.start]?.date, buckets[range.end]?.date)
      : "";

  if (!isOpen) return null;

  const displayCount = callsInYear || totalCalls;

  return (
    <div className="timeline-scrubber">
      {/* Top row: labels + range */}
      <div className="timeline-scrubber__header">
        <div className="timeline-scrubber__label">
          <span className="timeline-scrubber__title">Calls over time</span>
          <span className="timeline-scrubber__count">
            {displayCount} CALL{displayCount !== 1 ? "S" : ""}
          </span>
        </div>
        <div className="timeline-scrubber__range">{rangeLabel}</div>
      </div>

      {/* Chart fills remaining height */}
      <div className="timeline-scrubber__chart">
        <TimelineBarChart
          buckets={buckets}
          selectionRange={range}
          onStartDrag={startDrag}
          onDragMove={onDragMove}
          onEndDrag={endDrag}
          onJumpTo={jumpTo}
        />
      </div>
    </div>
  );
}
