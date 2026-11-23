import { useState, useEffect } from 'react';
import type { ReferenceItem, Pillar } from '@/types';
import { SectionTitle, Button, Input, Pill, Field, Select } from '@/components/ui';
import { ReferenceEmbedPreview } from '@/components/ReferenceEmbedPreview';
import { savedReferences, pillars } from '@/constants';

interface ReferenceViewProps {
  search: string;
  setSearch: (s: string) => void;
  onUse: (ref: ReferenceItem) => void;
}

const STORAGE_KEY = 'aspire_saved_references_custom';

export function ReferenceView({ search, setSearch, onUse }: ReferenceViewProps) {
  const [libraryRefs, setLibraryRefs] = useState<ReferenceItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse stored references', e);
    }
    return savedReferences;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState('Inspiration');
  const [newPillar, setNewPillar] = useState<Pillar>('Proof');
  const [newInstruction, setNewInstruction] = useState('');
  const [activePreviewRef, setActivePreviewRef] = useState<ReferenceItem | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(libraryRefs));
    } catch (e) {
      console.warn('Failed to save references to localStorage', e);
    }
  }, [libraryRefs]);

  const handleSaveReference = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newUrl.trim()) return;

    const newRef: ReferenceItem = {
      label: newLabel.trim(),
      url: newUrl.trim(),
      type: newType,
      pillar: newPillar,
      instruction: newInstruction.trim(),
    };

    setLibraryRefs((prev) => [newRef, ...prev]);
    setNewLabel('');
    setNewUrl('');
    setNewInstruction('');
    setIsModalOpen(false);
  };

  const filtered = libraryRefs.filter((r) =>
    r.label.toLowerCase().includes(search.toLowerCase()) ||
    (r.instruction && r.instruction.toLowerCase().includes(search.toLowerCase())) ||
    (r.type && r.type.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <SectionTitle
        eyebrow="SOURCE MATERIAL"
        title="REFERENCE LIBRARY"
        action={
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            + SAVE REFERENCE
          </Button>
        }
      />

      <div className="library-tools">
        <Input
          aria-label="Search references"
          placeholder="Search saved references by title, type, or notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Pill>{filtered.length} SAVED</Pill>
      </div>

      <div className="reference-grid">
        {filtered.map((r, index) => (
          <article className="reference-card" key={r.url + index}>
            <div
              className="ref-preview-wrap"
              onClick={() => setActivePreviewRef(r)}
              title="Click to view full preview"
            >
              <ReferenceEmbedPreview url={r.url} label={r.label} compact />
            </div>

            <div className="ref-body">
              <div className="ref-body-tags">
                {r.pillar && <Pill>{r.pillar}</Pill>}
                <Pill>{r.type}</Pill>
              </div>
              <h2>{r.label}</h2>
              <p>{r.instruction}</p>
              <div className="ref-actions">
                <button
                  type="button"
                  className="ref-preview-btn"
                  onClick={() => setActivePreviewRef(r)}
                >
                  PREVIEW EMBED
                </button>
                <a href={r.url} target="_blank" rel="noreferrer" className="ref-source-link">
                  OPEN SOURCE ↗
                </a>
                <Button onClick={() => onUse(r)}>USE IN ITEM</Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* FULL EMBED PREVIEW MODAL */}
      {activePreviewRef && (
        <div className="modal-backdrop" onClick={() => setActivePreviewRef(null)}>
          <div className="modal-content ref-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">{activePreviewRef.type.toUpperCase()}</span>
                <h3>{activePreviewRef.label}</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActivePreviewRef(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {activePreviewRef.instruction && (
                <p className="ref-modal-instruction">
                  <strong>Instruction:</strong> {activePreviewRef.instruction}
                </p>
              )}
              <ReferenceEmbedPreview
                url={activePreviewRef.url}
                label={activePreviewRef.label}
              />
            </div>
            <div className="modal-foot">
              <a
                href={activePreviewRef.url}
                target="_blank"
                rel="noreferrer"
                className="ref-source-link"
              >
                OPEN ORIGINAL SOURCE ↗
              </a>
              <Button
                variant="primary"
                onClick={() => {
                  onUse(activePreviewRef);
                  setActivePreviewRef(null);
                }}
              >
                USE IN CURRENT ITEM
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD REFERENCE MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content ref-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">NEW SOURCE MATERIAL</span>
                <h3>ADD REFERENCE TO LIBRARY</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReference} className="modal-body form-grid">
              <Field label="REFERENCE TITLE / LABEL" required className="span-2">
                <Input
                  value={newLabel}
                  placeholder="e.g. Shark Tank hook pacing reference"
                  onChange={(e) => setNewLabel(e.target.value)}
                  required
                />
              </Field>

              <Field label="REFERENCE TYPE" required>
                <Select value={newType} onChange={(e) => setNewType(e.target.value)}>
                  {[
                    'Inspiration',
                    'Pinterest / Moodboard',
                    'Raw footage (Drive)',
                    'Brand asset',
                    'Competitor/Ad Library',
                    'Social Media',
                    'Design / UI',
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </Select>
              </Field>

              <Field label="CONTENT PILLAR">
                <Select
                  value={newPillar}
                  onChange={(e) => setNewPillar(e.target.value as Pillar)}
                >
                  {pillars.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </Select>
              </Field>

              <Field label="REFERENCE LINK (URL)" required className="span-2">
                <Input
                  value={newUrl}
                  placeholder="https://youtube.com/..., https://drive.google.com/..., etc."
                  onChange={(e) => setNewUrl(e.target.value)}
                  required
                />
              </Field>

              <Field label="INSTRUCTION / EDITOR NOTES" className="span-2">
                <Input
                  value={newInstruction}
                  placeholder="What should the team notice or replicate from this?"
                  onChange={(e) => setNewInstruction(e.target.value)}
                />
              </Field>

              {newUrl.trim() && (
                <div className="span-2 ref-modal-live-preview">
                  <span className="eyebrow">LIVE EMBED PREVIEW</span>
                  <ReferenceEmbedPreview url={newUrl} label={newLabel || 'Reference preview'} />
                </div>
              )}

              <div className="span-2 modal-foot">
                <Button type="button" onClick={() => setIsModalOpen(false)}>
                  CANCEL
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!newLabel.trim() || !newUrl.trim()}
                >
                  SAVE REFERENCE
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
