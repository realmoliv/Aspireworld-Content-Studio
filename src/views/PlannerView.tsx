import React from 'react';
import type { Pillar } from '@/types';
import { SectionTitle, Button, Field, Input, Pill } from '@/components/ui';
import { pillars, slug } from '@/constants';

interface PlannerViewProps {
  step: number;
  setStep: (s: number) => void;
  month: string;
  setMonth: (m: string) => void;
  counts: Record<Pillar, number>;
  setCounts: React.Dispatch<React.SetStateAction<Record<Pillar, number>>>;
  onGenerate: () => void;
}

export function PlannerView({
  step,
  setStep,
  month,
  setMonth,
  counts,
  setCounts,
  onGenerate,
}: PlannerViewProps) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <SectionTitle
        eyebrow="MONTHLY PLANNER"
        title="PLAN NEXT MONTH"
        action={<Pill>STEP 0{step} / 04</Pill>}
      />
      <div className="planner">
        <aside>
          {['PICK THE MONTH', 'SET THE MIX', 'GENERATE DATES', 'REVIEW PLAN'].map((x, i) => (
            <button
              className={step === i + 1 ? 'active' : ''}
              onClick={() => setStep(i + 1)}
              key={x}
            >
              <span>0{i + 1}</span>
              {x}
            </button>
          ))}
        </aside>
        <section>
          {step === 1 && (
            <>
              <span className="eyebrow">STEP ONE</span>
              <h2>SELECT THE MONTH</h2>
              <p>Plan before the lock date. December is ready for the next cycle.</p>
              <Field label="Planning month">
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </Field>
              <Button variant="primary" onClick={() => setStep(2)}>
                CONTINUE
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <span className="eyebrow">STEP TWO</span>
              <h2>SET THE CONTENT MIX</h2>
              <p>Set an intentional volume for every pillar.</p>
              <div className="count-list">
                {pillars.map((p) => (
                  <div key={p}>
                    <span className={`pillar-dot pillar-${slug(p)}`} />
                    <strong>{p}</strong>
                    <div>
                      <Button
                        onClick={() => setCounts({ ...counts, [p]: Math.max(0, counts[p] - 1) })}
                      >
                        −
                      </Button>
                      <span>{counts[p]}</span>
                      <Button onClick={() => setCounts({ ...counts, [p]: counts[p] + 1 })}>
                        +
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="primary" onClick={() => setStep(3)}>
                BUILD DATE PATTERN
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <span className="eyebrow">STEP THREE</span>
              <h2>GENERATE THE DATES</h2>
              <p>
                {total} empty cards will be placed across Monday, Wednesday, Friday and Saturday.
              </p>
              <div className="pattern">
                <span>MON</span>
                <span>WED</span>
                <span>FRI</span>
                <span>SAT</span>
              </div>
              <Button variant="primary" onClick={() => setStep(4)}>
                PREVIEW PLAN
              </Button>
            </>
          )}
          {step === 4 && (
            <>
              <span className="eyebrow">STEP FOUR</span>
              <h2>REVIEW THE PLAN</h2>
              <p>{total} cards. Six pillars. One production rhythm.</p>
              <div className="review-stats">
                <div>
                  <strong>{total}</strong>
                  <span>TOTAL ITEMS</span>
                </div>
                <div>
                  <strong>4</strong>
                  <span>POSTING DAYS</span>
                </div>
                <div>
                  <strong>{month}</strong>
                  <span>MONTH</span>
                </div>
              </div>
              <Button variant="primary" onClick={onGenerate}>
                GENERATE MONTH
              </Button>
            </>
          )}
        </section>
        <div className="planner-preview">
          <span>OUTPUT PREVIEW</span>
          <strong>{total}</strong>
          <p>EMPTY CARDS</p>
          <small>MON / WED / FRI / SAT</small>
        </div>
      </div>
    </>
  );
}
