import { useState, useEffect } from 'react';
import { searchUsers } from '../lib/api';
import { useDebounce } from '../lib/useDebounce';

export default function ConversationList({ conversations, activeConvo, onlineUsers, onSelectConvo, onStartConvo, theme }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debouncedQuery = useDebounce(query, 350);
  const dk = theme === 'dark';

  useEffect(() => {
    if (!debouncedQuery.trim()) { setSearchResults([]); return; }
    setSearching(true);
    searchUsers(debouncedQuery)
      .then(setSearchResults)
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [debouncedQuery]);

  const showSearch = query.trim().length > 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Sora, sans-serif' }}>
      {/* Search */}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: dk ? '#3f3f46' : '#a1a1aa' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search users…"
            style={{
              width: '100%',
              background: dk ? '#0d0d0d' : '#f4f4f5',
              border: `1px solid ${dk ? '#1c1c1e' : '#e4e4e7'}`,
              borderRadius: '10px',
              padding: '8px 11px 8px 32px',
              fontSize: '13px',
              fontFamily: 'Sora, sans-serif',
              color: dk ? '#ffffff' : '#0a0a0a',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {searching && (
            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: dk ? '#3f3f46' : '#d4d4d8' }} className="animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {showSearch ? (
          <>
            <SectionLabel label="Results" dk={dk} />
            {searchResults.length === 0 && !searching && (
              <p style={{ padding: '12px 16px', fontSize: '12px', color: dk ? '#3f3f46' : '#d4d4d8', fontFamily: 'Sora, sans-serif' }}>No users found</p>
            )}
            {searchResults.map(user => (
              <UserRow key={user.id} user={user} isOnline={onlineUsers.has(user.id)}
                isActive={activeConvo?.user_id === user.id} theme={theme}
                onClick={() => { onStartConvo(user); setQuery(''); }}
              />
            ))}
          </>
        ) : (
          <>
            {conversations.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: dk ? '#3f3f46' : '#d4d4d8', fontFamily: 'Sora, sans-serif' }}>No conversations yet</p>
                <p style={{ fontSize: '11px', color: dk ? '#27272a' : '#e4e4e7', marginTop: '4px', fontFamily: 'Sora, sans-serif' }}>Search above to start chatting</p>
              </div>
            ) : (
              <>
                <SectionLabel label="Messages" dk={dk} />
                {conversations.map(convo => (
                  <UserRow
                    key={convo.user_id}
                    user={{ id: convo.user_id, display_name: convo.display_name, username: convo.username }}
                    isOnline={onlineUsers.has(convo.user_id)}
                    isActive={activeConvo?.user_id === convo.user_id}
                    lastMessageAt={convo.last_message_at}
                    theme={theme}
                    onClick={() => onSelectConvo({ user_id: convo.user_id, display_name: convo.display_name, username: convo.username })}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ label, dk }) {
  return (
    <div style={{ padding: '6px 16px 4px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: dk ? '#27272a' : '#d4d4d8', fontFamily: 'Sora, sans-serif' }}>
      {label}
    </div>
  );
}

function UserRow({ user, isOnline, isActive, lastMessageAt, onClick, theme }) {
  const dk = theme === 'dark';
  const initials = user.display_name?.slice(0, 2).toUpperCase() || '??';

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 12px',
        background: isActive ? (dk ? 'rgba(67,53,151,0.12)' : 'rgba(67,53,151,0.07)') : 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.15s',
        borderLeft: isActive ? '2px solid #433597' : '2px solid transparent',
        fontFamily: 'Sora, sans-serif',
      }}
    >
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: dk ? '#1c1c1e' : '#f4f4f5',
          border: `1px solid ${dk ? '#27272a' : '#e4e4e7'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 600,
          color: dk ? '#71717a' : '#a1a1aa',
        }}>
          {initials}
        </div>
        {isOnline && (
          <div style={{
            position: 'absolute', bottom: '-1px', right: '-1px',
            width: '10px', height: '10px', borderRadius: '50%',
            background: '#22c55e',
            border: `2px solid ${dk ? '#000000' : '#ffffff'}`,
          }} />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: dk ? '#ffffff' : '#0a0a0a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.display_name}
          </span>
          {lastMessageAt && (
            <span style={{ fontSize: '10px', color: dk ? '#3f3f46' : '#d4d4d8', flexShrink: 0, marginLeft: '8px' }}>
              {formatTime(lastMessageAt)}
            </span>
          )}
        </div>
        <p style={{ fontSize: '11px', color: dk ? '#3f3f46' : '#a1a1aa', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          @{user.username}
        </p>
      </div>
    </button>
  );
}

function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}