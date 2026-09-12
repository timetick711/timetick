import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, image, url, type = 'website', schema }) => {
    const siteName = 'Time Tick Store';
    const defaultTitle = `${siteName} | متجر الساعات الفاخرة`;
    const defaultDescription = 'متجر Time Tick متخصص في بيع الساعات الرجالية والنسائية الفاخرة مع تشكيلات متنوعة وأسعار مناسبة.';
    
    const seoTitle = title ? `${title} | ${siteName}` : defaultTitle;
    const seoDescription = description || defaultDescription;
    const seoImage = image || 'https://timetick.vercel.app/public/default-og.jpg'; // You may want to replace this with an actual default OG image URL
    const seoUrl = url ? `https://timetick.vercel.app${url}` : 'https://timetick.vercel.app';

    return (
        <Helmet>
            {/* Primary Meta Tags */}
            <title>{seoTitle}</title>
            <meta name="title" content={seoTitle} />
            <meta name="description" content={seoDescription} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={seoUrl} />
            <meta property="og:title" content={seoTitle} />
            <meta property="og:description" content={seoDescription} />
            <meta property="og:image" content={seoImage} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={seoUrl} />
            <meta property="twitter:title" content={seoTitle} />
            <meta property="twitter:description" content={seoDescription} />
            <meta property="twitter:image" content={seoImage} />

            {/* Schema.org JSON-LD */}
            {schema && (
                <script type="application/ld+json">
                    {JSON.stringify(schema)}
                </script>
            )}
        </Helmet>
    );
};

export default SEO;
