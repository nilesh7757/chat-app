import React from "react";

interface LinkPreviewProps {
  url: string;
  variant?: 'sent' | 'received';
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:[^/\n\s]+\/\\S+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
}

export default function LinkPreview({ url, variant = 'received' }: LinkPreviewProps) {
  const fallbackClass = variant === 'sent' ? "text-blue-100 underline break-all" : "text-blue-600 underline break-all";
  const ytId = extractYouTubeId(url);
  if (ytId) {
    return (
      <div className="mt-2 w-full">
        <iframe
          width="320"
          height="180"
          src={`https://www.youtube.com/embed/${ytId}`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video"
          className="rounded-lg shadow w-full"
          onClick={e => e.stopPropagation()}
        />
      </div>
    );
  }
  return (
    <div className="mt-2 w-full">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={fallbackClass + " block"}
        onClick={e => e.stopPropagation()}
      >
        {url}
      </a>
    </div>
  );
} 