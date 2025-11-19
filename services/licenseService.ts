import { useState, useEffect } from 'react';

// Structure of our license data on GitHub
export interface LicenseKey {
  key: string;
  isActive: boolean;
  owner: string;
  expirationDate?: string;
}

interface LicenseDatabase {
  licenses: LicenseKey[];
}

// Placeholder URL - The user will need to replace this with their actual raw GitHub file URL
// Example: https://raw.githubusercontent.com/username/repo/main/licenses.json
const LICENSE_DB_URL = 'https://raw.githubusercontent.com/KNIGHTABDO/eurospin-data-/main/licenses.json';
const LOCAL_STORAGE_KEY = 'neurospin_license_data';

// ⚠️ SECURITY WARNING: Replace this with your GitHub Personal Access Token.
// It must have 'repo' scope (or 'public_repo' if public).
// Since this is a client-side app, this token will be visible to anyone who decompiles the code.
export const GITHUB_TOKEN = 'YOUR_GITHUB_TOKEN_HERE'; 
const REPO_OWNER = 'KNIGHTABDO';
const REPO_NAME = 'eurospin-data-';
const FILE_PATH = 'licenses.json';

interface SavedLicense {
  key: string;
  owner: string;
  deviceId: string;
  activationDate: string;
}

// Generate a simple random device ID (in a real app, use node-machine-id)
const getDeviceId = () => {
  let id = localStorage.getItem('neurospin_device_id');
  if (!id) {
    id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('neurospin_device_id', id);
  }
  return id;
};

export const getSavedLicense = (): SavedLicense | null => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  return data ? JSON.parse(data) : null;
};

export const saveLicense = (key: string, owner: string) => {
  const data: SavedLicense = {
    key,
    owner,
    deviceId: getDeviceId(),
    activationDate: new Date().toISOString()
  };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
};

export const clearLicense = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
};

export const invalidateRemoteLicense = async (keyToInvalidate: string) => {
  if (GITHUB_TOKEN.includes('YOUR_GITHUB_TOKEN')) {
     console.warn("GitHub Token not set. Skipping remote invalidation.");
     return;
  }

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
  
  // 1. Get current file to get SHA
  const getRes = await fetch(url, {
      headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` }
  });
  if (!getRes.ok) throw new Error("Failed to fetch file info from GitHub");
  
  const fileData = await getRes.json();
  // Decode Base64 content
  const currentContent = JSON.parse(atob(fileData.content));
  
  // 2. Update the specific license
  let found = false;
  const updatedLicenses = currentContent.licenses.map((l: LicenseKey) => {
      if (l.key === keyToInvalidate) {
          found = true;
          return { ...l, isActive: false, owner: l.owner + ' (ACTIVATED)' };
      }
      return l;
  });

  if (!found) return;
  
  // Encode back to Base64
  const newContentBase64 = btoa(JSON.stringify({ licenses: updatedLicenses }, null, 2));

  // 3. Commit changes
  const putRes = await fetch(url, {
      method: 'PUT',
      headers: { 
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          message: `License Activation: ${keyToInvalidate}`,
          content: newContentBase64,
          sha: fileData.sha
      })
  });

  if (!putRes.ok) throw new Error("Failed to update license on GitHub");
};

export const verifyLicenseKey = async (inputKey: string): Promise<{ valid: boolean; message: string; owner?: string }> => {
  try {
    const response = await fetch(LICENSE_DB_URL, { cache: 'no-store' });
    
    if (!response.ok) {
        throw new Error("Impossible de contacter le serveur de licences.");
    }

    const data: LicenseDatabase = await response.json();
    const license = data.licenses.find(l => l.key === inputKey);

    if (!license) {
      return { valid: false, message: "Clé de licence invalide." };
    }

    if (!license.isActive) {
      return { valid: false, message: "Cette licence a été désactivée ou a expiré." };
    }

    // NOTE: In a full implementation with a backend, we would send a POST request here
    // to "burn" the key (set isActive: false) and associate it with getDeviceId().
    // Since we are using a static GitHub file, we cannot modify it from the client.
    // The "One Device" restriction is currently enforced by the local storage check below.

    return { valid: true, message: "Licence valide.", owner: license.owner };

  } catch (error) {
    console.error("License check failed", error);
    return { valid: false, message: "Erreur de connexion au serveur de licence. Vérifiez votre internet." };
  }
};
