import axios, { AxiosInstance } from 'axios';
import { GitHubFile, GitHubCreateFileResponse } from './types.js';

// Wrapper for GitHub API operations
export class GitHubClient {
  private client: AxiosInstance;
  private repoOwner: string;
  private repoName: string;

  constructor(token: string, repoOwner: string, repoName: string) {
    if (!token) {
      throw new Error('GitHub token is required');
    }
    if (!repoOwner || !repoName) {
      throw new Error('Repository owner and name are required');
    }

    this.repoOwner = repoOwner;
    this.repoName = repoName;

    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'blog-publisher-mcp/1.0.0',
      },
    });
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await this.client.get(`/repos/${this.repoOwner}/${this.repoName}/contents/${path}`);
      return true;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  async getFile(path: string): Promise<GitHubFile & { sha: string }> {
    const response = await this.client.get(
      `/repos/${this.repoOwner}/${this.repoName}/contents/${path}`
    );
    return response.data;
  }

  async createFile(path: string, content: string, message: string): Promise<GitHubCreateFileResponse> {
    const response = await this.client.put<GitHubCreateFileResponse>(
      `/repos/${this.repoOwner}/${this.repoName}/contents/${path}`,
      {
        message,
        content: Buffer.from(content).toString('base64'),
      }
    );
    return response.data;
  }

  async updateFile(path: string, content: string, message: string, sha: string): Promise<GitHubCreateFileResponse> {
    const response = await this.client.put<GitHubCreateFileResponse>(
      `/repos/${this.repoOwner}/${this.repoName}/contents/${path}`,
      {
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
      }
    );
    return response.data;
  }

  async listFiles(path: string): Promise<GitHubFile[]> {
    const response = await this.client.get<GitHubFile[]>(
      `/repos/${this.repoOwner}/${this.repoName}/contents/${path}`
    );
    return response.data;
  }
}

