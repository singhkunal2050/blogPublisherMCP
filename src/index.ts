import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { GitHubClient } from './github.js';
import { generateFilename, createBlogPostContent } from './blog-utils.js';
import { PublishBlogPostArgs, UpdateBlogPostArgs, DeleteBlogPostArgs } from './types.js';
import { TOOLS } from './constants.js';

class BlogPublisherServer {
  private server: Server;
  private github: GitHubClient;

  constructor() {
    // MCP Server initialization with metadata
    this.server = new Server({
      name: "blog-publisher",
      version: "1.0.0",
    });

    const githubToken = process.env.GITHUB_TOKEN || "";
    const repoOwner = process.env.REPO_OWNER || "";
    const repoName = process.env.REPO_NAME || "";

    if (!githubToken) {
      throw new Error("GITHUB_TOKEN environment variable is required");
    }
    if (!repoOwner || !repoName) {
      throw new Error("REPO_OWNER and REPO_NAME environment variables are required");
    }

    this.github = new GitHubClient(githubToken, repoOwner, repoName);
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // MCP: Handle ListTools request - tells clients what tools are available
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    // MCP: Handle CallTool request - routes tool calls to appropriate handlers
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case "publish_blog_post":
          return await this.publishBlogPost(request.params.arguments as unknown as PublishBlogPostArgs);
        case "list_blog_posts":
          return await this.listBlogPosts();
        case "update_blog_post":
          return await this.updateBlogPost(request.params.arguments as unknown as UpdateBlogPostArgs);
        case "delete_blog_post":
          return await this.deleteBlogPost(request.params.arguments as unknown as DeleteBlogPostArgs);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  private async publishBlogPost(args: PublishBlogPostArgs) {
    try {
      const { title, content, filename, tags, description, author, image, imageAlt, readTime } = args;

      const blogFilename = filename ? `${filename}.md` : `${generateFilename(title)}.md`;
      const blogPath = `src/blog/${blogFilename}`;

      const exists = await this.github.fileExists(blogPath);
      if (exists) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Blog post with filename "${blogFilename}" already exists. Use update_blog_post to modify it.`
        );
      }

      const fullContent = createBlogPostContent(
        { title, description, tags, author, image, imageAlt, readTime },
        content
      );

      const response = await this.github.createFile(
        blogPath,
        fullContent,
        `Add new blog post: ${title}`
      );

      // MCP: Tool response must have a 'content' array with type/text objects
      return {
        content: [
          {
            type: "text",
            text: `Successfully published blog post "${title}" to ${blogPath}.

Commit SHA: ${response.commit.sha}
File URL: ${response.content.html_url}

The build should be triggered automatically.`,
          },
        ],
      };
    } catch (error: any) {
      if (error instanceof McpError) {
        throw error;
      }
      // MCP: Use McpError for consistent error handling across the protocol
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to publish blog post: ${error.response?.data?.message || error.message}`
      );
    }
  }

  private async listBlogPosts() {
    try {
      const files = await this.github.listFiles('src/blog');

      const markdownFiles = files
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

  private async updateBlogPost(args: UpdateBlogPostArgs) {
    try {
      const { filename, title, content, tags, description, author, image, imageAlt, readTime } = args;
      const blogPath = `src/blog/${filename}`;

      if (!content) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'Content is required for updates in this version'
        );
      }

      const existingFile = await this.github.getFile(blogPath);

      const fullContent = createBlogPostContent(
        { title: title || 'Updated Post', description, tags, author, image, imageAlt, readTime },
        content
      );

      const response = await this.github.updateFile(
        blogPath,
        fullContent,
        `Update blog post: ${filename}`,
        existingFile.sha
      );

      return {
        content: [
          {
            type: "text",
            text: `Successfully updated blog post "${filename}".
            
Commit SHA: ${response.commit.sha}
File URL: ${response.content.html_url}

The build should be triggered automatically.`,
          },
        ],
      };
    } catch (error: any) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to update blog post: ${error.response?.data?.message || error.message}`
      );
    }
  }

  private async deleteBlogPost(args: DeleteBlogPostArgs) {
    try {
      const { filename } = args;
      const blogPath = `src/blog/${filename}`;

      const existingFile = await this.github.getFile(blogPath);

      await this.github.deleteFile(
        blogPath,
        `Delete blog post: ${filename}`,
        existingFile.sha
      );

      return {
        content: [
          {
            type: "text",
            text: `Successfully deleted blog post "${filename}".

The build should be triggered automatically.`,
          },
        ],
      };
    } catch (error: any) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to delete blog post: ${error.response?.data?.message || error.message}`
      );
    }
  }

  async run() {
    // MCP: Use stdio transport for communication with the client
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // Log to stderr to avoid polluting stdio channel
    console.error("Blog Publisher MCP server running on stdio");
  }
}

const server = new BlogPublisherServer();
server.run().catch(console.error);