export const TOOLS = [
  {
    name: "publish_blog_post",
    description: "Publish a new blog post to the GitHub repository",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "The title of the blog post",
        },
        content: {
          type: "string",
          description: "The full content of the blog post in Markdown format",
        },
        filename: {
          type: "string",
          description: "The filename for the blog post (without extension). If not provided, will be generated from title",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional array of tags for the blog post",
        },
        description: {
          type: "string",
          description: "Optional description/excerpt for the blog post",
        },
        author: {
          type: "string",
          description: "Optional author name for the blog post",
        },
        image: {
          type: "string",
          description: "Optional image path for the blog post",
        },
        imageAlt: {
          type: "string",
          description: "Optional alt text for the image",
        },
        readTime: {
          type: "string",
          description: "Optional read time for the blog post (e.g., '5 Minutes ⌚')",
        },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "list_blog_posts",
    description: "List existing blog posts in the repository",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "update_blog_post",
    description: "Update an existing blog post",
    inputSchema: {
      type: "object",
      properties: {
        filename: {
          type: "string",
          description: "The filename of the blog post to update (with .md extension)",
        },
        title: {
          type: "string",
          description: "The updated title of the blog post",
        },
        content: {
          type: "string",
          description: "The updated content of the blog post in Markdown format",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Updated array of tags for the blog post",
        },
        description: {
          type: "string",
          description: "Updated description/excerpt for the blog post",
        },
        author: {
          type: "string",
          description: "Updated author name for the blog post",
        },
        image: {
          type: "string",
          description: "Updated image path for the blog post",
        },
        imageAlt: {
          type: "string",
          description: "Updated alt text for the image",
        },
        readTime: {
          type: "string",
          description: "Updated read time for the blog post",
        },
      },
      required: ["filename"],
    },
  },
] as const;

