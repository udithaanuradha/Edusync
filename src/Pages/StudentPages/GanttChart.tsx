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

/**
 * Standalone Gantt chart: a milestone-name column on the left, and a
 * timeline column on the right (month axis + one bar per milestone). The
 * axis, bars, and "today" line are all positioned as a percentage of the
 * timeline column's own width — never the name column — so they stay
 * aligned regardless of how wide the milestone names are.
 */
const GanttChart: React.FC<GanttChartProps> = ({ tasks, timelineStart, timelineEnd }) => {
  const ganttData = useMemo(() => {
    const parsedTasks = tasks
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

    if (parsedTasks.length === 0) {
      return null;
    }

    const allDates = parsedTasks.flatMap((entry) => [entry.start, entry.end]);
    if (timelineStart) allDates.push(new Date(`${timelineStart}T00:00:00`));
    if (timelineEnd) allDates.push(new Date(`${timelineEnd}T00:00:00`));

    const rangeStart = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const rangeEnd = new Date(Math.max(...allDates.map((d) => d.getTime())));
    const totalMs = Math.max(rangeEnd.getTime() - rangeStart.getTime(), DAY_MS);

    const toPercent = (date: Date) => ((date.getTime() - rangeStart.getTime()) / totalMs) * 100;

    const bars = parsedTasks.map((entry) => {
      const left = toPercent(entry.start);
      // +1 day so the bar visually includes the end date itself
      const right = toPercent(new Date(entry.end.getTime() + DAY_MS));
      const durationDays = Math.max(1, Math.round((entry.end.getTime() - entry.start.getTime()) / DAY_MS) + 1);
      return {
        id: entry.task.id,
        name: entry.task.name,
        startDate: entry.task.startDate,
        endDate: entry.task.endDate,
        durationDays,
        leftPercent: Math.max(0, Math.min(100, left)),
        widthPercent: Math.max(2, Math.min(100, right - left)),
      };
    });

    // Month tick marks along the top axis
    const monthTicks: { key: string; label: string; percent: number }[] = [];
    const tickCursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (tickCursor <= rangeEnd) {
      monthTicks.push({
        key: tickCursor.toISOString(),
        label: tickCursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        percent: Math.max(0, Math.min(100, toPercent(tickCursor))),
      });
      tickCursor.setMonth(tickCursor.getMonth() + 1);
    }

    const today = new Date();
    const todayPercent = today >= rangeStart && today <= rangeEnd ? toPercent(today) : null;

    return { bars, monthTicks, todayPercent };
  }, [tasks, timelineStart, timelineEnd]);

  if (!ganttData) {
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
      <div className="gantt-chart-body">
        {/* Left column: milestone names, on their own tinted background */}
        <div className="gantt-chart-label-column">
          <div className="gantt-chart-label-spacer" />
          {ganttData.bars.map((bar) => (
            <div className="gantt-chart-label-row" key={bar.id} title={bar.name}>
              {bar.name}
            </div>
          ))}
        </div>

        {/* Right column: month axis + one bar per milestone, all measured
            against this column's own width so everything stays aligned */}
        <div className="gantt-chart-track-column">
          <div className="gantt-chart-axis">
            {ganttData.monthTicks.map((tick) => (
              <span key={tick.key} className="gantt-chart-axis-tick" style={{ left: `${tick.percent}%` }}>
                {tick.label}
              </span>
            ))}
          </div>
          <div className="gantt-chart-rows">
            {ganttData.bars.map((bar) => (
              <div className="gantt-chart-row-track" key={bar.id}>
                <div
                  className="gantt-chart-bar"
                  style={{ left: `${bar.leftPercent}%`, width: `${bar.widthPercent}%` }}
                  title={`${bar.startDate} → ${bar.endDate}`}
                >
                  <span className="gantt-chart-bar-label">{bar.durationDays}d</span>
                </div>
              </div>
            ))}
            {ganttData.todayPercent !== null && (
              <div className="gantt-chart-today-line" style={{ left: `${ganttData.todayPercent}%` }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
