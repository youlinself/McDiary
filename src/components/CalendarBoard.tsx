import type { CalendarEvent } from "../types";
import { WEEK_LABELS, formatMonthCN, monthMatrix, parseYmd, toYmd } from "../utils/date";

export interface DayAgg {
  total: number;
  count: number;
}

interface CalendarBoardProps {
  year: number;
  month: number;
  selectedDate: string;
  today: string;
  ordersByDate: Map<string, DayAgg>;
  activitiesByDate: Map<string, CalendarEvent[]>;
  onSelectDate: (ymd: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

function formatMoney(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function CalendarBoard({
  year,
  month,
  selectedDate,
  today,
  ordersByDate,
  activitiesByDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onToday,
}: CalendarBoardProps) {
  const weeks = monthMatrix(year, month);
  const todayDate = parseYmd(today);
  const isCurrentMonth =
    todayDate.getFullYear() === year && todayDate.getMonth() + 1 === month;

  return (
    <div className="calendar">
      <div className="calendar__head">
        <div>
          <h2 className="calendar__title">{formatMonthCN(year, month)}</h2>
          <p className="calendar__hint">点击日期查看当天的消费与活动</p>
        </div>
        <div className="calendar__nav">
          <button type="button" className="btn btn--icon" onClick={onPrevMonth} aria-label="上个月">
            ‹
          </button>
          {!isCurrentMonth && (
            <button type="button" className="btn btn--small" onClick={onToday}>
              回到今天
            </button>
          )}
          <button type="button" className="btn btn--icon" onClick={onNextMonth} aria-label="下个月">
            ›
          </button>
        </div>
      </div>

      <div className="calendar__weekdays">
        {WEEK_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="calendar__grid">
        {weeks.flat().map((date) => {
          const ymd = toYmd(date);
          const inMonth = date.getMonth() === month - 1;
          const agg = ordersByDate.get(ymd);
          const events = activitiesByDate.get(ymd) ?? [];
          const classes = ["day"];
          if (!inMonth) classes.push("day--muted");
          if (ymd === today) classes.push("day--today");
          if (ymd === selectedDate) classes.push("day--selected");

          return (
            <button
              type="button"
              key={ymd}
              className={classes.join(" ")}
              onClick={() => onSelectDate(ymd)}
            >
              <span className="day__num">{date.getDate()}</span>
              <span className="day__markers">
                {agg ? <span className="day__spend">¥{formatMoney(agg.total)}</span> : null}
                {events.length > 0 ? (
                  <span className="day__dots">
                    {events.slice(0, 3).map((event, index) => (
                      <i key={`${event.activityCode}-${index}`} />
                    ))}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="calendar__legend">
        <span>
          <i className="legend-dot legend-dot--spend" />
          消费记录
        </span>
        <span>
          <i className="legend-dot legend-dot--activity" />
          麦麦活动
        </span>
      </div>
    </div>
  );
}
