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
const LICENSE_DB_URL = 'https://raw.githubusercontent.com/stackblitz/neurospin-licenses/main/licenses.json';

export const verifyLicenseKey = async (inputKey: string): Promise<{ valid: boolean; message: string; owner?: string }> => {
  // MOCK DATA for demonstration or fallback
  const mockData: LicenseDatabase = {
      licenses: [
          { key: "NEURO-DEMO-2025", isActive: true, owner: "Utilisateur Démo" },
          { key: "RAD-X99-PHYS", isActive: true, owner: "Dr. House" },
          { key: "STUDENT-001", isActive: false, owner: "Étudiant (Expiré)" }
      ]
  };

  try {
    let data: LicenseDatabase = mockData;

    try {
        const response = await fetch(LICENSE_DB_URL);
        if (response.ok) {
            data = await response.json();
        } else {
            console.warn("Could not fetch remote licenses, using mock data.");
        }
    } catch (netError) {
        console.warn("Network error fetching licenses, using mock data.", netError);
    }
    
    // Simulate network delay for realism if using mock
    if (data === mockData) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

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
    return { valid: false, message: "Erreur de connexion au serveur de licence." };
  }
};
