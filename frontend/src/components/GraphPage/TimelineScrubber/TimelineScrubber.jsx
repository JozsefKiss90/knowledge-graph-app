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
  const { buckets, totalCalls } = useTimelineData(loadFromStore, currentKey, levels);

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

  // Count calls within selected range
  const selectedCount =
    buckets.length > 0
      ? buckets.slice(range.start, range.end + 1).reduce((sum, b) => Math.max(sum, b.count), 0)
      : 0;

  void selectedCount; // available for future use

  if (!isOpen) return null;

  return (
    <div className={`timeline-scrubber${buckets.length === 0 ? " timeline-scrubber--empty" : ""}`}>
      {/* Left label */}
      <div className="timeline-scrubber__label">
        <span className="timeline-scrubber__title">Calls over time</span>
        <span className="timeline-scrubber__count">
          {totalCalls} CALL{totalCalls !== 1 ? "S" : ""}
        </span>
      </div>

      {/* Center: bar chart */}
      <div className="timeline-scrubber__chart">
        {buckets.length > 0 ? (
          <TimelineBarChart
            buckets={buckets}
            selectionRange={range}
            onStartDrag={startDrag}
            onDragMove={onDragMove}
            onEndDrag={endDrag}
            onJumpTo={jumpTo}
          />
        ) : (
          <div className="timeline-scrubber__empty-msg">
            No call dates available for this layer
          </div>
        )}
      </div>

      {/* Right: range display */}
      <div className="timeline-scrubber__range">{rangeLabel}</div>
    </div>
  );
}
