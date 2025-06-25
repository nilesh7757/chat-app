import React, { useState, useRef } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  userProfile: { name: string; email: string; image: string | null; bio?: string } | null;
  onProfileUpdated: (profile: { name: string; email: string; image: string | null; bio?: string }) => void;
}

export default function EditProfileModal({ open, onClose, userProfile, onProfileUpdated }: EditProfileModalProps) {
  const [name, setName] = useState(userProfile?.name || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [image, setImage] = useState<string | null>(userProfile?.image || null);
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setName(userProfile?.name || '');
    setBio(userProfile?.bio || '');
    setImage(userProfile?.image || null);
    setFile(null);
    setError(null);
  }, [userProfile, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setImage(URL.createObjectURL(f));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      // 1. Update name and bio
      await axios.patch(`/api/user/${encodeURIComponent(userProfile?.email || '')}`, {
        name: name.trim(),
        bio: bio.slice(0, 200),
      });
      let newImage = image;
      // 2. If file selected, upload new photo
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await axios.post('/api/upload-profile', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        newImage = res.data.image;
      }
      // 3. Refetch updated profile
      const updated = await axios.get(`/api/user/${encodeURIComponent(userProfile?.email || '')}`);
      onProfileUpdated({
        name: updated.data.name,
        email: updated.data.email,
        image: newImage,
        bio: updated.data.bio,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 relative animate-fadeIn">
        <Button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
          variant="ghost"
          size="icon"
        >
          <X className="w-6 h-6" />
        </Button>
        <h2 className="text-xl font-bold mb-6 text-center text-gray-900">Edit Profile</h2>
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            {image ? (
              <Image
                src={image}
                alt="Profile"
                width={80}
                height={80}
                className="rounded-full object-cover ring-2 ring-blue-200"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                {userProfile?.name ? userProfile.name[0].toUpperCase() : 'U'}
              </div>
            )}
            <Button
              className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 shadow-lg hover:bg-blue-700 focus:outline-none"
              onClick={() => fileInputRef.current?.click()}
              title="Change photo"
              type="button"
              variant="secondary"
              size="icon"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={50}
            disabled={isSaving}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio <span className="text-xs text-gray-400">({bio.length}/200)</span></label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white resize-none"
            value={bio}
            onChange={e => setBio(e.target.value.slice(0, 200))}
            maxLength={200}
            rows={3}
            disabled={isSaving}
          />
        </div>
        {error && <div className="text-red-600 text-sm mb-2 text-center">{error}</div>}
        <Button
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSave}
          disabled={isSaving || !name.trim()}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
} 