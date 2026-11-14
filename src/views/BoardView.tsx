import type { Item, Status } from '@/types';
import { SectionTitle, Pill } from '@/components/ui';
import { statuses, slug, missing } from '@/constants';

interface BoardViewProps {
  items: Item[];
  onOpen: (id: string) => void;
  onStatus: (id: string, status: Status) => void;
}

export function BoardView({ items, onOpen, onStatus }: BoardViewProps) {
  return (
    <>
      <SectionTitle
        eyebrow="PRODUCTION FLOW"
        title="WEEK BOARD"
        action={<Pill>{items.length} ACTIVE ITEMS</Pill>}
      />
      <div className="board">
        {statuses.map((status, index) => (
          <section
            className="board-column"
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onStatus(e.dataTransfer.getData('item-id'), status)}
          >
            <header>
              <span>0{index + 1}</span>
              <strong>{status.toUpperCase()}</strong>
              <small>{items.filter((i) => i.status === status).length}</small>
            </header>
            <div className="board-stack">
              {items
                .filter((i) => i.status === status)
                .map((item) => (
                  <button
                    key={item.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('item-id', item.id)}
                    className="board-card"
                    onClick={() => onOpen(item.id)}
                  >
                    <span className={`pillar-line pillar-${slug(item.pillar)}`} />
                    <small>
                      {item.date.slice(8)} NOV · {item.type.toUpperCase()}
                    </small>
                    <strong>{item.title}</strong>
                    <div>
                      <Pill>{item.pillar}</Pill>
                      {missing(item) && <i className="missing-dot" />}
                    </div>
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
