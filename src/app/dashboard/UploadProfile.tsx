'use client';
import { useState } from "react";
import axios from 'axios';

export default function UploadProfile() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Choose a file");
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post("/api/upload-profile", formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    setIsUploading(false);

    if (res.status === 200) {
      alert("Uploaded successfully!");
      window.location.reload(); // refresh to get new session image
    } else {
      alert("Upload failed: " + res.data.error);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button
        onClick={handleUpload}
        className="bg-blue-500 text-white px-4 py-2 rounded mt-2 hover:bg-blue-700"
      >
        {isUploading ? "Uploading..." : "Upload Profile Image"}
      </button>
    </div>
  );
}
