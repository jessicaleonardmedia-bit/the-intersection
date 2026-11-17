// Coming up: the list of approved and scheduled social posts for the crew page.
// Reads the Notion Posts database with a read-only key kept in Netlify settings
// (NOTION_TOKEN and NOTION_POSTS_DB). Only logged-in crew with a role can see it.
// It sends titles, dates, pillar, content type, platforms, the approved caption,
// the alt text and an image preview if the post has one.
// Never drafts: only Approved and Scheduled posts are sent.

const ALLOWED_ROLES = ['Executive Producer', 'Content Admin', 'Volunteer'];
const SHOWN_STATUSES = ['Approved', 'Scheduled'];

function reply(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
    body: JSON.stringify(body),
  };
}

function read(prop) {
  if (!prop) return '';
  switch (prop.type) {
    case 'title': return prop.title.map((t) => t.plain_text).join('');
    case 'rich_text': return prop.rich_text.map((t) => t.plain_text).join('');
    case 'select': return prop.select ? prop.select.name : '';
    case 'status': return prop.status ? prop.status.name : '';
    case 'multi_select': return prop.multi_select.map((o) => o.name);
    case 'date': return prop.date && prop.date.start ? prop.date.start.slice(0, 10) : '';
    default: return '';
  }
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif)$/i;

function isImage(url) {
  try { return IMAGE_EXT.test(decodeURIComponent(new URL(url).pathname)); } catch (e) { return false; }
}

// Image links from the "Photos or videos" field, whether it's a files field or a link.
function imagesFromProp(prop) {
  if (!prop) return [];
  if (prop.type === 'files') {
    return prop.files.map((f) => (f.type === 'file' ? f.file.url : f.external && f.external.url)).filter(Boolean);
  }
  if (prop.type === 'url' && prop.url) return [prop.url];
  if (prop.type === 'rich_text') {
    return prop.rich_text.map((t) => t.href || (t.text && t.text.link && t.text.link.url)).filter(Boolean);
  }
  return [];
}

const TEXT_TYPES = ['paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item',
  'numbered_list_item', 'quote', 'callout', 'toggle'];

// Reads a post's page body: the caption (the section under any heading with "caption"
// in it, or the text before "Alt text" if there are no headings), the alt text, and
// any images placed in the page.
async function bodyFor(pageId, token) {
  const empty = { caption: '', alt: '', images: [] };
  const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28' },
  });
  if (!res.ok) return empty;
  const data = await res.json();

  const images = data.results
    .filter((b) => b.type === 'image')
    .map((b) => (b.image.type === 'file' ? b.image.file.url : b.image.external && b.image.external.url))
    .filter(Boolean);

  const blocks = data.results
    .filter((b) => TEXT_TYPES.includes(b.type))
    .map((b) => ({
      heading: b.type.startsWith('heading'),
      text: (b[b.type].rich_text || []).map((t) => t.plain_text).join('').trim(),
    }));

  const hasHeadings = blocks.some((b) => b.heading);
  const caption = [];
  const alt = [];
  let section = hasHeadings ? '' : 'caption';
  for (const b of blocks) {
    if (b.heading) {
      section = /caption/i.test(b.text) ? 'caption' : /alt text/i.test(b.text) ? 'alt' : '';
      continue;
    }
    if (!hasHeadings && /^alt text/i.test(b.text)) {
      section = 'alt';
      const rest = b.text.replace(/^alt text:?\s*/i, '');
      if (rest) alt.push(rest);
      continue;
    }
    if (!b.text) continue;
    if (section === 'caption') caption.push(b.text);
    if (section === 'alt') alt.push(b.text);
  }
  return { caption: caption.join('\n\n'), alt: alt.join(' '), images };
}

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) return reply(401, { error: 'login' });

  const roles = (user.app_metadata && user.app_metadata.roles) || [];
  if (!roles.some((r) => ALLOWED_ROLES.includes(r))) return reply(403, { error: 'role' });

  const token = process.env.NOTION_TOKEN;
  const db = process.env.NOTION_POSTS_DB;
  if (!token || !db) return reply(500, { error: 'settings' });

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne' }).format(new Date());
  const pages = [];
  let cursor;

  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${db}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { property: 'Post date', date: { on_or_after: today } },
        sorts: [{ property: 'Post date', direction: 'ascending' }],
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    });
    if (!res.ok) {
      console.error('Notion said', res.status, await res.text());
      return reply(502, { error: 'notion' });
    }
    const data = await res.json();
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor && pages.length < 300);

  const posts = pages
    .map((page) => {
      const p = page.properties;
      const platforms = read(p['Platforms']);
      return {
        id: page.id,
        title: read(Object.values(p).find((x) => x.type === 'title')),
        date: read(p['Post date']),
        status: read(p['Status']),
        pillar: read(p['Pillar']),
        contentType: read(p['Content type']),
        platforms: Array.isArray(platforms) ? platforms : platforms ? [platforms] : [],
        media: imagesFromProp(p['Photos or videos']),
      };
    })
    .filter((post) => SHOWN_STATUSES.includes(post.status))
    .map(({ status, ...rest }) => rest);

  await Promise.all(posts.map(async (post) => {
    const body = await bodyFor(post.id, token);
    post.caption = body.caption;
    post.alt = body.alt;
    post.image = post.media.concat(body.images).find(isImage) || '';
    delete post.id;
    delete post.media;
  }));

  return reply(200, { posts });
};
