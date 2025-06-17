// scripts/seed.mjs
import fs from 'node:fs';
import path from 'path';
import { neon, Pool } from '@neondatabase/serverless';
import tags from './tags.mjs'

// --- CONFIGURATION ---

const DATA_DIR = path.join(process.cwd(), 'data', 'georgia');
console.log(`Using data directory: ${DATA_DIR}`);

// --- DATABASE CONNECTION ---
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on('error', (err) => console.error(err)); // deal with e.g. re-connect

// --- HELPER FUNCTIONS ---

// Search for all objects in a nested structure that have a specific key-value pair.

function findObjectsWithKeyValue(obj, key, value) {
  const results = [];
  const visited = new WeakSet();
  function recurse(item) {
    // Only process if item is a non-null object
    if (item && typeof item === 'object') {
      if (visited.has(item)) return;          // avoid cycles
      visited.add(item);

      // If this object has the target key as its own property and value matches, record it
      if (!Array.isArray(item)
          && Object.prototype.hasOwnProperty.call(item, key)
          && item[key] === value) {
        results.push(item);
      }

      // Recurse into arrays or objects
      if (Array.isArray(item)) {
        for (const element of item) {
          recurse(element);
        }
      } else {
        for (const k in item) {
          // Only recurse on own properties
          if (Object.prototype.hasOwnProperty.call(item, k)) {
            recurse(item[k]);
          }
        }
      }
    }
  }
  recurse(obj);
  return results;
}
const findProperty = (obj, nameToFind, propertyToReturn) => {
  const foundProperty = obj.find(item => item.type === nameToFind);
  return foundProperty ? foundProperty[propertyToReturn] : null;
}

function loadAllJson(dir) {
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .flatMap(filePath => {
      const raw = fs.readFileSync(path.join(dir, filePath), 'utf8');
      const data = JSON.parse(raw);
      return {
        "slug": filePath.slice(0, -5),
        "title": filePath.slice(0, -5).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        "meta_description": `Seed data for ${filePath.slice(0, -5)}`,
        "status": "published",
        "published_at": new Date().toISOString(),
        "jsonData": Array.isArray(data) ? data : [data]};
    });
}
function transformForSeed(src) {
  const {
    slug,
    jsonData
  } = src;
  let topics
  switch (slug) {
    case 'general':
      console.log(findProperty(jsonData, 'list', "items"))
      // console.log(jsonData[2].content);
      const generalPage = {}
        generalPage.title = "Culture and Traditions of Georgia";
        generalPage.description = [
          {
            type: 'paragraph',
            text: "Explore the rich culture and traditions of Georgia, from its ancient history to modern practices."
          }
        ];
        generalPage.content = jsonData.map((card) => ({
                      type: 'structured_card',
            structured_card: {
              title: card.title,
              description: card.content,
              img_src: card.img_src,
              img_alt: card.img_alt,
              items: ''
          }
        }

        ));
        jsonData.length = 0; // Clear the original jsonData array
        jsonData.push(generalPage);
        // console.log(jsonData[0].content);
      topics = tags.general;
      break;
    case 'history':
      topics = tags.history;
      break;
    case 'culture':
        const culturePage = {}
        culturePage.title = "Culture and Traditions of Georgia";
        culturePage.description = [
          {
            type: 'paragraph',
            text: "Explore the rich culture and traditions of Georgia, from its ancient history to modern practices."
          }
        ];
        culturePage.content = jsonData.map((card) => ({
          type: 'structured_card',
          structured_card: {
            title: card.title,
            description: card.content,
            img_src: card.img_src,
            img_alt: card.img_alt,
            items: card.items || []
          }
        }));
        jsonData.length = 0; // Clear the original jsonData array
        jsonData.push(culturePage);
      topics = tags.culture;
      break;
    case 'nature':
      topics = tags.nature;
      break;
    case 'adventures':
      jsonData.forEach((card) => {
        if (card.name) {
          card.title = card.name;
          delete card.name; // Remove the old key to avoid confusion
        }
        if (card.imageSrc) {
          card.img_src = card.imageSrc;
          delete card.imageSrc; // Remove the old key to avoid confusion
        }
        if (card.imageAlt) {
          card.img_alt = card.imageAlt;
          delete card.imageAlt; // Remove the old key to avoid confusion
        }
        if (card.description) {
          card.description = [
            {
              type: 'paragraph',
              text: card.description
            }
          ]
        }
        if (card.location) {
          card.content = {
            type: 'paragraph',
            text: `Location: ${card.location}`
          };
          delete card.location; // Remove the old key to avoid confusion
        }
        if (card.footer) {
          card.footer = `Read more: <Link href="${card.footer}">Explore further</Link>`;
        } else {
          card.footer = '';
        }
      });
      topics = tags.adventures;
      break;
    case 'cuisine':
      jsonData.forEach((card) => {
        if (card.page.title) {
          card.title = card.page.title;
          delete card.page.title; // Remove the old key to avoid confusion
        }
        if (card.page.intro) {
          card.description = [
            {
              type: 'paragraph',
              text: card.page.intro
            }
          ];
          delete card.page.intro; // Remove the old key to avoid confusion
        }
        if (card.page.sections) {
          for (const section of card.page.sections) {
            if (section.dishes && section.venues) {
              section.items = {
                dishes: section.dishes.map(dish => ({
                  dish
                })),
                venues: section.venues.map(venue => ({
                  venue
                }))
              }
              delete section.venues; // Remove the old key to avoid confusion
              delete section.dishes; // Remove the old key to avoid confusion
            }
          }
        }
        if (card.page.sections){
          card.content = card.page.sections.map(section => ({
            type: 'structured_card',
            structured_card: section
          }));
          delete card.page.sections; // Remove the old key to avoid confusion
        }
      delete card.page; // Remove the old key to avoid confusion
      });
      topics = tags.cuisine;
      break;
    case 'guide':
      topics = tags.guide;
      break;
    case 'health':
      topics = tags.health;
      break;
    case 'nightlife':
      topics = tags.nightlife;
      break;
    case 'wine':
      topics = tags.wine;
      break;
    default:
  }
  return {
    slug: src.slug,
    title: src.title,
    meta_description: src.meta_description || `Seed data for ${src.slug}`,
    status: src.status || 'draft',
    published_at: src.published_at || new Date().toISOString(),
    jsonData: src.jsonData || [],
    topics: topics || [],
  };
}

const INPUT_DIR = path.join(process.cwd(), 'data', 'georgia');
const georgiaData = loadAllJson(INPUT_DIR);
// const OUTPUT_PATH = path.join(process.cwd(), 'data', 'georgia', 'seeded.json');
const seededData = georgiaData.map(transformForSeed);






// console.log(seededData[3].jsonData[0].content); // Debugging line to check the first title







async function upsertTopic(client, topicName) {
    const slug = topicName.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
    const res = await client.query(
        `INSERT INTO topics (name, slug) VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [topicName, slug]
    );
    return res.rows[0].id;
}


// --- MAIN SEEDING LOGIC ---
async function main() {
const client = await pool.connect();
console.log('✅ Connected to the database.');

  try {
    // Wrap the entire seed process in a transaction.
    // If any part fails, the whole process will be rolled back.
    await client.query('BEGIN');
    console.log('🚀 Starting transaction...');

    // 1. Define the page and its associated JSON data
    for (const pageData of seededData) {
      // --- SEED A SINGLE PAGE ---
    
    console.log(`\nSeeding page: "${pageData.title}"...`);
    
    // Insert the page into the `pages` table
    const pageInsertResult = await client.query(
      `INSERT INTO pages (slug, title, meta_description, status, published_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [pageData.slug, pageData.title, pageData.meta_description, pageData.status, pageData.published_at]
    );

    const pageId = pageInsertResult.rows[0].id;
    console.log(`  - Inserted page with ID: ${pageId}`);
    
    // Insert topics and associate them with the page
    for (const topicName of pageData.topics) {
        const topicId = await upsertTopic(client, topicName);
        await client.query(
            `INSERT INTO page_topics (page_id, topic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [pageId, topicId]
        );
        console.log(`  - Associated with topic: "${topicName}" (ID: ${topicId})`);
    }

    // Read the content cards from the associated JSON file
    const cards = await readJsonFile(pageData.jsonData);

    let orderCounter = 0; // To maintain the order of blocks on the page

    // Loop through each "card" in the JSON file

    for (const card of cards) {
      console.log(`  - Processing card: "${card.title}"`);
      
      // Insert the card title as a heading
      await client.query(
        `INSERT INTO content_blocks (page_id, type, content_data, order_on_page)
         VALUES ($1, 'heading_h2', $2, $3)`,
        [pageId, JSON.stringify({ text: card.title }), orderCounter++]
      );
      
      // Insert the image if it exists
      if (card.img_src) {
        await client.query(
            `INSERT INTO content_blocks (page_id, type, content_data, order_on_page)
             VALUES ($1, 'image', $2, $3)`,
            [pageId, JSON.stringify({ image_path: card.img_src, alt_text: card.img_alt }), orderCounter++]
        );
      }
      
      // Insert the description blocks
      for (const block of card.description) {
        await client.query(
          `INSERT INTO content_blocks (page_id, type, content_data, order_on_page)
           VALUES ($1, $2, $3, $4)`,
          [pageId, block.type, JSON.stringify(block), orderCounter++]
        );
      }
      
      // Insert the main content blocks
      if (card.content.type === 'structured_card') {
        for (const structuredCard of card.content.structured_card) {
          await client.query(
            `INSERT INTO structured_cards (page_id, card_title, card_description, items, img_src, img_alt, order_on_page)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [pageId, structuredCard.title, structuredCard.description, JSON.stringify(structuredCard.items || []), structuredCard.img_src || null, structuredCard.img_alt || null, orderCounter++]
          );
        }
      }
      for (const block of card.content) {
        await client.query(
          `INSERT INTO content_blocks (page_id, type, content_data, order_on_page)
           VALUES ($1, $2, $3, $4)`,
          [pageId, block.type, JSON.stringify(block), orderCounter++]
        );
      }
      
      // Insert the footer link as a paragraph
      if (card.footer) {
        const footerText = `Read more: <a href="${card.footer}">Explore further</a>`;
        await client.query(
          `INSERT INTO content_blocks (page_id, type, content_data, order_on_page)
           VALUES ($1, 'paragraph', $2, $3)`,
          [pageId, JSON.stringify({ text: footerText }), orderCounter++]
        );
      }
    }
    
      console.log(`✅ Successfully seeded page: "${pageData.title}" with ID: ${pageId}`);
    }
    // --- END OF SEEDING A SINGLE PAGE ---

    await client.query('COMMIT');
    console.log('\n✅ Transaction committed. Database seeded successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ An error occurred. Transaction rolled back.');
    console.error(error);
  } finally {
    client.release();
    await pool.end();
    console.log('👋 Database connection closed.');
  }
}

// // Run the main function
// main().catch(console.error);

