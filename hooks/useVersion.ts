// hooks/useVersion.ts
import { useState, useEffect } from "react";
import { getGitHubApiUrl, getGitHubHeaders, extractVersion, GITHUB_CONFIG } from "../config/github";

interface VersionInfo {
  version: string;
  commitMessage: string;
  commitDate: string;
  commitHash: string;
  loading: boolean;
  error: string | null;
}

export function useVersion(): VersionInfo {
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({
    version: "Loading...",
    commitMessage: "",
    commitDate: "",
    commitHash: "",
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchVersion() {
      try {
        // Pobierz ostatni commit z GitHub API
        const url = getGitHubApiUrl(`/commits/${GITHUB_CONFIG.BRANCH}`);
        const response = await fetch(url, {
          headers: getGitHubHeaders(),
        });

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const data = await response.json();
        const commitMessage = data.commit.message;
        const commitDate = data.commit.author.date;
        const commitHash = data.sha.substring(0, 7);

        // Wyciągnij numer wersji z commit message
        const version = extractVersion(commitMessage) || "Unknown";

        setVersionInfo({
          version,
          commitMessage,
          commitDate: new Date(commitDate).toLocaleDateString("pl-PL"),
          commitHash,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching version:", error);
        setVersionInfo({
          version: "3.2.0", // Fallback version
          commitMessage: "",
          commitDate: new Date().toLocaleDateString("pl-PL"),
          commitHash: "",
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    fetchVersion();
  }, []);

  return versionInfo;
}