import { Helmet } from 'react-helmet-async';

/**
 * Meta Tags Component for Social Sharing
 * Use this in your pages to create rich link previews
 */

// For main app pages
export function AppMetaTags({ title, description, image }) {
  const defaultTitle = "Inkwell - Just Write";
  const defaultDescription = "Show up. Write messy. Build the habit. No perfection required.";
  const defaultImage = `${window.location.origin}/og-default.png`; // Create this image

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title || defaultTitle}</title>
      <meta name="title" content={title || defaultTitle} />
      <meta name="description" content={description || defaultDescription} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={window.location.href} />
      <meta property="og:title" content={title || defaultTitle} />
      <meta property="og:description" content={description || defaultDescription} />
      <meta property="og:image" content={image || defaultImage} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={window.location.href} />
      <meta property="twitter:title" content={title || defaultTitle} />
      <meta property="twitter:description" content={description || defaultDescription} />
      <meta property="twitter:image" content={image || defaultImage} />
    </Helmet>
  );
}

// For individual quote pages
export function QuoteMetaTags({ quote }) {
  const title = `"${quote.content.substring(0, 60)}${quote.content.length > 60 ? '...' : ''}"`;
  const description = quote.title 
    ? `${quote.content} — ${quote.title}`
    : quote.content;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />

      <meta property="og:type" content="article" />
      <meta property="og:url" content={window.location.href} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${window.location.origin}/api/quote/${quote.id}/image`} />

      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={window.location.href} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={`${window.location.origin}/api/quote/${quote.id}/image`} />
    </Helmet>
  );
}

// For progress share pages (if you create dedicated pages)
export function ProgressMetaTags({ type, stats }) {
  const title = type === 'daily' 
    ? `Today's Writing: ${stats.sprintsCompleted} sprint${stats.sprintsCompleted !== 1 ? 's' : ''}, ${stats.wordsWritten.toLocaleString()} words`
    : `This Week: ${stats.totalSprints} sprints, ${stats.totalWords.toLocaleString()} words`;
  
  const description = type === 'daily'
    ? `I'm building a consistent writing habit. Join me!`
    : `My weekly writing progress. Every word counts!`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />

      <meta property="og:type" content="website" />
      <meta property="og:url" content={window.location.href} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />

      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={window.location.href} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
    </Helmet>
  );
}