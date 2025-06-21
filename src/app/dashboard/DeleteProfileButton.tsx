'use client';
import { useState } from "react";

export default function DeleteProfileButton() {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete your profile photo?")) {
      return;
    }

    setIsDeleting(true);
    
    try {
      const res = await fetch("/api/delete-profile", {
        method: "DELETE",
      });

      if (res.ok) {
        alert("Profile photo deleted successfully!");
        window.location.reload(); // Refresh to show default avatar
      } else {
        const data = await res.json();
        alert("Delete failed: " + data.error);
      }
    } catch {
      alert("Delete failed: Network error");
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