import React from 'react';
import type { Item, FilterState, TeamMember } from '@/types';
import { SectionTitle, Button, Field, Select, Empty } from '@/components/ui';
import { types, pillars, statuses, slug, missing } from '@/constants';

interface CalendarViewProps {
  items: Item[];
  month: string;
  setMonth: (m: string) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
  ready: number;
  onOpen: (id: string) => void;
  onMove: (id: string, date: string) => void;
  onNew: () => void;
  teamMembers?: TeamMember[];
}

export function CalendarView({
  items,
  month,
  setMonth,
  filters,
  setFilters,
  filtersOpen,
  setFiltersOpen,
  ready,
  onOpen,
  onMove,
  onNew,
  teamMembers = [],
}: CalendarViewProps) {
  const [year, mon] = month.split('-').map(Number);
  const days = new Date(year, mon, 0).getDate();
  const start = new Date(year, mon - 1, 1).getDay();
  const cells = Array(start)
    .fill(null)
    .concat(Array.from({ length: days }, (_, i) => i + 1));
  const monthLabel = new Date(year, mon - 1)
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    .toUpperCase();

  const change = (d: number) => {
    const n = new Date(year, mon - 1 + d, 1);
    setMonth(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <>
      <SectionTitle
        eyebrow="CONTENT CALENDAR"
        title={monthLabel}
        action={
          <div className="month-actions">
            <Button onClick={() => change(-1)}>←</Button>
            <Button onClick={() => change(1)}>→</Button>
          </div>
        }
      />
      <div className="deadline">
        <div>
          <span className="deadline-mark">20</span>
          <p>
            <strong>NEXT MONTH'S PLAN LOCKS ON THE 20TH.</strong>
            <br />
            Creatives due by the 25th.
          </p>
        </div>
        <Button onClick={() => setFiltersOpen(!filtersOpen)}>
          FILTERS{' '}
          <span className="filter-count">
            {Object.values(filters).filter((x) => x !== 'All').length}
          </span>
        </Button>
      </div>

      {filtersOpen && (
        <div className="filter-row">
          {(['type', 'pillar', 'status', 'assignee'] as const).map((k) => (
            <Field key={k} label={k}>
              <Select
                value={filters[k]}
                onChange={(e) => setFilters({ ...filters, [k]: e.target.value })}
              >
                <option value="All">All</option>
                {k === 'type'
                  ? types.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))
                  : k === 'pillar'
                    ? pillars.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))
                    : k === 'status'
                      ? statuses.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))
                      : [
                          <option key="Unassigned" value="Unassigned">
                            Unassigned
                          </option>,
                          ...teamMembers.map((m) => (
                            <option key={m.id} value={m.full_name}>
                              {m.full_name}
                            </option>
                          )),
                        ]}
              </Select>
            </Field>
          ))}
        </div>
      )}

      <div className="progress-row">
        <div>
          <strong>
            {ready} OF {items.length} ITEMS READY
          </strong>
          <span>Approved, scheduled or posted</span>
        </div>
        <div className="progress">
          <i style={{ width: `${items.length ? (ready / items.length) * 100 : 0}%` }} />
        </div>
        <button className="view-toggle active">MONTH</button>
        <button className="view-toggle">LIST</button>
      </div>

      <div className="calendar">
        <div className="weekdays">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {cells.map((day, index) =>
            day ? (
              <div
                key={day}
                className="day"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) =>
                  onMove(
                    e.dataTransfer.getData('item-id'),
                    `${month}-${String(day).padStart(2, '0')}`
                  )
                }
              >
                <span className="day-num">{String(day).padStart(2, '0')}</span>
                <div className="day-items">
                  {items
                    .filter((i) => Number(i.date.slice(8)) === day)
                    .map((item) => (
                      <button
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('item-id', item.id)}
                        onClick={() => onOpen(item.id)}
                        key={item.id}
                        className={`calendar-item pillar-${slug(item.pillar)}`}
                      >
                        <span>
                          {item.type.toUpperCase()} ·{' '}
                          <b className={`status-${slug(item.status)}`}>
                            {item.status.toUpperCase()}
                          </b>
                        </span>
                        <strong>{item.title}</strong>
                        {missing(item) && <i title="Missing required details" />}
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <div key={`e${index}`} className="day empty-day" />
            )
          )}
        </div>
      </div>

      {!items.length && (
        <Empty
          title="NO ITEMS THIS MONTH"
          text="Build the month from a template or start with one clear brief."
          action="CREATE FIRST ITEM"
          onClick={onNew}
        />
      )}
    </>
  );
}
