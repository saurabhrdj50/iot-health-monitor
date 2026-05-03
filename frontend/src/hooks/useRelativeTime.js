import { useEffect, useState } from 'react';

export function useRelativeTime(timestamp) {
  const [relative, setRelative] = useState('');

  useEffect(() => {
    if (!timestamp) {
      setRelative('');
      return;
    }

    const update = () => {
      const now = Date.now();
      const then = new Date(timestamp).getTime();
      const diff = Math.max(0, now - then);

      if (diff < 1000) setRelative('just now');
      else if (diff < 60000) setRelative(`${Math.floor(diff / 1000)}s ago`);
      else if (diff < 3600000) setRelative(`${Math.floor(diff / 60000)}m ago`);
      else setRelative(`${Math.floor(diff / 3600000)}h ago`);
    };

    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return relative;
}
