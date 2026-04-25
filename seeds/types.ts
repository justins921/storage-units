// Per-client seed shape. Each client deploys its own database with one
// of these. Adding a new client = adding a new file under seeds/, no
// application code changes.

export interface SeedFacility {
  slug: string;
  name: string;
  branding: {
    hero_title?: string;
    hero_subtitle?: string;
    primary_color?: string;
    logo_url?: string;
  };
  unit_types: SeedUnitType[];
}

export interface SeedUnitType {
  name: string;
  width_ft?: number;
  length_ft?: number;
  features: string[];
  monthly_rate_cents: number;
  description?: string;
  unit_labels: string[]; // e.g. ['A1','A2','A3']
}

export interface SeedClient {
  org: { id: string; name: string; slug: string };
  facilities: SeedFacility[];
}
