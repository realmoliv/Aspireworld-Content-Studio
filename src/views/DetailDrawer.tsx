import { useState } from 'react';
import type { Item, ContentType, Pillar } from '@/types';
import { Button, Field, Input, Textarea, Select, Pill } from '@/components/ui';
import { AssetUploadManager } from '@/components/AssetUploadManager';
import { types, pillars, statuses, specMap, slug } from '@/constants';

interface DetailDrawerProps {
  item: Item;
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
          { author: currentUserName || 'Aryan Kapoor', text: comment, time: 'Now' },
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
                    onChange={(e) =>
                      onUpdate({
                        type: e.target.value as ContentType,
                        specs: specMap[e.target.value] || [],
                      })
                    }
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
                    value={item.assignee}
                    onChange={(e) => onUpdate({ assignee: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    <option>Aryan Kapoor</option>
                    <option>Mira Shah</option>
                  </Select>
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
              <Field label="ON-SCREEN TEXT — ONE SCENE OR SLIDE PER LINE" required>
                <Textarea
                  rows={6}
                  value={item.copy.onScreen}
                  onChange={(e) => onCopy('onScreen', e.target.value)}
                />
              </Field>
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
                  <h3>SHOT / SLIDE LIST</h3>
                </div>
                <Button
                  onClick={() =>
                    onUpdate({
                      shots: [
                        ...item.shots,
                        {
                          order: String(item.shots.length + 1).padStart(2, '0'),
                          visual: '',
                          text: '',
                        },
                      ],
                    })
                  }
                >
                  + ADD ROW
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
              <span className="eyebrow">PRE-SUBMISSION</span>
              <h3>QUALITY CHECKLIST</h3>
              <div className="checklist">
                {item.checklist.map((c, index) => (
                  <label key={c.label + index}>
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
                      <strong>{c.author}</strong>
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
  const add = () =>
    onUpdate({
      references: [
        ...item.references,
        { url: '', label: 'New reference', instruction: '', type: 'Inspiration' },
      ],
    });

  return (
    <div className="detail-section">
      <div className="shot-head">
        <div>
          <span className="eyebrow">SOURCE MATERIAL</span>
          <h3>REFERENCES</h3>
        </div>
        <Button onClick={add}>+ ADD LINK</Button>
      </div>
      {item.references.length ? (
        item.references.map((r, index) => (
          <div className="reference-row" key={index}>
            <Select
              value={r.type}
              onChange={(e) => {
                const n = [...item.references];
                n[index] = { ...r, type: e.target.value };
                onUpdate({ references: n });
              }}
            >
              {['Inspiration', 'Raw footage (Drive)', 'Brand asset', 'Competitor/Ad Library'].map(
                (x) => (
                  <option key={x}>{x}</option>
                )
              )}
            </Select>
            <Input
              value={r.label}
              onChange={(e) => {
                const n = [...item.references];
                n[index] = { ...r, label: e.target.value };
                onUpdate({ references: n });
              }}
            />
            <Input
              value={r.url}
              placeholder="https://"
              onChange={(e) => {
                const n = [...item.references];
                n[index] = { ...r, url: e.target.value };
                onUpdate({ references: n });
              }}
            />
            <Input
              value={r.instruction}
              placeholder="What should the editor copy?"
              onChange={(e) => {
                const n = [...item.references];
                n[index] = { ...r, instruction: e.target.value };
                onUpdate({ references: n });
              }}
            />
          </div>
        ))
      ) : (
        <p className="muted">No references added. Add one clear source before production.</p>
      )}
    </div>
  );
}
