import type { ReferenceItem } from '@/types';
import { SectionTitle, Button, Input, Pill } from '@/components/ui';
import { savedReferences } from '@/constants';

interface ReferenceViewProps {
  search: string;
  setSearch: (s: string) => void;
  onUse: (ref: ReferenceItem) => void;
}

export function ReferenceView({ search, setSearch, onUse }: ReferenceViewProps) {
  const refs = savedReferences.filter((r) =>
    r.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <SectionTitle
        eyebrow="SOURCE MATERIAL"
        title="REFERENCE LIBRARY"
        action={<Button>SAVE REFERENCE</Button>}
      />
      <div className="library-tools">
        <Input
          aria-label="Search references"
          placeholder="Search saved references"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Pill>{refs.length} SAVED</Pill>
      </div>
      <div className="reference-grid">
        {refs.map((r, index) => (
          <article className="reference-card" key={r.url}>
            <div className="ref-preview">
              <span>0{index + 1}</span>
              <strong>
                RAW
                <br />
                FOOTAGE
              </strong>
            </div>
            <div className="ref-body">
              <div>
                <Pill>{r.pillar}</Pill>
                <Pill>{r.type}</Pill>
              </div>
              <h2>{r.label}</h2>
              <p>{r.instruction}</p>
              <div className="ref-actions">
                <a href={r.url} target="_blank" rel="noreferrer">
                  OPEN SOURCE ↗
                </a>
                <Button onClick={() => onUse(r)}>USE IN ITEM</Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
