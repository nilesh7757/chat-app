'use client';

import { useEffect, useRef, useState } from 'react';
import { getSession } from 'next-auth/react';
import Image from 'next/image';
import React from 'react';

interface ChatContact {
  email: string;
  name: string;
  image: string | null;
}

interface Contact {
  email: string;
  name: string;
  image: string | null;
  found: boolean;
}

interface ChatMessage {
  from: string;
  text: string;
  file?: {
    url: string;
    name: string;
    type: string;
  };
}

export default function ChatBox({ 
  targetEmail, 
  onAddContact,
  onRefreshContacts,
  onUnknownMessage
}: { 
  targetEmail: string;
  onAddContact?: (contact: Contact) => void;
  onRefreshContacts?: () => Promise<void>;
  onUnknownMessage?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState<ChatContact | null>(null);
  const [hasAddedContact, setHasAddedContact] = useState(false);
  const [contactNotification, setContactNotification] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const selfEmailRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const fetchContactDetails = async (email: string): Promise<Contact> => {
    try {
      const response = await fetch(`/api/user/${encodeURIComponent(email)}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching contact details:', error);
      return {
        email: email,
        name: email.split('@')[0],
        image: null,
        found: false
      };
    }
  };

  const addContactToList = async (email: string) => {
    if (hasAddedContact || !onAddContact) return;
    
    try {
      const contactDetails = await fetchContactDetails(email);
      
      // Add to local state
      onAddContact(contactDetails);
      
      // Add to database for current user
      const response = await fetch('/api/contacts/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactEmail: email }),
      });

      if (response.ok) {
        console.log('Contact added to database');
      } else {
        console.error('Failed to add contact to database');
      }
      
      setHasAddedContact(true);
    } catch (error) {
      console.error('Error adding contact:', error);
    }
  };

  useEffect(() => {
    fetchContactDetails(targetEmail).then(setContact);
  }, [targetEmail]);

  useEffect(() => {
    const connect = async () => {
      const session = await getSession();
      if (!session?.user?.email) return;

      const self = session.user.email;
      selfEmailRef.current = self;

      const socket = new WebSocket('ws://localhost:3001');
      socketRef.current = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'join', self, target: targetEmail }));
      };

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'chat') {
          setMessages(prev => {
            const isDuplicate = prev.some(m =>
              m.text === msg.text &&
              m.from === msg.from &&
              ((m.file && msg.file && m.file.url === msg.file.url) || (!m.file && !msg.file))
            );
            if (isDuplicate) return prev;
            return [...prev, msg];
          });
        }
        if (msg.type === 'history') {
          setMessages(msg.messages);
        }
        if (msg.type === 'contact_added') {
          setContactNotification(msg.message);
          setTimeout(() => setContactNotification(null), 3000);
          if (onRefreshContacts) {
            onRefreshContacts();
          }
        }
        if (msg.type === 'unknown_message') {
          setContactNotification(`New message from ${msg.fromName || msg.from}`);
          setTimeout(() => setContactNotification(null), 5000);
          if (onUnknownMessage) {
            onUnknownMessage();
          }
        }
      };
    };

    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [targetEmail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // File upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        sendMessage('', { url: data.url, name: file.name, type: file.type });
      }
    } catch (err) {
      alert('File upload failed');
    } finally {
      e.target.value = '';
    }
  };

  // Modified sendMessage to support file
  const sendMessage = (text?: string, fileObj?: { url: string; name: string; type: string }) => {
    if ((!text || !text.trim()) && !fileObj) return;
    let msgObj: ChatMessage = {
      from: selfEmailRef.current || 'You',
      text: text?.trim() || '',
    };
    if (fileObj) {
      msgObj.file = fileObj;
    }
    setMessages(prev => [...prev, msgObj]);
    // Only include file if present
    const wsMsg: any = { type: 'chat', text: msgObj.text };
    if (msgObj.file) wsMsg.file = msgObj.file;
    socketRef.current?.send(JSON.stringify(wsMsg));
    setMessage('');
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {contact?.image ? (
              <Image
                src={contact.image}
                alt={contact.name}
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-medium text-sm">
                {contact ? getInitials(contact.name) : 'U'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {contact?.name || targetEmail}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {targetEmail}
            </p>
            {!hasAddedContact && (
              <p className="text-xs text-blue-600">
                Send a message to add to contacts
              </p>
            )}
            {contactNotification && (
              <p className="text-xs text-green-600 animate-pulse">
                {contactNotification}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.from === selfEmailRef.current ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.from === selfEmailRef.current
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  {/* Show file if present and valid */}
                  {msg.file && msg.file.url ? (
                    <div>
                      {msg.file.type && msg.file.type.startsWith('image/') ? (
                        <a href={msg.file.url} target="_blank" rel="noopener noreferrer">
                          <img src={msg.file.url} alt={msg.file.name} className="max-h-40 max-w-xs rounded mb-1" />
                        </a>
                      ) : null}
                      <a
                        href={msg.file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-blue-200 hover:text-blue-100 break-all"
                        download={msg.file.name}
                      >
                        {msg.file.name}
                      </a>
                    </div>
                  ) : null}
                  {msg.text && <p className="text-sm mt-1">{msg.text}</p>}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex space-x-2 items-center">
          {/* Attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600"
            title="Attach file"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l7.07-7.07a4 4 0 10-5.656-5.657l-7.071 7.07a6 6 0 108.485 8.486l6.364-6.364" />
            </svg>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
          </button>
          <input
            type="text"
            value={message}
            className="flex-1 border border-gray-300 text-gray-900 px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(message)}
          />
          <button
            onClick={() => sendMessage(message)}
            className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
            disabled={!message.trim()}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
