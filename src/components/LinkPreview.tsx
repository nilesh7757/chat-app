import React, { useEffect, useRef, useState } from "react";
import Embed from "react-embed";

interface LinkPreviewProps {
  url: string;
  variant?: 'sent' | 'received';
}

export default function LinkPreview({ url, variant = 'received' }: LinkPreviewProps) {
  const [embedRendered, setEmbedRendered] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const fallbackClass = variant === 'sent' ? "text-blue-100 underline break-all" : "text-blue-600 underline break-all";
  const fallbackLink = (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={fallbackClass + " block"}
      onClick={e => e.stopPropagation()}
    >
      {url}
    </a>
  );

  // If the embed doesn't render after a short delay, show the fallback
  useEffect(() => {
    setEmbedRendered(false);
    setShowFallback(false);
    const timeout = setTimeout(() => {
      if (!embedRendered) setShowFallback(true);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [url]);

  return (
    <div className="mt-2 w-full">
      <Embed
        url={url}
        renderUnsupported={() => {
          setShowFallback(true);
          return fallbackLink;
        }}
        onRender={() => setEmbedRendered(true)}
        iframeProps={{
          className: "rounded-lg shadow w-full",
          onClick: (e: React.MouseEvent) => e.stopPropagation(),
        }}
      />
      {/* If the embed didn't render and renderUnsupported wasn't called, show fallback */}
      {showFallback && !embedRendered && fallbackLink}
    </div>
  );
} 