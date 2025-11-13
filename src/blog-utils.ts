import { BlogPostMetadata } from './types.js';

export function generateFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function formatFrontmatter(metadata: BlogPostMetadata): string {
  const frontmatter = ['---'];
  frontmatter.push(`title: ${metadata.title}`);

  if (metadata.author) {
    frontmatter.push(`author: ${metadata.author}`);
  }

  if (metadata.description) {
    frontmatter.push(`description: ${metadata.description}`);
  }

  const tags = [...(metadata.tags || []), 'post'];

  if (tags.length > 0) {
    frontmatter.push(`tags:`);
    tags.forEach(tag => {
      frontmatter.push(`  - ${tag}`);
    });
  }

  frontmatter.push(`date: ${metadata.date || new Date().toISOString()}`);

  if (metadata.image) {
    frontmatter.push(`image: ${metadata.image}`);
  }

  if (metadata.imageAlt) {
    frontmatter.push(`imageAlt: "${metadata.imageAlt}"`);
  }

  if (metadata.readTime) {
    frontmatter.push(`readTime: ${metadata.readTime}`);
  }

  frontmatter.push('---');
  frontmatter.push('');

  return frontmatter.join('\n');
}

export function createBlogPostContent(metadata: BlogPostMetadata, content: string): string {
  const frontmatter = formatFrontmatter(metadata);
  return frontmatter + content;
}

