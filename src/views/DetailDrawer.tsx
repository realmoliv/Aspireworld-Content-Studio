import { useState, useEffect, useCallback, useDeferredValue } from 'react';
import type { Item, ContentType, Pillar, TeamMember } from '@/types';
import { Button, Field, Input, Textarea, Select, Pill } from '@/components/ui';
import { AssetUploadManager } from '@/components/AssetUploadManager';
import { ReferenceEmbedPreview } from '@/components/ReferenceEmbedPreview';
import { useEntityDraft, type DraftPatch } from '@/hooks/useDebouncedSave';
import type { ItemPatch } from '@/hooks/useContentStudio';
import { types, pillars, statuses, specMap, slug, getChecklistForType, getUserDesignation, getUserTitleCaseDesignation } from '@/constants';

function parseCarouselSlides(onScreen: string): string[] {
  if (!onScreen || !onScreen.trim()) return [''];
  const markerRegex = /(?:^|\n\s*\n|\n)Slide\s*\d+\s*[:\-]\s*/i;
  if (markerRegex.test(onScreen)) {
    const parts = onScreen
      .split(markerRegex)
      .map((s) => s.trim())
      .filter((_, idx) => idx > 0);
    if (parts.length > 0) return parts.slice(0, 5);
  }
  const blocks = onScreen.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  if (blocks.length > 1) return blocks.slice(0, 5);
  return [onScreen.trim()];
}

function serializeCarouselSlides(slides: string[]): string {
  return slides
    .map((s, idx) => 'Slide ' + (idx + 1) + ':\n' + s.trim())
    .join('\n\n');
}

const SLIDE_HINTS = ['HOOK', 'CONTEXT', 'CORE VALUE', 'INSIGHT', 'CALL TO ACTION (CTA)'];

interface DetailDrawerProps {
  item: Item;
  teamMembers?: TeamMember[];
  onClose: () => void;
  onUpdate: (patch: Partial<Item>) => void | Promise<void>;
  onUpdateItem?: (id: string, patch: ItemPatch) => Promise<void> | void;
  onCopy: (key: keyof Item['copy'], value: string) => void | Promise<void>;
  onDuplicate: () => void;
  onDuplicateNext: () => void;
  setToast: (msg: string) => void;
  currentUserName?: string;
  canWrite?: boolean;
  isAdmin?: boolean;
  onUploadAsset?: (file: File, version: string) => Promise<any>;
  onDeleteAsset?: (assetId: string, storagePath?: string | null) => Promise<void>;
  onAddComment?: (text: string) => void;
  onDelete?: () => void;
}

export function DetailDrawer({
  item,
  teamMembers = [],
  onClose,
  onUpdate,
  onUpdateItem,
  onCopy,
  onDuplicate,
  onDuplicateNext,
  setToast,
  currentUserName,
  canWrite = true,
  isAdmin = true,
  onUploadAsset,
  onDeleteAsset,
  onAddComment,
  onDelete,
}: DetailDrawerProps) {
  const [tab, setTab] = useState<'brief' | 'copy' | 'shots' | 'assets' | 'review'>('brief');
  const [comment, setComment] = useState('');

  const persistDraft = useCallback(
    async (id: string, patch: DraftPatch<Item>) => {
      if (onUpdateItem) {
        await onUpdateItem(id, patch as ItemPatch);
        return;
      }
      const legacyPatch: any = { ...patch };
      if (patch.copy) {
        for (const [k, v] of Object.entries(patch.copy)) {
          if (v !== undefined) {
            await onCopy(k as keyof Item['copy'], String(v));
          }
        }
        delete legacyPatch.copy;
      }
      if (Object.keys(legacyPatch).length > 0) {
        await onUpdate(legacyPatch);
      }
    },
    [onUpdateItem, onUpdate, onCopy]
  );

  const {
    draft,
    saveState,
    errorMsg,
    queuePatch,
    commitImmediate,
    flush,
    flushIfDirty,
    retry,
  } = useEntityDraft<Item>({
    entityId: item.id,
    entity: item,
    onPersist: persistDraft,
    debounceMs: 600,
    onUnmountError: () => setToast('Failed to save changes. Check your connection.'),
  });

  const requestClose = useCallback(() => {
    void flush();
    onClose();
  }, [flush, onClose]);

  const isCarousel = draft.type === 'Carousel';

  const [slides, setSlides] = useState<string[]>(() => parseCarouselSlides(draft.copy.onScreen));

  useEffect(() => {
    setSlides(parseCarouselSlides(draft.copy.onScreen));
  }, [draft.id, draft.type]);

  const handleSlideChange = (index: number, val: string) => {
    const next = [...slides];
    next[index] = val;
    setSlides(next);
    queuePatch({ copy: { onScreen: serializeCarouselSlides(next) } });
  };

  const handleAddSlide = () => {
    if (slides.length >= 5) return;
    const next = [...slides, ''];
    setSlides(next);
    void commitImmediate({ copy: { onScreen: serializeCarouselSlides(next) } });
  };

  const handleRemoveSlide = (index: number) => {
    if (slides.length <= 1) {
      const next = [''];
      setSlides(next);
      void commitImmediate({ copy: { onScreen: '' } });
      return;
    }
    const next = slides.filter((_, idx) => idx !== index);
    setSlides(next);
    void commitImmediate({ copy: { onScreen: serializeCarouselSlides(next) } });
  };

  const copyBrief = () => {
    const text = `${draft.title}\n${draft.type} · ${draft.pillar} · ${draft.date} ${draft.time}\n\nGOAL\n${draft.goal}\n\nBRIEF\n${draft.brief}\n\nON-SCREEN TEXT\n${draft.copy.onScreen}\n\nCAPTION\n${draft.copy.caption}\n\nCTA\n${draft.copy.cta}\n\nSPECS\n${draft.specs.join('\n')}`;
    navigator.clipboard?.writeText(text);
    setToast('Brief copied for sharing.');
  };

  const addComment = () => {
    if (!comment.trim()) return;
    if (onAddComment) {
      onAddComment(comment);
    } else {
      void commitImmediate({
        comments: [
          ...draft.comments,
          { author: currentUserName || 'Team Member', text: comment, time: 'Now' },
        ],
      });
    }
    setComment('');
  };

  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
    >
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Content item detail">
        <header>
          <div>
            <Pill tone={`pillar-${slug(draft.pillar)}`}>{draft.pillar}</Pill>
            {draft.verifyDate && <Pill tone="verify">VERIFY DATE</Pill>}
            <h2>{draft.title}</h2>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span>
                {draft.date} · {draft.time}
              </span>
              {saveState === 'dirty' && (
                <small style={{ color: 'var(--grey)', fontSize: '0.7rem' }}>Unsaved…</small>
              )}
              {saveState === 'saving' && (
                <small style={{ color: 'var(--grey)', fontSize: '0.7rem' }}>Saving…</small>
              )}
              {saveState === 'saved' && (
                <small style={{ color: '#22c55e', fontSize: '0.7rem', fontWeight: 600 }}>Saved</small>
              )}
              {saveState === 'error' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#ef4444', fontSize: '0.7rem', fontWeight: 600 }}>
                  Save failed{errorMsg ? `: ${errorMsg}` : ''}
                  <button
                    type="button"
                    onClick={retry}
                    style={{
                      background: 'transparent',
                      border: '1px solid #ef4444',
                      color: '#ef4444',
                      padding: '0.1rem 0.4rem',
                      fontSize: '0.65rem',
                      cursor: 'pointer',
                    }}
                  >
                    Retry
                  </button>
                </span>
              )}
            </span>
          </div>
          <button className="close" onClick={requestClose} aria-label="Close detail">
            ×
          </button>
        </header>

        <div className="drawer-toolbar">
          <Button onClick={copyBrief}>COPY BRIEF</Button>
          <Button onClick={onDuplicate}>DUPLICATE</Button>
          <Button onClick={onDuplicateNext}>NEXT MONTH</Button>
          {onDelete && canWrite && (
            <Button
              onClick={() => {
                if (window.confirm(`Delete "${draft.title || 'Untitled item'}"?`)) {
                  onDelete();
                }
              }}
              style={{ color: '#fc0d12', borderColor: 'rgba(252, 13, 18, 0.4)', marginLeft: 'auto' }}
            >
              DELETE
            </Button>
          )}
        </div>

        <nav className="tabs">
          {(['brief', 'copy', 'shots', 'assets', 'review'] as const).map((x) => (
            <button
              key={x}
              className={tab === x ? 'active' : ''}
              onClick={() => setTab(x)}
            >
              {x.toUpperCase()}
            </button>
          ))}
        </nav>

        <div className="drawer-content">
          {tab === 'brief' && (
            <>
              <div className="form-grid">
                <Field label="TITLE" required className="span-2">
                  <Input
                    value={draft.title}
                    onChange={(e) => queuePatch({ title: e.target.value })}
                    onBlur={flushIfDirty}
                  />
                </Field>
                <Field label="CONTENT TYPE" required>
                  <Select
                    value={draft.type}
                    onChange={(e) => {
                      const newType = e.target.value as ContentType;
                      const prevStandards = getChecklistForType(draft.type);
                      const isDefaultOrEmpty =
                        draft.checklist.length === 0 ||
                        draft.checklist.every(
                          (c, idx) => !c.done && c.label === prevStandards[idx]
                        );

                      void commitImmediate({
                        type: newType,
                        specs: specMap[newType] || [],
                        ...(isDefaultOrEmpty
                          ? {
                              checklist: getChecklistForType(newType).map((label) => ({
                                label,
                                done: false,
                              })),
                            }
                          : {}),
                      });
                    }}
                  >
                    {types.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="PILLAR" required>
                  <Select
                    value={draft.pillar}
                    onChange={(e) => void commitImmediate({ pillar: e.target.value as Pillar })}
                  >
                    {pillars.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="POST DATE" required>
                  <Input
                    type="date"
                    value={draft.date}
                    onChange={(e) => queuePatch({ date: e.target.value })}
                    onBlur={flushIfDirty}
                  />
                </Field>
                <Field label="TIME">
                  <Input
                    type="time"
                    value={draft.time}
                    onChange={(e) => queuePatch({ time: e.target.value })}
                    onBlur={flushIfDirty}
                  />
                </Field>
                <Field label="ASSIGNEE" required>
                  <Select
                    value={draft.assigneeId || teamMembers?.find((m) => m.full_name === draft.assignee)?.id || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) {
                        void commitImmediate({ assignee: '', assigneeId: null });
                      } else {
                        const member = teamMembers?.find((m) => m.id === selectedId);
                        void commitImmediate({
                          assignee: member?.full_name || '',
                          assigneeId: selectedId,
                        });
                      }
                    }}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers && teamMembers.length > 0 ? (
                      teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name} — {getUserTitleCaseDesignation(member.full_name, member.role)}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No users available</option>
                    )}
                  </Select>
                  {draft.assignee && (
                    <div className="assignee-role-badge">
                      <span className="eyebrow">ROLE:</span>
                      <strong>{getUserDesignation(draft.assignee)}</strong>
                    </div>
                  )}
                </Field>
                <Field label="STATUS">
                  <Select
                    value={draft.status}
                    onChange={(e) => void commitImmediate({ status: e.target.value as any })}
                  >
                    {statuses.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="GOAL">
                  <Select
                    value={draft.goal}
                    onChange={(e) => void commitImmediate({ goal: e.target.value })}
                  >
                    {['Get Clients', 'Build Trust', 'Festive', 'Product/Merch'].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="PRIORITY">
                  <Select
                    value={draft.priority}
                    onChange={(e) => void commitImmediate({ priority: e.target.value })}
                  >
                    {['Low', 'Normal', 'High'].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="BRIEF" required className="span-2">
                  <Textarea
                    rows={5}
                    value={draft.brief}
                    placeholder="State the objective, sequence and outcome."
                    onChange={(e) => queuePatch({ brief: e.target.value })}
                    onBlur={flushIfDirty}
                  />
                </Field>
              </div>

              <DetailReferences
                item={draft}
                onQueuePatch={queuePatch}
                onCommitImmediate={commitImmediate}
                onBlurFlush={flushIfDirty}
              />

              <div className="spec-block">
                <span className="eyebrow">AUTO-ATTACHED SPECS</span>
                <h3>{draft.type.toUpperCase()}</h3>
                <div>
                  {draft.specs.map((x) => (
                    <Pill key={x}>{x}</Pill>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'copy' && (
            <div className="copy-fields">
              {isCarousel ? (
                <div className="carousel-slides-wrap">
                  <div className="carousel-header-bar">
                    <div className="carousel-header-title">
                      <strong>CAROUSEL SLIDES ({slides.length}/5)</strong>
                      <small>Max 5 slides allowed for carousels</small>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleAddSlide}
                      disabled={slides.length >= 5}
                    >
                      {slides.length >= 5 ? 'MAX 5 REACHED' : '+ ADD SLIDE'}
                    </Button>
                  </div>
                  <div className="carousel-slides-container">
                    {slides.map((slideText, idx) => (
                      <div key={idx} className="carousel-slide-card">
                        <div className="carousel-slide-head">
                          <span className="carousel-slide-badge">
                            SLIDE {String(idx + 1).padStart(2, '0')}
                            <span className="carousel-slide-tag">
                              — {SLIDE_HINTS[idx] || `SLIDE ${idx + 1}`}
                            </span>
                          </span>
                          {slides.length > 1 && (
                            <button
                              type="button"
                              className="carousel-btn-remove"
                              onClick={() => handleRemoveSlide(idx)}
                              title="Delete slide"
                            >
                              ✕ REMOVE
                            </button>
                          )}
                        </div>
                        <Textarea
                          rows={3}
                          value={slideText}
                          placeholder={`Enter on-screen text for slide ${idx + 1}...`}
                          onChange={(e) => handleSlideChange(idx, e.target.value)}
                          onBlur={flushIfDirty}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Field label="ON-SCREEN TEXT — ONE SCENE PER LINE" required>
                  <Textarea
                    rows={6}
                    value={draft.copy.onScreen}
                    onChange={(e) => queuePatch({ copy: { onScreen: e.target.value } })}
                    onBlur={flushIfDirty}
                  />
                </Field>
              )}
              <Field label="CAPTION" required>
                <Textarea
                  rows={6}
                  value={draft.copy.caption}
                  onChange={(e) => queuePatch({ copy: { caption: e.target.value } })}
                  onBlur={flushIfDirty}
                />
              </Field>
              <Field label="HASHTAGS — MAX 5">
                <Input
                  value={draft.copy.hashtags}
                  onChange={(e) =>
                    queuePatch({ copy: { hashtags: e.target.value.split(' ').slice(0, 5).join(' ') } })
                  }
                  onBlur={flushIfDirty}
                />
              </Field>
              <Field label="CALL TO ACTION" required>
                <Input
                  value={draft.copy.cta}
                  onChange={(e) => queuePatch({ copy: { cta: e.target.value } })}
                  onBlur={flushIfDirty}
                />
              </Field>
              <Field label="VOICEOVER OR SCRIPT">
                <Textarea
                  rows={8}
                  value={draft.copy.script}
                  onChange={(e) => queuePatch({ copy: { script: e.target.value } })}
                  onBlur={flushIfDirty}
                />
              </Field>
            </div>
          )}

          {tab === 'shots' && (
            <div>
              <div className="shot-head">
                <div>
                  <span className="eyebrow">PRODUCTION ORDER</span>
                  <h3>{isCarousel ? 'SLIDE LIST (MAX 5)' : 'SHOT / SLIDE LIST'}</h3>
                </div>
                <Button
                  disabled={isCarousel && draft.shots.length >= 5}
                  onClick={() => {
                    if (isCarousel && draft.shots.length >= 5) return;
                    void commitImmediate({
                      shots: [
                        ...draft.shots,
                        {
                          order: String(draft.shots.length + 1).padStart(2, '0'),
                          visual: '',
                          text: '',
                        },
                      ],
                    });
                  }}
                >
                  {isCarousel && draft.shots.length >= 5 ? 'MAX 5 REACHED' : '+ ADD ROW'}
                </Button>
              </div>
              {draft.shots.map((s, index) => (
                <div className="shot-row" key={s.id || index}>
                  <Input
                    value={s.order}
                    onChange={(e) => {
                      const n = [...draft.shots];
                      n[index] = { ...s, order: e.target.value };
                      queuePatch({ shots: n });
                    }}
                    onBlur={flushIfDirty}
                  />
                  <Textarea
                    rows={2}
                    placeholder="Visual description"
                    value={s.visual}
                    onChange={(e) => {
                      const n = [...draft.shots];
                      n[index] = { ...s, visual: e.target.value };
                      queuePatch({ shots: n });
                    }}
                    onBlur={flushIfDirty}
                  />
                  <Textarea
                    rows={2}
                    placeholder="Text on screen"
                    value={s.text}
                    onChange={(e) => {
                      const n = [...draft.shots];
                      n[index] = { ...s, text: e.target.value };
                      queuePatch({ shots: n });
                    }}
                    onBlur={flushIfDirty}
                  />
                </div>
              ))}
            </div>
          )}

          {tab === 'assets' && (
            <AssetUploadManager
              itemId={draft.id}
              assets={draft.assets || []}
              onUpload={onUploadAsset || (async () => {})}
              onDelete={onDeleteAsset || (async () => {})}
              canWrite={canWrite}
              isAdmin={isAdmin}
            />
          )}

          {tab === 'review' && (
            <>
              <div className="review-checklist-section">
                <div className="review-checklist-header">
                  <div>
                    <span className="eyebrow">{draft.type.toUpperCase()} VERIFICATION</span>
                    <h3>QUALITY & ALGORITHM CHECKLIST</h3>
                  </div>
                  <div className="review-checklist-actions">
                    <span className="review-checklist-count">
                      {draft.checklist.filter((c) => c.done).length} / {draft.checklist.length} PASSED
                    </span>
                    <Button
                      type="button"
                      onClick={() => {
                        void commitImmediate({
                          checklist: getChecklistForType(draft.type).map((label) => ({
                            label,
                            done: false,
                          })),
                        });
                        setToast(`Loaded standard ${draft.type} checklist.`);
                      }}
                      title={`Reset to recommended criteria for ${draft.type}`}
                    >
                      SYNC {draft.type.toUpperCase()} STANDARD
                    </Button>
                  </div>
                </div>

                <div className="review-progress-bar">
                  <div
                    className="review-progress-fill"
                    style={{
                      width: `${
                        draft.checklist.length
                          ? (draft.checklist.filter((c) => c.done).length / draft.checklist.length) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <div className="checklist">
                  {draft.checklist.map((c, index) => (
                    <label key={c.label + index} className={c.done ? 'checked' : ''}>
                      <input
                        type="checkbox"
                        checked={c.done}
                        onChange={() => {
                          const n = [...draft.checklist];
                          n[index] = { ...c, done: !c.done };
                          void commitImmediate({ checklist: n });
                        }}
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="comments">
                <span className="eyebrow">REVIEW THREAD</span>
                {draft.comments.map((c, idx) => (
                  <div key={c.id || idx}>
                    <span className="avatar">
                      {c.author
                        .split(' ')
                        .map((x) => x[0])
                        .join('')}
                    </span>
                    <p>
                      <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        {c.author}
                        <span className="comment-role-tag">{getUserDesignation(c.author)}</span>
                      </strong>
                      <small>{c.time}</small>
                      {c.text}
                    </p>
                  </div>
                ))}
                <Field label="ADD COMMENT">
                  <Textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </Field>
                <Button onClick={addComment}>POST COMMENT</Button>
              </div>

              <div className="approval">
                <Button
                  onClick={() => {
                    void commitImmediate({ status: 'In Design/Edit' });
                    setToast('Changes requested.');
                  }}
                >
                  REQUEST CHANGES
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    void commitImmediate({ status: 'Approved' });
                    setToast('Item approved.');
                  }}
                >
                  APPROVE
                </Button>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function DeferredReferencePreview({ url, label }: { url: string; label: string }) {
  const deferredUrl = useDeferredValue(url);
  return <ReferenceEmbedPreview url={deferredUrl} label={label} />;
}

function DetailReferences({
  item,
  onQueuePatch,
  onCommitImmediate,
  onBlurFlush,
}: {
  item: Item;
  onQueuePatch: (patch: DraftPatch<Item>) => void;
  onCommitImmediate: (patch: DraftPatch<Item>) => Promise<void>;
  onBlurFlush: () => void;
}) {
  const [collapsedIndices, setCollapsedIndices] = useState<Record<number, boolean>>({});

  const toggleCollapse = (idx: number) => {
    setCollapsedIndices((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const add = () => {
    void onCommitImmediate({
      references: [
        ...item.references,
        { url: '', label: '', instruction: '', type: 'Inspiration' },
      ],
    });
  };

  const remove = (index: number) => {
    const next = item.references.filter((_, idx) => idx !== index);
    void onCommitImmediate({ references: next });
  };

  return (
    <div className="detail-section">
      <div className="shot-head">
        <div>
          <span className="eyebrow">SOURCE MATERIAL</span>
          <h3>REFERENCES & EMBEDDED PREVIEWS</h3>
        </div>
        <Button onClick={add}>+ ADD LINK</Button>
      </div>

      {item.references.length ? (
        <div className="reference-list-editor">
          {item.references.map((r, index) => {
            const isCollapsed = !!collapsedIndices[index];
            return (
              <div className="reference-card-editor" key={r.id || index}>
                <div className="reference-card-head">
                  <div className="reference-card-title-group">
                    <span className="reference-card-badge">REF 0{index + 1}</span>
                    <span className="reference-card-type-pill">{r.type}</span>
                    <strong className="reference-card-label-display">
                      {r.label || 'Untitled Reference'}
                    </strong>
                  </div>
                  <div className="reference-card-actions">
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="reference-card-link-btn"
                        title="Open in new window"
                      >
                        OPEN ↗
                      </a>
                    )}
                    <button
                      type="button"
                      className="reference-card-toggle-btn"
                      onClick={() => toggleCollapse(index)}
                    >
                      {isCollapsed ? 'EXPAND' : 'COLLAPSE'}
                    </button>
                    <button
                      type="button"
                      className="reference-card-remove-btn"
                      onClick={() => remove(index)}
                      title="Remove reference"
                    >
                      ✕ REMOVE
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="reference-card-body">
                    <div className="reference-card-fields">
                      <Field label="REF TYPE">
                        <Select
                          value={r.type}
                          onChange={(e) => {
                            const n = [...item.references];
                            n[index] = { ...r, type: e.target.value };
                            void onCommitImmediate({ references: n });
                          }}
                        >
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
                      <Field label="LABEL / TITLE">
                        <Input
                          value={r.label}
                          placeholder="e.g. Trendzilla — Hook reference"
                          onChange={(e) => {
                            const n = [...item.references];
                            n[index] = { ...r, label: e.target.value };
                            onQueuePatch({ references: n });
                          }}
                          onBlur={onBlurFlush}
                        />
                      </Field>
                      <Field label="REFERENCE LINK (URL)" className="span-2">
                        <Input
                          value={r.url}
                          placeholder="Paste YouTube, Vimeo, Drive, Instagram, Figma, Image, or Web URL..."
                          onChange={(e) => {
                            const n = [...item.references];
                            n[index] = { ...r, url: e.target.value };
                            onQueuePatch({ references: n });
                          }}
                          onBlur={onBlurFlush}
                        />
                      </Field>
                      <Field label="EDITOR INSTRUCTION / NOTES" className="span-2">
                        <Input
                          value={r.instruction}
                          placeholder="What should the editor copy or notice from this reference?"
                          onChange={(e) => {
                            const n = [...item.references];
                            n[index] = { ...r, instruction: e.target.value };
                            onQueuePatch({ references: n });
                          }}
                          onBlur={onBlurFlush}
                        />
                      </Field>
                    </div>

                    <div className="reference-card-preview-area">
                      <span className="eyebrow" style={{ marginBottom: '0.4rem', display: 'block' }}>
                        LIVE EMBED PREVIEW
                      </span>
                      <DeferredReferencePreview
                        url={r.url}
                        label={r.label || `Reference ${index + 1}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="muted">No references added. Add one clear source before production.</p>
      )}
    </div>
  );
}
