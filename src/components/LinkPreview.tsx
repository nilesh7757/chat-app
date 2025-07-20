import React from "react";
import dynamic from "next/dynamic";

const Embed = dynamic(() => import("react-embed"), { ssr: false });

interface LinkPreviewProps {
  url: string;
  variant?: 'sent' | 'received';
}

export default function LinkPreview({ url, variant = 'received' }: LinkPreviewProps) {
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

  return (
    <div className="mt-2 w-full">
      {/* @ts-ignore: react-embed may not have correct types */}
      <Embed>
        {url}
      </Embed>
      {/* Optionally, always show the fallback link below for unsupported links */}
      {/* {fallbackLink} */}
    </div>
  );
} 