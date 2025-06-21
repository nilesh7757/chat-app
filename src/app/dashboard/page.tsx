'use client';

import ContactList from './ContactList';
import { useSearchParams } from 'next/navigation';
import ChatBox from './ChatBox';
import { getSession, signOut } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';

interface Contact {
  email: string;
  name: string;
  image: string | null;
  found: boolean;
}

export default function Page() {
  const searchParams = useSearchParams();
  const targetEmail = searchParams.get('with');
  const [userProfile, setUserProfile] = useState<{ name: string; email: string; image: string | null } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const session = await getSession();
      if (session?.user) {
        setUserProfile({
          name: session.user.name || 'User',
          email: session.user.email || '',
          image: session.user.image || null
        });
      }
    };
    fetchUserProfile();
  }, []);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await fetch('/api/contacts');
        if (response.ok) {
          const data = await response.json();
          setContacts(data.contacts || []);
        }
      } catch (error) {
        console.error('Error fetching contacts:', error);
      }
    };
    fetchContacts();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleProfileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-profile', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(prev => prev ? { ...prev, image: data.image } : null);
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert('Upload failed: ' + errorData.error);
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Upload failed: Network error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddContact = (contact: Contact) => {
    // Check if contact already exists
    if (!contacts.some(existingContact => existingContact.email === contact.email)) {
      setContacts(prev => [...prev, contact]);
    }
  };

  const refreshContacts = async () => {
    try {
      const response = await fetch('/api/contacts');
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Error refreshing contacts:', error);
    }
  };

  const refreshUnknownSenders = async () => {
    // This will be called by the ContactList component
    // The ContactList component will handle fetching unknown senders
    console.log('🔄 Dashboard: refreshUnknownSenders called, incrementing refreshTrigger');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Left Sidebar - Contact List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header with user profile */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div className="flex-shrink-0 relative group">
                <div 
                  className="cursor-pointer relative"
                  onClick={handleProfileClick}
                >
                  {userProfile?.image ? (
                    <Image
                      src={userProfile.image}
                      alt={userProfile.name}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {userProfile ? getInitials(userProfile.name) : 'U'}
                    </div>
                  )}
                  
                  {/* Pencil icon overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  
                  {/* Loading overlay */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userProfile?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userProfile?.email || 'user@example.com'}
                </p>
                {isUploading && (
                  <p className="text-xs text-blue-600">Updating profile...</p>
                )}
              </div>
            </div>
            
            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="ml-3 p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Sign Out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Contact List */}
        <div className="flex-1 overflow-hidden">
          <ContactList contacts={contacts} setContacts={setContacts} refreshTrigger={refreshTrigger} />
        </div>
      </div>

      {/* Right Side - Chat Area */}
      <div className="flex-1 flex flex-col">
        {targetEmail ? (
          contacts.some(c => c.email === targetEmail) ? (
            <ChatBox 
              targetEmail={targetEmail} 
              onAddContact={handleAddContact} 
              onRefreshContacts={refreshContacts}
              onUnknownMessage={refreshUnknownSenders}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Not in contacts</h3>
                <p className="text-gray-500 mb-4">This user is not in your contacts. Add them to start chatting.</p>
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => {
                    // Add the user to contacts
                    handleAddContact({
                      email: targetEmail,
                      name: targetEmail.split('@')[0],
                      image: null,
                      found: false
                    });
                  }}
                >
                  Add to Contacts
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No chat selected</h3>
              <p className="text-gray-500 mb-4">Select a contact from the sidebar to start chatting</p>
              <button
                className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => {
                  if (contacts.length > 0) {
                    const params = new URLSearchParams(window.location.search);
                    params.set('with', contacts[0].email);
                    window.location.search = params.toString();
                  }
                }}
                disabled={contacts.length === 0}
              >
                {contacts.length === 0 ? 'No contacts available' : 'Start a Chat'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
