
export interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  downloadUrl: string;
  releaseNotes: string;
}

interface RemoteMetadata {
  version: string;
  downloadUrl: string;
  releaseNotes: string;
  forceUpdate: boolean;
}

// Placeholder - User must update this
const METADATA_URL = 'https://raw.githubusercontent.com/stackblitz/neurospin-licenses/main/metadata.json';

// Simple semver comparison (e.g. "1.0.1" > "1.0.0")
const isNewerVersion = (oldVer: string, newVer: string): boolean => {
  const oldParts = oldVer.split('.').map(Number);
  const newParts = newVer.split('.').map(Number);
  
  for (let i = 0; i < Math.max(oldParts.length, newParts.length); i++) {
    const o = oldParts[i] || 0;
    const n = newParts[i] || 0;
    if (n > o) return true;
    if (n < o) return false;
  }
  return false;
};

export const checkForUpdates = async (currentVersion: string): Promise<UpdateInfo> => {
  try {
    const response = await fetch(METADATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error("Failed to fetch update info");
    
    const data: RemoteMetadata = await response.json();
    
    if (isNewerVersion(currentVersion, data.version)) {
      return {
        hasUpdate: true,
        latestVersion: data.version,
        downloadUrl: data.downloadUrl,
        releaseNotes: data.releaseNotes
      };
    }
    
    return { hasUpdate: false, latestVersion: currentVersion, downloadUrl: '', releaseNotes: '' };
  } catch (error) {
    console.error("Update check failed:", error);
    return { hasUpdate: false, latestVersion: currentVersion, downloadUrl: '', releaseNotes: '' };
  }
};
