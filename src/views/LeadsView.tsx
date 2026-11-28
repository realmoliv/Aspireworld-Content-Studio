import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Lead, TeamMember, LeadActivity } from '@/types';
import { SectionTitle, Button, Input, Select, Pill } from '@/components/ui';
import { useEntityDraft } from '@/hooks/useDebouncedSave';
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
  onUpdateLead?: (leadId: string, patch: Partial<Lead>) => Promise<void> | void;
  onDeleteLead?: (leadId: string) => void;
}

function getDaysDifference(dateStr?: string): {
  diff: number | null;
  isToday: boolean;
  isOverdue: boolean;
  formatted: string;
} {
  if (!dateStr) {
    return { diff: null, isToday: false, isOverdue: false, formatted: 'No follow-up set' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const isToday = diffDays === 0;
  const isOverdue = diffDays < 0;

  return {
    diff: diffDays,
    isToday,
    isOverdue,
    formatted: dateStr,
  };
}

function formatLeadDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
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

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
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
  const [selectedHoldReason, setSelectedHoldReason] = useState<string>('Budget');
  const [customHoldReason, setCustomHoldReason] = useState<string>('');
  const [holdResumeDate, setHoldResumeDate] = useState<string>(getOffsetDate(7));
  const [holdNotes, setHoldNotes] = useState<string>('');
  const [holdErrors, setHoldErrors] = useState<{ reason?: string; date?: string; general?: string }>({});
  const [isHoldSubmitting, setIsHoldSubmitting] = useState<boolean>(false);
  const [showUnsavedDiscardModal, setShowUnsavedDiscardModal] = useState<boolean>(false);

  // Resume Lead Modal State (Safe resumption from Hold to active status)
  const [resumeModalLead, setResumeModalLead] = useState<Lead | null>(null);
  const [resumeStatus, setResumeStatus] = useState<string>('Qualified');
  const [isResumeSubmitting, setIsResumeSubmitting] = useState<boolean>(false);

  // Track initial hold state to detect dirty changes
  const holdInitialStateRef = useRef<{
    reason: string;
    customReason: string;
    date: string;
    notes: string;
  }>({ reason: '', customReason: '', date: '', notes: '' });

  // Date Change Modal State
  const [dateChangeModal, setDateChangeModal] = useState<{
    lead: Lead;
    oldDate: string;
    newDate: string;
  } | null>(null);
  const [selectedDateReason, setSelectedDateReason] = useState<string>('Client rescheduled');
  const [customDateReason, setCustomDateReason] = useState<string>('');

  // Call Booked Modal State
  const [callBookedModalLead, setCallBookedModalLead] = useState<Lead | null>(null);
  const [callBookedDate, setCallBookedDate] = useState<string>(getOffsetDate(2));
  const [callBookedError, setCallBookedError] = useState<string>('');

  // Activity Log Modal State
  const [activeActivityLead, setActiveActivityLead] = useState<Lead | null>(null);
  const [newActivityNote, setNewActivityNote] = useState<string>('');

  // Delete Lead Confirmation Modal (Poka-Yoke)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  // Expandable row details (for compact table / mobile view)
  const [expandedLeadIds, setExpandedLeadIds] = useState<Set<string>>(new Set());

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [ownerFilter, setOwnerFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [queueTab, setQueueTab] = useState<'all' | 'overdue' | 'today' | 'upcoming'>('all');

  // Combined Team Members ensuring standard studio team is always available
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

  // Body scroll lock when any modal is open
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      onHoldModalLead ||
      dateChangeModal ||
      callBookedModalLead ||
      activeActivityLead ||
      leadToDelete ||
      showUnsavedDiscardModal
    );
    if (isAnyModalOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [
    onHoldModalLead,
    dateChangeModal,
    callBookedModalLead,
    activeActivityLead,
    leadToDelete,
    showUnsavedDiscardModal,
  ]);

  // Keyboard navigation & Escape key support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showUnsavedDiscardModal) {
          setShowUnsavedDiscardModal(false);
        } else if (onHoldModalLead) {
          requestCloseHoldModal();
        } else if (dateChangeModal) {
          setDateChangeModal(null);
        } else if (callBookedModalLead) {
          setCallBookedModalLead(null);
        } else if (activeActivityLead) {
          setActiveActivityLead(null);
        } else if (leadToDelete) {
          setLeadToDelete(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const toggleRowExpanded = (id: string) => {
    setExpandedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const add = () => {
    if (onAddLead) {
      onAddLead();
    } else {
      const newLead: Lead = {
        id: `l${Date.now()}`,
        date: getTodayDate(),
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

  const update = useCallback(async (id: string, patch: Partial<Lead>) => {
    if (onUpdateLead) {
      await onUpdateLead(id, patch);
    } else {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    }
  }, [onUpdateLead, setLeads]);

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
    return [newEntry, ...(lead.activityLog || [])];
  };

  // Open Hold Lead Modal
  const openHoldModal = (lead: Lead) => {
    const defaultDate = lead.followUp && lead.followUp >= getTodayDate() ? lead.followUp : getOffsetDate(7);
    const isKnownReason = lead.holdReason && (holdReasons as readonly string[]).includes(lead.holdReason);
    const initialReason = lead.holdReason ? (isKnownReason ? lead.holdReason : 'Other / Custom') : 'Budget';
    const initialCustom = lead.holdReason && !isKnownReason ? lead.holdReason : '';

    setSelectedHoldReason(initialReason);
    setCustomHoldReason(initialCustom);
    setHoldResumeDate(defaultDate);
    setHoldNotes(lead.holdNotes || '');
    setHoldErrors({});
    setIsHoldSubmitting(false);

    holdInitialStateRef.current = {
      reason: initialReason,
      customReason: initialCustom,
      date: defaultDate,
      notes: lead.holdNotes || '',
    };

    setOnHoldModalLead(lead);
  };

  // Open Resume Lead Modal
  const openResumeModal = (lead: Lead) => {
    const candidate = lead.previousStatus && lead.previousStatus !== 'On hold' ? lead.previousStatus : 'Qualified';
    setResumeStatus(candidate);
    setResumeModalLead(lead);
    setIsResumeSubmitting(false);
  };

  // Check unsaved changes before closing Hold Modal
  const requestCloseHoldModal = () => {
    const isDirty =
      selectedHoldReason !== holdInitialStateRef.current.reason ||
      customHoldReason !== holdInitialStateRef.current.customReason ||
      holdResumeDate !== holdInitialStateRef.current.date ||
      holdNotes !== holdInitialStateRef.current.notes;

    if (isDirty) {
      setShowUnsavedDiscardModal(true);
    } else {
      setOnHoldModalLead(null);
    }
  };

  const discardAndCloseHoldModal = () => {
    setShowUnsavedDiscardModal(false);
    setOnHoldModalLead(null);
  };

  // Status Change Handler (Poka-Yoke transition safeguarding)
  const handleStatusChange = async (lead: Lead, newStatus: string) => {
    if (lead.status === newStatus) return;

    if (newStatus === 'On hold') {
      openHoldModal(lead);
      return;
    }

    if (newStatus === 'Call booked') {
      if (!lead.followUp || lead.followUp < getTodayDate()) {
        setCallBookedModalLead(lead);
        setCallBookedDate(getOffsetDate(2));
        setCallBookedError('');
        return;
      }
    }

    const previousStatus = lead.status;
    const isResuming = previousStatus === 'On hold';
    const actionText = isResuming
      ? `${currentUser} changed lead status from On hold to ${newStatus} (Resumed from hold).`
      : `${currentUser} changed lead status from ${previousStatus} to ${newStatus}.`;

    const newLog = logActivity(lead, actionText, 'status');

    try {
      await update(lead.id, {
        status: newStatus,
        previousStatus,
        ...(isResuming && { holdReason: '', holdNotes: '', resumeDate: '' }),
        activityLog: newLog,
      });
      if (setToast) setToast(`Status updated to ${newStatus}`);
    } catch (err: any) {
      console.error('Failed to change status:', err);
      if (setToast) setToast(`Failed to update status: ${err?.message || 'Database error'}`);
    }
  };

  // Validate Hold Form
  const validateHoldForm = (): boolean => {
    const errors: { reason?: string; date?: string } = {};
    const effectiveReason = selectedHoldReason === 'Other / Custom' ? customHoldReason.trim() : (customHoldReason.trim() || selectedHoldReason);

    if (!effectiveReason) {
      errors.reason = 'Primary reason is required.';
    }

    const todayStr = getTodayDate();
    if (!holdResumeDate) {
      errors.date = 'Resume / follow-up date is required.';
    } else if (holdResumeDate < todayStr) {
      errors.date = 'Resume date cannot be in the past.';
    }

    setHoldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Confirm On Hold Modal Submission with Single Source of Truth synchronization
  const confirmOnHold = async () => {
    if (!onHoldModalLead || isHoldSubmitting) return;

    if (!validateHoldForm()) {
      return;
    }

    setIsHoldSubmitting(true);

    const effectiveReason = selectedHoldReason === 'Other / Custom' ? customHoldReason.trim() : (customHoldReason.trim() || selectedHoldReason);
    const formattedDate = formatLeadDate(holdResumeDate);
    const previousStatus = onHoldModalLead.status || 'New';
    const noteSuffix = holdNotes.trim() ? `\nAdditional Notes: ${holdNotes.trim()}` : '';
    const actionText = `${currentUser} changed lead status from ${previousStatus} to On hold.\nHold Reason: ${effectiveReason}${noteSuffix}\nResume Date: ${formattedDate}`;

    const newLog = logActivity(onHoldModalLead, actionText, 'status');

    try {
      await update(onHoldModalLead.id, {
        status: 'On hold',
        previousStatus,
        holdReason: effectiveReason,
        holdNotes: holdNotes.trim(),
        resumeDate: holdResumeDate,
        followUp: holdResumeDate,
        activityLog: newLog,
      });

      if (setToast) {
        setToast(`Lead "${onHoldModalLead.name}" placed on hold until ${formattedDate}.`);
      }
      setOnHoldModalLead(null);
    } catch (err: any) {
      console.error('Error placing lead on hold:', err);
      setHoldErrors({ general: `Database update failed: ${err?.message || 'Could not save hold status.'}` });
      if (setToast) {
        setToast(`Failed to place lead on hold: ${err?.message || 'Database error'}`);
      }
    } finally {
      setIsHoldSubmitting(false);
    }
  };

  // Confirm Resume Lead (Restores active pipeline state)
  const confirmResumeLead = async () => {
    if (!resumeModalLead || isResumeSubmitting) return;

    setIsResumeSubmitting(true);
    const targetStatus = resumeStatus || resumeModalLead.previousStatus || 'Qualified';
    const previousStatus = resumeModalLead.status || 'On hold';
    const actionText = `${currentUser} changed lead status from ${previousStatus} to ${targetStatus} (Resumed from hold).`;
    const newLog = logActivity(resumeModalLead, actionText, 'status');

    try {
      await update(resumeModalLead.id, {
        status: targetStatus,
        previousStatus,
        holdReason: '',
        holdNotes: '',
        resumeDate: '',
        activityLog: newLog,
      });

      if (setToast) {
        setToast(`Lead "${resumeModalLead.name}" resumed to ${targetStatus}.`);
      }
      setResumeModalLead(null);
    } catch (err: any) {
      console.error('Failed to resume lead:', err);
      if (setToast) {
        setToast(`Failed to resume lead: ${err?.message || 'Database error'}`);
      }
    } finally {
      setIsResumeSubmitting(false);
    }
  };

  // Confirm Call Booked Modal
  const confirmCallBooked = async () => {
    if (!callBookedModalLead) return;
    if (!callBookedDate) {
      setCallBookedError('Call date is required.');
      return;
    }
    if (callBookedDate < getTodayDate()) {
      setCallBookedError('Call date cannot be in the past.');
      return;
    }

    const formattedDate = formatLeadDate(callBookedDate);
    const previousStatus = callBookedModalLead.status;
    const actionText = `${currentUser} changed lead status from ${previousStatus} to Call booked.\nCall Date: ${formattedDate}`;
    const newLog = logActivity(callBookedModalLead, actionText, 'status');

    try {
      await update(callBookedModalLead.id, {
        status: 'Call booked',
        previousStatus,
        followUp: callBookedDate,
        activityLog: newLog,
      });

      setCallBookedModalLead(null);
      if (setToast) setToast(`Call booked and follow-up set for ${formattedDate}.`);
    } catch (err: any) {
      console.error('Failed to book call:', err);
      if (setToast) setToast(`Failed to book call: ${err?.message || 'Database error'}`);
    }
  };

  // Date Change Handler
  const confirmDateChange = async () => {
    if (!dateChangeModal) return;
    const { lead, newDate, oldDate } = dateChangeModal;
    const effectiveReason = customDateReason.trim() || selectedDateReason;
    const formattedOld = formatLeadDate(oldDate);
    const formattedNew = formatLeadDate(newDate);

    const actionText = `${currentUser} changed follow-up date from ${formattedOld} to ${formattedNew}.\nReason: ${effectiveReason}`;
    const newLog = logActivity(lead, actionText, 'date_change');

    try {
      await update(lead.id, {
        followUp: newDate,
        ...(lead.status === 'On hold' && { resumeDate: newDate }),
        activityLog: newLog,
      });

      setDateChangeModal(null);
      if (setToast) setToast(`Follow-up date updated to ${formattedNew}.`);
    } catch (err: any) {
      if (setToast) setToast(`Failed to update date: ${err?.message || 'Database error'}`);
    }
  };

  const handleFollowUpChange = async (lead: Lead, newDate: string) => {
    const oldDate = lead.followUp || '';
    if (newDate === oldDate) return;

    if (oldDate && oldDate !== newDate) {
      setDateChangeModal({
        lead,
        oldDate,
        newDate,
      });
      setSelectedDateReason('Client rescheduled');
      setCustomDateReason('');
    } else {
      const actionText = `${currentUser} scheduled follow-up for ${formatLeadDate(newDate)}`;
      const newLog = logActivity(lead, actionText, 'date_change');
      try {
        await update(lead.id, {
          followUp: newDate,
          ...(lead.status === 'On hold' && { resumeDate: newDate }),
          activityLog: newLog,
        });
        if (setToast) setToast(`Follow-up date updated to ${formatLeadDate(newDate)}.`);
      } catch (err: any) {
        if (setToast) setToast(`Failed to update date: ${err?.message || 'Database error'}`);
      }
    }
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

  // Delete Lead Handler with Poka-Yoke confirmation
  const confirmDeleteLead = () => {
    if (!leadToDelete) return;
    const name = leadToDelete.name;
    if (onDeleteLead) {
      onDeleteLead(leadToDelete.id);
    } else {
      setLeads((curr) => curr.filter((x) => x.id !== leadToDelete.id));
    }
    setLeadToDelete(null);
    if (setToast) setToast(`Lead "${name}" deleted.`);
  };

  // Calculate Actionable Follow-up Queues
  const { activeFollowUps, overdueLeads, todayLeads, upcomingLeads, displayedQueueItems } = useMemo(() => {
    const active = leads
      .filter((l) => !['Closed', 'Cancelled', 'Lost', 'Wrong data'].includes(l.status) && l.followUp)
      .map((l) => {
        const diffInfo = getDaysDifference(l.followUp);
        return { lead: l, ...diffInfo };
      });
    const overdue = active.filter((item) => item.isOverdue);
    const today = active.filter((item) => item.isToday);
    const upcoming = active.filter((item) => item.diff !== null && item.diff > 0 && item.diff <= 7);
    const displayed =
      queueTab === 'overdue'
        ? overdue
        : queueTab === 'today'
        ? today
        : queueTab === 'upcoming'
        ? upcoming
        : [...overdue, ...today, ...upcoming];

    return {
      activeFollowUps: active,
      overdueLeads: overdue,
      todayLeads: today,
      upcomingLeads: upcoming,
      displayedQueueItems: displayed,
    };
  }, [leads, queueTab]);

  // Filtering
  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
      const resolvedOwner = getSelectedOwnerValue(l.owner) || 'Unassigned';
      if (ownerFilter !== 'ALL' && resolvedOwner !== ownerFilter) return false;
      if (q) {
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
  }, [leads, statusFilter, ownerFilter, searchQuery, effectiveTeamMembers]);

  return (
    <div className="lead-tracker-view">
      <SectionTitle
        eyebrow="CLIENT PIPELINE"
        title="LEAD TRACKER"
        action={
          <Button variant="primary" onClick={add} className="add-lead-top-btn">
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
          <div key={label as string} className="lead-stat-card">
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
              ALL ({activeFollowUps.length})
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
                      ⏸ <strong>Hold:</strong> {l.holdReason}
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
                    📝 LOGS
                  </button>
                  {l.status === 'On hold' ? (
                    <button
                      type="button"
                      className="queue-action-btn primary"
                      style={{ background: '#fbbf24', color: '#000', borderColor: '#fbbf24' }}
                      onClick={() => openResumeModal(l)}
                    >
                      ▶ RESUME LEAD
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="queue-action-btn primary"
                      onClick={() => {
                        setDateChangeModal({
                          lead: l,
                          oldDate: l.followUp || '',
                          newDate: getOffsetDate(3),
                        });
                      }}
                    >
                      RESCHEDULE ↗
                    </button>
                  )}
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

      {/* 1. DESKTOP & TABLET TABLE LAYOUT (Zero horizontal scroll on 1366px+) */}
      <div className="table-wrap leads-table-wrap desktop-only-table">
        <table className="leads-table-refactored">
          <thead>
            <tr>
              <th style={{ minWidth: '180px' }}>LEAD & CONTACT</th>
              <th style={{ width: '16%' }}>STATUS & HOLD</th>
              <th style={{ width: '17%' }}>SERVICE & VALUE</th>
              <th style={{ width: '15%' }}>OWNER</th>
              <th style={{ width: '16%' }}>FOLLOW-UP & URGENCY</th>
              <th className="th-actions" style={{ width: '140px', minWidth: '140px', textAlign: 'center' }}>ACTIONS</th>
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
              const isExpanded = expandedLeadIds.has(l.id);

              return (
                <React.Fragment key={l.id}>
                  <tr
                    className={`lead-row ${
                      isWrongData ? 'row-wrong-data' : isCancelledOrLost ? 'row-cancelled' : ''
                    } ${isExpanded ? 'row-expanded' : ''}`}
                    style={{ borderLeft: `3px solid ${statusCfg.color}` }}
                  >
                    {/* 1. LEAD & CONTACT */}
                    <td>
                      <div className="cell-lead-header">
                        <strong
                          className="lead-name-link"
                          onClick={() => toggleRowExpanded(l.id)}
                          title="Click to expand details"
                        >
                          {l.name}
                        </strong>
                        <div className="lead-meta-sub">
                          <span className="lead-contact-text" title={l.contact}>
                            {l.contact || 'No contact'}
                          </span>
                          <span className="meta-dot">•</span>
                          <span className="lead-source-badge">{l.source}</span>
                          <span className="meta-dot">•</span>
                          <span className="lead-date-text">{formatLeadDate(l.date)}</span>
                        </div>
                      </div>
                    </td>

                    {/* 2. STATUS & COLOR INDICATOR */}
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
                      {l.status === 'On hold' && (
                        <div
                          className="hold-indicator-tag"
                          onClick={() => openHoldModal(l)}
                          title="Click to view or edit hold details"
                        >
                          ⏸ {l.holdReason || 'Hold'} • {formatLeadDate(l.resumeDate)}
                        </div>
                      )}
                    </td>

                    {/* 3. SERVICE & BUDGET */}
                    <td>
                      <div className="cell-service-value">
                        <span className="lead-service-title">{l.service || 'Service TBD'}</span>
                        <span className="lead-budget-tag">{l.budget || 'Budget TBD'}</span>
                      </div>
                    </td>

                    {/* 4. OWNER */}
                    <td>
                      <Select
                        value={getSelectedOwnerValue(l.owner)}
                        onChange={(e) => {
                          const val = e.target.value;
                          const member = effectiveTeamMembers.find((m) => m.full_name === val);
                          handleOwnerChange(l, val, member?.id || null);
                        }}
                        className="select-lead-owner"
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

                    {/* 5. FOLLOW-UP & DAYS LEFT */}
                    <td>
                      <div className="cell-followup-compact">
                        <div
                          className="followup-interactive-date"
                          onClick={() => {
                            setDateChangeModal({
                              lead: l,
                              oldDate: l.followUp || '',
                              newDate: getOffsetDate(3),
                            });
                          }}
                          title="Click to reschedule follow-up date"
                        >
                          <span>📅 {formatLeadDate(l.followUp)}</span>
                          <span className="date-edit-icon">✎</span>
                        </div>

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

                    {/* 6. ACTIONS (Expand, History, Delete) */}
                    <td className="actions-cell-td">
                      <div className="actions-cell">
                        <button
                          type="button"
                          className={`action-btn action-btn-expand ${isExpanded ? 'active' : ''}`}
                          onClick={() => toggleRowExpanded(l.id)}
                          title={isExpanded ? 'Collapse row details' : 'Expand full details'}
                          aria-label="Toggle details"
                        >
                          {isExpanded ? '▲' : '▼'}
                        </button>
                        <button
                          type="button"
                          className="action-btn action-btn-history"
                          onClick={() => setActiveActivityLead(l)}
                          title={`View activity logs (${l.activityLog?.length || 0})`}
                          aria-label="View activity logs"
                        >
                          <span className="act-icon">📝</span>
                          <span className="act-count">{l.activityLog?.length || 0}</span>
                        </button>
                        <button
                          type="button"
                          className="action-btn action-btn-delete"
                          onClick={() => setLeadToDelete(l)}
                          title="Delete lead (Poka-Yoke confirmation)"
                          aria-label="Delete lead"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* EXPANDABLE ROW DETAILS (Secondary info kept accessible without cluttering) */}
                  {isExpanded && (
                    <tr className="expanded-lead-details-row">
                      <td colSpan={6}>
                        <div className="expanded-details-container">
                          <div className="details-col">
                            <LeadQuickEditDesktop lead={l} onPersist={update} setToast={setToast} />
                          </div>

                          <div className="details-col">
                            <span className="eyebrow">HOLD & FOLLOW-UP SETTINGS</span>
                            {l.status === 'On hold' ? (
                              <div className="hold-details-box">
                                <div className="hold-info-line">
                                  <span>HOLD REASON:</span>
                                  <strong>{l.holdReason || 'None specified'}</strong>
                                </div>
                                <div className="hold-info-line">
                                  <span>RESUME DATE:</span>
                                  <strong>{formatLeadDate(l.resumeDate)}</strong>
                                </div>
                                <Button
                                  variant="primary"
                                  onClick={() => openHoldModal(l)}
                                  style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}
                                >
                                  MODIFY HOLD SETTINGS ↗
                                </Button>
                              </div>
                            ) : (
                              <div className="not-on-hold-box">
                                <p>Lead is active. Put on hold to pause follow-ups until a future date.</p>
                                <Button
                                  onClick={() => openHoldModal(l)}
                                  style={{ fontSize: '0.75rem' }}
                                >
                                  PLACE ON HOLD ⏸
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="details-col">
                            <span className="eyebrow">RECENT ACTIVITY ({l.activityLog?.length || 0})</span>
                            <div className="details-activity-snippet">
                              {l.activityLog && l.activityLog.length > 0 ? (
                                l.activityLog.slice(0, 3).map((act) => (
                                  <div key={act.id} className="mini-activity-item">
                                    <span className="mini-act-author">{act.author}</span>
                                    <p className="mini-act-text">{act.action}</p>
                                    <small className="mini-act-time">
                                      {new Date(act.timestamp).toLocaleDateString([], {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </small>
                                  </div>
                                ))
                              ) : (
                                <p className="text-muted">No activity entries yet.</p>
                              )}
                              <Button
                                onClick={() => setActiveActivityLead(l)}
                                style={{ fontSize: '0.75rem', marginTop: '0.4rem' }}
                              >
                                FULL ACTIVITY TIMELINE ➔
                              </Button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 2. MOBILE CARD VIEW (320px–767px: Dedicated responsive lead cards) */}
      <div className="leads-mobile-card-list">
        {filteredLeads.map((l) => {
          const diffInfo = getDaysDifference(l.followUp);
          const statusCfg = leadStatusConfig[l.status] || {
            color: '#fff',
            bg: 'transparent',
            border: '#fff',
          };
          const isCallBookedOrHold = l.status === 'Call booked' || l.status === 'On hold';
          const isMissingRequiredFollowUp = isCallBookedOrHold && !l.followUp;
          const isExpanded = expandedLeadIds.has(l.id);

          return (
            <div
              key={l.id}
              className={`mobile-lead-card ${l.status === 'On hold' ? 'card-on-hold' : ''}`}
              style={{ borderLeft: `4px solid ${statusCfg.color}` }}
            >
              {/* Card Header: Status & Urgency Badge */}
              <div className="mobile-card-top-row">
                <span
                  className="lead-status-pill"
                  style={{
                    color: statusCfg.color,
                    backgroundColor: statusCfg.bg,
                    borderColor: statusCfg.border,
                  }}
                >
                  {l.status.toUpperCase()}
                </span>

                {isMissingRequiredFollowUp ? (
                  <span className="days-badge badge-required-pulse">⚠ DATE REQUIRED</span>
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
                ) : null}
              </div>

              {/* Card Title & Meta */}
              <div className="mobile-card-identity">
                <h3 className="mobile-card-name" onClick={() => toggleRowExpanded(l.id)}>
                  {l.name}
                </h3>
                <div className="mobile-card-contact-line">
                  <span>{l.contact || 'No contact provided'}</span>
                  <span className="meta-dot">•</span>
                  <span className="lead-source-badge">{l.source}</span>
                </div>
              </div>

              {/* Key Lead Metrics Grid */}
              <div className="mobile-card-info-grid">
                <div className="mobile-info-cell">
                  <small>SERVICE</small>
                  <strong>{l.service || 'Service TBD'}</strong>
                </div>
                <div className="mobile-info-cell">
                  <small>BUDGET</small>
                  <strong>{l.budget || 'Budget TBD'}</strong>
                </div>
                <div className="mobile-info-cell">
                  <small>OWNER</small>
                  <strong>{l.owner || 'Unassigned'}</strong>
                </div>
                <div className="mobile-info-cell">
                  <small>FOLLOW-UP</small>
                  <strong>{formatLeadDate(l.followUp)}</strong>
                </div>
              </div>

              {/* Hold Banner if on hold */}
              {l.status === 'On hold' && (
                <div className="mobile-card-hold-banner" onClick={() => openHoldModal(l)}>
                  <span>⏸ <strong>ON HOLD:</strong> {l.holdReason || 'Reason'}</span>
                  <small>Resumes {formatLeadDate(l.resumeDate)}</small>
                </div>
              )}

              {/* Mobile Card Action Buttons (Min 44px touch targets) */}
              <div className="mobile-card-actions-bar">
                <div className="mobile-actions-row-primary">
                  <div className="mobile-status-dropdown-wrap">
                    <Select
                      value={l.status}
                      onChange={(e) => handleStatusChange(l, e.target.value)}
                      className="mobile-status-select"
                    >
                      {leadStatuses.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {l.status === 'On hold' ? (
                    <button
                      type="button"
                      className="mobile-touch-btn mobile-resume-btn"
                      style={{ background: '#fbbf24', color: '#000', borderColor: '#fbbf24' }}
                      onClick={() => openResumeModal(l)}
                      title="Resume Lead"
                    >
                      ▶ RESUME
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="mobile-touch-btn mobile-hold-btn"
                      onClick={() => openHoldModal(l)}
                      title="Configure Hold"
                    >
                      ⏸ HOLD
                    </button>
                  )}
                </div>

                <div className="mobile-actions-row-secondary">
                  <button
                    type="button"
                    className="mobile-touch-btn"
                    onClick={() => setActiveActivityLead(l)}
                    title="View Activity Logs"
                  >
                    📝 LOGS ({l.activityLog?.length || 0})
                  </button>

                  <button
                    type="button"
                    className="mobile-touch-btn"
                    onClick={() => toggleRowExpanded(l.id)}
                    title="Toggle details"
                  >
                    {isExpanded ? '▲ LESS' : '▼ DETAILS'}
                  </button>

                  <button
                    type="button"
                    className="mobile-touch-btn mobile-del-btn"
                    onClick={() => setLeadToDelete(l)}
                    title="Delete lead"
                  >
                    ✕ DELETE
                  </button>
                </div>
              </div>

              {/* Mobile Card Expanded Details */}
              {isExpanded && (
                <div className="mobile-card-expanded-body">
                  <div className="mobile-expanded-field">
                    <label>OWNER ASSIGNMENT</label>
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
                    </Select>
                  </div>

                  <LeadQuickEditMobile
                    lead={l}
                    onPersist={update}
                    onFollowUpChange={handleFollowUpChange}
                    setToast={setToast}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* =========================================================================
          1. HOLD LEAD MODAL (Centered, Viewport Safe, Poka-Yoke Safeguards)
          ========================================================================= */}
      {onHoldModalLead && (
        <div className="modal-backdrop" onClick={requestCloseHoldModal}>
          <div
            className="modal-content hold-lead-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hold-modal-title"
          >
            {/* Modal Header with Prominent Lead Name */}
            <div className="modal-head">
              <div>
                <span className="eyebrow">
                  {onHoldModalLead.status === 'On hold' ? 'HOLD SETTINGS • ACTIVE ON HOLD' : 'STATUS CHANGE • POKA-YOKE SAFEGUARD'}
                </span>
                <h3 id="hold-modal-title">
                  {onHoldModalLead.status === 'On hold' ? 'HOLD SETTINGS' : 'PLACE LEAD ON HOLD'}
                </h3>
                <div className="modal-lead-identity-pill">
                  <span className="lead-indicator-dot" />
                  <strong>LEAD: {onHoldModalLead.name}</strong>
                  {onHoldModalLead.service && <span>• {onHoldModalLead.service}</span>}
                </div>
                {onHoldModalLead.status === 'On hold' && (
                  <div style={{ marginTop: '0.65rem' }}>
                    <button
                      type="button"
                      className="btn-resume-in-modal"
                      onClick={() => {
                        const l = onHoldModalLead;
                        setOnHoldModalLead(null);
                        openResumeModal(l);
                      }}
                    >
                      ▶ RESUME THIS LEAD NOW
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={requestCloseHoldModal}
                aria-label="Close Hold Modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Internally Scrollable */}
            <div className="modal-body hold-modal-body">
              {holdErrors.general && (
                <div className="hold-modal-general-error">
                  ⚠ {holdErrors.general}
                </div>
              )}
              {/* Field 1: Primary Reason (Required) */}
              <div className="modal-field-block">
                <label className="field-label-required">
                  <span>1. PRIMARY REASON FOR HOLD (REQUIRED):</span>
                </label>
                <div className="chips-grid">
                  {[
                    ['Budget', 'Budget — Waiting on funds / client budget approval'],
                    ['Timing', 'Timing — Busy with launch / requested temporary delay'],
                    ['Thinking', 'Thinking — Evaluating proposal and options'],
                    ['Awaiting Partner', 'Awaiting approval from business partner or team'],
                    ['Other / Custom', 'Other / Custom reason...'],
                  ].map(([shortKey, fullLabel]) => (
                    <button
                      key={shortKey}
                      type="button"
                      className={`chip-btn ${selectedHoldReason === shortKey ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedHoldReason(shortKey);
                        if (holdErrors.reason) {
                          setHoldErrors((prev) => ({ ...prev, reason: undefined }));
                        }
                      }}
                    >
                      {fullLabel}
                    </button>
                  ))}
                </div>

                {/* Custom reason input if selected or custom text entered */}
                {(selectedHoldReason === 'Other / Custom' || customHoldReason) && (
                  <div style={{ marginTop: '0.4rem' }}>
                    <Input
                      value={customHoldReason}
                      placeholder="Specify custom reason (e.g. Awaiting Q1 planning)..."
                      onChange={(e) => {
                        setCustomHoldReason(e.target.value);
                        if (holdErrors.reason) {
                          setHoldErrors((prev) => ({ ...prev, reason: undefined }));
                        }
                      }}
                      className={holdErrors.reason ? 'input-error-danger' : ''}
                    />
                  </div>
                )}

                {holdErrors.reason && (
                  <div className="field-error-msg">{holdErrors.reason}</div>
                )}
              </div>

              {/* Field 2: Additional context / notes (Optional) */}
              <div className="modal-field-block">
                <label>
                  <span>2. ADDITIONAL CONTEXT / NOTES (OPTIONAL):</span>
                </label>
                <textarea
                  className="modal-textarea"
                  rows={3}
                  value={holdNotes}
                  placeholder="Add any specific context, discussion points or deliverables for the resume date..."
                  onChange={(e) => setHoldNotes(e.target.value)}
                />
              </div>

              {/* Field 3: Resume / follow-up date (Required) */}
              <div className="modal-field-block">
                <label className="field-label-required">
                  <span>3. RESUME / FOLLOW-UP DATE (REQUIRED):</span>
                </label>
                <Input
                  type="date"
                  min={getTodayDate()}
                  required
                  value={holdResumeDate}
                  onChange={(e) => {
                    setHoldResumeDate(e.target.value);
                    if (holdErrors.date) {
                      setHoldErrors((prev) => ({ ...prev, date: undefined }));
                    }
                  }}
                  className={holdErrors.date ? 'input-error-danger' : ''}
                />

                {/* Field 4: Quick Date Shortcuts */}
                <div className="quick-date-shortcuts">
                  <span>QUICK SHORTCUTS:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setHoldResumeDate(getOffsetDate(3));
                      setHoldErrors((prev) => ({ ...prev, date: undefined }));
                    }}
                  >
                    +3 DAYS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHoldResumeDate(getOffsetDate(7));
                      setHoldErrors((prev) => ({ ...prev, date: undefined }));
                    }}
                  >
                    +1 WEEK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHoldResumeDate(getOffsetDate(14));
                      setHoldErrors((prev) => ({ ...prev, date: undefined }));
                    }}
                  >
                    +2 WEEKS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHoldResumeDate(getOffsetDate(30));
                      setHoldErrors((prev) => ({ ...prev, date: undefined }));
                    }}
                  >
                    +1 MONTH
                  </button>
                </div>

                {holdErrors.date && (
                  <div className="field-error-msg">{holdErrors.date}</div>
                )}
              </div>
            </div>

            {/* Modal Actions Footer: Always accessible at bottom */}
            <div className="modal-foot">
              <Button type="button" onClick={requestCloseHoldModal} disabled={isHoldSubmitting}>
                CANCEL
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={isHoldSubmitting}
                onClick={confirmOnHold}
                className="confirm-hold-btn"
              >
                {isHoldSubmitting
                  ? 'SAVING...'
                  : onHoldModalLead.status === 'On hold'
                  ? 'UPDATE HOLD SETTINGS'
                  : 'CONFIRM ON HOLD & SET RESUME DATE'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          RESUME LEAD MODAL (Safe, Poka-Yoke Lead Resumption from Hold)
          ========================================================================= */}
      {resumeModalLead && (
        <div className="modal-backdrop" onClick={() => setResumeModalLead(null)}>
          <div
            className="modal-content hold-lead-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="resume-modal-title"
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">RESUME WORKFLOW • PIPELINE RESTORATION</span>
                <h3 id="resume-modal-title">RESUME LEAD FROM HOLD</h3>
                <div className="modal-lead-identity-pill">
                  <span className="lead-indicator-dot" />
                  <strong>LEAD: {resumeModalLead.name}</strong>
                  {resumeModalLead.service && <span>• {resumeModalLead.service}</span>}
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setResumeModalLead(null)}
                aria-label="Close Resume Modal"
              >
                ✕
              </button>
            </div>

            <div className="modal-body hold-modal-body">
              <div className="resume-lead-info-box">
                <div className="resume-info-row">
                  <span className="eyebrow">CURRENT STATUS:</span>
                  <strong style={{ color: '#fbbf24' }}>ON HOLD</strong>
                </div>
                {resumeModalLead.holdReason && (
                  <div className="resume-info-row">
                    <span className="eyebrow">ACTIVE HOLD REASON:</span>
                    <span>{resumeModalLead.holdReason}</span>
                  </div>
                )}
                {resumeModalLead.resumeDate && (
                  <div className="resume-info-row">
                    <span className="eyebrow">SCHEDULED RESUME:</span>
                    <span>{formatLeadDate(resumeModalLead.resumeDate)}</span>
                  </div>
                )}
                {resumeModalLead.previousStatus && (
                  <div className="resume-info-row">
                    <span className="eyebrow">PREVIOUS STATUS (BEFORE HOLD):</span>
                    <strong style={{ color: leadStatusConfig[resumeModalLead.previousStatus]?.color || '#fff' }}>
                      {resumeModalLead.previousStatus}
                    </strong>
                  </div>
                )}
              </div>

              <div className="modal-field-block" style={{ marginTop: '1rem' }}>
                <label className="field-label-required">
                  <span>SELECT TARGET STATUS TO RESUME TO:</span>
                </label>
                <div className="chips-grid">
                  {leadStatuses
                    .filter((st) => st !== 'On hold')
                    .map((st) => (
                      <button
                        key={st}
                        type="button"
                        className={`chip-btn ${resumeStatus === st ? 'active' : ''}`}
                        onClick={() => setResumeStatus(st)}
                      >
                        {st === (resumeModalLead.previousStatus || 'Qualified')
                          ? `★ ${st} (Previous Status)`
                          : st}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <Button type="button" onClick={() => setResumeModalLead(null)} disabled={isResumeSubmitting}>
                CANCEL
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={isResumeSubmitting}
                onClick={confirmResumeLead}
                className="confirm-resume-btn"
              >
                {isResumeSubmitting ? 'RESUMING...' : `CONFIRM RESUME TO ${resumeStatus.toUpperCase()}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. UNSAVED CHANGES CONFIRMATION MODAL (Poka-Yoke Guard)
          ========================================================================= */}
      {showUnsavedDiscardModal && (
        <div className="modal-backdrop modal-backdrop-nested" onClick={() => setShowUnsavedDiscardModal(false)}>
          <div className="modal-content poka-yoke-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">UNSAVED CHANGES</span>
                <h3>DISCARD HOLD SETUP?</h3>
              </div>
            </div>
            <div className="modal-body">
              <p className="poka-yoke-text">
                You have modified the hold reason, notes, or resume date for{' '}
                <strong>{onHoldModalLead?.name}</strong>. If you discard now, your changes will not be saved.
              </p>
            </div>
            <div className="modal-foot">
              <Button variant="primary" onClick={() => setShowUnsavedDiscardModal(false)}>
                KEEP EDITING
              </Button>
              <Button onClick={discardAndCloseHoldModal} className="btn-destructive">
                DISCARD & CLOSE
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. DATE CHANGE AUDIT MODAL
          ========================================================================= */}
      {dateChangeModal && (
        <div className="modal-backdrop" onClick={() => setDateChangeModal(null)}>
          <div className="modal-content lead-popup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">AUDIT TRACKING • POKA-YOKE</span>
                <h3>TRACK DATE CHANGE</h3>
                <small className="modal-sub-lead">LEAD: {dateChangeModal.lead.name}</small>
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
                <span className="eyebrow">WHY DID THE DATE CHANGE? (REQUIRED):</span>
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

      {/* =========================================================================
          4. CALL BOOKED MANDATORY DATE MODAL
          ========================================================================= */}
      {callBookedModalLead && (
        <div className="modal-backdrop" onClick={() => setCallBookedModalLead(null)}>
          <div className="modal-content lead-popup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">MANDATORY STEP • POKA-YOKE</span>
                <h3>SET CALL BOOKED DATE</h3>
                <small className="modal-sub-lead">LEAD: {callBookedModalLead.name}</small>
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
                To move <strong>{callBookedModalLead.name}</strong> to <strong>Call booked</strong>, you must set the scheduled date and time.
              </p>

              <div className="modal-field-block">
                <span className="eyebrow">SCHEDULED CALL DATE (REQUIRED):</span>
                <Input
                  type="date"
                  min={getTodayDate()}
                  required
                  value={callBookedDate}
                  onChange={(e) => {
                    setCallBookedDate(e.target.value);
                    setCallBookedError('');
                  }}
                  className={callBookedError ? 'input-error-danger' : ''}
                />
                {callBookedError && <div className="field-error-msg">{callBookedError}</div>}
              </div>
            </div>

            <div className="modal-foot">
              <Button type="button" onClick={() => setCallBookedModalLead(null)}>
                CANCEL
              </Button>
              <Button type="button" variant="primary" onClick={confirmCallBooked}>
                CONFIRM CALL BOOKING
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          5. DELETE LEAD POKA-YOKE CONFIRMATION MODAL
          ========================================================================= */}
      {leadToDelete && (
        <div className="modal-backdrop" onClick={() => setLeadToDelete(null)}>
          <div className="modal-content poka-yoke-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: '#ef4444' }}>DESTRUCTIVE ACTION • POKA-YOKE</span>
                <h3>PERMANENTLY DELETE LEAD?</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setLeadToDelete(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="poka-yoke-text">
                Are you sure you want to permanently delete lead <strong>"{leadToDelete.name}"</strong>?
              </p>
              <div className="poka-yoke-lead-details">
                <div><span>Contact:</span> <strong>{leadToDelete.contact || 'None'}</strong></div>
                <div><span>Service:</span> <strong>{leadToDelete.service || 'None'}</strong></div>
                <div><span>Status:</span> <strong>{leadToDelete.status}</strong></div>
              </div>
              <div className="poka-yoke-warning-callout">
                ⚠ This action is irreversible. All activity history and reminders associated with this lead will be permanently deleted.
              </div>
            </div>

            <div className="modal-foot">
              <Button type="button" onClick={() => setLeadToDelete(null)}>
                CANCEL
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={confirmDeleteLead}
                className="btn-destructive-confirm"
              >
                YES, PERMANENTLY DELETE
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. ACTIVITY LOG & AUDIT MODAL
          ========================================================================= */}
      {activeActivityLead && (
        <div className="modal-backdrop" onClick={() => setActiveActivityLead(null)}>
          <div
            className="modal-content lead-activity-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">CHRONOLOGICAL AUDIT TIMELINE</span>
                <h3>LEAD ACTIVITY LOG</h3>
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
              <div className="activity-lead-summary">
                <div>
                  <span className="eyebrow">LEAD</span>
                  <strong>{activeActivityLead.name}</strong>
                </div>
                <div>
                  <span className="eyebrow">STATUS</span>
                  <strong style={{ color: leadStatusConfig[activeActivityLead.status]?.color }}>
                    {activeActivityLead.status}
                  </strong>
                </div>
                <div>
                  <span className="eyebrow">OWNER</span>
                  <strong>{activeActivityLead.owner || 'Unassigned'}</strong>
                </div>
                <div>
                  <span className="eyebrow">NEXT FOLLOW-UP</span>
                  <strong>{formatLeadDate(activeActivityLead.followUp)}</strong>
                </div>
              </div>

              {/* Form to append manual note to log */}
              <form onSubmit={handleAddManualNote} className="activity-note-form">
                <span className="eyebrow">+ LOG NEW NOTE / CLIENT UPDATE:</span>
                <div className="note-input-row">
                  <Input
                    placeholder="Type client update, phone call notes, budget revisions..."
                    value={newActivityNote}
                    onChange={(e) => setNewActivityNote(e.target.value)}
                  />
                  <Button type="submit" variant="primary" disabled={!newActivityNote.trim()}>
                    ADD NOTE
                  </Button>
                </div>
              </form>

              {/* Chronological Timeline */}
              <div className="activity-timeline-feed">
                {activeActivityLead.activityLog && activeActivityLead.activityLog.length > 0 ? (
                  activeActivityLead.activityLog.map((act) => (
                    <div key={act.id} className={`timeline-entry timeline-type-${act.type || 'status'}`}>
                      <div className="timeline-marker" />
                      <div className="timeline-content">
                        <div className="timeline-meta">
                          <strong className="timeline-author">{act.author}</strong>
                          <span className="timeline-time">
                            {new Date(act.timestamp).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="timeline-action-text">{act.action}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="timeline-empty">
                    <p>No activity recorded yet for this lead.</p>
                  </div>
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

const SaveIndicator = ({
  saveState,
  errorMsg,
  onRetry,
}: {
  saveState: 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
  errorMsg: string | null;
  onRetry: () => void;
}) => {
  if (saveState === 'idle') return null;
  return (
    <span style={{ marginLeft: '0.5rem', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
      {saveState === 'dirty' && <span style={{ color: 'var(--grey)' }}>Unsaved…</span>}
      {saveState === 'saving' && <span style={{ color: 'var(--grey)' }}>Saving…</span>}
      {saveState === 'saved' && <span style={{ color: '#22c55e', fontWeight: 600 }}>Saved</span>}
      {saveState === 'error' && (
        <span style={{ color: '#ef4444', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          Save failed{errorMsg ? `: ${errorMsg}` : ''}
          <button
            type="button"
            onClick={onRetry}
            style={{
              background: 'transparent',
              border: '1px solid #ef4444',
              color: '#ef4444',
              padding: '0.05rem 0.35rem',
              fontSize: '0.65rem',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </span>
      )}
    </span>
  );
};

const LeadQuickEditDesktop = React.memo(function LeadQuickEditDesktop({
  lead,
  onPersist,
  setToast,
}: {
  lead: Lead;
  onPersist: (id: string, patch: Partial<Lead>) => Promise<void>;
  setToast?: (msg: string) => void;
}) {
  const { draft, saveState, errorMsg, queuePatch, flushIfDirty, retry } = useEntityDraft<Lead>({
    entityId: lead.id,
    entity: lead,
    onPersist: (id, patch) => onPersist(id, patch as Partial<Lead>),
    debounceMs: 600,
    onUnmountError: () => setToast?.('Failed to save lead edits. Please check connection.'),
  });

  return (
    <>
      <span className="eyebrow">
        QUICK EDIT RECORD
        <SaveIndicator saveState={saveState} errorMsg={errorMsg} onRetry={retry} />
      </span>
      <div className="details-input-grid">
        <label>
          <span>LEAD NAME:</span>
          <Input
            value={draft.name}
            onChange={(e) => queuePatch({ name: e.target.value })}
            onBlur={flushIfDirty}
          />
        </label>
        <label>
          <span>CONTACT INFO:</span>
          <Input
            value={draft.contact}
            placeholder="@handle or phone"
            onChange={(e) => queuePatch({ contact: e.target.value })}
            onBlur={flushIfDirty}
          />
        </label>
        <label>
          <span>SERVICE REQUIRED:</span>
          <Input
            value={draft.service}
            onChange={(e) => queuePatch({ service: e.target.value })}
            onBlur={flushIfDirty}
          />
        </label>
        <label>
          <span>BUDGET:</span>
          <Input
            value={draft.budget}
            onChange={(e) => queuePatch({ budget: e.target.value })}
            onBlur={flushIfDirty}
          />
        </label>
      </div>
    </>
  );
});

const LeadQuickEditMobile = React.memo(function LeadQuickEditMobile({
  lead,
  onPersist,
  onFollowUpChange,
  setToast,
}: {
  lead: Lead;
  onPersist: (id: string, patch: Partial<Lead>) => Promise<void>;
  onFollowUpChange: (lead: Lead, newDate: string) => Promise<void> | void;
  setToast?: (msg: string) => void;
}) {
  const { draft, saveState, errorMsg, queuePatch, flushIfDirty, retry } = useEntityDraft<Lead>({
    entityId: lead.id,
    entity: lead,
    onPersist: (id, patch) => onPersist(id, patch as Partial<Lead>),
    debounceMs: 600,
    onUnmountError: () => setToast?.('Failed to save lead edits. Please check connection.'),
  });

  return (
    <>
      <div className="mobile-expanded-field">
        <label>
          FOLLOW-UP DATE
          <SaveIndicator saveState={saveState} errorMsg={errorMsg} onRetry={retry} />
        </label>
        <Input
          type="date"
          value={lead.followUp || ''}
          onChange={(e) => onFollowUpChange(lead, e.target.value)}
        />
      </div>

      <div className="mobile-expanded-field">
        <label>SERVICE</label>
        <Input
          value={draft.service}
          onChange={(e) => queuePatch({ service: e.target.value })}
          onBlur={flushIfDirty}
        />
      </div>

      <div className="mobile-expanded-field">
        <label>BUDGET</label>
        <Input
          value={draft.budget}
          onChange={(e) => queuePatch({ budget: e.target.value })}
          onBlur={flushIfDirty}
        />
      </div>
    </>
  );
});
