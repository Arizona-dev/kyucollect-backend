import axios from "axios";
import { logger } from "../../utils/logger";

interface InseeEstablishment {
  siret: string;
  uniteLegale: {
    denominationUniteLegale?: string;
    nomUniteLegale?: string;
    prenomUsuelUniteLegale?: string;
  };
  adresseEtablissement: {
    numeroVoieEtablissement?: string;
    typeVoieEtablissement?: string;
    libelleVoieEtablissement?: string;
    codePostalEtablissement?: string;
    libelleCommuneEtablissement?: string;
  };
  periodesEtablissement: Array<{
    etatAdministratifEtablissement: string;
  }>;
}

interface InseeApiResponse {
  etablissement: InseeEstablishment;
}

export interface BusinessInfo {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  isActive: boolean;
}

export class InseeService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = process.env.INSEE_API_URL || "https://api.insee.fr/api-sirene/3.11";
    this.apiKey = process.env.INSEE_API_KEY || "";

    if (!this.apiKey) {
      logger.warn("INSEE API key not configured");
    }
  }

  /**
   * Fetch establishment data from INSEE SIRENE API
   * @param siret - The 14-digit SIRET number
   * @returns Business information or null if not found
   */
  async fetchSiretData(siret: string): Promise<BusinessInfo | null> {
    try {
      // Validate SIRET format
      const cleanSiret = siret.replace(/\s/g, "");
      if (!/^\d{14}$/.test(cleanSiret)) {
        throw new Error("SIRET invalide");
      }

      if (!this.apiKey) {
        throw new Error("INSEE API key not configured");
      }

      // Call INSEE API
      const response = await axios.get<InseeApiResponse>(
        `${this.apiUrl}/siret/${cleanSiret}`,
        {
          headers: {
            "X-INSEE-Api-Key-Integration": this.apiKey,
            "Accept": "application/json",
          },
        }
      );

      const etablissement = response.data.etablissement;

      // Check if establishment is active
      const isActive = etablissement.periodesEtablissement?.[0]?.etatAdministratifEtablissement === "A";

      // Extract business name (can be company name or individual name)
      let businessName = etablissement.uniteLegale.denominationUniteLegale || "";

      if (!businessName && etablissement.uniteLegale.nomUniteLegale) {
        // For individual entrepreneurs
        const nom = etablissement.uniteLegale.nomUniteLegale;
        const prenom = etablissement.uniteLegale.prenomUsuelUniteLegale || "";
        businessName = `${prenom} ${nom}`.trim();
      }

      // Build street address
      const addr = etablissement.adresseEtablissement;
      const streetParts = [
        addr.numeroVoieEtablissement,
        addr.typeVoieEtablissement,
        addr.libelleVoieEtablissement,
      ].filter(Boolean);

      const street = streetParts.join(" ");

      return {
        name: businessName,
        street: street,
        postalCode: addr.codePostalEtablissement || "",
        city: addr.libelleCommuneEtablissement || "",
        isActive,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error("SIRET non trouvé");
      }

      logger.error("Error fetching INSEE data:", error);
      throw new Error("Erreur lors de la récupération des données");
    }
  }
}
