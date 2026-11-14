import type { Lead } from '@/types';
import { SectionTitle, Button, Input, Select } from '@/components/ui';

interface LeadsViewProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  onAddLead?: () => void;
  onUpdateLead?: (leadId: string, patch: Partial<Lead>) => void;
}

export function LeadsView({ leads, setLeads, onAddLead, onUpdateLead }: LeadsViewProps) {
  const add = () => {
    if (onAddLead) {
      onAddLead();
    } else {
      setLeads((prev) => [
        ...prev,
        {
          id: `l${Date.now()}`,
          date: '2026-11-20',
          source: 'Organic',
          name: 'New lead',
          contact: '',
          service: '',
          budget: '',
          status: 'New',
          followUp: '',
        },
      ]);
    }
  };

  const set = (id: string, key: keyof Lead, value: string) => {
    if (onUpdateLead) {
      onUpdateLead(id, { [key]: value });
    }
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, [key]: value } : l)));
  };

  return (
    <>
      <SectionTitle
        eyebrow="CLIENT PIPELINE"
        title="LEAD TRACKER"
        action={
          <Button variant="primary" onClick={add}>
            + ADD LEAD
          </Button>
        }
      />
      <div className="lead-stats">
        {[
          ['LEADS THIS WEEK', leads.length],
          ['QUALIFIED', leads.filter((l) => l.status === 'Qualified').length],
          ['CALLS BOOKED', leads.filter((l) => l.status === 'Call booked').length],
          ['CLOSED', leads.filter((l) => l.status === 'Closed').length],
        ].map(([a, b]) => (
          <div key={a as string}>
            <strong>{String(b).padStart(2, '0')}</strong>
            <span>{a}</span>
          </div>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {[
                'DATE',
                'SOURCE',
                'NAME',
                'CONTACT',
                'SERVICE NEEDED',
                'BUDGET',
                'STATUS',
                'FOLLOW-UP',
              ].map((x) => (
                <th key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td>
                  <Input
                    type="date"
                    value={l.date}
                    onChange={(e) => set(l.id, 'date', e.target.value)}
                  />
                </td>
                <td>
                  <Select
                    value={l.source}
                    onChange={(e) => set(l.id, 'source', e.target.value)}
                  >
                    {['Ad', 'Organic', 'Outreach', 'Referral'].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </td>
                {(['name', 'contact', 'service', 'budget'] as const).map((k) => (
                  <td key={k}>
                    <Input value={l[k]} onChange={(e) => set(l.id, k, e.target.value)} />
                  </td>
                ))}
                <td>
                  <Select
                    value={l.status}
                    onChange={(e) => set(l.id, 'status', e.target.value)}
                  >
                    {['New', 'Qualified', 'Call booked', 'Closed', 'Lost'].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </td>
                <td>
                  <Input
                    type="date"
                    value={l.followUp}
                    onChange={(e) => set(l.id, 'followUp', e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
