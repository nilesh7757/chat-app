'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

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
  onContactSelect?: () => void;
}

export default function ContactList({ contacts, setContacts, refreshTrigger, onContactSelect }: ContactListProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [unknownSenders, setUnknownSenders] = useState<UnknownSender[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchUserDetails = async (email: string): Promise<Contact> => {
    try {
      const response = await axios.get(`/api/user/${encodeURIComponent(email)}`);
      return response.data as Contact;
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
      const response = await axios.get('/api/contacts/unknown-senders');
      const data = response.data as { unknownSenders: UnknownSender[] };
      console.log('Unknown senders response:', data);
      setUnknownSenders(data.unknownSenders || []);
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
      
      // Add to local state
      setContacts(prev => [...prev, userDetails]);
      
      // Persist to database
      const response = await axios.post('/api/contacts/add', { contactEmail: email });

      if (response.status !== 200) {
        console.error('Failed to save contact to database');
        // Remove from local state if database save failed
        setContacts(prev => prev.filter(contact => contact.email !== email));
        alert('Failed to add contact. Please try again.');
        return;
      }
      
      // Update URL with the new contact
      const params = new URLSearchParams(searchParams);
      params.set('with', email);
      router.push(`/dashboard?${params.toString()}`);
      setEmail('');
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('Failed to add contact. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectContact = async (contactEmail: string) => {
    // Check if this is an unknown sender that needs to be added to contacts
    const isUnknownSender = unknownSenders.some(sender => sender.email === contactEmail);
    const isAlreadyInContacts = contacts.some(contact => contact.email === contactEmail);
    
    if (isUnknownSender && !isAlreadyInContacts) {
      setIsAddingContact(true);
      // Add the unknown sender to contacts
      try {
        const userDetails = await fetchUserDetails(contactEmail);
        
        // Add to local state
        setContacts(prev => [...prev, userDetails]);
        
        // Persist to database
        const response = await axios.post('/api/contacts/add', { contactEmail });

        if (response.status !== 200) {
          console.error('Failed to save contact to database');
          // Remove from local state if database save failed
          setContacts(prev => prev.filter(contact => contact.email !== contactEmail));
          alert('Failed to add contact. Please try again.');
          setIsAddingContact(false);
          return;
        }
      } catch (error) {
        console.error('Error adding contact:', error);
        alert('Failed to add contact. Please try again.');
        setIsAddingContact(false);
        return;
      } finally {
        setIsAddingContact(false);
      }
    }
    
    // Update URL with the selected contact
    const params = new URLSearchParams(searchParams);
    params.set('with', contactEmail);
    router.push(`/dashboard?${params.toString()}`);
    if (onContactSelect) onContactSelect();
  };

  const deleteContact = async (contactEmail: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent contact selection when clicking delete
    
    if (!confirm(`Are you sure you want to delete ${contactEmail} from your contacts?`)) {
      return;
    }

    try {
      const config: AxiosRequestConfig = { headers: { 'Content-Type': 'application/json' }, data: { contactEmail } };
      const response = await axios.delete('/api/contacts/delete', config);

      if (response.status === 200) {
        // Remove from local state
        setContacts(prev => prev.filter(contact => contact.email !== contactEmail));
        
        // If this contact is currently selected, clear the selection
        if (searchParams.get('with') === contactEmail) {
          const params = new URLSearchParams(searchParams);
          params.delete('with');
          router.push(`/dashboard?${params.toString()}`);
        }
      } else {
        const data = response.data as { error?: string };
        alert('Failed to delete contact: ' + (data.error || 'Unknown error'));
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
      {/* Add Contact Section */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex space-x-2">
          <input
            type="email"
            placeholder="Add contact by email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 border border-gray-300 text-gray-900 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-500"
            onKeyDown={(e) => e.key === 'Enter' && addContact()}
            disabled={isLoading}
          />
          <button 
            onClick={addContact} 
            className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              '+'
            )}
          </button>
        </div>
      </div>

      {/* Unknown Senders Section */}
      {unknownSenders.length > 0 && (
        <div className="border-b border-gray-200">
          <div className="px-4 py-3 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200 flex justify-between items-center">
            <p className="text-sm font-semibold text-yellow-800">New Messages</p>
            <div className="flex items-center space-x-2">
              {isAddingContact && (
                <div className="w-4 h-4 border border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
              )}
              <button
                onClick={fetchUnknownSenders}
                className="p-1 text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100 rounded transition-colors"
                title="Refresh unknown senders"
                disabled={isAddingContact}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          <div>
            {unknownSenders.map((sender, index) => (
              <div
                key={`unknown-${index}`}
                className={`cursor-pointer p-4 hover:bg-yellow-50 border-b border-yellow-100 last:border-b-0 transition-all duration-200 group ${
                  searchParams.get('with') === sender.email ? 'bg-yellow-100 border-l-4 border-l-yellow-500' : ''
                } ${isAddingContact ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isAddingContact && selectContact(sender.email)}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {sender.image ? (
                      <Image
                        src={sender.image}
                        alt={sender.name}
                        width={44}
                        height={44}
                        className="rounded-full object-cover ring-2 ring-yellow-200"
                      />
                    ) : (
                      <div className="w-11 h-11 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                        {getInitials(sender.name)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      Unknown
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {sender.email}
                    </p>
                    <p className="text-xs text-gray-600 truncate mt-1">
                      {sender.lastMessage}
                    </p>
                    <p className="text-xs text-yellow-600 font-medium mt-1">
                      {formatTime(sender.lastMessageTime.toString())}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded-full font-semibold">Unknown Sender</span>
                  </div>
                  {/* New message indicator */}
                  <div className="w-3 h-3 bg-yellow-500 rounded-full flex-shrink-0 shadow-sm"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {contacts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No contacts yet</h3>
            <p className="text-gray-600">Add a contact to start chatting</p>
          </div>
        ) : (
          <div>
            {contacts.map((contact, index) => (
              <div
                key={index}
                className={`cursor-pointer p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-all duration-200 group ${
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
                        width={44}
                        height={44}
                        className="rounded-full object-cover ring-2 ring-gray-100"
                      />
                    ) : (
                      <div className="w-11 h-11 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                        {getInitials(contact.name)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {contact.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {contact.email}
                    </p>
                    {!contact.found && (
                      <p className="text-xs text-orange-600 font-medium mt-1">
                        Not registered
                      </p>
                    )}
                  </div>
                  
                  {/* Delete Button */}
                  <button
                    onClick={(e) => deleteContact(contact.email, e)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200"
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
