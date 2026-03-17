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
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const BATCH_SIZE = 10;
    const [pageByGroup, setPageByGroup] = useState<Record<StatusGroup, number>>({
        under_review: 0,
        needs_fix: 0,
        awaiting_second_check: 0,
    });

    const changePage = (status: StatusGroup, delta: number, maxPage: number) => {
        setPageByGroup(prev => ({
            ...prev,
            [status]: Math.max(0, Math.min(prev[status] + delta, maxPage)),
        }));
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };


    // Fetch participants needing QC
    const fetchParticipants = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/qc/list');
            const data = await res.json();
            if (data.ok) {
                setParticipants(data.participants);
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
                setParticipants(prev => prev.filter(p => p.prolific_pid !== pid));
                showToast(`Audio approved for ${pid}`);
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
                setParticipants(prev => prev.filter(p => p.prolific_pid !== pid));
                showToast(`Marked needs fix for ${pid}`);
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
                setParticipants(prev => prev.filter(p => p.prolific_pid !== pid));
                showToast(`Audio replaced for ${pid}`);
            } else {
                alert('Error: ' + data.error);
            }
        } catch {
            alert('Failed to replace audio');
        }
        setActionLoading(null);
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

                                {(() => {
                                    const page = pageByGroup[status];
                                    const totalPages = Math.ceil(group.length / BATCH_SIZE);
                                    const pageItems = group.slice(page * BATCH_SIZE, (page + 1) * BATCH_SIZE);
                                    const start = page * BATCH_SIZE + 1;
                                    const end = Math.min((page + 1) * BATCH_SIZE, group.length);
                                    return (
                                        <>
                                            <p style={styles.pageInfo}>Showing {start}–{end} of {group.length}</p>
                                            <div style={styles.list}>
                                                {pageItems.map((p) => (
                                                    <div key={p.prolific_pid} style={{ ...styles.card, borderLeft: `4px solid ${config.color}` }}>
                                                        <div style={styles.cardHeader}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                            {totalPages > 1 && (
                                                <div style={styles.pagination}>
                                                    <button
                                                        onClick={() => changePage(status, -1, totalPages - 1)}
                                                        disabled={page === 0}
                                                        style={{ ...styles.pageBtn, opacity: page === 0 ? 0.4 : 1 }}
                                                    >
                                                        ← Previous
                                                    </button>
                                                    <span style={styles.pageLabel}>Page {page + 1} / {totalPages}</span>
                                                    <button
                                                        onClick={() => changePage(status, 1, totalPages - 1)}
                                                        disabled={page >= totalPages - 1}
                                                        style={{ ...styles.pageBtn, opacity: page >= totalPages - 1 ? 0.4 : 1 }}
                                                    >
                                                        Next →
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        );
                    })}
                </>
            )}

            <button onClick={fetchParticipants} style={styles.refreshBtn}>
                🔄 Refresh
            </button>

            {/* Simple Toast Notification */}
            {toastMessage && (
                <div style={styles.toast}>
                    {toastMessage}
                </div>
            )}
        </main>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    toast: {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: '#4caf50',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        zIndex: 1000,
        fontWeight: 500,
        animation: 'fadeIn 0.3s ease-in-out',
    },
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

    refreshBtn: {
        marginTop: '24px',
        padding: '12px 24px',
        background: '#333',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    pageInfo: {
        fontSize: '12px',
        color: '#888',
        marginBottom: '8px',
    },
    pagination: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginTop: '16px',
    },
    pageBtn: {
        padding: '8px 16px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        background: '#fff',
        cursor: 'pointer',
        fontWeight: 'bold',
    },
    pageLabel: {
        fontSize: '13px',
        color: '#555',
    },
};
