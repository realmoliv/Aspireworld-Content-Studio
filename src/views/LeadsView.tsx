import React, { useState, useMemo } from 'react';
import type { Lead, TeamMember, LeadActivity } from '@/types';
import { SectionTitle, Button, Input, Select, Pill } from '@/components/ui';
import {
  leadStatuses,
  leadSources,
  holdReasons,
  dateChangeReasons,
  leadStatusConfig,
  getUserTitleCaseDesignation,
  defaultTeamMembers,
} from '@/constants';

interface LeadsViewProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  teamMembers?: TeamMember[];
  currentUser?: string;
  setToast?: (msg: string) => void;
  onAddLead?: () => void;
  onUpdateLead?: (leadId: string, patch: Partial<Lead>) => void;
  onDeleteLead?: (leadId: string) => void;
}

function getDaysDifference(dateStr?: string): {
  diff: number | null;
  isToday: boolean;
  isOverdue: boolean;
} {
  if (!dateStr || !dateStr.trim()) return { diff: null, isToday: false, isOverdue: false };
  const target = new Date(dateStr + 'T00:00:00');
  if (isNaN(target.getTime())) return { diff: null, isToday: false, isOverdue: false };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return {
    diff: diffDays,
    isToday: diffDays === 0,
    isOverdue: diffDays < 0,
  };
}

function formatLeadDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getOffsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function LeadsView({
  leads,
  setLeads,
  teamMembers = [],
  currentUser = 'Akshay',
  setToast,
  onAddLead,
  onUpdateLead,
  onDeleteLead,
}: LeadsViewProps) {
  // Modal states
  const [onHoldModalLead, setOnHoldModalLead] = useState<Lead | null>(null);
  const [onHoldPrevStatus, setOnHoldPrevStatus] = useState<string>('New');
  const [selectedHoldReason, setSelectedHoldReason] = useState<string>('Budget');
  const [customHoldReason, setCustomHoldReason] = useState<string>('');
  const [holdResumeDate, setHoldResumeDate] = useState<string>(getOffsetDate(7));

  const [dateChangeModal, setDateChangeModal] = useState<{
    lead: Lead;
    oldDate: string;
    newDate: string;
  } | null>(null);
  const [selectedDateReason, setSelectedDateReason] = useState<string>('Client rescheduled');
  const [customDateReason, setCustomDateReason] = useState<string>('');

  const [callBookedModalLead, setCallBookedModalLead] = useState<Lead | null>(null);
  const [callBookedPrevStatus, setCallBookedPrevStatus] = useState<string>('New');
  const [callBookedDate, setCallBookedDate] = useState<string>(getOffsetDate(2));

  const [activeActivityLead, setActiveActivityLead] = useState<Lead | null>(null);
  const [newActivityNote, setNewActivityNote] = useState<string>('');

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [ownerFilter, setOwnerFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [queueTab, setQueueTab] = useState<'all' | 'overdue' | 'today' | 'upcoming'>('all');

  const effectiveTeamMembers = useMemo(() => {
    const list = [...(teamMembers || [])];
    for (const def of defaultTeamMembers) {
      if (!list.some((m) => m.full_name.toLowerCase().includes(def.full_name.toLowerCase().split(' ')[0]))) {
        list.push(def);
      }
    }
    return list;
  }, [teamMembers]);

  const getSelectedOwnerValue = (owner?: string) => {
    if (!owner) return '';
    const match = effectiveTeamMembers.find(
      (m) =>
        m.full_name.toLowerCase() === owner.toLowerCase() ||
        m.full_name.toLowerCase().startsWith(owner.toLowerCase()) ||
        owner.toLowerCase().startsWith(m.full_name.toLowerCase().split(' ')[0])
    );
    return match ? match.full_name : owner;
  };

  const add = () => {
    if (onAddLead) {
      onAddLead();
    } else {
      const newLead: Lead = {
        id: `l${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        source: 'Organic',
        name: 'New lead',
        contact: '',
        service: '',
        budget: '',
        status: 'New',
        followUp: '',
        owner: currentUser,
        activityLog: [
          {
            id: `act_${Date.now()}`,
            timestamp: new Date().toISOString(),
            author: currentUser,
            action: 'Lead created',
            type: 'note',
          },
        ],
      };
      setLeads((prev) => [newLead, ...prev]);
    }
  };

  const update = (id: string, patch: Partial<Lead>) => {
    if (onUpdateLead) {
      onUpdateLead(id, patch);
    }
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const logActivity = (
    lead: Lead,
    action: string,
    type: LeadActivity['type'] = 'status'
  ): LeadActivity[] => {
    const newEntry: LeadActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      author: currentUser,
      action,
      type,
    };
    const updatedLog = [newEntry, ...(lead.activityLog || [])];
    return updatedLog;
  };

  // Status Change Handler
  const handleStatusChange = (lead: Lead, newStatus: string) => {
    if (lead.status === newStatus) return;

    if (newStatus === 'On hold') {
      setOnHoldPrevStatus(lead.status);
      setOnHoldModalLead(lead);
      setSelectedHoldReason('Budget');
      setCustomHoldReason('');
      setHoldResumeDate(lead.followUp || getOffsetDate(7));
      return;
    }

    if (newStatus === 'Call booked') {
      if (!lead.followUp) {
        setCallBookedPrevStatus(lead.status);
        setCallBookedModalLead(lead);
        setCallBookedDate(getOffsetDate(2));
        return;
      }
    }

    const actionText = `${currentUser} → Status changed from ${lead.status} to ${newStatus}`;
    const newLog = logActivity(lead, actionText, 'status');
    update(lead.id, { status: newStatus, activityLog: newLog });
  };

  // Confirm On Hold Modal
  const confirmOnHold = () => {
    if (!onHoldModalLead) return;
    const effectiveReason = customHoldReason.trim() || selectedHoldReason;
    const formattedDate = formatLeadDate(holdResumeDate);
    const actionText = `${currentUser} → On hold, resume ${formattedDate}, reason: ${effectiveReason}`;

    const newLog = logActivity(onHoldModalLead, actionText, 'status');

    update(onHoldModalLead.id, {
      status: 'On hold',
      holdReason: effectiveReason,
      resumeDate: holdResumeDate,
      followUp: holdResumeDate,
      activityLog: newLog,
    });

    setOnHoldModalLead(null);
    if (setToast) setToast(`Lead placed on hold until ${formattedDate}.`);
  };

  // Cancel On Hold Modal
  const cancelOnHold = () => {
    setOnHoldModalLead(null);
  };

  // Confirm Call Booked Modal
  const confirmCallBooked = () => {
    if (!callBookedModalLead) return;
    const formattedDate = formatLeadDate(callBookedDate);
    const actionText = `${currentUser} → Call booked for ${formattedDate}`;

    const newLog = logActivity(callBookedModalLead, actionText, 'status');

    update(callBookedModalLead.id, {
      status: 'Call booked',
      followUp: callBookedDate,
      activityLog: newLog,
    });

    setCallBookedModalLead(null);
    if (setToast) setToast(`Call booked and follow-up set for ${formattedDate}.`);
  };

  // Date Change Handler
  const handleFollowUpChange = (lead: Lead, newDate: string) => {
    const oldDate = lead.followUp || '';
    if (newDate === oldDate) return;

    // If changing an already set date, prompt for reason
    if (oldDate && newDate) {
      setDateChangeModal({ lead, oldDate, newDate });
      setSelectedDateReason('Client rescheduled');
      setCustomDateReason('');
      return;
    }

    // Direct change if previously empty
    const actionText = `${currentUser} → Follow-up set to ${formatLeadDate(newDate)}`;
    const newLog = logActivity(lead, actionText, 'date_change');
    update(lead.id, { followUp: newDate, activityLog: newLog });
  };

  // Confirm Date Change
  const confirmDateChange = () => {
    if (!dateChangeModal) return;
    const { lead, oldDate, newDate } = dateChangeModal;
    const effectiveReason = customDateReason.trim() || selectedDateReason;
    const actionText = `${currentUser} → Follow-up changed from ${formatLeadDate(
      oldDate
    )} to ${formatLeadDate(newDate)} (${effectiveReason})`;

    const newLog = logActivity(lead, actionText, 'date_change');
    update(lead.id, { followUp: newDate, activityLog: newLog });
    setDateChangeModal(null);
    if (setToast) setToast(`Follow-up date updated.`);
  };

  // Owner Change
  const handleOwnerChange = (lead: Lead, newOwner: string, newOwnerId: string | null) => {
    const actionText = `${currentUser} assigned lead to ${newOwner || 'Unassigned'}`;
    const newLog = logActivity(lead, actionText, 'owner');
    update(lead.id, { owner: newOwner, ownerId: newOwnerId, activityLog: newLog });
    if (setToast) {
      setToast(newOwner ? `Lead assigned to ${newOwner}.` : 'Lead marked unassigned.');
    }
  };

  // Add Manual Activity Note
  const handleAddManualNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActivityLead || !newActivityNote.trim()) return;

    const actionText = `${currentUser} → ${newActivityNote.trim()}`;
    const newLog = logActivity(activeActivityLead, actionText, 'note');

    update(activeActivityLead.id, { activityLog: newLog });
    setActiveActivityLead({ ...activeActivityLead, activityLog: newLog });
    setNewActivityNote('');
    if (setToast) setToast('Activity note logged.');
  };

  // Calculate Actionable Follow-up Queues
  const activeFollowUps = leads
    .filter((l) => !['Closed', 'Cancelled', 'Lost', 'Wrong data'].includes(l.status) && l.followUp)
    .map((l) => {
      const diffInfo = getDaysDifference(l.followUp);
      return { lead: l, ...diffInfo };
    });

  const overdueLeads = activeFollowUps.filter((item) => item.isOverdue);
  const todayLeads = activeFollowUps.filter((item) => item.isToday);
  const upcomingLeads = activeFollowUps.filter((item) => item.diff !== null && item.diff > 0 && item.diff <= 7);

  const displayedQueueItems =
    queueTab === 'overdue'
      ? overdueLeads
      : queueTab === 'today'
      ? todayLeads
      : queueTab === 'upcoming'
      ? upcomingLeads
      : [...overdueLeads, ...todayLeads, ...upcomingLeads];

  // Table filtering
  const filteredLeads = leads.filter((l) => {
    if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
    const resolvedOwner = getSelectedOwnerValue(l.owner) || 'Unassigned';
    if (ownerFilter !== 'ALL' && resolvedOwner !== ownerFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        l.name.toLowerCase().includes(q) ||
        l.contact.toLowerCase().includes(q) ||
        l.service.toLowerCase().includes(q) ||
        l.budget.toLowerCase().includes(q) ||
        (l.owner && l.owner.toLowerCase().includes(q)) ||
        resolvedOwner.toLowerCase().includes(q) ||
        (l.holdReason && l.holdReason.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="lead-tracker-view">
      <SectionTitle
        eyebrow="CLIENT PIPELINE"
        title="LEAD TRACKER"
        action={
          <Button variant="primary" onClick={add}>
            + ADD LEAD
          </Button>
        }
      />

      {/* KPI METRIC CARDS */}
      <div className="lead-stats">
        {[
          ['LEADS TOTAL', leads.length],
          ['QUALIFIED', leads.filter((l) => l.status === 'Qualified').length],
          ['CALLS BOOKED', leads.filter((l) => l.status === 'Call booked').length],
          ['ON HOLD', leads.filter((l) => l.status === 'On hold').length],
          ['CLOSED', leads.filter((l) => l.status === 'Closed').length],
        ].map(([label, val]) => (
          <div key={label as string}>
            <strong>{String(val).padStart(2, '0')}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* TODAY'S & OVERDUE FOLLOW-UPS STRIP */}
      <section className="followup-queue-strip">
        <div className="queue-strip-head">
          <div className="queue-strip-title">
            <span className="queue-strip-icon">⚡</span>
            <div>
              <strong>FOLLOW-UP QUEUE & IMMEDIATE ACTIONS</strong>
              <small>Real-time queue tracking overdue deadlines and scheduled calls</small>
            </div>
          </div>

          <div className="queue-strip-tabs">
            <button
              type="button"
              className={`queue-pill-btn ${queueTab === 'all' ? 'active' : ''}`}
              onClick={() => setQueueTab('all')}
            >
              ALL QUEUE ({activeFollowUps.length})
            </button>
            <button
              type="button"
              className={`queue-pill-btn queue-overdue-btn ${queueTab === 'overdue' ? 'active' : ''}`}
              onClick={() => setQueueTab('overdue')}
            >
              ⚠ OVERDUE ({overdueLeads.length})
            </button>
            <button
              type="button"
              className={`queue-pill-btn queue-today-btn ${queueTab === 'today' ? 'active' : ''}`}
              onClick={() => setQueueTab('today')}
            >
              🔔 TODAY ({todayLeads.length})
            </button>
            <button
              type="button"
              className={`queue-pill-btn ${queueTab === 'upcoming' ? 'active' : ''}`}
              onClick={() => setQueueTab('upcoming')}
            >
              UPCOMING ({upcomingLeads.length})
            </button>
          </div>
        </div>

        {displayedQueueItems.length > 0 ? (
          <div className="queue-cards-carousel">
            {displayedQueueItems.map(({ lead: l, diff, isToday, isOverdue }) => (
              <div
                key={l.id}
                className={`queue-card ${isOverdue ? 'queue-card-overdue' : isToday ? 'queue-card-today' : ''}`}
              >
                <div className="queue-card-top">
                  <span
                    className={`queue-badge ${
                      isOverdue ? 'badge-danger' : isToday ? 'badge-warning' : 'badge-info'
                    }`}
                  >
                    {isOverdue
                      ? `⚠ ${Math.abs(diff || 0)}D OVERDUE`
                      : isToday
                      ? '🔔 DUE TODAY'
                      : `IN ${diff} DAYS`}
                  </span>
                  <span
                    className="lead-status-pill"
                    style={{
                      color: leadStatusConfig[l.status]?.color || '#fff',
                      backgroundColor: leadStatusConfig[l.status]?.bg || 'transparent',
                      borderColor: leadStatusConfig[l.status]?.border || '#fff',
                    }}
                  >
                    {l.status.toUpperCase()}
                  </span>
                </div>

                <div className="queue-card-body">
                  <h4>{l.name}</h4>
                  <p className="queue-card-contact">{l.contact || 'No contact provided'}</p>
                  <p className="queue-card-meta">
                    <strong>{l.service || 'Service TBD'}</strong> · {l.budget || 'Budget TBD'}
                  </p>
                  {l.status === 'On hold' && l.holdReason && (
                    <small className="queue-card-hold-note">
                      ⏸ <strong>Reason:</strong> {l.holdReason}
                    </small>
                  )}
                  <div className="queue-card-owner">
                    <span>OWNER:</span>
                    <strong>{l.owner || 'Unassigned'}</strong>
                  </div>
                </div>

                <div className="queue-card-actions">
                  <button
                    type="button"
                    className="queue-action-btn"
                    onClick={() => setActiveActivityLead(l)}
                  >
                    📜 LOG ACTIVITY
                  </button>
                  <button
                    type="button"
                    className="queue-action-btn primary"
                    onClick={() => {
                      if (l.status === 'On hold') {
                        setOnHoldPrevStatus(l.status);
                        setOnHoldModalLead(l);
                        setSelectedHoldReason(l.holdReason || 'Budget');
                        setCustomHoldReason('');
                        setHoldResumeDate(l.followUp || getOffsetDate(7));
                      } else {
                        setDateChangeModal({
                          lead: l,
                          oldDate: l.followUp || '',
                          newDate: getOffsetDate(3),
                        });
                      }
                    }}
                  >
                    RESCHEDULE ↗
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="queue-empty-state">
            <span>✓</span>
            <div>
              <strong>ALL FOLLOW-UPS ARE CURRENT</strong>
              <small>No overdue leads or pending follow-ups in this queue filter.</small>
            </div>
          </div>
        )}
      </section>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="leads-toolbar">
        <div className="leads-search-box">
          <Input
            aria-label="Search leads"
            placeholder="Search by name, contact, service, budget, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="leads-filter-group">
          <label>
            <span>STATUS:</span>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              {leadStatuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </Select>
          </label>

          <label>
            <span>OWNER:</span>
            <Select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
              <option value="ALL">All Owners</option>
              <option value="Unassigned">Unassigned</option>
              {effectiveTeamMembers.map((m) => (
                <option key={m.id} value={m.full_name}>
                  {m.full_name}
                </option>
              ))}
            </Select>
          </label>

          <Pill>{filteredLeads.length} LEADS</Pill>
        </div>
      </div>

      {/* LEADS TABLE */}
      <div className="table-wrap leads-table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: '11rem' }}>STATUS</th>
              <th style={{ width: '9rem' }}>DATE</th>
              <th style={{ width: '8.5rem' }}>SOURCE</th>
              <th>NAME</th>
              <th>CONTACT</th>
              <th>SERVICE NEEDED</th>
              <th style={{ width: '8rem' }}>BUDGET</th>
              <th style={{ width: '11rem' }}>OWNER</th>
              <th style={{ width: '13rem' }}>FOLLOW-UP & DEADLINE</th>
              <th style={{ width: '9.5rem' }}>ACTIVITY</th>
              <th style={{ width: '3.5rem' }}>DEL</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((l) => {
              const diffInfo = getDaysDifference(l.followUp);
              const statusCfg = leadStatusConfig[l.status] || {
                color: '#fff',
                bg: 'transparent',
                border: '#fff',
              };
              const isWrongData = l.status === 'Wrong data';
              const isCancelledOrLost = l.status === 'Cancelled' || l.status === 'Lost';
              const isCallBookedOrHold = l.status === 'Call booked' || l.status === 'On hold';
              const isMissingRequiredFollowUp = isCallBookedOrHold && !l.followUp;

              return (
                <tr
                  key={l.id}
                  className={`lead-row ${
                    isWrongData ? 'row-wrong-data' : isCancelledOrLost ? 'row-cancelled' : ''
                  }`}
                  style={{ borderLeft: `3px solid ${statusCfg.color}` }}
                >
                  {/* STATUS & COLOR INDICATOR */}
                  <td>
                    <div className="lead-status-select-wrap">
                      <span
                        className="status-color-dot"
                        style={{ backgroundColor: statusCfg.color }}
                        title={l.status}
                      />
                      <Select
                        value={l.status}
                        onChange={(e) => handleStatusChange(l, e.target.value)}
                        className={`select-status select-status-${l.status.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {leadStatuses.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </Select>
                    </div>
                    {l.status === 'On hold' && l.holdReason && (
                      <span className="lead-hold-badge" title={l.holdReason}>
                        ⏸ {l.holdReason.split('—')[0]}
                      </span>
                    )}
                  </td>

                  {/* DATE */}
                  <td>
                    <Input
                      type="date"
                      value={l.date}
                      onChange={(e) => update(l.id, { date: e.target.value })}
                    />
                  </td>

                  {/* SOURCE */}
                  <td>
                    <Select
                      value={l.source}
                      onChange={(e) => update(l.id, { source: e.target.value })}
                    >
                      {leadSources.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </Select>
                  </td>

                  {/* NAME */}
                  <td>
                    <Input
                      value={l.name}
                      placeholder="Lead name"
                      onChange={(e) => update(l.id, { name: e.target.value })}
                    />
                  </td>

                  {/* CONTACT */}
                  <td>
                    <Input
                      value={l.contact}
                      placeholder="@handle / phone"
                      onChange={(e) => update(l.id, { contact: e.target.value })}
                    />
                  </td>

                  {/* SERVICE */}
                  <td>
                    <Input
                      value={l.service}
                      placeholder="e.g. Music Video"
                      onChange={(e) => update(l.id, { service: e.target.value })}
                    />
                  </td>

                  {/* BUDGET */}
                  <td>
                    <Input
                      value={l.budget}
                      placeholder="₹75,000"
                      onChange={(e) => update(l.id, { budget: e.target.value })}
                    />
                  </td>

                  {/* OWNER */}
                  <td>
                    <Select
                      value={getSelectedOwnerValue(l.owner)}
                      onChange={(e) => {
                        const val = e.target.value;
                        const member = effectiveTeamMembers.find((m) => m.full_name === val);
                        handleOwnerChange(l, val, member?.id || null);
                      }}
                    >
                      <option value="">Unassigned</option>
                      {effectiveTeamMembers.map((m) => (
                        <option key={m.id} value={m.full_name}>
                          {m.full_name} ({getUserTitleCaseDesignation(m.full_name, m.role)})
                        </option>
                      ))}
                      {l.owner && !effectiveTeamMembers.some((m) => m.full_name === getSelectedOwnerValue(l.owner)) && (
                        <option value={l.owner}>{l.owner}</option>
                      )}
                    </Select>
                  </td>

                  {/* FOLLOW-UP & DAYS LEFT */}
                  <td>
                    <div className="followup-cell-wrap">
                      <Input
                        type="date"
                        value={l.followUp || ''}
                        required={isCallBookedOrHold}
                        onChange={(e) => handleFollowUpChange(l, e.target.value)}
                        className={isMissingRequiredFollowUp ? 'input-required-danger' : ''}
                      />

                      {/* Relative Days Left Badge */}
                      <div className="followup-badge-container">
                        {isMissingRequiredFollowUp ? (
                          <span className="days-badge badge-required-pulse">
                            ⚠ DATE REQUIRED
                          </span>
                        ) : diffInfo.diff !== null ? (
                          <span
                            className={`days-badge ${
                              diffInfo.isOverdue
                                ? 'badge-danger'
                                : diffInfo.isToday
                                ? 'badge-warning'
                                : diffInfo.diff === 1
                                ? 'badge-tomorrow'
                                : 'badge-future'
                            }`}
                          >
                            {diffInfo.isOverdue
                              ? `OVERDUE (${Math.abs(diffInfo.diff)}d AGO)`
                              : diffInfo.isToday
                              ? '🔔 DUE TODAY'
                              : diffInfo.diff === 1
                              ? 'TOMORROW'
                              : `IN ${diffInfo.diff} DAYS`}
                          </span>
                        ) : (
                          <span className="days-badge badge-none">No date</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* ACTIVITY LOG BUTTON */}
                  <td>
                    <button
                      type="button"
                      className="lead-activity-btn"
                      onClick={() => setActiveActivityLead(l)}
                      title="View complete activity log and notes"
                    >
                      <span>📜</span>
                      <strong>{l.activityLog?.length || 0} LOGS</strong>
                    </button>
                    {l.activityLog && l.activityLog.length > 0 && (
                      <small className="lead-latest-action" title={l.activityLog[0].action}>
                        {l.activityLog[0].action}
                      </small>
                    )}
                  </td>

                  {/* DELETE ACTION */}
                  <td>
                    <button
                      type="button"
                      className="lead-del-btn"
                      onClick={() => {
                        if (confirm(`Delete lead "${l.name}"?`)) {
                          if (onDeleteLead) onDeleteLead(l.id);
                          else setLeads((curr) => curr.filter((x) => x.id !== l.id));
                        }
                      }}
                      title="Delete lead"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 1. ON HOLD POPUP MODAL */}
      {onHoldModalLead && (
        <div className="modal-backdrop" onClick={cancelOnHold}>
          <div className="modal-content lead-popup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">STATUS CHANGE</span>
                <h3>PLACE LEAD ON HOLD</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={cancelOnHold}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="lead-popup-prompt">
                Why is <strong>{onHoldModalLead.name}</strong> being put on hold? Select a reason
                and choose when to resume follow-up.
              </p>

              <div className="hold-reasons-group">
                <span className="eyebrow">SELECT PRIMARY REASON:</span>
                <div className="chips-grid">
                  {[
                    ['Budget', 'Budget — Waiting on funds / client approval'],
                    ['Timing', 'Timing — Busy with launch / requested delay'],
                    ['Thinking', 'Thinking — Evaluating proposal & options'],
                    ['Awaiting Partner', 'Awaiting approval from business partner'],
                  ].map(([shortKey, fullLabel]) => (
                    <button
                      key={shortKey}
                      type="button"
                      className={`chip-btn ${selectedHoldReason === shortKey ? 'active' : ''}`}
                      onClick={() => setSelectedHoldReason(shortKey)}
                    >
                      {fullLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-field-block">
                <span className="eyebrow">ADDITIONAL CONTEXT / NOTES (OPTIONAL):</span>
                <Input
                  value={customHoldReason}
                  placeholder="e.g. Client requested reconnect after investor round..."
                  onChange={(e) => setCustomHoldReason(e.target.value)}
                />
              </div>

              <div className="modal-field-block">
                <span className="eyebrow">RESUME / FOLLOW-UP DATE (REQUIRED):</span>
                <Input
                  type="date"
                  required
                  value={holdResumeDate}
                  onChange={(e) => setHoldResumeDate(e.target.value)}
                />
                <div className="quick-date-shortcuts">
                  <span>QUICK SHORTCUTS:</span>
                  <button type="button" onClick={() => setHoldResumeDate(getOffsetDate(3))}>
                    +3 DAYS
                  </button>
                  <button type="button" onClick={() => setHoldResumeDate(getOffsetDate(7))}>
                    +1 WEEK
                  </button>
                  <button type="button" onClick={() => setHoldResumeDate(getOffsetDate(14))}>
                    +2 WEEKS
                  </button>
                  <button type="button" onClick={() => setHoldResumeDate(getOffsetDate(30))}>
                    +1 MONTH
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <Button type="button" onClick={cancelOnHold}>
                CANCEL
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!holdResumeDate}
                onClick={confirmOnHold}
              >
                CONFIRM ON HOLD & SET RESUME DATE
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. DATE CHANGE POPUP MODAL */}
      {dateChangeModal && (
        <div className="modal-backdrop" onClick={() => setDateChangeModal(null)}>
          <div className="modal-content lead-popup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">AUDIT TRACKING</span>
                <h3>TRACK DATE CHANGE</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDateChangeModal(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="date-change-visual">
                <div>
                  <small>PREVIOUS DATE</small>
                  <strong>{formatLeadDate(dateChangeModal.oldDate)}</strong>
                </div>
                <span>➔</span>
                <div>
                  <small>NEW FOLLOW-UP</small>
                  <strong className="text-highlight">
                    {formatLeadDate(dateChangeModal.newDate)}
                  </strong>
                </div>
              </div>

              <div className="modal-field-block">
                <span className="eyebrow">WHY DID THE DATE CHANGE?</span>
                <div className="chips-grid">
                  {dateChangeReasons.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`chip-btn ${selectedDateReason === r ? 'active' : ''}`}
                      onClick={() => setSelectedDateReason(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-field-block">
                <span className="eyebrow">CUSTOM REASON / NOTE:</span>
                <Input
                  value={customDateReason}
                  placeholder="Or enter custom reason for audit log..."
                  onChange={(e) => setCustomDateReason(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-foot">
              <Button type="button" onClick={() => setDateChangeModal(null)}>
                CANCEL
              </Button>
              <Button type="button" variant="primary" onClick={confirmDateChange}>
                SAVE DATE CHANGE
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CALL BOOKED MANDATORY DATE MODAL */}
      {callBookedModalLead && (
        <div className="modal-backdrop" onClick={() => setCallBookedModalLead(null)}>
          <div className="modal-content lead-popup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">MANDATORY FOLLOW-UP</span>
                <h3>SET CALL BOOKED DATE</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setCallBookedModalLead(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="lead-popup-prompt">
                Setting status to <strong>Call booked</strong> requires a confirmed call date for{' '}
                <strong>{callBookedModalLead.name}</strong>.
              </p>

              <div className="modal-field-block">
                <span className="eyebrow">CALL / FOLLOW-UP DATE:</span>
                <Input
                  type="date"
                  required
                  value={callBookedDate}
                  onChange={(e) => setCallBookedDate(e.target.value)}
                />
                <div className="quick-date-shortcuts">
                  <span>QUICK SHORTCUTS:</span>
                  <button type="button" onClick={() => setCallBookedDate(getOffsetDate(1))}>
                    TOMORROW
                  </button>
                  <button type="button" onClick={() => setCallBookedDate(getOffsetDate(2))}>
                    +2 DAYS
                  </button>
                  <button type="button" onClick={() => setCallBookedDate(getOffsetDate(3))}>
                    +3 DAYS
                  </button>
                  <button type="button" onClick={() => setCallBookedDate(getOffsetDate(7))}>
                    NEXT WEEK
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <Button type="button" onClick={() => setCallBookedModalLead(null)}>
                CANCEL
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!callBookedDate}
                onClick={confirmCallBooked}
              >
                CONFIRM CALL & FOLLOW-UP DATE
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ACTIVITY LOG & NOTES DRAWER / MODAL */}
      {activeActivityLead && (
        <div className="modal-backdrop" onClick={() => setActiveActivityLead(null)}>
          <div
            className="modal-content lead-activity-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">AUDIT & ENGAGEMENT HISTORY</span>
                <h3>ACTIVITY LOG: {activeActivityLead.name}</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveActivityLead(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Lead Summary Header Card */}
              <div className="activity-lead-summary">
                <div>
                  <span className="eyebrow">STATUS</span>
                  <strong
                    style={{
                      color:
                        leadStatusConfig[activeActivityLead.status]?.color || '#fff',
                    }}
                  >
                    {activeActivityLead.status.toUpperCase()}
                  </strong>
                </div>
                <div>
                  <span className="eyebrow">OWNER</span>
                  <strong>{activeActivityLead.owner || 'Unassigned'}</strong>
                </div>
                <div>
                  <span className="eyebrow">BUDGET</span>
                  <strong>{activeActivityLead.budget || 'TBD'}</strong>
                </div>
                <div>
                  <span className="eyebrow">FOLLOW-UP</span>
                  <strong>{formatLeadDate(activeActivityLead.followUp)}</strong>
                </div>
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddManualNote} className="activity-note-form">
                <span className="eyebrow">ADD LOG ENTRY / CALL NOTE</span>
                <div className="note-input-row">
                  <Input
                    value={newActivityNote}
                    placeholder="Enter call notes, client response, budget discussion, or next steps..."
                    onChange={(e) => setNewActivityNote(e.target.value)}
                  />
                  <Button type="submit" variant="primary" disabled={!newActivityNote.trim()}>
                    + LOG NOTE
                  </Button>
                </div>
              </form>

              {/* Timeline Stream */}
              <div className="activity-timeline-stream">
                <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>
                  CHRONOLOGICAL TIMELINE ({activeActivityLead.activityLog?.length || 0} ENTRIES)
                </span>

                {activeActivityLead.activityLog && activeActivityLead.activityLog.length > 0 ? (
                  <div className="timeline-items">
                    {activeActivityLead.activityLog.map((act) => (
                      <div key={act.id} className="timeline-item">
                        <div className="timeline-item-avatar">
                          {act.author ? act.author.slice(0, 2).toUpperCase() : 'SYS'}
                        </div>
                        <div className="timeline-item-content">
                          <div className="timeline-item-meta">
                            <strong>{act.author || 'Team Member'}</strong>
                            <small>{new Date(act.timestamp).toLocaleString('en-GB')}</small>
                          </div>
                          <p className="timeline-item-action">{act.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted" style={{ padding: '1rem', textAlign: 'center' }}>
                    No activity recorded yet for this lead.
                  </p>
                )}
              </div>
            </div>

            <div className="modal-foot">
              <Button type="button" onClick={() => setActiveActivityLead(null)}>
                CLOSE
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
