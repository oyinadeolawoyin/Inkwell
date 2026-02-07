import { useState, useEffect, useRef } from "react";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import html2canvas from "html2canvas";
import { AppMetaTags } from "../utilis/metatags";

export default function DailyQuote() {
  const { user } = useAuth();
  const [quote, setQuote] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const quoteRef = useRef(null);

  useEffect(() => {
    fetchQuote();
  }, []);

  async function fetchQuote() {
    try {
      const res = await fetch(`${API_URL}/quote`, {
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log("Quote data:", data);
        
        const quoteData = data.quote || data;
        
        setQuote(quoteData);
        setLikesCount(quoteData._count?.likes || 0);
        setIsLiked(quoteData.userLiked || false);
      } else {
        console.error("Quote fetch failed:", res.status);
      }
    } catch (error) {
      console.error("Failed to fetch quote:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLike() {
    if (!user || !quote) return;

    try {
      const res = await fetch(`${API_URL}/quote/${quote.id}/like`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setIsLiked(data.liked);
        setLikesCount(data.likesCount);
      }
    } catch (error) {
      console.error("Failed to like quote:", error);
    }
  }

  async function handleShare() {
    if (!quoteRef.current) return;
    
    setIsSharing(true);
    
    try {
      // Create a canvas from the quote element
      const canvas = await html2canvas(quoteRef.current, {
        backgroundColor: '#fffbf0',
        scale: 2, // Higher quality
        logging: false,
      });

      // Convert canvas to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      
      const shareData = {
        title: 'Daily Writing Quote',
        text: `"${quote.content}"${quote.title ? ` — ${quote.title}` : ''}`,
        url: window.location.origin + '/quote/' + quote.id, // You'll need to create this route
      };

      // Try Web Share API first (works on mobile)
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'quote.png', { type: 'image/png' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            ...shareData,
            files: [file],
          });
        } else {
          await navigator.share(shareData);
        }
      } else {
        // Fallback: Copy text and download image
        await navigator.clipboard.writeText(`${shareData.text}\n\n${shareData.url}`);
        
        // Download the image
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'daily-quote.png';
        link.href = url;
        link.click();
        
        alert('Quote copied to clipboard and image downloaded!');
      }
    } catch (error) {
      console.error('Share failed:', error);
      
      // Final fallback: just copy text
      const fallbackText = `"${quote.content}"${quote.title ? ` — ${quote.title}` : ''}\n\n${window.location.origin}`;
      await navigator.clipboard.writeText(fallbackText);
      alert('Quote copied to clipboard!');
    } finally {
      setIsSharing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl shadow-soft p-8 sm:p-10 border-l-4 border-ink-gold animate-pulse">
        <div className="h-24 bg-ink-cream rounded"></div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl shadow-soft p-8 sm:p-10 border-l-4 border-ink-gold">
        <p className="text-center text-ink-gray italic">
          "Your daily inspiration will appear here"
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Share Button - Positioned outside for clean screenshot */}
      <button
        onClick={handleShare}
        disabled={isSharing}
        className="absolute -top-3 -right-3 z-20 bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Share quote"
      >
        {isSharing ? (
          <svg className="w-5 h-5 text-ink-primary animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className="w-5 h-5 text-ink-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        )}
      </button>

      {/* Quote Content - This will be captured */}
      <div 
        ref={quoteRef}
        className="bg-gradient-to-br from-amber-50 to-white rounded-2xl shadow-soft-lg p-8 sm:p-10 lg:p-12 border-l-4 border-ink-gold relative overflow-hidden"
      >
        {/* Decorative element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-ink-gold opacity-5 rounded-full -mr-16 -mt-16"></div>
        
        {/* Opening quote mark */}
        <div className="absolute top-4 left-4 text-6xl text-ink-gold opacity-20 font-serif leading-none">
          "
        </div>
        
        {/* Quote Content */}
        <blockquote className="relative z-10 mb-6">
          <p className="text-lg sm:text-xl lg:text-2xl text-ink-primary font-serif italic leading-relaxed text-center px-4 sm:px-8">
            {quote.content}
          </p>
          {quote.title && (
            <footer className="mt-4 text-center">
              <span className="text-base sm:text-lg text-ink-gray font-sans not-italic">
                — {quote.title}
              </span>
            </footer>
          )}
        </blockquote>

        {/* Closing quote mark */}
        <div className="absolute bottom-4 right-4 text-6xl text-ink-gold opacity-20 font-serif leading-none">
          "
        </div>

        {/* Like Button */}
        <div className="flex items-center justify-center gap-2 pt-6 border-t border-ink-gold border-opacity-20 relative z-10">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              isLiked 
                ? 'text-ink-gold hover:text-amber-600 bg-ink-gold bg-opacity-10' 
                : 'text-gray-400 hover:text-ink-gold hover:bg-ink-cream'
            }`}
            aria-label={isLiked ? "Unlike" : "Like"}
          >
            <svg 
              className="w-5 h-5" 
              fill={isLiked ? "currentColor" : "none"}
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
              />
            </svg>
            <span className="text-sm sm:text-base font-medium">
              {likesCount} {likesCount === 1 ? 'writer likes' : 'writers like'} this
            </span>
          </button>
        </div>
        {/* Watermark for shared images */}
        <div className="mt-4 text-center">
          <span className="text-xs text-gray-400">
            {window.location.hostname}
          </span>
        </div>
      </div>
    </div>
  );
}