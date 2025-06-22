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

  const handleAddContact = async (contact: Contact) => {
    // Check if contact already exists
    if (!contacts.some(existingContact => existingContact.email === contact.email)) {
      // Add to local state first
      setContacts(prev => [...prev, contact]);
      
      // Persist to database
      try {
        const response = await fetch('/api/contacts/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contactEmail: contact.email }),
        });

        if (!response.ok) {
          console.error('Failed to save contact to database');
          // Remove from local state if database save failed
          setContacts(prev => prev.filter(c => c.email !== contact.email));
          alert('Failed to add contact. Please try again.');
        }
      } catch (error) {
        console.error('Error adding contact:', error);
        // Remove from local state if database save failed
        setContacts(prev => prev.filter(c => c.email !== contact.email));
        alert('Failed to add contact. Please try again.');
      }
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
    <div className="h-screen flex bg-gray-50">
      {/* Left Sidebar - Contact List */}
      <div className="w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        {/* Header with user profile */}
        <div className="p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="flex-shrink-0 relative group">
                <div 
                  className="cursor-pointer relative"
                  onClick={handleProfileClick}
                >
                  {userProfile?.image ? (
                    <Image
                      src={userProfile.image}
                      alt={userProfile.name}
                      width={48}
                      height={48}
                      className="rounded-full object-cover ring-2 ring-gray-100"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-sm">
                      {userProfile ? getInitials(userProfile.name) : 'U'}
                    </div>
                  )}
                  
                  {/* Pencil icon overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  
                  {/* Loading overlay */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
                <p className="text-base font-semibold text-gray-900 truncate">
                  {userProfile?.name || 'User'}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {userProfile?.email || 'user@example.com'}
                </p>
                {isUploading && (
                  <p className="text-xs text-blue-600 font-medium">Updating profile...</p>
                )}
              </div>
            </div>
            
            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="ml-3 p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200"
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
      <div className="flex-1 flex flex-col bg-white">
        {targetEmail ? (
          contacts.some(c => c.email === targetEmail) ? (
            <ChatBox 
              targetEmail={targetEmail} 
              onAddContact={handleAddContact} 
              onRefreshContacts={refreshContacts}
              onUnknownMessage={refreshUnknownSenders}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="text-center max-w-md mx-auto px-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Not in contacts</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">This user is not in your contacts yet. Add them to start chatting and stay connected.</p>
                <button
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium shadow-sm"
                  onClick={async () => {
                    // Add the user to contacts
                    await handleAddContact({
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
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="text-center max-w-md mx-auto px-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Welcome to Chat</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">Select a contact from the sidebar to start chatting, or add new contacts to begin conversations.</p>
              <button
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
