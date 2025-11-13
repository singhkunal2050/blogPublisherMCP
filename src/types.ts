export interface GitHubFile {
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

export interface GitHubCreateFileResponse {
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

export interface BlogPostMetadata {
  title: string;
  description?: string;
  tags?: string[];
  date?: string;
  author?: string;
  image?: string;
  imageAlt?: string;
  readTime?: string;
}

export interface PublishBlogPostArgs {
  title: string;
  content: string;
  filename?: string;
  tags?: string[];
  description?: string;
  author?: string;
  image?: string;
  imageAlt?: string;
  readTime?: string;
}

export interface UpdateBlogPostArgs {
  filename: string;
  title?: string;
  content?: string;
  tags?: string[];
  description?: string;
  author?: string;
  image?: string;
  imageAlt?: string;
  readTime?: string;
}

export interface DeleteBlogPostArgs {
  filename: string;
}

