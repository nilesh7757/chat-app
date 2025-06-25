import React from 'react';
import Image from 'next/image';

interface UserInfoBoxProps {
  open: boolean;
  onClose: () => void;
  user: { name: string; email: string; image: string | null; bio?: string };
}

export default function UserInfoBox({ open, onClose, user }: UserInfoBoxProps) {
  return (
    <div
      className={`fixed top-0 left-0 w-full z-50 flex justify-center transition-transform duration-500 ease-in-out ${open ? 'translate-y-0' : '-translate-y-full'}`}
      style={{ pointerEvents: open ? 'auto' : 'none', display: open ? undefined : 'none' }}
    >
      <div className="bg-white shadow-xl rounded-b-2xl w-full max-w-lg mx-auto mt-0 p-8 relative border-b border-gray-200">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex flex-col items-center mb-4">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name}
              width={80}
              height={80}
              className="rounded-full object-cover ring-2 ring-blue-200"
            />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
          )}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-1">{user.name}</h2>
          <p className="text-gray-600 text-sm mb-2">{user.email}</p>
          {user.bio && (
            <p className="text-gray-700 text-base mt-2 whitespace-pre-line">{user.bio}</p>
          )}
        </div>
      </div>
    </div>
  );
} 