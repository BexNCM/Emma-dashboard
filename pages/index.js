import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Dashboard() {
  const [briefing, setBriefing] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);
  const [draftReply, setDraftReply] = useState(null);
  const [completedItems, setCompletedItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || '';

  // Fetch fresh email data on page load
  useEffect(() => {
    fetchBriefing();
  }, []);

  const fetchBriefing = async () => {
    setDataLoading(true);
    try {
      // Call the Netlify Function to get fresh email data
      const response = await fetch('/.netlify/functions/briefing');
      if (!response.ok) throw new Error('Failed to fetch briefing');
      
      const data = await response.json();
      setBriefing(data.briefing);
    } catch (error) {
      console.error('Error fetching briefing:', error);
      // Fallback to empty briefing on error
      setBriefing({
        urgent: [],
        action: [],
        fyi: [],
        meetings: [],
        ignore: []
      });
    }
    setDataLoading(false);
  };

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
          subject: item.subject,
          from: item.from,
          replyTo: item.replyTo, // Sender's email address
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

  const markComplete = async (id, item) => {
    setCompletedItems(prev => ({ ...prev, [id]: true }));
    
    // Optional: Call Make scenario to move email to "Done" folder
    // You would implement this by creating another Make webhook
    // For now, just mark as done in the dashboard
  };

  if (dataLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
        backgroundColor: '#f5f3f0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>Loading your briefing...</p>
          <p style={{ fontSize: '12px', color: '#888' }}>Fetching emails and categorizing with AI</p>
        </div>
      </div>
    );
  }

  if (!briefing) {
    return <div>Error loading briefing</div>;
  }

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
          .refresh-btn { font-size: 12px; color: #378add; cursor: pointer; margin-left: 12px; text-decoration: underline; }
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
          .empty { font-size: 12px; color: #999; font-style: italic; }
        `}</style>
      </Head>

      <div className="container">
        <div className="header">
          <h1>☀️ Em's Daily Briefing <span className="refresh-btn" onClick={fetchBriefing}>↻ refresh</span></h1>
          <p>Updated {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* URGENT */}
        {briefing.urgent && briefing.urgent.length > 0 && (
          <div className="section">
            <div className="section-title" style={{ color: '#c5192d' }}>
              <span>🔴</span> Urgent — needs your personal response today
            </div>
            {briefing.urgent.map(item => (
              <div key={item.id} className={`item urgent ${completedItems[item.id] ? 'complete' : ''}`} onClick={() => toggleExpand(item.id)}>
                <div className="item-header">
                  <i className="ti ti-mail"></i>
                  <div className="item-content">
                    <p className="item-title">{item.subject}</p>
                    <p className="item-meta">{item.from}</p>
                  </div>
                </div>
                {expandedItem === item.id && (
                  <div className="item-detail">
                    <p>{item.detail}</p>
                    <p className="item-action">→ {item.action}</p>
                    <div className="button-group">
                      {item.hasReply && (
                        <button className="btn-primary" onClick={(e) => { e.stopPropagation(); generateReply(item); }} disabled={loading}>
                          {loading ? 'Generating...' : 'Draft reply →'}
                        </button>
                      )}
                      <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); markComplete(item.id, item); }}>
                        Done ✓
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ACTION REQUIRED */}
        {briefing.action && briefing.action.length > 0 && (
          <div className="section">
            <div className="section-title" style={{ color: '#b35806' }}>
              <span>🟠</span> Action required — not urgent
            </div>
            {briefing.action.map(item => (
              <div key={item.id} className={`item action ${completedItems[item.id] ? 'complete' : ''}`} onClick={() => toggleExpand(item.id)}>
                <div className="item-header">
                  <i className="ti ti-briefcase"></i>
                  <div className="item-content">
                    <p className="item-title">{item.subject}</p>
                    <p className="item-meta">{item.from}</p>
                  </div>
                </div>
                {expandedItem === item.id && (
                  <div className="item-detail">
                    <p>{item.detail}</p>
                    <p className="item-action">→ {item.action}</p>
                    <div className="button-group">
                      {item.hasReply && (
                        <button className="btn-primary" onClick={(e) => { e.stopPropagation(); generateReply(item); }} disabled={loading}>
                          {loading ? 'Generating...' : 'Draft reply →'}
                        </button>
                      )}
                      <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); markComplete(item.id, item); }}>
                        Done ✓
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* FYI */}
        {briefing.fyi && briefing.fyi.length > 0 && (
          <div className="section">
            <div className="section-title" style={{ color: '#0f6e56' }}>
              <span>🟢</span> FYI / low priority
            </div>
            {briefing.fyi.map(item => (
              <div key={item.id} className="item fyi">
                <div className="item-header">
                  <i className="ti ti-info-circle"></i>
                  <div className="item-content">
                    <p className="item-title">{item.subject}</p>
                    <p className="item-meta">{item.from}</p>
                    {item.detail && <p style={{ fontSize: '13px', marginTop: '6px' }}>{item.detail}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MEETINGS */}
        {briefing.meetings && briefing.meetings.length > 0 && (
          <div className="section">
            <div className="section-title">
              <span>📅</span> Today's meetings & appointments
            </div>
            {briefing.meetings.map(item => (
              <div key={item.id} className="item fyi">
                <div className="item-header">
                  <i className="ti ti-calendar"></i>
                  <div className="item-content">
                    <p className="item-title">{item.subject}</p>
                    <p className="item-meta">{item.from}</p>
                    {item.detail && <p style={{ fontSize: '13px', marginTop: '6px' }}>{item.detail}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

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
