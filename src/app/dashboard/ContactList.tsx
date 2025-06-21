'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

interface Contact {
  email: string;
  name: string;
  image: string | null;
  found: boolean;
}

interface UnknownSender extends Contact {
  lastMessage: string;
  lastMessageTime: Date;
}

interface ContactListProps {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  refreshTrigger?: number;
}

export default function ContactList({ contacts, setContacts, refreshTrigger }: ContactListProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unknownSenders, setUnknownSenders] = useState<UnknownSender[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchUserDetails = async (email: string): Promise<Contact> => {
    try {
      const response = await fetch(`/api/user/${encodeURIComponent(email)}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching user details:', error);
      return {
        email: email,
        name: email.split('@')[0],
        image: null,
        found: false
      };
    }
  };

  const fetchUnknownSenders = async () => {
    try {
      console.log('Fetching unknown senders...');
      const response = await fetch('/api/contacts/unknown-senders');
      if (response.ok) {
        const data = await response.json();
        console.log('Unknown senders response:', data);
        setUnknownSenders(data.unknownSenders || []);
      } else {
        console.error('Failed to fetch unknown senders:', response.status);
      }
    } catch (error) {
      console.error('Error fetching unknown senders:', error);
    }
  };

  useEffect(() => {
    fetchUnknownSenders();
  }, []);

  useEffect(() => {
    if (refreshTrigger) {
      console.log('🔄 ContactList: refreshTrigger changed, fetching unknown senders');
      fetchUnknownSenders();
    }
  }, [refreshTrigger]);

  const addContact = async () => {
    if (!email.trim() || contacts.some(contact => contact.email === email)) {
      return;
    }

    setIsLoading(true);
    try {
      const userDetails = await fetchUserDetails(email);
      setContacts(prev => [...prev, userDetails]);
      
      // Update URL with the new contact
      const params = new URLSearchParams(searchParams);
      params.set('with', email);
      router.push(`/dashboard?${params.toString()}`);
      setEmail('');
    } catch (error) {
      console.error('Error adding contact:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectContact = (contactEmail: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('with', contactEmail);
    router.push(`/dashboard?${params.toString()}`);
  };

  const deleteContact = async (contactEmail: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent contact selection when clicking delete
    
    if (!confirm(`Are you sure you want to delete ${contactEmail} from your contacts?`)) {
      return;
    }

    try {
      const response = await fetch('/api/contacts/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactEmail }),
      });

      if (response.ok) {
        // Remove from local state
        setContacts(prev => prev.filter(contact => contact.email !== contactEmail));
        
        // If this contact is currently selected, clear the selection
        if (searchParams.get('with') === contactEmail) {
          const params = new URLSearchParams(searchParams);
          params.delete('with');
          router.push(`/dashboard?${params.toString()}`);
        }
      } else {
        const data = await response.json();
        alert('Failed to delete contact: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact: Network error');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Debug Section - Remove in production */}
      <div className="p-2 bg-gray-100 text-xs text-gray-600 border-b">
        <div>Refresh Trigger: {refreshTrigger}</div>
        <div>Unknown Senders: {unknownSenders.length}</div>
        <div>Contacts: {contacts.length}</div>
      </div>

      {/* Add Contact Section */}
      <div className="p-3 border-b border-gray-200 bg-white">
        <div className="flex">
          <input
            type="email"
            placeholder="Add contact by email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-gray-300 text-gray-900 px-3 py-2 rounded-l flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm placeholder-gray-500"
            onKeyDown={(e) => e.key === 'Enter' && addContact()}
            disabled={isLoading}
          />
          <button 
            onClick={addContact} 
            className="bg-blue-600 text-white px-3 py-2 rounded-r hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 text-sm"
            disabled={isLoading}
          >
            {isLoading ? '...' : '+'}
          </button>
        </div>
      </div>

      {/* Unknown Senders Section */}
      {unknownSenders.length > 0 && (
        <div className="border-b border-gray-200">
          <div className="px-3 py-2 bg-yellow-50 border-b border-yellow-200 flex justify-between items-center">
            <p className="text-xs font-medium text-yellow-800">New Messages</p>
            <button
              onClick={fetchUnknownSenders}
              className="text-xs text-yellow-700 hover:text-yellow-900"
              title="Refresh unknown senders"
            >
              🔄
            </button>
          </div>
          <div>
            {unknownSenders.map((sender, index) => (
              <div
                key={`unknown-${index}`}
                className={`cursor-pointer p-3 hover:bg-yellow-50 border-b border-yellow-100 last:border-b-0 transition-colors group ${
                  searchParams.get('with') === sender.email ? 'bg-yellow-100 border-l-4 border-l-yellow-500' : ''
                }`}
                onClick={() => selectContact(sender.email)}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {sender.image ? (
                      <Image
                        src={sender.image}
                        alt={sender.name}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-yellow-300 rounded-full flex items-center justify-center text-yellow-700 font-medium text-sm">
                        {getInitials(sender.name)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {sender.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {sender.email}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {sender.lastMessage}
                    </p>
                    <p className="text-xs text-yellow-600">
                      {formatTime(sender.lastMessageTime.toString())}
                    </p>
                  </div>
                  
                  {/* New message indicator */}
                  <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {contacts.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium">No contacts yet</p>
            <p className="text-xs">Add a contact to start chatting</p>
          </div>
        ) : (
          <div>
            {contacts.map((contact, index) => (
              <div
                key={index}
                className={`cursor-pointer p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors group ${
                  searchParams.get('with') === contact.email ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => selectContact(contact.email)}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {contact.image ? (
                      <Image
                        src={contact.image}
                        alt={contact.name}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-medium text-sm">
                        {getInitials(contact.name)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {contact.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {contact.email}
                    </p>
                    {!contact.found && (
                      <p className="text-xs text-orange-600">
                        Not registered
                      </p>
                    )}
                  </div>
                  
                  {/* Delete Button */}
                  <button
                    onClick={(e) => deleteContact(contact.email, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-200"
                    title="Delete contact"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
