import { useEffect, useState } from 'react';

export const useSingleTab = (): boolean => {
  const [isDuplicate, setIsDuplicate] = useState<boolean>(false);

  useEffect(() => {
    // Unique channel name for Red Tetris
    const channel = new BroadcastChannel('red_tetris_tab_channel');

    channel.onmessage = (event: MessageEvent<string>) => {
      if (event.data === 'NEW_TAB') {
        // We are the EXISTING tab, tell the new tab that we are active
        channel.postMessage('TAB_ALREADY_ACTIVE');
      } else if (event.data === 'TAB_ALREADY_ACTIVE') {
        // We are the NEW tab, we received confirmation another tab is active
        setIsDuplicate(true);
      }
    };

    // Announce presence
    channel.postMessage('NEW_TAB');

    return () => {
      channel.close();
    };
  }, []);

  return isDuplicate;
};

