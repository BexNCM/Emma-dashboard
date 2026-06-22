import { useState, useEffect } from 'react';
import Head from 'next/head';

// ===== WEBHOOK ENDPOINTS =====
const FETCH_WEBHOOK = 'https://hook.eu1.make.com/goiuad2qu5k2jwb6vdovxbwwnoywo78s';
const ACTIONS_WEBHOOK = 'https://hook.eu1.make.com/kdjon3heov9zltj1oay65pyvvkeg9uch';

export default function Dashboard() {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [processing, setProcessing] = useState(null);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardTo, setForwardTo] = useState('');
  const [toast, setToast] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => { fetchBriefing(); }, []);

  const fetchBriefing = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(FETCH_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!res.ok) throw new Error('Fetch failed: ' + res.status);
      const text = await res.text();
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(cleaned);
      setBriefing(data);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAction = async (action, email, extra = {}) => {
    setProcessing(action);
    try {
      const payload = {
        action,
        emailId: email.id,
        fromAddress: email.from_address,
        fromName: email.from_name,
        subject: email.subject,
        body: email.body || email.preview,
        replyText: extra.replyText !== undefined ? extra.replyText : replyText,
        forwardTo: extra.forwardTo || ''
      };
      const res = await fetch(ACTIONS_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Action failed');
      const data = await res.json();
      if (action === 'ai_draft') return data.draft || '';
      if (action === 'save_draft') showToast('✓ Saved to Outlook drafts');
      else if (action === 'send') { showToast('✓ Reply sent'); closeModal(); }
      else if (action === 'forward_draft') { showToast('✓ Forward draft saved'); setForwardOpen(false); setForwardTo(''); closeModal(); }
      else if (action === 'delete') { showToast('✓ Deleted'); closeModal(); }
    } catch (e) {
      showToast('✕ ' + e.message, 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleAiDraft = async () => {
    if (!selected) return;
    setAiDrafting(true);
    try {
      const draft = await handleAction('ai_draft', selected, { replyText });
      if (draft) setReplyText(draft);
    } finally {
      setAiDrafting(false);
    }
  };

  const closeModal = () => {
    setSelected(null);
    setReplyText('');
    setForwardOpen(false);
    setForwardTo('');
  };

  const openModal = (email) => {
    setSelected(email);
    setReplyText('');
    setForwardOpen(false);
  };

  const formatDate = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const formatTime = (d) => d ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
  const timeAgo = (iso) => {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  };

  const filteredEmails = (list) => {
    if (!list) return [];
    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter(e => (e.subject || '').toLowerCase().includes(s) || (e.from_name || '').toLowerCase().includes(s) || (e.preview || '').toLowerCase().includes(s));
  };

  const urgent = filteredEmails(briefing?.emails?.urgent);
  const action = filteredEmails(briefing?.emails?.action);
  const fyi = filteredEmails(briefing?.emails?.fyi);

  const showSection = (key) => filter === 'all' || filter === key;

  return (
    <>
      <Head>
        <title>Emma's Daily Briefing — NCM</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--ncm-navy:#0f1419;--ncm-navy-soft:#1a2030;--ncm-navy-lift:#252d3f;--ncm-gold:#c4a96b;--ncm-gold-soft:#d4bc85;--ncm-cream:#faf7f2;--ncm-paper:#f5f1ea;--ncm-ink:#1a1a1a;--ncm-ink-soft:#4a4a4a;--ncm-ink-faded:#8a8a8a;--ncm-line:#e8e3da;--urgent:#c0392b;--urgent-bg:#fdf2f0;--action:#b8860b;--action-bg:#fdf9ed;--fyi:#5a7a4d;--fyi-bg:#f4f7f1}
        body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--ncm-cream);color:var(--ncm-ink);min-height:100vh;-webkit-font-smoothing:antialiased}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div style={S.shell}>
        <div style={S.header}>
          <div style={S.headerOverlay}></div>
          <div style={S.brandRow}>
            <div style={S.brand}>
              <div style={S.brandMark}>N</div>
              <div style={S.brandText}>NCM · The Surplus Strategy People™</div>
            </div>
            <div style={S.headerActions}>
              <button style={S.iconBtn} onClick={fetchBriefing} title="Refresh" disabled={loading}>{loading ? '⋯' : '↻'}</button>
            </div>
          </div>
          <div style={S.greeting}>Good morning, <span style={{ color: 'var(--ncm-gold)' }}>Emma</span></div>
          <div style={S.date}>{formatDate()}{lastUpdated && ` · Updated ${formatTime(lastUpdated)}`}</div>

          {briefing?.counts && (
            <div style={S.stats}>
              <Stat num={briefing.counts.urgent || 0} label="Urgent" color="#ff6b5e" />
              <Stat num={briefing.counts.action || 0} label="Action" color="var(--ncm-gold)" />
              <Stat num={briefing.counts.fyi || 0} label="FYI" color="#7ab068" />
              <Stat num={briefing.counts.ignore || 0} label="Ignored" color="#9aa4b8" />
            </div>
          )}
        </div>

        {briefing && (
          <div style={S.toolbar}>
            <div style={S.search}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input style={S.searchInput} placeholder="Search emails, senders, subjects…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={S.chips}>
              {['all', 'urgent', 'action', 'fyi'].map(f => (
                <div key={f} style={{ ...S.chip, ...(filter === f ? S.chipActive : {}) }} onClick={() => setFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div style={S.stateBox}>
            <div style={S.spinner}></div>
            <div style={{ marginTop: 16, color: 'var(--ncm-ink-faded)' }}>Fetching your inbox…</div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ncm-ink-faded)' }}>This takes ~10-20 seconds while Claude categorises</div>
          </div>
        )}

        {error && !loading && (
          <div style={S.stateBox}>
            <div style={{ fontSize: 14, color: 'var(--urgent)', marginBottom: 12, fontWeight: 600 }}>Couldn't load briefing</div>
            <div style={{ fontSize: 12, color: 'var(--ncm-ink-faded)', marginBottom: 16 }}>{error}</div>
            <button style={S.btnPrimary} onClick={fetchBriefing}>Try again</button>
          </div>
        )}

        {briefing && !loading && (
          <>
            {showSection('urgent') && urgent.length > 0 && (
              <Section title="Urgent — needs your response today" count={urgent.length} dotColor="var(--urgent)" shadow="rgba(192,57,43,0.15)">
                {urgent.map((e, i) => <EmailCard key={e.id || i} email={e} variant="urgent" onClick={() => openModal({ ...e, category: 'urgent' })} timeAgo={timeAgo} />)}
              </Section>
            )}
            {showSection('action') && action.length > 0 && (
              <Section title="Action required — not urgent" count={action.length} dotColor="var(--action)" shadow="rgba(184,134,11,0.15)">
                {action.map((e, i) => <EmailCard key={e.id || i} email={e} variant="action" onClick={() => openModal({ ...e, category: 'action' })} timeAgo={timeAgo} />)}
              </Section>
            )}
            {showSection('fyi') && fyi.length > 0 && (
              <Section title="FYI · Low priority" count={fyi.length} dotColor="var(--fyi)" shadow="rgba(90,122,77,0.15)">
                {fyi.map((e, i) => <EmailCard key={e.id || i} email={e} variant="fyi" onClick={() => openModal({ ...e, category: 'fyi' })} timeAgo={timeAgo} />)}
              </Section>
            )}
            {urgent.length === 0 && action.length === 0 && fyi.length === 0 && (
              <div style={S.stateBox}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Inbox zero</div>
                <div style={{ fontSize: 13, color: 'var(--ncm-ink-faded)', marginTop: 6 }}>Nothing needs your attention right now.</div>
              </div>
            )}
          </>
        )}

        <div style={S.footer}>Live briefing · <span style={{ color: 'var(--ncm-gold)' }}>NCM Auctions</span> · {lastUpdated ? `Updated ${formatTime(lastUpdated)}` : 'Loading'}</div>
      </div>

      {selected && (
        <div style={S.modalOverlay} onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div style={S.modal}>
            <div style={S.modalHead}>
              <div style={{ flex: 1 }}>
                <div style={S.modalFrom}>From <strong>{selected.from_name}</strong> · {selected.from_address} · {timeAgo(selected.received_at)}</div>
                <div style={S.modalSubject}>{selected.subject}</div>
                {selected.suggested_action && <div style={S.modalSuggestion}>↳ {selected.suggested_action}</div>}
              </div>
              <button style={S.modalClose} onClick={closeModal}>✕</button>
            </div>

            <div style={S.modalBody}>{selected.body || selected.preview || 'No preview available'}</div>

            {!forwardOpen && (
              <>
                <div style={S.modalActionsWrap}>
                  <div style={S.modalLabel}>Draft reply</div>
                  <textarea style={S.modalReply} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your response… or hit ✨ AI draft to have Claude write it in Emma's voice" />
                </div>

                <div style={S.modalActions}>
                  <button style={S.btnGhost} onClick={handleAiDraft} disabled={aiDrafting}>{aiDrafting ? '⋯ drafting' : '✨ AI draft'}</button>
                  <button style={S.btnDanger} onClick={() => { if (confirm('Delete this email permanently?')) handleAction('delete', selected); }} disabled={processing}>🗑 Delete</button>
                  <div style={{ flex: 1 }}></div>
                  <button style={S.btnGhost} onClick={() => setForwardOpen(true)} disabled={processing}>→ Forward</button>
                  <button style={S.btnGold} onClick={() => handleAction('save_draft', selected)} disabled={processing || !replyText}>{processing === 'save_draft' ? '⋯' : '↳ Save draft to Outlook'}</button>
                  <button style={S.btnPrimary} onClick={() => { if (confirm('Send this reply now?')) handleAction('send', selected); }} disabled={processing || !replyText}>{processing === 'send' ? '⋯' : 'Send →'}</button>
                </div>
              </>
            )}

            {forwardOpen && (
              <>
                <div style={S.modalActionsWrap}>
                  <div style={S.modalLabel}>Forward to (email address)</div>
                  <input style={S.modalInput} placeholder="recipient@example.com" value={forwardTo} onChange={e => setForwardTo(e.target.value)} />
                  <div style={{ ...S.modalLabel, marginTop: 16 }}>Optional note</div>
                  <textarea style={S.modalReply} placeholder="Add a note to forward with…" value={replyText} onChange={e => setReplyText(e.target.value)} />
                </div>
                <div style={S.modalActions}>
                  <button style={S.btnGhost} onClick={() => setForwardOpen(false)}>← Back</button>
                  <div style={{ flex: 1 }}></div>
                  <button style={S.btnGold} onClick={() => handleAction('forward_draft', selected, { forwardTo })} disabled={processing || !forwardTo}>{processing === 'forward_draft' ? '⋯' : '↳ Save forward draft'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div style={{ ...S.toast, background: toast.type === 'error' ? '#c0392b' : '#0f1419' }}>{toast.msg}</div>
      )}
    </>
  );
}

const Stat = ({ num, label, color }) => (
  <div style={S.stat}>
    <div style={{ ...S.statNum, color }}>{num}</div>
    <div style={S.statLabel}>{label}</div>
  </div>
);

const Section = ({ title, count, dotColor, shadow, children }) => (
  <div style={{ marginBottom: 32 }}>
    <div style={S.sectionHead}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, boxShadow: `0 0 0 4px ${shadow}` }}></div>
      <div style={S.sectionTitle}>{title}</div>
      <div style={S.sectionCount}>{count}</div>
    </div>
    {children}
  </div>
);

const EmailCard = ({ email, variant, onClick, timeAgo }) => {
  const borderColors = { urgent: 'var(--urgent)', action: 'var(--action)', fyi: 'var(--fyi)' };
  const tagBg = { urgent: 'var(--urgent-bg)', action: 'var(--action-bg)' };
  const tagColor = { urgent: 'var(--urgent)', action: 'var(--action)' };
  return (
    <div style={{ ...S.email, borderLeft: `3px solid ${borderColors[variant]}` }} onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px -8px rgba(15,20,25,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
      <div style={S.emailTop}>
        <div style={S.emailFrom}>{email.from_name}{email.from_address ? ` · ${email.from_address}` : ''}</div>
        <div style={S.emailTime}>{timeAgo(email.received_at)}</div>
      </div>
      <div style={S.emailSubject}>{email.subject}</div>
      <div style={S.emailPreview}>{email.preview || email.body?.substring(0, 200)}</div>
      {email.suggested_action && (variant === 'urgent' || variant === 'action') && (
        <div style={{ ...S.emailTag, background: tagBg[variant], color: tagColor[variant] }}>↳ {email.suggested_action}</div>
      )}
    </div>
  );
};

const S = {
  shell: { maxWidth: 900, margin: '0 auto', padding: '32px 24px 80px' },
  header: { background: 'linear-gradient(135deg, #0f1419 0%, #1a2030 100%)', borderRadius: 18, padding: '36px 40px', position: 'relative', overflow: 'hidden', boxShadow: '0 12px 40px -12px rgba(15,20,25,0.4)' },
  headerOverlay: { position: 'absolute', top: 0, right: 0, width: 300, height: 300, background: 'radial-gradient(circle, rgba(196,169,107,0.15) 0%, transparent 70%)', pointerEvents: 'none' },
  brandRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, position: 'relative', zIndex: 1 },
  brand: { display: 'flex', alignItems: 'center', gap: 12 },
  brandMark: { width: 36, height: 36, background: '#c4a96b', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 18, color: '#0f1419' },
  brandText: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '2.5px', color: '#d4bc85', fontWeight: 600 },
  headerActions: { display: 'flex', gap: 8, position: 'relative', zIndex: 1 },
  iconBtn: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 },
  greeting: { fontFamily: "'Fraunces', serif", fontSize: 38, fontWeight: 600, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: 8, position: 'relative', zIndex: 1 },
  date: { fontSize: 14, color: '#9aa4b8', fontWeight: 400, position: 'relative', zIndex: 1 },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden', marginTop: 28, position: 'relative', zIndex: 1, border: '1px solid rgba(255,255,255,0.06)' },
  stat: { background: '#1a2030', padding: '18px 20px', textAlign: 'left' },
  statNum: { fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, lineHeight: 1 },
  statLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#9aa4b8', marginTop: 6, fontWeight: 500 },
  toolbar: { display: 'flex', gap: 12, margin: '24px 0 20px', alignItems: 'center', flexWrap: 'wrap' },
  search: { flex: 1, minWidth: 240, background: '#fff', border: '1px solid #e8e3da', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, color: '#8a8a8a' },
  searchInput: { border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 14, flex: 1, background: 'transparent', color: '#1a1a1a' },
  chips: { display: 'flex', gap: 6 },
  chip: { padding: '8px 14px', fontSize: 12, fontWeight: 500, border: '1px solid #e8e3da', background: '#fff', borderRadius: 20, cursor: 'pointer', color: '#4a4a4a' },
  chipActive: { background: '#0f1419', color: '#fff', borderColor: '#0f1419' },
  sectionHead: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #e8e3da' },
  sectionTitle: { fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.2px' },
  sectionCount: { fontSize: 12, fontWeight: 600, color: '#8a8a8a', background: '#f5f1ea', padding: '2px 10px', borderRadius: 12 },
  email: { background: '#fff', border: '1px solid #e8e3da', borderRadius: 14, padding: '18px 22px', marginBottom: 10, cursor: 'pointer', transition: 'all 0.2s' },
  emailTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12 },
  emailFrom: { fontSize: 13, color: '#4a4a4a', fontWeight: 500 },
  emailTime: { fontSize: 11, color: '#8a8a8a', whiteSpace: 'nowrap' },
  emailSubject: { fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 6, lineHeight: 1.35, letterSpacing: '-0.1px' },
  emailPreview: { fontSize: 13, color: '#4a4a4a', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  emailTag: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', padding: '3px 8px', borderRadius: 6, marginTop: 10 },
  stateBox: { background: '#fff', border: '1px solid #e8e3da', borderRadius: 14, padding: '48px 32px', textAlign: 'center', marginTop: 24 },
  spinner: { width: 28, height: 28, border: '3px solid #e8e3da', borderTop: '3px solid #c4a96b', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' },
  footer: { textAlign: 'center', marginTop: 40, color: '#8a8a8a', fontSize: 12 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,20,25,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', zIndex: 100, overflowY: 'auto' },
  modal: { background: '#fff', borderRadius: 18, maxWidth: 780, width: '100%', boxShadow: '0 24px 64px -16px rgba(15,20,25,0.4)', overflow: 'hidden' },
  modalHead: { padding: '24px 32px', borderBottom: '1px solid #e8e3da', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  modalFrom: { fontSize: 13, color: '#8a8a8a', marginBottom: 6 },
  modalSubject: { fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.25, letterSpacing: '-0.4px' },
  modalSuggestion: { fontSize: 12, color: '#b8860b', marginTop: 8, fontWeight: 600 },
  modalClose: { background: '#f5f1ea', border: 'none', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16, color: '#4a4a4a', flexShrink: 0 },
  modalBody: { padding: '24px 32px', maxHeight: 340, overflowY: 'auto', fontSize: 14, lineHeight: 1.65, color: '#4a4a4a', whiteSpace: 'pre-wrap', wordWrap: 'break-word' },
  modalActionsWrap: { padding: '0 32px 24px' },
  modalLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#8a8a8a', fontWeight: 600, marginBottom: 10 },
  modalReply: { width: '100%', minHeight: 140, padding: '14px 16px', border: '1px solid #e8e3da', borderRadius: 12, fontFamily: 'inherit', fontSize: 14, lineHeight: 1.6, color: '#1a1a1a', resize: 'vertical', background: '#faf7f2' },
  modalInput: { width: '100%', padding: '12px 16px', border: '1px solid #e8e3da', borderRadius: 12, fontFamily: 'inherit', fontSize: 14, color: '#1a1a1a', background: '#faf7f2' },
  modalActions: { padding: '16px 32px', borderTop: '1px solid #e8e3da', background: '#f5f1ea', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  btnPrimary: { padding: '10px 16px', borderRadius: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: '#0f1419', color: '#fff' },
  btnGold: { padding: '10px 16px', borderRadius: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: '#c4a96b', color: '#0f1419' },
  btnGhost: { padding: '10px 16px', borderRadius: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#4a4a4a', border: '1px solid #e8e3da' },
  btnDanger: { padding: '10px 16px', borderRadius: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#c0392b', border: '1px solid transparent' },
  toast: { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', color: '#fff', padding: '14px 22px', borderRadius: 12, fontSize: 14, fontWeight: 500, boxShadow: '0 12px 32px -8px rgba(0,0,0,0.3)', zIndex: 200 }
};
