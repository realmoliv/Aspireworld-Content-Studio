import { useState, useEffect } from 'react';
import type { Item, ContentType, Pillar, TeamMember } from '@/types';
import { Button, Field, Input, Textarea, Select, Pill } from '@/components/ui';
import { AssetUploadManager } from '@/components/AssetUploadManager';
import { ReferenceEmbedPreview } from '@/components/ReferenceEmbedPreview';
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
  onUpdate: (patch: Partial<Item>) => void;
  onCopy: (key: keyof Item['copy'], value: string) => void;
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

  const isCarousel = item.type === 'Carousel';

  const [slides, setSlides] = useState<string[]>(() => parseCarouselSlides(item.copy.onScreen));

  useEffect(() => {
    setSlides(parseCarouselSlides(item.copy.onScreen));
  }, [item.id, item.type]);

  const handleSlideChange = (index: number, val: string) => {
    const next = [...slides];
    next[index] = val;
    setSlides(next);
    onCopy('onScreen', serializeCarouselSlides(next));
  };

  const handleAddSlide = () => {
    if (slides.length >= 5) return;
    const next = [...slides, ''];
    setSlides(next);
    onCopy('onScreen', serializeCarouselSlides(next));
  };

  const handleRemoveSlide = (index: number) => {
    if (slides.length <= 1) {
      const next = [''];
      setSlides(next);
      onCopy('onScreen', '');
      return;
    }
    const next = slides.filter((_, idx) => idx !== index);
    setSlides(next);
    onCopy('onScreen', serializeCarouselSlides(next));
  };

  const copyBrief = () => {
    const text = `${item.title}\n${item.type} · ${item.pillar} · ${item.date} ${item.time}\n\nGOAL\n${item.goal}\n\nBRIEF\n${item.brief}\n\nON-SCREEN TEXT\n${item.copy.onScreen}\n\nCAPTION\n${item.copy.caption}\n\nCTA\n${item.copy.cta}\n\nSPECS\n${item.specs.join('\n')}`;
    navigator.clipboard?.writeText(text);
    setToast('Brief copied for sharing.');
  };

  const addComment = () => {
    if (!comment.trim()) return;
    if (onAddComment) {
      onAddComment(comment);
    } else {
      onUpdate({
        comments: [
          ...item.comments,
          { author: currentUserName || 'Team Member', text: comment, time: 'Now' },
        ],
      });
    }
    setComment('');
  };

  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Content item detail">
        <header>
          <div>
            <Pill tone={`pillar-${slug(item.pillar)}`}>{item.pillar}</Pill>
            {item.verifyDate && <Pill tone="verify">VERIFY DATE</Pill>}
            <h2>{item.title}</h2>
            <span>
              {item.date} · {item.time}
            </span>
          </div>
          <button className="close" onClick={onClose} aria-label="Close detail">
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
                if (window.confirm(`Delete "${item.title || 'Untitled item'}"?`)) {
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
                    value={item.title}
                    onChange={(e) => onUpdate({ title: e.target.value })}
                  />
                </Field>
                <Field label="CONTENT TYPE" required>
                  <Select
                    value={item.type}
                    onChange={(e) => {
                      const newType = e.target.value as ContentType;
                      const prevStandards = getChecklistForType(item.type);
                      const isDefaultOrEmpty =
                        item.checklist.length === 0 ||
                        item.checklist.every(
                          (c, idx) => !c.done && c.label === prevStandards[idx]
                        );

                      onUpdate({
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
                    value={item.pillar}
                    onChange={(e) => onUpdate({ pillar: e.target.value as Pillar })}
                  >
                    {pillars.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="POST DATE" required>
                  <Input
                    type="date"
                    value={item.date}
                    onChange={(e) => onUpdate({ date: e.target.value })}
                  />
                </Field>
                <Field label="TIME">
                  <Input
                    type="time"
                    value={item.time}
                    onChange={(e) => onUpdate({ time: e.target.value })}
                  />
                </Field>
                <Field label="ASSIGNEE" required>
                  <Select
                    value={item.assigneeId || teamMembers?.find((m) => m.full_name === item.assignee)?.id || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) {
                        onUpdate({ assignee: '', assigneeId: null });
                      } else {
                        const member = teamMembers?.find((m) => m.id === selectedId);
                        onUpdate({
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
                  {item.assignee && (
                    <div className="assignee-role-badge">
                      <span className="eyebrow">ROLE:</span>
                      <strong>{getUserDesignation(item.assignee)}</strong>
                    </div>
                  )}
                </Field>
                <Field label="STATUS">
                  <Select
                    value={item.status}
                    onChange={(e) => onUpdate({ status: e.target.value as any })}
                  >
                    {statuses.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="GOAL">
                  <Select
                    value={item.goal}
                    onChange={(e) => onUpdate({ goal: e.target.value })}
                  >
                    {['Get Clients', 'Build Trust', 'Festive', 'Product/Merch'].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="PRIORITY">
                  <Select
                    value={item.priority}
                    onChange={(e) => onUpdate({ priority: e.target.value })}
                  >
                    {['Low', 'Normal', 'High'].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="BRIEF" required className="span-2">
                  <Textarea
                    rows={5}
                    value={item.brief}
                    placeholder="State the objective, sequence and outcome."
                    onChange={(e) => onUpdate({ brief: e.target.value })}
                  />
                </Field>
              </div>

              <DetailReferences item={item} onUpdate={onUpdate} />

              <div className="spec-block">
                <span className="eyebrow">AUTO-ATTACHED SPECS</span>
                <h3>{item.type.toUpperCase()}</h3>
                <div>
                  {item.specs.map((x) => (
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
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Field label="ON-SCREEN TEXT — ONE SCENE PER LINE" required>
                  <Textarea
                    rows={6}
                    value={item.copy.onScreen}
                    onChange={(e) => onCopy('onScreen', e.target.value)}
                  />
                </Field>
              )}
              <Field label="CAPTION" required>
                <Textarea
                  rows={6}
                  value={item.copy.caption}
                  onChange={(e) => onCopy('caption', e.target.value)}
                />
              </Field>
              <Field label="HASHTAGS — MAX 5">
                <Input
                  value={item.copy.hashtags}
                  onChange={(e) =>
                    onCopy('hashtags', e.target.value.split(' ').slice(0, 5).join(' '))
                  }
                />
              </Field>
              <Field label="CALL TO ACTION" required>
                <Input value={item.copy.cta} onChange={(e) => onCopy('cta', e.target.value)} />
              </Field>
              <Field label="VOICEOVER OR SCRIPT">
                <Textarea
                  rows={8}
                  value={item.copy.script}
                  onChange={(e) => onCopy('script', e.target.value)}
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
                  disabled={isCarousel && item.shots.length >= 5}
                  onClick={() => {
                    if (isCarousel && item.shots.length >= 5) return;
                    onUpdate({
                      shots: [
                        ...item.shots,
                        {
                          order: String(item.shots.length + 1).padStart(2, '0'),
                          visual: '',
                          text: '',
                        },
                      ],
                    });
                  }}
                >
                  {isCarousel && item.shots.length >= 5 ? 'MAX 5 REACHED' : '+ ADD ROW'}
                </Button>
              </div>
              {item.shots.map((s, index) => (
                <div className="shot-row" key={index}>
                  <Input
                    value={s.order}
                    onChange={(e) => {
                      const n = [...item.shots];
                      n[index] = { ...s, order: e.target.value };
                      onUpdate({ shots: n });
                    }}
                  />
                  <Textarea
                    rows={2}
                    placeholder="Visual description"
                    value={s.visual}
                    onChange={(e) => {
                      const n = [...item.shots];
                      n[index] = { ...s, visual: e.target.value };
                      onUpdate({ shots: n });
                    }}
                  />
                  <Textarea
                    rows={2}
                    placeholder="Text on screen"
                    value={s.text}
                    onChange={(e) => {
                      const n = [...item.shots];
                      n[index] = { ...s, text: e.target.value };
                      onUpdate({ shots: n });
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {tab === 'assets' && (
            <AssetUploadManager
              itemId={item.id}
              assets={item.assets || []}
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
                    <span className="eyebrow">{item.type.toUpperCase()} VERIFICATION</span>
                    <h3>QUALITY & ALGORITHM CHECKLIST</h3>
                  </div>
                  <div className="review-checklist-actions">
                    <span className="review-checklist-count">
                      {item.checklist.filter((c) => c.done).length} / {item.checklist.length} PASSED
                    </span>
                    <Button
                      type="button"
                      onClick={() => {
                        onUpdate({
                          checklist: getChecklistForType(item.type).map((label) => ({
                            label,
                            done: false,
                          })),
                        });
                        setToast(`Loaded standard ${item.type} checklist.`);
                      }}
                      title={`Reset to recommended criteria for ${item.type}`}
                    >
                      SYNC {item.type.toUpperCase()} STANDARD
                    </Button>
                  </div>
                </div>

                <div className="review-progress-bar">
                  <div
                    className="review-progress-fill"
                    style={{
                      width: `${
                        item.checklist.length
                          ? (item.checklist.filter((c) => c.done).length / item.checklist.length) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <div className="checklist">
                  {item.checklist.map((c, index) => (
                    <label key={c.label + index} className={c.done ? 'checked' : ''}>
                      <input
                        type="checkbox"
                        checked={c.done}
                        onChange={() => {
                          const n = [...item.checklist];
                          n[index] = { ...c, done: !c.done };
                          onUpdate({ checklist: n });
                        }}
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="comments">
                <span className="eyebrow">REVIEW THREAD</span>
                {item.comments.map((c, idx) => (
                  <div key={idx}>
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
                    onUpdate({ status: 'In Design/Edit' });
                    setToast('Changes requested.');
                  }}
                >
                  REQUEST CHANGES
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    onUpdate({ status: 'Approved' });
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

function DetailReferences({ item, onUpdate }: { item: Item; onUpdate: (patch: Partial<Item>) => void }) {
  const [collapsedIndices, setCollapsedIndices] = useState<Record<number, boolean>>({});

  const toggleCollapse = (idx: number) => {
    setCollapsedIndices((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const add = () => {
    onUpdate({
      references: [
        ...item.references,
        { url: '', label: '', instruction: '', type: 'Inspiration' },
      ],
    });
  };

  const remove = (index: number) => {
    const next = item.references.filter((_, idx) => idx !== index);
    onUpdate({ references: next });
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
                            onUpdate({ references: n });
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
                            onUpdate({ references: n });
                          }}
                        />
                      </Field>
                      <Field label="REFERENCE LINK (URL)" className="span-2">
                        <Input
                          value={r.url}
                          placeholder="Paste YouTube, Vimeo, Drive, Instagram, Figma, Image, or Web URL..."
                          onChange={(e) => {
                            const n = [...item.references];
                            n[index] = { ...r, url: e.target.value };
                            onUpdate({ references: n });
                          }}
                        />
                      </Field>
                      <Field label="EDITOR INSTRUCTION / NOTES" className="span-2">
                        <Input
                          value={r.instruction}
                          placeholder="What should the editor copy or notice from this reference?"
                          onChange={(e) => {
                            const n = [...item.references];
                            n[index] = { ...r, instruction: e.target.value };
                            onUpdate({ references: n });
                          }}
                        />
                      </Field>
                    </div>

                    <div className="reference-card-preview-area">
                      <span className="eyebrow" style={{ marginBottom: '0.4rem', display: 'block' }}>
                        LIVE EMBED PREVIEW
                      </span>
                      <ReferenceEmbedPreview
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
