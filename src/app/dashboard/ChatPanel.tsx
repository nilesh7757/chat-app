'use client';

import { useSearchParams } from 'next/navigation';
import ChatBox from './ChatBox';

export default function ChatPanel() {
  const searchParams = useSearchParams();
  const targetEmail = searchParams.get('with');

  if (!targetEmail) {
    return <p className="text-gray-500">Select a contact to start chatting.</p>;
  }

  return (
    <ChatBox targetEmail={targetEmail} />
  );
}
