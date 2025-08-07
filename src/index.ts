import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance } from "axios";

interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
}

interface GitHubCreateFileResponse {
  content: {
    name: string;
    path: string;
    sha: string;
    size: number;
    url: string;
    html_url: string;
    git_url: string;
    download_url: string;
    type: string;
  };
  commit: {
    sha: string;
    node_id: string;
    url: string;
    html_url: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
}

class BlogPublisherServer {
  private server: Server;
  private github: AxiosInstance;
  private repoOwner: string;
  private repoName: string;

  constructor() {
    this.server = new Server({
      name: "blog-publisher",
      version: "1.0.0",
    });

    // Initialize GitHub API client
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error("GITHUB_TOKEN environment variable is required");
    }

    this.github = axios.create({
      baseURL: "https://api.github.com",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "blog-publisher-mcp/1.0.0",
      },
    });

    // Get repo details from environment
    this.repoOwner = process.env.REPO_OWNER || "";
    this.repoName = process.env.REPO_NAME || "";

    if (!this.repoOwner || !this.repoName) {
      throw new Error("REPO_OWNER and REPO_NAME environment variables are required");
    }

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
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
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case "publish_blog_post":
          return await this.publishBlogPost(request.params.arguments);
        case "list_blog_posts":
          return await this.listBlogPosts();
        case "update_blog_post":
          return await this.updateBlogPost(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  private generateFilename(title: string): string {
    // Generate a URL-friendly filename from title
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove duplicate hyphens
      .trim();
  }

  private formatFrontmatter(metadata: {
    title: string;
    description?: string;
    tags?: string[];
    date?: string;
    author?: string;
    image?: string;
    imageAlt?: string;
    readTime?: string;
  }): string {
    const frontmatter = ['---'];
    frontmatter.push(`title: ${metadata.title}`);
    
    if (metadata.author) {
      frontmatter.push(`author: ${metadata.author}`);
    }
    
    if (metadata.description) {
      frontmatter.push(`description: ${metadata.description}`);
    }
    
    metadata.tags = [...(metadata.tags || []), 'post'];
    
    if (metadata.tags && metadata.tags.length > 0) {
      frontmatter.push(`tags:`);
      metadata.tags.forEach(tag => {
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

  private async publishBlogPost(args: any) {
    try {
      const { title, content, filename, tags, description, author, image, imageAlt, readTime } = args;
      
      const blogFilename = filename ? `${filename}.md` : `${this.generateFilename(title)}.md`;
      const blogPath = `src/blog/${blogFilename}`;

      // Check if file already exists
      try {
        await this.github.get(`/repos/${this.repoOwner}/${this.repoName}/contents/${blogPath}`);
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Blog post with filename "${blogFilename}" already exists. Use update_blog_post to modify it.`
        );
      } catch (error: any) {
        // File doesn't exist, which is what we want for publishing a new post
        if (error.response?.status !== 404) {
          throw error;
        }
      }

      // Create the full blog post content with frontmatter
      const frontmatter = this.formatFrontmatter({
        title,
        description,
        tags,
        author,
        image,
        imageAlt,
        readTime,
      });
      
      const fullContent = frontmatter + content;

      // Create the file
      const response = await this.github.put<GitHubCreateFileResponse>(
        `/repos/${this.repoOwner}/${this.repoName}/contents/${blogPath}`,
        {
          message: `Add new blog post: ${title}`,
          content: Buffer.from(fullContent).toString('base64'),
        }
      );

      return {
        content: [
          {
            type: "text",
            text: `Successfully published blog post "${title}" to ${blogPath}. 
            
Commit SHA: ${response.data.commit.sha}
File URL: ${response.data.content.html_url}

The build should be triggered automatically.`,
          },
        ],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to publish blog post: ${error.response?.data?.message || error.message}`
      );
    }
  }

  private async listBlogPosts() {
    try {
      const response = await this.github.get<GitHubFile[]>(
        `/repos/${this.repoOwner}/${this.repoName}/contents/src/blog`
      );

      const markdownFiles = response.data
        .filter((file) => file.type === 'file' && file.name.endsWith('.md'))
        .map((file) => ({
          name: file.name,
          path: file.path,
          url: file.html_url,
          size: file.size,
        }));

      return {
        content: [
          {
            type: "text",
            text: `Found ${markdownFiles.length} blog posts:\n\n${markdownFiles
              .map((file) => `- ${file.name} (${file.size} bytes)`)
              .join('\n')}`,
          },
        ],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list blog posts: ${error.response?.data?.message || error.message}`
      );
    }
  }

  private async updateBlogPost(args: any) {
    try {
      const { filename, title, content, tags, description, author, image, imageAlt, readTime } = args;
      const blogPath = `src/blog/${filename}`;

      // Get existing file to obtain its SHA
      const existingFileResponse = await this.github.get(
        `/repos/${this.repoOwner}/${this.repoName}/contents/${blogPath}`
      );

      const existingFile = existingFileResponse.data as GitHubFile & { sha: string };

      // If we have new content, create the full blog post with frontmatter
      let fullContent: string;
      if (content) {
        const frontmatter = this.formatFrontmatter({
          title: title || 'Updated Post',
          description,
          tags,
          author,
          image,
          imageAlt,
          readTime,
        });
        fullContent = frontmatter + content;
      } else {
        // If no new content provided, just update the existing content
        // (This would typically involve parsing existing frontmatter, but for v0 we'll require content)
        throw new McpError(
          ErrorCode.InvalidRequest,
          'Content is required for updates in this version'
        );
      }

      // Update the file
      const response = await this.github.put<GitHubCreateFileResponse>(
        `/repos/${this.repoOwner}/${this.repoName}/contents/${blogPath}`,
        {
          message: `Update blog post: ${filename}`,
          content: Buffer.from(fullContent).toString('base64'),
          sha: existingFile.sha,
        }
      );

      return {
        content: [
          {
            type: "text",
            text: `Successfully updated blog post "${filename}".
            
Commit SHA: ${response.data.commit.sha}
File URL: ${response.data.content.html_url}

The build should be triggered automatically.`,
          },
        ],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to update blog post: ${error.response?.data?.message || error.message}`
      );
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Blog Publisher MCP server running on stdio");
  }
}

const server = new BlogPublisherServer();
server.run().catch(console.error);