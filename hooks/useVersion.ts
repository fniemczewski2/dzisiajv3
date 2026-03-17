// hooks/useVersion.ts
import { useState, useEffect } from "react";
import {
  getGitHubApiUrl,
  getGitHubHeaders,
  extractVersion,
  GITHUB_CONFIG,
} from "../config/github";

interface VersionInfo {
  version: string;
  commitMessage: string;
  commitDate: string;
  commitHash: string;
  loading: boolean;
  error: string | null;
}

const INITIAL_STATE: VersionInfo = {
  version: "Loading...",
  commitMessage: "",
  commitDate: "",
  commitHash: "",
  loading: true,
  error: null,
};

export function useVersion(): VersionInfo {
  const [versionInfo, setVersionInfo] = useState<VersionInfo>(INITIAL_STATE);

  useEffect(() => {
    async function fetchVersion() {
      try {
        const url = getGitHubApiUrl(`/commits/${GITHUB_CONFIG.BRANCH}`);
        const response = await fetch(url, { headers: getGitHubHeaders() });

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const data = await response.json();
        const commitMessage: string = data.commit.message;
        const commitDate: string = data.commit.author.date;
        const commitHash: string = data.sha.substring(0, 7);

        setVersionInfo({
          version: extractVersion(commitMessage) || "Unknown",
          commitMessage,
          commitDate: new Date(commitDate).toLocaleDateString("pl-PL"),
          commitHash,
          loading: false,
          error: null,
        });
      } catch (error) {
        setVersionInfo({
          version: "Unknown",
          commitMessage: "",
          commitDate: new Date().toLocaleDateString("pl-PL"),
          commitHash: "",
          loading: false,
          error: error instanceof Error ? error.message : "Nieznany błąd",
        });
      }
    }

    fetchVersion();
  }, []);

  return versionInfo;
}