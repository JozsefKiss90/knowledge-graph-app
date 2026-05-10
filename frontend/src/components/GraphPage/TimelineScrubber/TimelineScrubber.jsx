import React, { useEffect, useCallback } from "react";
import TimelineBarChart from "./TimelineBarChart";
import { useTimelineData } from "./useTimelineData";
import { useTimelineSelection } from "./useTimelineSelection";
import { formatRangeParts } from "./utils";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

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

  // Build range label parts
  const rangeParts =
    buckets.length > 0
      ? formatRangeParts(buckets[range.start]?.date, buckets[range.end]?.date)
      : null;

  if (!isOpen) return null;

  const displayCount = totalCalls;

  return (
    <div className="timeline-scrubber">
      {/* Top row: labels + legend + range */}
      <div className="timeline-scrubber__header">
        <div className="timeline-scrubber__label">
          <span className="timeline-scrubber__title">Calls over time</span>
          <span className="timeline-scrubber__count">
            {displayCount} CALL{displayCount !== 1 ? "S" : ""}
          </span>
        </div>
        <div className="timeline-scrubber__legend">
          <span className="timeline-scrubber__legend-item">
            <span className="timeline-scrubber__legend-dot timeline-scrubber__legend-dot--open" />
            Open
          </span>
          <span className="timeline-scrubber__legend-item">
            <span className="timeline-scrubber__legend-dot timeline-scrubber__legend-dot--upcoming" />
            Forthcoming
          </span>
          <span className="timeline-scrubber__legend-item">
            <span className="timeline-scrubber__legend-dot timeline-scrubber__legend-dot--closed" />
            Closed
          </span>
        </div>
        {rangeParts && (
          <div className="timeline-scrubber__range">
            <span>{rangeParts.start}</span>
            <ArrowForwardIcon className="timeline-scrubber__range-arrow" />
            <span>{rangeParts.end}</span>
          </div>
        )}
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
