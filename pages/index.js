import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Dashboard() {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBriefing();
    // Auto-refresh every 5 minutes
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

  const EmailCard = ({ sender, subject, summary, action, backgroundColor, borderColor, textColor }) => (
    <div style={{
      background: backgroundColor,
      border: `1px solid ${borderColor}`,
      borderRadius: '10px',
      padding: '20px 24px',
      marginBottom: '12px',
    }}>
      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
        {sender}
      </div>
      <div style={{
        fontSize: '15px',
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: '10px',
      }}>
        "{subject}"
      </div>
      <p style={{
        margin: '0 0 12px',
        fontSize: '14px',
        color: '#374151',
        lineHeight: '1.6',
      }}>
        {summary}
      </p>
      {action && (
        <div style={{
          background: textColor,
          color: 'white',
          display: 'inline-block',
          padding: '6px 14px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
        }}>
          → {action}
        </div>
      )}
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
              {briefing.action && briefing.action.length > 0 && ` Plus ${briefing.action.length} action ${briefing.action.length === 1 ? 'item' : 'items'} that can wait.`}
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
                  sender={item.from}
                  subject={item.subject}
                  summary={item.detail}
                  action={item.action}
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
                  sender={item.from}
                  subject={item.subject}
                  summary={item.detail}
                  action={item.action}
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
            Generated by your AI daily briefing · NCM Asset Management · Updated {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </>
  );
}
