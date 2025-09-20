import { useState, useEffect } from 'react';

function formatMessageDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return `sent ${diffSec} second${diffSec !== 1 ? 's' : ''} ago`;
  if (diffMin < 60) return `sent ${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `sent ${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;

  if (diffDay < 7) {
    const options = { weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false };
    return `sent ${date.toLocaleDateString(undefined, options)}`;
  }

  const options = { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
  return `sent ${date.toLocaleDateString(undefined, options)}`;
}

export function useRelativeTime(date: Date, interval = 60000) {
  const [relative, setRelative] = useState(() => formatMessageDate(date));

  useEffect(() => {
    const timer = setInterval(() => {
      setRelative(formatMessageDate(date));
    }, interval);

    return () => clearInterval(timer);
  }, [date, interval]);

  return relative;
}
