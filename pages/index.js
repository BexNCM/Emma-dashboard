import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Dashboard() {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState(null);
  const [processingEmail, setProcessingEmail] = useState(null);

  const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || '';

  useEffect(() => {
    fetchBriefing();
    const interval = setInterval(fetchBriefing, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchBriefing = async () => {
    try {
      const response = await fetch('/.netlify/functions/briefing');
      if (!response.ok) throw new Error('Failed to fetch briefing');
      const data = await response.json();
      setBriefing(data.briefing);
    } catch (error) {
      console.error('Error fetching briefing:', error);
    }
    setLoading(false);
  };

  const handleAction = async (action, item) => {
    setProcessingEmail(item.id);
    try {
      const response = await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: item.id,
          subject: item.subject,
          from: item.from,
          replyTo: item.replyTo,
          detail: item.detail,
          action: action,
          actionType: action, // Type of action: reply, delete, forward, addToCalendar, markDone
        })
      });

      if (!response.ok) throw new Error('Failed to perform action');
      
      // Show success message
      alert(`✓ ${action} completed for "${item.subject}"`);
      
      // Refresh briefing
      fetchBriefing();
    } catch (error) {
      console.error('Error:', error);
      alert(`Error performing ${action}: ${error.message}`);
    } finally {
      setProcessingEmail(null);
    }
  };

  const formatDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-GB', options);
  };

  if (loading) {
    return (
      <div style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f8fafc',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px', color: '#1a1a1a' }}>Loading your briefing...</p>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>Fetching emails and categorizing with AI</p>
        </div>
      </div>
    );
  }

  if (!briefing) {
    return <div>Error loading briefing</div>;
  }

  const Section = ({ emoji, title, color, children }) => (
    <div style={{ marginBottom: '32px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '10px',
        borderBottom: `2px solid ${color}`,
      }}>
        <span style={{ fontSize: '18px', marginRight: '10px' }}>{emoji}</span>
        <span style={{
          fontSize: '13px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: color,
        }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );

  const ActionButtons = ({ item, backgroundColor }) => (
    <div style={{
      display: 'flex',
      gap: '8px',
      marginTop: '12px',
      flexWrap: 'wrap',
    }}>
      <button
        onClick={() => handleAction('reply', item)}
        disabled={processingEmail === item.id}
        style={{
          background: '#2563eb',
          color: 'white',
          border: 'none',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          cursor: processingEmail === item.id ? 'not-allowed' : 'pointer',
          opacity: processingEmail === item.id ? 0.6 : 1,
          transition: 'all 0.2s',
        }}
        onMouseOver={(e) => !processingEmail && (e.target.style.background = '#1d4ed8')}
        onMouseOut={(e) => (e.target.style.background = '#2563eb')}
      >
        ↩️ Reply
      </button>
      <button
        onClick={() => handleAction('forward', item)}
        disabled={processingEmail === item.id}
        style={{
          background: '#7c3aed',
          color: 'white',
          border: 'none',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          cursor: processingEmail === item.id ? 'not-allowed' : 'pointer',
          opacity: processingEmail === item.id ? 0.6 : 1,
        }}
      >
        ➡️ Forward
      </button>
      <button
        onClick={() => handleAction('addToCalendar', item)}
        disabled={processingEmail === item.id}
        style={{
          background: '#0891b2',
          color: 'white',
          border: 'none',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          cursor: processingEmail === item.id ? 'not-allowed' : 'pointer',
          opacity: processingEmail === item.id ? 0.6 : 1,
        }}
      >
        📅 Add to Calendar
      </button>
      <button
        onClick={() => handleAction('delete', item)}
        disabled={processingEmail === item.id}
        style={{
          background: '#dc2626',
          color: 'white',
          border: 'none',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          cursor: processingEmail === item.id ? 'not-allowed' : 'pointer',
          opacity: processingEmail === item.id ? 0.6 : 1,
        }}
      >
        🗑️ Delete
      </button>
      <button
        onClick={() => handleAction('markDone', item)}
        disabled={processingEmail === item.id}
        style={{
          background: '#059669',
          color: 'white',
          border: 'none',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          cursor: processingEmail === item.id ? 'not-allowed' : 'pointer',
          opacity: processingEmail === item.id ? 0.6 : 1,
        }}
      >
        ✓ Done
      </button>
    </div>
  );

  const EmailCard = ({ item, backgroundColor, borderColor, textColor }) => (
    <div style={{
      background: backgroundColor,
      border: `1px solid ${borderColor}`,
      borderRadius: '10px',
      padding: '20px 24px',
      marginBottom: '12px',
    }}>
      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
        {item.from}
      </div>
      <div style={{
        fontSize: '15px',
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: '10px',
      }}>
        "{item.subject}"
      </div>
      <p style={{
        margin: '0 0 12px',
        fontSize: '14px',
        color: '#374151',
        lineHeight: '1.6',
      }}>
        {item.detail}
      </p>
      <ActionButtons item={item} backgroundColor={backgroundColor} />
    </div>
  );

  return (
    <>
      <Head>
        <title>Emma's Daily Briefing</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
        maxWidth: '680px',
        margin: '0 auto',
        color: '#1a1a1a',
        background: '#ffffff',
        minHeight: '100vh',
      }}>
        {/* Dark header */}
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          padding: '32px 40px',
          borderRadius: '12px 12px 0 0',
        }}>
          <div style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: '#94a3b8',
            marginBottom: '8px',
          }}>
            NCM Asset Management
          </div>
          <div style={{
            fontSize: '26px',
            fontWeight: '700',
            color: '#ffffff',
          }}>
            ☀️ Daily Briefing
          </div>
          <div style={{
            fontSize: '15px',
            color: '#94a3b8',
            marginTop: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>{formatDate()}</span>
            <button onClick={fetchBriefing} style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '16px',
            }}>
              ↻
            </button>
          </div>
        </div>

        {/* Summary banner */}
        {briefing.urgent && briefing.urgent.length > 0 && (
          <div style={{
            background: '#f0f9ff',
            borderLeft: '4px solid #0ea5e9',
            padding: '16px 24px',
          }}>
            <p style={{
              margin: '0',
              fontSize: '14px',
              color: '#0c4a6e',
            }}>
              You have <strong>{briefing.urgent.length}</strong> urgent {briefing.urgent.length === 1 ? 'email' : 'emails'} requiring your personal response today.
              {briefing.action && briefing.action.length > 0 && ` Plus ${briefing.action.length} action ${briefing.action.length === 1 ? 'item' : 'items'}.`}
            </p>
          </div>
        )}

        <div style={{ padding: '32px 40px' }}>
          {/* 🔴 Urgent */}
          {briefing.urgent && briefing.urgent.length > 0 && (
            <Section emoji="🔴" title="Urgent — needs your personal response today" color="#dc2626">
              {briefing.urgent.map(item => (
                <EmailCard
                  key={item.id}
                  item={item}
                  backgroundColor="#fff5f5"
                  borderColor="#fecaca"
                  textColor="#dc2626"
                />
              ))}
            </Section>
          )}

          {/* 🟡 Action required */}
          {briefing.action && briefing.action.length > 0 && (
            <Section emoji="🟡" title="Action required — not urgent" color="#d97706">
              {briefing.action.map(item => (
                <EmailCard
                  key={item.id}
                  item={item}
                  backgroundColor="#fffbeb"
                  borderColor="#fde68a"
                  textColor="#d97706"
                />
              ))}
            </Section>
          )}

          {/* 🟢 FYI */}
          {briefing.fyi && briefing.fyi.length > 0 && (
            <Section emoji="🟢" title="FYI / Low priority" color="#16a34a">
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                padding: '16px 20px',
              }}>
                <ul style={{
                  margin: '0',
                  paddingLeft: '18px',
                  fontSize: '13px',
                  color: '#374151',
                  lineHeight: '2',
                }}>
                  {briefing.fyi.map(item => (
                    <li key={item.id}>
                      <strong>{item.from}</strong> — {item.subject}
                    </li>
                  ))}
                </ul>
              </div>
            </Section>
          )}

          {/* 📅 Meetings */}
          {briefing.meetings && briefing.meetings.length > 0 && (
            <div>
              <div style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#1a1a1a',
                marginBottom: '20px',
                marginTop: '40px',
                paddingTop: '32px',
                borderTop: '2px solid #e5e7eb',
              }}>
                📅 Today's Meetings
              </div>
              {briefing.meetings.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '20px 24px',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '10px',
                  }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#1a1a1a',
                    }}>
                      {item.subject}
                    </div>
                    <div style={{
                      background: '#e0e7ff',
                      color: '#4338ca',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      marginLeft: '12px',
                    }}>
                      {item.from}
                    </div>
                  </div>
                  <p style={{
                    margin: '0 0 8px',
                    fontSize: '13px',
                    color: '#374151',
                    lineHeight: '1.6',
                  }}>
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          )}

          {briefing.urgent?.length === 0 && briefing.action?.length === 0 && briefing.fyi?.length === 0 && briefing.meetings?.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#9ca3af',
            }}>
              <p>No emails or meetings today.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          padding: '20px 40px',
          borderRadius: '0 0 12px 12px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '12px',
            color: '#94a3b8',
          }}>
            Interactive briefing · NCM Asset Management · Updated {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </>
  );
}
