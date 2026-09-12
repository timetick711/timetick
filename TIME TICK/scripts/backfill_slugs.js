import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Service key is better, but anon key might have sufficient privileges if RLS allows or if we disable it temporarily.

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function generateSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Replace spaces with -
    .replace(/\s+/g, '-')
    // Remove all non-word chars except - and arabic characters
    .replace(/[^\w\-أ-ي]/g, '')
    // Replace multiple - with single -
    .replace(/\-\-+/g, '-')
    // Trim - from start of text
    .replace(/^-+/, '')
    // Trim - from end of text
    .replace(/-+$/, '');
}

async function backfillSlugs() {
  console.log('Fetching products...');
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug');

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  console.log(`Found ${products.length} products.`);

  let updatedCount = 0;
  for (const product of products) {
    if (!product.slug && product.name) {
      let slug = generateSlug(product.name);
      
      // Ensure unique slug
      let uniqueSlug = slug;
      let counter = 1;
      let isUnique = false;
      
      while (!isUnique) {
        const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('slug', uniqueSlug)
            .neq('id', product.id)
            .single();
            
        if (existing) {
            uniqueSlug = `${slug}-${counter}`;
            counter++;
        } else {
            isUnique = true;
        }
      }

      console.log(`Updating product ${product.id} with slug: ${uniqueSlug}`);
      const { error: updateError } = await supabase
        .from('products')
        .update({ slug: uniqueSlug })
        .eq('id', product.id);

      if (updateError) {
        console.error(`Error updating product ${product.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Finished backfilling slugs. Updated ${updatedCount} products.`);
}

backfillSlugs();
