import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials for sitemap generation');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const SITE_URL = 'https://timetick.vercel.app';

async function generateSitemap() {
  console.log('Generating sitemap...');

  let products = [];
  let { data, error } = await supabase
    .from('products')
    .select('id, slug, updated_at');

  if (error && error.code === '42703') { // Column does not exist
    console.warn('Slug column not found in database, falling back to ID-only generation for sitemap.');
    const fallback = await supabase.from('products').select('id, updated_at');
    if (fallback.error) {
      console.error('Error fetching products for sitemap:', fallback.error);
      return;
    }
    products = fallback.data || [];
  } else if (error) {
    console.error('Error fetching products for sitemap:', error);
    return;
  } else {
    products = data || [];
  }

  const urls = [
    { loc: `${SITE_URL}/`, priority: 1.0, changefreq: 'daily' },
    // Add other static routes as needed
  ];

  products.forEach(product => {
    // Prefer slug, fallback to id
    const identifier = product.slug || product.id;
    const lastMod = product.updated_at ? new Date(product.updated_at).toISOString() : new Date().toISOString();
    
    urls.push({
      loc: `${SITE_URL}/product/${identifier}`,
      priority: 0.8,
      changefreq: 'weekly',
      lastmod: lastMod
    });
  });

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `
  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>
`).join('')}
</urlset>`;

  const publicDir = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }

  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml);
  console.log(`Generated sitemap.xml with ${urls.length} URLs`);

  // Generate robots.txt
  const robotsTxt = `User-agent: *
Allow: /

Disallow: /admin
Disallow: /dashboard

Sitemap: ${SITE_URL}/sitemap.xml`;

  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt);
  console.log('Generated robots.txt');
}

generateSitemap();
