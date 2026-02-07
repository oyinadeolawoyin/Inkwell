import { useEffect } from 'react';

/**
 * Simple Meta Tags without external dependencies
 * Works with React 19 - no package conflicts!
 */

export function AppMetaTags({ title, description, image } = {}) {
  const defaultTitle = "Inkwell - Just Write";
  const defaultDescription = "Show up. Write messy. Build the habit. No perfection required.";
  const defaultImage = `${window.location.origin}/og-default.png`;

  useEffect(() => {
    // Update title
    document.title = title || defaultTitle;

    // Update or create meta tags
    updateMetaTag('name', 'description', description || defaultDescription);
    updateMetaTag('property', 'og:title', title || defaultTitle);
    updateMetaTag('property', 'og:description', description || defaultDescription);
    updateMetaTag('property', 'og:image', image || defaultImage);
    updateMetaTag('property', 'og:url', window.location.href);
    updateMetaTag('property', 'og:type', 'website');
    
    updateMetaTag('property', 'twitter:card', 'summary_large_image');
    updateMetaTag('property', 'twitter:title', title || defaultTitle);
    updateMetaTag('property', 'twitter:description', description || defaultDescription);
    updateMetaTag('property', 'twitter:image', image || defaultImage);
  }, [title, description, image]);

  return null; // This component doesn't render anything
}

export function QuoteMetaTags({ quote }) {
  const title = `"${quote.content.substring(0, 60)}${quote.content.length > 60 ? '...' : ''}"`;
  const description = quote.title 
    ? `${quote.content} — ${quote.title}`
    : quote.content;

  useEffect(() => {
    document.title = title;

    updateMetaTag('name', 'description', description);
    updateMetaTag('property', 'og:title', title);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('property', 'og:url', window.location.href);
    updateMetaTag('property', 'og:type', 'article');
    
    updateMetaTag('property', 'twitter:card', 'summary_large_image');
    updateMetaTag('property', 'twitter:title', title);
    updateMetaTag('property', 'twitter:description', description);
  }, [quote]);

  return null;
}

export function ProgressMetaTags({ type, stats }) {
  const title = type === 'daily' 
    ? `Today's Writing: ${stats.sprintsCompleted} sprint${stats.sprintsCompleted !== 1 ? 's' : ''}, ${stats.wordsWritten.toLocaleString()} words`
    : `This Week: ${stats.totalSprints} sprints, ${stats.totalWords.toLocaleString()} words`;
  
  const description = type === 'daily'
    ? `I'm building a consistent writing habit. Join me!`
    : `My weekly writing progress. Every word counts!`;

  useEffect(() => {
    document.title = title;

    updateMetaTag('name', 'description', description);
    updateMetaTag('property', 'og:title', title);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('property', 'og:url', window.location.href);
    
    updateMetaTag('property', 'twitter:card', 'summary_large_image');
    updateMetaTag('property', 'twitter:title', title);
    updateMetaTag('property', 'twitter:description', description);
  }, [type, stats]);

  return null;
}

// Helper function to update or create meta tags
function updateMetaTag(attr, key, content) {
  if (!content) return;

  let element = document.querySelector(`meta[${attr}="${key}"]`);
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
}

/**
 * Usage (EXACTLY THE SAME as before):
 * 
 * // In Homepage:
 * <AppMetaTags 
 *   title="Inkwell - Start Writing Now"
 *   description="The easiest way to show up and write. No judgment, just progress."
 * />
 * 
 * // In Dashboard:
 * <AppMetaTags 
 *   title="My Writing Space"
 *   description="Showing up, one sprint at a time."
 * />
 * 
 * // Default:
 * <AppMetaTags />
 */