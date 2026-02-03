import { useState, useEffect } from "react";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";

export default function DailyQuote() {
  const { user } = useAuth();
  const [quote, setQuote] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

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
        
        // Handle both response formats
        const quoteData = data.quote || data; // Backend might return { quote: {...} } or just {...}
        
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
    <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl shadow-soft-lg p-8 sm:p-10 lg:p-12 border-l-4 border-ink-gold relative overflow-hidden">
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
    </div>
  );
}