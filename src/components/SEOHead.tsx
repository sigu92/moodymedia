import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  noIndex?: boolean;
}

const SEOHead = ({
  title = "Moody Media - Premium SEO Marketplace",
  description = "Connect with verified publishers, get quality backlinks, and grow your online presence. Transparent pricing, real metrics, guaranteed results.",
  keywords = "SEO, backlinks, link building, digital marketing, publishers, media outlets, SERP, rankings",
  image = "/og-image.jpg",
  url = "https://moodymedia.se",
  type = "website",
  noIndex = false
}: SEOHeadProps) => {
  const fullTitle = title.includes("Moody Media") ? title : `${title} | Moody Media`;
  const fullUrl = url.startsWith("http") ? url : `https://moodymedia.se${url}`;
  const fullImage = image.startsWith("http") ? image : `https://moodymedia.se${image}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={noIndex ? "noindex,nofollow" : "index,follow"} />
      <meta name="author" content="Moody Media" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:site_name" content="Moody Media" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:creator" content="@moodymedia" />

      {/* Additional SEO Meta Tags */}
      <meta name="theme-color" content="#6366f1" />
      <meta name="msapplication-TileColor" content="#6366f1" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="format-detection" content="telephone=no" />

      {/* Structured Data for Organization */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Moody Media",
          "url": "https://moodymedia.se",
          "logo": "https://moodymedia.se/logo.png",
          "description": description,
          "foundingDate": "2019",
          "founder": {
            "@type": "Person",
            "name": "Alex Johnson"
          },
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+46-8-123-456-78",
            "contactType": "customer service",
            "email": "hello@moodymedia.se"
          },
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Stockholm",
            "addressCountry": "SE"
          },
          "sameAs": [
            "https://twitter.com/moodymedia",
            "https://linkedin.com/company/moodymedia",
            "https://facebook.com/moodymedia"
          ]
        })}
      </script>

      {/* Structured Data for WebSite */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Moody Media",
          "url": "https://moodymedia.se",
          "description": description,
          "potentialAction": {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://moodymedia.se/marketplace?search={search_term_string}"
            },
            "query-input": "required name=search_term_string"
          }
        })}
      </script>
    </Helmet>
  );
};

export default SEOHead;