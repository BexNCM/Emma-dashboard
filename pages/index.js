import React, { useState } from 'react';
import Head from 'next/head';

export default function Dashboard() {
  const [expandedItem, setExpandedItem] = useState(null);
  const [draftReply, setDraftReply] = useState(null);
  const [completedItems, setCompletedItems] = useState({});
  const [loading, setLoading] = useState(false);

  const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || '';

  const toggleExpand = (id) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  const generateReply = async (item) => {
    setLoading(true);
    try {
      const response = await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: item.id,
          subject: item.title,
          from: item.from,
          detail: item.detail,
          action: item.action
        })
      });

      if (!response.ok) throw new Error('Failed to generate reply');
      const result = await response.json();
      setDraftReply({ 
        itemId: item.id, 
        text: result.draftText, 
        inOutlook: result.draftCreated 
      });
    } catch (error) {
      console.error('Error:', error);
      setDraftReply({ 
        itemId: item.id, 
        text: 'Error generating reply. Check Make webhook URL in .env.local', 
        error: true 
      });
    }
    setLoading(false);
  };

  const markComplete = (id) => {
    setCompletedItems(prev => ({ ...prev, [id]: true }));
  };

  const briefData = {
    urgent: [
      {
        id: 'isio',
        title: 'Re: Introduction & invitation',
        from: 'Jenny Miller - ISIO',
        status: 'URGENT — NEEDS YOUR PERSONAL RESPONSE TODAY',
        detail: "She's reaching out to check in, referencing that the business sale has been pushed back to summer and acknowledging you've got a lot on. Warm, relationship-led touch from a financial/advisory contact who clearly knows the deal timeline.",
        action: '→ Brief personal reply — keep warm, confirm summer timeline holds',
        hasReply: true,
        icon: 'ti-mail'
      }
    ],
    actionRequired: [
      {
        id: 'dcc',
        title: 'Doncaster Chamber Board of Directors',
        from: 'Daniel Fell MBE - Doncaster Chamber of Commerce',
        detail: "CEO personally inviting you to consider a NED vacancy ahead of their AGM. A second info-session invite also came from S. Moore. Decide if you want to pursue (profile-building opportunity, local network) and either attend or reply to Dan.",
        action: '→ Decide and reply to Dan, or attend their info session',
        hasReply: true,
        icon: 'ti-briefcase'
      },
      {
        id: 'security',
        title: 'OpenAI - Security Notice',
        from: 'OpenAI - Security',
        detail: "Action Required: Important security update for OpenAI macOS apps. Genuine security notice — update any OpenAI macOS apps on your devices.",
        action: '→ Deadline 12 June — forward to Amy K or action yourself',
        hasReply: false,
        icon: 'ti-lock'
      },
      {
        id: 'jane',
        title: 'Warnington Drive — Joinery Update',
        from: 'Jane Price-Stephens - Interior Designer',
        detail: "Updated presentation via WeTransfer including proposed downstairs WC design. File available to review.",
        action: '→ Download and review presentation; coordinate with David Roe',
        hasReply: false,
        isFile: true,
        icon: 'ti-download'
      }
    ],
    fyi: [
      {
        id: 'edi',
        title: 'Edi Adegbola (Propaganda) — Yorkshire Post interview confirmed',
        detail: '2pm 19 June (Teams). Already in calendar.',
        icon: 'ti-calendar'
      },
      {
        id: 'dhl',
        title: 'DHL ×2 — Aritzia delivery est. Friday 5 June',
        detail: 'No-signature authorisation requested. Tracking in hand.',
        icon: 'ti-truck'
      },
      {
        id: 'net',
        title: 'NET-A-PORTER — Order on its way',
        detail: 'Tracking JD014600012679249833.',
        icon: 'ti-truck'
      }
    ],
    canIgnore: [
      'DHgate promo · Blys Father\'s Day · MyoMaster product email · HealthExpress prescription reminder · LinkedIn newsletters ×3 · FitMind book launch · Stocked Food menu update · Lake Y / Resamania members update · Plaud Team product email'
    ],
    meetings: [
      {
        id: 'oxify1',
        time: '2:45pm – 4:15pm BST',
        title: 'Oxify — 90 Minute S Chamber Session',
        location: 'Ground floor, The Randall Business Centre, Retford, DN22 7WF',
        detail: 'Personal health appointment — hyperbaric oxygen chamber session. Arrive no earlier than 5 minutes before. No prep needed.',
        icon: 'ti-heart-pulse'
      }
    ]
  };

  const isItemComplete = (id) => completedItems[id];

  return (
    <>
      <Head>
        <title>Emma's Daily Briefing</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons@2.44.0/tabler-icons.css" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f3f0; color: #1a1a1a; }
          .container { max-width: 720px; margin: 0 auto; padding: 2rem 1rem; }
          .header { padding-bottom: 1rem; border-bottom: 1px solid #e5e3e0; margin-bottom: 1.5rem; }
          .header h1 { font-size: 22px; font-weight: 500; margin-bottom: 0.25rem; }
          .header p { font-size: 13px; color: #888; }
          .section { margin-bottom: 2rem; }
          .section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 1rem; font-size: 16px; font-weight: 500; }
          .section-title i { font-size: 20px; }
          .item { background: white; border: 1px solid #e5e3e0; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; cursor: pointer; transition: all 0.2s; }
          .item:hover { border-color: #d1cfcc; }
          .item.urgent { background: #fff4f3; border-color: #f4d4d1; }
          .item.action { background: #fff9f0; border-color: #eed5b5; }
          .item.fyi { background: #f0faf7; border-color: #c0e8dd; }
          .item-header { display: flex; gap: 12px; align-items: flex-start; }
          .item-icon { font-size: 18px; margin-top: 2px; flex-shrink: 0; }
          .item.urgent .item-icon { color: #c5192d; }
          .item.action .item-icon { color: #b35806; }
          .item.fyi .item-icon { color: #0f6e56; }
          .item-content { flex: 1; }
          .item-title { font-weight: 500; margin: 0 0 4px; font-size: 15px; }
          .item-meta { font-size: 12px; color: #888; margin: 0; }
          .item-status { font-size: 12px; font-weight: 500; margin: 6px 0 0; }
          .item.urgent .item-status { color: #c5192d; }
          .item.action .item-status { color: #b35806; }
          .item-detail { margin-top: 12px; padding-top: 12px; border-top: 1px solid currentColor; opacity: 0.7; }
          .item-detail p { font-size: 13px; line-height: 1.6; margin: 0 0 12px; }
          .item-action { font-size: 12px; color: #666; font-style: italic; margin: 0 0 12px; }
          .button-group { display: flex; gap: 8px; }
          button { padding: 6px 12px; font-size: 12px; border: 1px solid; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s; }
          .btn-primary { background: #c5192d; color: white; border-color: #c5192d; }
          .btn-primary:hover { opacity: 0.9; }
          .btn-secondary { background: transparent; color: #c5192d; border-color: #c5192d; }
          .item.action .btn-primary { background: #b35806; border-color: #b35806; }
          .item.action .btn-secondary { color: #b35806; border-color: #b35806; }
          .draft-panel { background: #f0f5fb; border: 2px solid #378add; border-radius: 8px; padding: 1rem; margin-top: 2rem; }
          .draft-panel h3 { margin: 0 0 12px; font-size: 13px; font-weight: 500; color: #378add; }
          textarea { width: 100%; min-height: 120px; font-size: 13px; font-family: monospace; padding: 8px; border: 1px solid #e5e3e0; border-radius: 6px; margin-bottom: 12px; }
          .canignore { background: #f9f7f4; border: 1px dashed #d1cfcc; border-radius: 8px; padding: 1rem; font-size: 13px; color: #888; line-height: 1.6; }
          .complete { opacity: 0.6; text-decoration: line-through; }
        `}</style>
      </Head>

      <div className="container">
        <div className="header">
          <h1>☀️ Em's Daily Briefing</h1>
          <p>Wednesday, 3 June 2026</p>
        </div>

        {/* URGENT */}
        <div className="section">
          <div className="section-title" style={{ color: '#c5192d' }}>
            <span>🔴</span> Urgent — needs your personal response today
          </div>
          {briefData.urgent.map(item => (
            <div key={item.id} className={`item urgent ${isItemComplete(item.id) ? 'complete' : ''}`} onClick={() => toggleExpand(item.id)}>
              <div className="item-header">
                <i className={`ti ${item.icon}`}></i>
                <div className="item-content">
                  <p className="item-title">{item.title}</p>
                  <p className="item-meta">{item.from}</p>
                  <p className="item-status">{item.status}</p>
                </div>
              </div>
              {expandedItem === item.id && (
                <div className="item-detail">
                  <p>{item.detail}</p>
                  <p className="item-action">{item.action}</p>
                  <div className="button-group">
                    {item.hasReply && (
                      <button className="btn-primary" onClick={(e) => { e.stopPropagation(); generateReply(item); }} disabled={loading}>
                        {loading ? 'Generating...' : 'Draft reply →'}
                      </button>
                    )}
                    <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); markComplete(item.id); }}>
                      Done ✓
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ACTION REQUIRED */}
        <div className="section">
          <div className="section-title" style={{ color: '#b35806' }}>
            <span>🟠</span> Action required — not urgent
          </div>
          {briefData.actionRequired.map(item => (
            <div key={item.id} className={`item action ${isItemComplete(item.id) ? 'complete' : ''}`} onClick={() => toggleExpand(item.id)}>
              <div className="item-header">
                <i className={`ti ${item.icon}`}></i>
                <div className="item-content">
                  <p className="item-title">{item.title}</p>
                  <p className="item-meta">{item.from}</p>
                </div>
              </div>
              {expandedItem === item.id && (
                <div className="item-detail">
                  <p>{item.detail}</p>
                  <p className="item-action">{item.action}</p>
                  <div className="button-group">
                    {item.hasReply && (
                      <button className="btn-primary" onClick={(e) => { e.stopPropagation(); generateReply(item); }} disabled={loading}>
                        {loading ? 'Generating...' : 'Draft reply →'}
                      </button>
                    )}
                    {item.isFile && (
                      <button className="btn-primary" onClick={(e) => { e.stopPropagation(); }}>
                        Download →
                      </button>
                    )}
                    <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); markComplete(item.id); }}>
                      Done ✓
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* FYI */}
        <div className="section">
          <div className="section-title" style={{ color: '#0f6e56' }}>
            <span>🟢</span> FYI / low priority
          </div>
          {briefData.fyi.map(item => (
            <div key={item.id} className="item fyi">
              <div className="item-header">
                <i className={`ti ${item.icon}`}></i>
                <div className="item-content">
                  <p className="item-title">{item.title}</p>
                  {item.detail && <p className="item-meta">{item.detail}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CAN IGNORE */}
        <div className="section">
          <div className="section-title">
            <span>⚪</span> Can likely be ignored
          </div>
          <div className="canignore">{briefData.canIgnore[0]}</div>
        </div>

        {/* MEETINGS */}
        <div className="section">
          <div className="section-title">
            <span>📅</span> Today's meetings
          </div>
          {briefData.meetings.map(meeting => (
            <div key={meeting.id} className="item fyi">
              <div className="item-header">
                <i className={`ti ${meeting.icon}`}></i>
                <div className="item-content">
                  <p className="item-title">{meeting.title}</p>
                  <p className="item-meta" style={{ fontWeight: '500' }}>{meeting.time}</p>
                  <p className="item-meta">{meeting.location}</p>
                  <p style={{ fontSize: '13px', margin: '6px 0 0', lineHeight: '1.5' }}>{meeting.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* DRAFT PANEL */}
        {draftReply && (
          <div className="draft-panel">
            <h3>Draft Reply:</h3>
            <textarea value={draftReply.text} readOnly />
            <div className="button-group">
              <button className="btn-primary" onClick={() => { navigator.clipboard.writeText(draftReply.text); alert('Copied!'); }}>
                Copy to clipboard
              </button>
              {draftReply.inOutlook && <span style={{ fontSize: '12px', color: '#0f6e56', fontWeight: '500' }}>✓ Draft created in Outlook</span>}
              <button className="btn-secondary" onClick={() => setDraftReply(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
