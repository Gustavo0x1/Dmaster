// components/Home.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useLayout } from '../components/Layout'; // Import useLayout
import RPGGrid from '../components/MainGrids';
import Chat from '../components/ChatBox';

// Define a type for the sendChatMessage function
type SendChatMessageFunction = (message: string) => void;

const Home: React.FC = () => {
  const { addContentToCenter, addContentToRight, clearContentFromCenter, clearContentFromRight } = useLayout(); // Use the layout hook
  const [sendChatMessage, setSendChatMessage] = useState<SendChatMessageFunction | null>(null);

  // Use useEffect to add components to layout when Home mounts
  useEffect(() => {
    // Add RPGGrid to the center column
    addContentToCenter(<RPGGrid />);
    // Add Chat to the right column, passing the setSendChatMessage prop
    addContentToRight(<Chat setSendChatMessage={setSendChatMessage} userId={1} />);

    // Cleanup function to remove components when Home unmounts
    return () => {
      clearContentFromCenter();
      clearContentFromRight();
    };
  }, [addContentToCenter, addContentToRight, clearContentFromCenter, clearContentFromRight, setSendChatMessage]);

  // The Home component itself doesn't need to render anything directly
  // within its return, as its children are now managed by the Layout.
  return null; // Or a loading spinner, or some placeholder if needed
};

export default Home;