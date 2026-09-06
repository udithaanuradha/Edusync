import React, { useMemo } from 'react';
import './GanttChart.css';

export interface GanttTask {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface GanttChartProps {
  tasks: GanttTask[];
  timelineStart?: string;
  timelineEnd?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const AXIS_MARKER_COUNT = 5;
// Below this bar width, the date-range label wouldn't fit inside the bar
// itself, so it's placed just to the right of it instead.
const MIN_WIDTH_FOR_INLINE_LABEL = 18;

const formatShort = (date: Date): string =>
  date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

const formatFull = (date: Date): string =>
  date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Clean, standard-looking Gantt chart: milestone names on the left, one bar
 * per milestone on the right spanning its real start–end dates, labeled
 * with the actual date range (not just a day count). A handful of evenly
 * spaced axis markers with matching gridlines give clear reference points
 * across the whole span, instead of a tick for every individual date.
 */
const GanttChart: React.FC<GanttChartProps> = ({ tasks, timelineStart, timelineEnd }) => {
  const data = useMemo(() => {
    const parsed = tasks
      .map((task) => ({
        task,
        start: task.startDate ? new Date(`${task.startDate}T00:00:00`) : null,
        end: task.endDate ? new Date(`${task.endDate}T00:00:00`) : null,
      }))
      .filter(
        (entry): entry is { task: GanttTask; start: Date; end: Date } =>
          entry.start !== null &&
          entry.end !== null &&
          !Number.isNaN(entry.start.getTime()) &&
          !Number.isNaN(entry.end.getTime()),
      );

    if (parsed.length === 0) return null;

    const allDates = parsed.flatMap((entry) => [entry.start, entry.end]);
    if (timelineStart) allDates.push(new Date(`${timelineStart}T00:00:00`));
    if (timelineEnd) allDates.push(new Date(`${timelineEnd}T00:00:00`));

    const rangeStart = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const rangeEnd = new Date(Math.max(...allDates.map((d) => d.getTime())));
    const totalMs = Math.max(rangeEnd.getTime() - rangeStart.getTime(), DAY_MS);
    const toPercent = (date: Date) => ((date.getTime() - rangeStart.getTime()) / totalMs) * 100;

    const rows = parsed.map((entry) => {
      const left = Math.max(0, Math.min(100, toPercent(entry.start)));
      // +1 day so the bar visually includes the end date itself
      const rightRaw = toPercent(new Date(entry.end.getTime() + DAY_MS));
      const width = Math.max(2, Math.min(100 - left, rightRaw - left));
      return {
        id: entry.task.id,
        name: entry.task.name,
        rangeLabel: `${formatShort(entry.start)} – ${formatShort(entry.end)}`,
        leftPercent: left,
        widthPercent: width,
      };
    });

    // A handful of evenly spaced axis markers spanning the whole range —
    // clear, consistent reference points instead of one tick per milestone
    // date (which crowds and overlaps once several dates sit close together).
    const axisMarkers = Array.from({ length: AXIS_MARKER_COUNT }, (_, i) => {
      const percent = (i / (AXIS_MARKER_COUNT - 1)) * 100;
      const time = rangeStart.getTime() + (totalMs * i) / (AXIS_MARKER_COUNT - 1);
      return { key: `marker-${i}`, label: formatShort(new Date(time)), percent };
    });

    return {
      rows,
      axisMarkers,
      rangeCaption: `${formatFull(rangeStart)} – ${formatFull(rangeEnd)}`,
    };
  }, [tasks, timelineStart, timelineEnd]);

  if (!data) {
    return (
      <div className="gantt-chart-wrapper">
        <h4 className="gantt-chart-title">Timeline Overview (Gantt Chart)</h4>
        <p className="gantt-chart-empty">Add at least one milestone with a start and end date to see it plotted here.</p>
      </div>
    );
  }

  return (
    <div className="gantt-chart-wrapper">
      <h4 className="gantt-chart-title">Timeline Overview (Gantt Chart)</h4>
      <p className="gantt-chart-range-caption">{data.rangeCaption}</p>

      <div className="gantt-chart-body">
        {/* Left column: milestone names, on their own tinted background */}
        <div className="gantt-chart-label-column">
          <div className="gantt-chart-label-spacer" />
          {data.rows.map((row) => (
            <div className="gantt-chart-label-row" key={row.id} title={row.name}>
              {row.name}
            </div>
          ))}
        </div>

        {/* Right column: axis markers + one bar per milestone, all measured
            against this column's own width so everything stays aligned */}
        <div className="gantt-chart-track-column">
          <div className="gantt-chart-axis">
            {data.axisMarkers.map((marker) => (
              <span key={marker.key} className="gantt-chart-axis-tick" style={{ left: `${marker.percent}%` }}>
                {marker.label}
              </span>
            ))}
          </div>
          <div className="gantt-chart-rows">
            {data.axisMarkers.map((marker) => (
              <div
                key={`grid-${marker.key}`}
                className="gantt-chart-gridline"
                style={{ left: `${marker.percent}%` }}
                aria-hidden="true"
              />
            ))}
            {data.rows.map((row) => {
              const showInline = row.widthPercent >= MIN_WIDTH_FOR_INLINE_LABEL;
              return (
                <div className="gantt-chart-row-track" key={row.id}>
                  <div
                    className="gantt-chart-bar"
                    style={{ left: `${row.leftPercent}%`, width: `${row.widthPercent}%` }}
                    title={`${row.name}: ${row.rangeLabel}`}
                  >
                    {showInline && <span className="gantt-chart-bar-label">{row.rangeLabel}</span>}
                  </div>
                  {!showInline && (
                    <span
                      className="gantt-chart-bar-label-external"
                      // Flip to the bar's left side once it's close enough to the
                      // right edge that a right-side label would run off the chart.
                      style={
                        row.leftPercent + row.widthPercent > 80
                          ? { right: `calc(${100 - row.leftPercent}% + 8px)` }
                          : { left: `calc(${row.leftPercent + row.widthPercent}% + 8px)` }
                      }
                    >
                      {row.rangeLabel}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
