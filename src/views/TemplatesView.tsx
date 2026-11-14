import type { Item, ContentType, Pillar } from '@/types';
import { SectionTitle, Button, Pill } from '@/components/ui';
import { templates } from '@/constants';

interface TemplatesViewProps {
  onUse: (preset: Partial<Item>) => void;
}

export function TemplatesView({ onUse }: TemplatesViewProps) {
  return (
    <>
      <SectionTitle
        eyebrow="REUSABLE SYSTEMS"
        title="BRIEF TEMPLATES"
        action={<Button>+ NEW TEMPLATE</Button>}
      />
      <p className="page-intro">
        Start with a proven structure. Replace every placeholder before production.
      </p>
      <div className="template-grid">
        {templates.map((t, index) => (
          <article className="template-card" key={t[0]}>
            <span className="template-index">0{index + 1}</span>
            <Pill>{t[1]}</Pill>
            <h2>{t[0]}</h2>
            <p>{t[2]}</p>
            <div className="template-footer">
              <span>{t[1] === 'Reel' ? '6' : '4'} CHECKS INCLUDED</span>
              <Button
                onClick={() =>
                  onUse({
                    title: t[0],
                    type: t[1] as ContentType,
                    brief: t[2],
                    pillar: (t[0].includes('Offer')
                      ? 'Offer'
                      : t[0].includes('Festival')
                        ? 'Festive'
                        : t[0].includes('Behind')
                          ? 'Behind the Scenes'
                          : t[0].includes('Value')
                            ? 'Value'
                            : 'Proof') as Pillar,
                  })
                }
              >
                USE TEMPLATE
              </Button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
