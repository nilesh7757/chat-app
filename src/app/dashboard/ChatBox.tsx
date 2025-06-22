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
    size?: number;
  };
  createdAt?: string | Date;
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
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const selfEmailRef = useRef<string>('');
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

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return (
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (fileType === 'application/pdf') {
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return (
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fetchContactDetails = async (email: string): Promise<Contact> => {
    try {
      const response = await fetch(`/api/user/${encodeURIComponent(email)}`);
      if (response.ok) {
        const userData = await response.json();
        return {
          email: userData.email,
          name: userData.name || email.split('@')[0],
          image: userData.image,
          found: true
        };
      }
    } catch (error) {
      console.error('Error fetching contact details:', error);
    }
    
    return {
      email,
      name: email.split('@')[0],
      image: null,
      found: false
    };
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
      if (!session?.user?.email) {
        console.log('❌ No session or user email found');
        return;
      }

      const self = session.user.email;
      selfEmailRef.current = self;
      console.log('🔗 Connecting to WebSocket for user:', self);

      const socket = new WebSocket('ws://localhost:3001');
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('🔗 WebSocket connected successfully');
        const joinMessage = { type: 'join', self, target: targetEmail };
        console.log('📤 Sending join message:', joinMessage);
        socket.send(JSON.stringify(joinMessage));
      };

      socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      socket.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
      };

      socket.onmessage = (event) => {
        console.log('📥 Received WebSocket message:', event.data);
        const msg = JSON.parse(event.data);
        console.log('📥 Parsed message:', msg);
        
        if (msg.type === 'chat') {
          console.log('💬 Processing chat message:', msg);
          setMessages(prev => {
            console.log('📝 Current messages count:', prev.length);
            // More robust duplicate detection
            const isDuplicate = prev.some(m => {
              // If both messages have files, compare file URLs, sender, and timestamps
              if (m.file && msg.file) {
                const timeDiff = Math.abs(new Date(m.createdAt || 0).getTime() - new Date(msg.createdAt || 0).getTime());
                const isDuplicateFile = m.file.url === msg.file.url && 
                                       m.from === msg.from && 
                                       timeDiff < 2000; // Within 2 seconds
                console.log(`🔍 File message duplicate check:`, {
                  urlMatch: m.file.url === msg.file.url,
                  senderMatch: m.from === msg.from,
                  timeDiff,
                  isDuplicate: isDuplicateFile
                });
                if (isDuplicateFile) return true;
              }
              // If both messages have text, compare text, sender, and timestamps
              if (m.text && msg.text) {
                const timeDiff = Math.abs(new Date(m.createdAt || 0).getTime() - new Date(msg.createdAt || 0).getTime());
                const isDuplicateText = m.text === msg.text && 
                                       m.from === msg.from && 
                                       timeDiff < 2000; // Within 2 seconds
                console.log(`🔍 Text message duplicate check:`, {
                  textMatch: m.text === msg.text,
                  senderMatch: m.from === msg.from,
                  timeDiff,
                  isDuplicate: isDuplicateText
                });
                if (isDuplicateText) return true;
              }
              // If one has file and other has text, they're different
              return false;
            });
            
            if (isDuplicate) {
              console.log('🔄 Duplicate message detected, skipping');
              return prev;
            }
            
            console.log('✅ Adding new message to chat');
            const newMessages = [...prev, msg];
            console.log('📝 New messages count:', newMessages.length);
            return newMessages;
          });
        }
        if (msg.type === 'history') {
          console.log('📚 Loading chat history:', msg.messages.length, 'messages');
          setMessages(msg.messages);
        }
        if (msg.type === 'contact_added') {
          console.log('👥 Contact added notification:', msg.message);
          setContactNotification(msg.message);
          setTimeout(() => setContactNotification(null), 3000);
          if (onRefreshContacts) {
            onRefreshContacts();
          }
        }
        if (msg.type === 'unknown_message') {
          console.log('❓ Unknown message notification:', msg);
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
      console.log('🧹 Cleaning up WebSocket connection');
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [targetEmail, onRefreshContacts, onUnknownMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // File upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log('📁 File selected:', { name: file.name, type: file.type, size: file.size });
    
    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      e.target.value = '';
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    try {
      setIsUploadingFile(true);
      console.log('📤 Uploading file to server...');
      const res = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      console.log('📥 Upload response:', data);
      if (data.url) {
        console.log('✅ File uploaded successfully, sending message');
        sendMessage('', { url: data.url, name: file.name, type: file.type, size: file.size });
      } else {
        alert('File upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('File upload error:', error);
      alert('File upload failed. Please try again.');
    } finally {
      e.target.value = '';
      setIsUploadingFile(false);
    }
  };

  // Modified sendMessage to support file
  const sendMessage = (text?: string, fileObj?: { url: string; name: string; type: string; size?: number }) => {
    console.log('📤 sendMessage called with:', { text, fileObj });
    
    if ((!text || !text.trim()) && !fileObj) {
      console.log('❌ No text or file provided, returning early');
      return;
    }
    
    console.log('📤 Sending message:', { text, fileObj });
    
    const msgObj: ChatMessage = {
      from: selfEmailRef.current || 'You',
      text: text?.trim() || '',
    };
    if (fileObj) {
      msgObj.file = fileObj;
    }
    
    // Only include file if present
    const wsMsg: { type: string; text: string; file?: { url: string; name: string; type: string; size?: number } } = { type: 'chat', text: msgObj.text };
    if (msgObj.file) wsMsg.file = msgObj.file;
    
    console.log('🌐 WebSocket message being sent:', wsMsg);
    console.log('🌐 WebSocket state:', socketRef.current?.readyState);
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(wsMsg));
      console.log('✅ Message sent via WebSocket');
    } else {
      console.error('❌ WebSocket not connected, cannot send message');
    }
    
    setMessage('');
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="p-6 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {contact?.image ? (
              <Image
                src={contact.image}
                alt={contact.name}
                width={48}
                height={48}
                className="rounded-full object-cover ring-2 ring-gray-100"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-sm">
                {contact ? getInitials(contact.name) : 'U'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-gray-900 truncate">
              {contact?.name || targetEmail}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {targetEmail}
            </p>
            {!hasAddedContact && (
              <p className="text-sm text-blue-600 font-medium mt-1">
                Send a message to add to contacts
              </p>
            )}
            {contactNotification && (
              <p className="text-sm text-green-600 font-medium mt-1 animate-pulse">
                {contactNotification}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
            <p className="text-gray-600">Start the conversation by sending a message!</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-full">
            {messages.map((msg, i) => {
              console.log('🎨 Rendering message:', { 
                index: i, 
                from: msg.from, 
                text: msg.text, 
                hasFile: !!msg.file,
                fileDetails: msg.file ? {
                  url: msg.file.url,
                  name: msg.file.name,
                  type: msg.file.type,
                  size: msg.file.size
                } : null
              });
              const isOwnMessage = msg.from === selfEmailRef.current;
              return (
                <div
                  key={i}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} px-2`}
                >
                  <div
                    className={`max-w-[280px] sm:max-w-[320px] md:max-w-[400px] lg:max-w-[480px] px-6 py-4 rounded-2xl shadow-sm break-words ${
                      isOwnMessage
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    {/* Show file if present and valid */}
                    {msg.file && msg.file.url ? (
                      <div className="mb-3">
                        {msg.file.type && msg.file.type.startsWith('image/') ? (
                          <a href={msg.file.url} target="_blank" rel="noopener noreferrer" className="block">
                            <img src={msg.file.url} alt={msg.file.name} className="max-h-48 max-w-full rounded-lg mb-2 shadow-sm" />
                          </a>
                        ) : (
                          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border max-w-full">
                            {getFileIcon(msg.file.type)}
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="text-sm font-medium text-gray-900 truncate">{msg.file.name}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(msg.file.size || 0)}</p>
                            </div>
                          </div>
                        )}
                        <a
                          href={msg.file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center space-x-1 text-sm font-medium ${
                            isOwnMessage
                              ? 'text-blue-200 hover:text-blue-100'
                              : 'text-blue-600 hover:text-blue-800'
                          }`}
                          download={msg.file.name}
                        >
                          <span>📎</span>
                          <span>Download</span>
                        </a>
                      </div>
                    ) : null}
                    {msg.text && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {msg.text}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="p-6 border-t border-gray-200 bg-white">
        <div className="flex space-x-3 items-end">
          {/* Attach button */}
          <button
            type="button"
            onClick={() => !isUploadingFile && fileInputRef.current?.click()}
            className={`p-3 rounded-full transition-all duration-200 ${
              isUploadingFile 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800'
            }`}
            title={isUploadingFile ? "Uploading file..." : "Attach file"}
            disabled={isUploadingFile}
          >
            {isUploadingFile ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l7.07-7.07a4 4 0 10-5.656-5.657l-7.071 7.07a6 6 0 108.485 8.486l6.364-6.364" />
              </svg>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploadingFile}
            />
          </button>
          
          {/* Message input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              className="w-full border border-gray-300 text-gray-900 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 text-sm"
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(message)}
            />
          </div>
          
          {/* Send button */}
          <button
            onClick={() => sendMessage(message)}
            className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
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
