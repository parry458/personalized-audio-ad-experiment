/**
 * Admin QC Dashboard
 * ==================
 * 
 * Review and approve participant audio.
 * Groups participants by status. Supports batch regeneration for needs_fix items.
 * Protected by Basic Auth middleware.
 */

'use client';

import { useState, useEffect } from 'react';

interface Participant {
    prolific_pid: string;
    condition: string;
    audio_status: string;
    audio_path: string | null;
    audio_url: string | null;
    audio_generated_at: string | null;
    qc_status: string;
    qc_checked_at: string | null;
    qc_notes: string | null;
    qc_replaced_count: number;
}

type StatusGroup = 'under_review' | 'needs_fix' | 'awaiting_second_check';

const GROUP_CONFIG: Record<StatusGroup, { label: string; color: string; bgColor: string }> = {
    under_review: { label: '🔍 Awaiting First Check', color: '#ff9800', bgColor: '#fff8e1' },
    needs_fix: { label: '⚠️ Needs Fix', color: '#f44336', bgColor: '#ffebee' },
    awaiting_second_check: { label: '🔄 Awaiting Second Check', color: '#2196f3', bgColor: '#e3f2fd' },
};

export default function AdminQCPage() {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [regenerating, setRegenerating] = useState(false);

    // Fetch participants needing QC
    const fetchParticipants = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/qc/list');
            const data = await res.json();
            if (data.ok) {
                setParticipants(data.participants);
                // Clear selection for any PIDs no longer in the list
                setSelected(prev => {
                    const validPids = new Set(data.participants.map((p: Participant) => p.prolific_pid));
                    return new Set([...prev].filter(pid => validPids.has(pid)));
                });
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchParticipants();
    }, []);

    // Handle approve
    const handleApprove = async (pid: string) => {
        setActionLoading(pid);
        try {
            const res = await fetch('/api/admin/qc/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prolific_pid: pid, qc_notes: notes[pid] }),
            });
            const data = await res.json();
            if (data.ok) {
                await fetchParticipants();
            } else {
                alert('Error: ' + data.error);
            }
        } catch {
            alert('Failed to approve');
        }
        setActionLoading(null);
    };

    // Handle needs fix
    const handleNeedsFix = async (pid: string) => {
        setActionLoading(pid);
        try {
            const res = await fetch('/api/admin/qc/needs-fix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prolific_pid: pid, qc_notes: notes[pid] }),
            });
            const data = await res.json();
            if (data.ok) {
                await fetchParticipants();
            } else {
                alert('Error: ' + data.error);
            }
        } catch {
            alert('Failed to mark needs fix');
        }
        setActionLoading(null);
    };

    // Handle replace audio
    const handleReplaceAudio = async (pid: string, file: File) => {
        setActionLoading(pid);
        try {
            const formData = new FormData();
            formData.append('prolific_pid', pid);
            formData.append('file', file);
            if (notes[pid]) formData.append('qc_notes', notes[pid]);

            const res = await fetch('/api/admin/qc/replace-audio', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.ok) {
                await fetchParticipants();
            } else {
                alert('Error: ' + data.error);
            }
        } catch {
            alert('Failed to replace audio');
        }
        setActionLoading(null);
    };

    // Handle batch regeneration
    const handleRegenerate = async () => {
        if (selected.size === 0) return;
        if (!confirm(`Regenerate audio for ${selected.size} participant(s)?\n\nThis will call ElevenLabs TTS, stitch with podcast, and upload new files.`)) return;

        setRegenerating(true);
        try {
            const res = await fetch('/api/admin/qc/regenerate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prolific_pids: [...selected] }),
            });
            const data = await res.json();
            if (data.ok) {
                const { summary } = data;
                alert(`Regeneration complete!\n✅ ${summary.success} succeeded\n❌ ${summary.failed} failed`);
                setSelected(new Set());
                await fetchParticipants();
            } else {
                alert('Error: ' + data.error);
            }
        } catch {
            alert('Failed to regenerate');
        }
        setRegenerating(false);
    };

    // Toggle selection
    const toggleSelect = (pid: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(pid)) next.delete(pid);
            else next.add(pid);
            return next;
        });
    };

    // Select all needs_fix
    const needsFixPids = participants.filter(p => p.qc_status === 'needs_fix').map(p => p.prolific_pid);
    const allNeedsFixSelected = needsFixPids.length > 0 && needsFixPids.every(pid => selected.has(pid));

    const toggleSelectAll = () => {
        if (allNeedsFixSelected) {
            setSelected(prev => {
                const next = new Set(prev);
                needsFixPids.forEach(pid => next.delete(pid));
                return next;
            });
        } else {
            setSelected(prev => new Set([...prev, ...needsFixPids]));
        }
    };

    // Group participants by status
    const groups: Record<StatusGroup, Participant[]> = {
        under_review: participants.filter(p => p.qc_status === 'under_review'),
        needs_fix: participants.filter(p => p.qc_status === 'needs_fix'),
        awaiting_second_check: participants.filter(p => p.qc_status === 'awaiting_second_check'),
    };

    if (loading) {
        return <main style={styles.main}><p>Loading...</p></main>;
    }

    if (error) {
        return (
            <main style={styles.main}>
                <h1>Admin QC Dashboard</h1>
                <p style={styles.error}>Error: {error}</p>
            </main>
        );
    }

    return (
        <main style={styles.main}>
            <h1>🎧 Admin QC Dashboard</h1>
            <p style={styles.subtitle}>
                Participants needing QC review: <strong>{participants.length}</strong>
            </p>

            {participants.length === 0 ? (
                <p style={styles.empty}>✅ No participants pending QC review.</p>
            ) : (
                <>
                    {/* Regenerate bar for needs_fix */}
                    {needsFixPids.length > 0 && (
                        <div style={styles.regenBar}>
                            <label style={styles.selectAllLabel}>
                                <input
                                    type="checkbox"
                                    checked={allNeedsFixSelected}
                                    onChange={toggleSelectAll}
                                />
                                Select all Needs Fix ({needsFixPids.length})
                            </label>
                            <button
                                onClick={handleRegenerate}
                                disabled={selected.size === 0 || regenerating}
                                style={{
                                    ...styles.button,
                                    ...styles.regenBtn,
                                    opacity: selected.size === 0 || regenerating ? 0.5 : 1,
                                }}
                            >
                                {regenerating ? '⏳ Regenerating...' : `🔄 Regenerate Selected (${selected.size})`}
                            </button>
                        </div>
                    )}

                    {/* Grouped sections */}
                    {(Object.keys(GROUP_CONFIG) as StatusGroup[]).map(status => {
                        const group = groups[status];
                        if (group.length === 0) return null;
                        const config = GROUP_CONFIG[status];

                        return (
                            <div key={status} style={{ marginBottom: '32px' }}>
                                <h2 style={{ ...styles.groupHeader, color: config.color }}>
                                    {config.label}
                                    <span style={styles.groupCount}>{group.length}</span>
                                </h2>

                                <div style={styles.list}>
                                    {group.map((p) => (
                                        <div key={p.prolific_pid} style={{ ...styles.card, borderLeft: `4px solid ${config.color}` }}>
                                            <div style={styles.cardHeader}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {/* Checkbox only for needs_fix */}
                                                    {status === 'needs_fix' && (
                                                        <input
                                                            type="checkbox"
                                                            checked={selected.has(p.prolific_pid)}
                                                            onChange={() => toggleSelect(p.prolific_pid)}
                                                            style={{ width: '18px', height: '18px' }}
                                                        />
                                                    )}
                                                    <strong>{p.prolific_pid}</strong>
                                                    <span style={styles.conditionBadge}>{p.condition}</span>
                                                </div>
                                                <span style={{
                                                    ...styles.badge,
                                                    background: config.color,
                                                }}>
                                                    {config.label.replace(/^[^ ]+ /, '')}
                                                </span>
                                            </div>

                                            <div style={styles.meta}>
                                                <span>Generated: {p.audio_generated_at ? new Date(p.audio_generated_at).toLocaleString() : 'N/A'}</span>
                                                {p.qc_replaced_count > 0 && (
                                                    <span> • Replaced: {p.qc_replaced_count}x</span>
                                                )}
                                                {p.qc_notes && (
                                                    <span> • Notes: {p.qc_notes}</span>
                                                )}
                                            </div>

                                            {p.audio_url && (
                                                <audio controls src={p.audio_url} style={styles.audio} />
                                            )}

                                            <textarea
                                                placeholder="QC notes (optional)"
                                                value={notes[p.prolific_pid] || ''}
                                                onChange={(e) => setNotes({ ...notes, [p.prolific_pid]: e.target.value })}
                                                style={styles.textarea}
                                            />

                                            <div style={styles.actions}>
                                                {/* Approve: for under_review and awaiting_second_check */}
                                                {(status === 'under_review' || status === 'awaiting_second_check') && (
                                                    <button
                                                        onClick={() => handleApprove(p.prolific_pid)}
                                                        disabled={actionLoading === p.prolific_pid}
                                                        style={{ ...styles.button, ...styles.approveBtn }}
                                                    >
                                                        ✅ Approve
                                                    </button>
                                                )}
                                                {/* Needs Fix: for under_review and awaiting_second_check */}
                                                {(status === 'under_review' || status === 'awaiting_second_check') && (
                                                    <button
                                                        onClick={() => handleNeedsFix(p.prolific_pid)}
                                                        disabled={actionLoading === p.prolific_pid}
                                                        style={{ ...styles.button, ...styles.fixBtn }}
                                                    >
                                                        ⚠️ Needs Fix
                                                    </button>
                                                )}
                                                {/* Replace Audio: always available */}
                                                <label style={styles.uploadLabel}>
                                                    📁 Replace Audio
                                                    <input
                                                        type="file"
                                                        accept="audio/mpeg,audio/mp3"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleReplaceAudio(p.prolific_pid, file);
                                                        }}
                                                        style={{ display: 'none' }}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </>
            )}

            <button onClick={fetchParticipants} style={styles.refreshBtn}>
                🔄 Refresh
            </button>
        </main>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    main: {
        padding: '40px 20px',
        maxWidth: '900px',
        margin: '0 auto',
        fontFamily: 'system-ui, sans-serif',
    },
    subtitle: {
        color: '#666',
        marginBottom: '24px',
    },
    empty: {
        color: '#4caf50',
        padding: '20px',
        background: '#e8f5e9',
        borderRadius: '8px',
    },
    error: {
        color: '#d32f2f',
        padding: '20px',
        background: '#ffebee',
        borderRadius: '8px',
    },
    groupHeader: {
        fontSize: '18px',
        fontWeight: 'bold',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    groupCount: {
        background: '#eee',
        color: '#333',
        borderRadius: '12px',
        padding: '2px 10px',
        fontSize: '13px',
        fontWeight: 'normal',
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    card: {
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        background: '#fafafa',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
    },
    badge: {
        padding: '4px 12px',
        borderRadius: '12px',
        color: 'white',
        fontSize: '12px',
        fontWeight: 'bold',
    },
    conditionBadge: {
        padding: '2px 8px',
        borderRadius: '4px',
        background: '#e0e0e0',
        color: '#333',
        fontSize: '11px',
        textTransform: 'uppercase',
    },
    meta: {
        fontSize: '12px',
        color: '#888',
        marginBottom: '12px',
    },
    audio: {
        width: '100%',
        marginBottom: '12px',
    },
    textarea: {
        width: '100%',
        minHeight: '60px',
        padding: '8px',
        marginBottom: '12px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        fontFamily: 'inherit',
        resize: 'vertical',
    },
    actions: {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
    },
    button: {
        padding: '10px 16px',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 'bold',
    },
    approveBtn: {
        background: '#4caf50',
        color: 'white',
    },
    fixBtn: {
        background: '#ff9800',
        color: 'white',
    },
    uploadLabel: {
        padding: '10px 16px',
        borderRadius: '4px',
        background: '#2196f3',
        color: 'white',
        cursor: 'pointer',
        fontWeight: 'bold',
    },
    regenBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: '#fff3e0',
        border: '1px solid #ffcc80',
        borderRadius: '8px',
        marginBottom: '24px',
    },
    selectAllLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '14px',
    },
    regenBtn: {
        background: '#e65100',
        color: 'white',
        fontSize: '14px',
    },
    refreshBtn: {
        marginTop: '24px',
        padding: '12px 24px',
        background: '#333',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
};
