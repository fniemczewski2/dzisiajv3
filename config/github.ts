// config/github.ts
export const GITHUB_CONFIG = {
  OWNER: "fniemczewski2", 
  REPO: "dzisiajv3", 
  BRANCH: "main",
  COMMITS_PER_PAGE: 1,
  TOKEN: "",
};

export function getGitHubApiUrl(endpoint: string): string {
  return `https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}${endpoint}`;
}

export function getGitHubHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
  };

  if (GITHUB_CONFIG.TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_CONFIG.TOKEN}`;
  }

  return headers;
}

export function extractVersion(commitMessage: string): string | null {
  const versionMatch = commitMessage.match(/Ver\s*(\d+\.\d+\.\d+)/i);
  return versionMatch ? versionMatch[1] : null;
}

export function isConfigValid(): boolean {
  return (
    GITHUB_CONFIG.OWNER !== "your-username" &&
    GITHUB_CONFIG.REPO !== "dzisiaj-v3" &&
    GITHUB_CONFIG.OWNER.length > 0 &&
    GITHUB_CONFIG.REPO.length > 0
  );
}