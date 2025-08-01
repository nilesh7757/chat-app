'use client';
import { useState } from "react";
import axios from 'axios';
import { toast } from 'react-toastify';

export default function DeleteProfileButton() {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete your profile photo?")) {
      return;
    }

    setIsDeleting(true);
    
    try {
      const res = await axios.delete("/api/delete-profile");

      if (res.status === 200) {
        toast.success("Profile photo deleted successfully!");
        window.location.reload(); // Refresh to show default avatar
      } else {
        const data = res.data as { error?: string };
        toast.error("Delete failed: " + (data.error || "Unknown error"));
      }
    } catch {
      toast.error("Delete failed: Network error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-400"
    >
      {isDeleting ? "Deleting..." : "Delete Profile Photo"}
    </button>
  );
} 