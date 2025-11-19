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

    return { valid: true, message: "Licence valide.", owner: license.owner };

  } catch (error) {
    console.error("License check failed", error);
    return { valid: false, message: "Erreur de connexion au serveur de licence. Vérifiez votre internet." };
  }
};
