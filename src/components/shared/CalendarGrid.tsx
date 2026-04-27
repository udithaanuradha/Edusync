import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type CalendarGridMarker = {
  day: number;
  type: 'panel' | 'frozen';
  panels?: number;
  label?: string;
};

type CalendarGridProps = {
  monthName: string;
  cells: Array<number | null>;
  markerMap: Map<number, CalendarGridMarker>;
  isCoordinator: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (day: number) => void;
};

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CalendarGrid: React.FC<CalendarGridProps> = ({
  monthName,
  cells,
  markerMap,
  isCoordinator,
  onPrevMonth,
  onNextMonth,
  onDayClick,
}) => {
  return (
    <section className="calendar-main-card" aria-label="Calendar grid">
      <div className="month-nav-row">
        <button type="button" className="month-icon-btn" aria-label="Previous month" onClick={onPrevMonth}>
          <ChevronLeft size={16} />
        </button>

        <h3>{monthName}</h3>

        <button type="button" className="month-icon-btn" aria-label="Next month" onClick={onNextMonth}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="weekday-row">
        {weekDays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="month-grid">
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`blank-${idx}`} className="day-cell day-cell-empty" />;
          }

          const marker = markerMap.get(day);
          const typeClass = marker ? `marker-${marker.type}` : '';

          return (
            <button
              key={day}
              type="button"
              className={`day-cell ${typeClass} ${isCoordinator ? 'clickable-day' : ''}`.trim()}
              onClick={() => onDayClick(day)}
            >
              <span className="day-number">{day}</span>

              {marker?.type === 'panel' && (
                <span className="panel-count">
                  {marker.panels || 1} Panel{(marker.panels || 1) > 1 ? 's' : ''}
                </span>
              )}
              {marker?.type === 'frozen' && <span className="freeze-pill">Frozen</span>}
            </button>
          );
        })}
      </div>

      <div className="calendar-legend-row">
        <div className="legend-item"><span className="legend-swatch legend-panel" />Scheduled panel</div>
        <div className="legend-item"><span className="legend-swatch legend-frozen" />Frozen date</div>
      </div>
    </section>
  );
};

export default CalendarGrid;