'use client';

import { useSearchParams } from 'next/navigation';
import ChatBox from '../ChatBox';

export default function ChatPage() {
  const searchParams = useSearchParams();
  const targetEmail = searchParams.get('with');

  if (!targetEmail) {
    return (
      <div className="p-4">
        <p className="text-red-500">No chat target specified. Please select a contact.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <ChatBox targetEmail={targetEmail} />
    </div>
  );
} 