import type { SeedClient } from './types';

// Chandler client seed. This file is the ONLY place Chandler-specific data
// should live. Adding a new client (e.g. seeds/yellowstone.ts) requires no
// changes to application code.
//
// org.id is a stable UUID generated at seed authoring time so reseeding
// against an existing DB doesn't proliferate org rows.

export const chandler: SeedClient = {
  org: {
    id: '00000000-0000-0000-0000-00000000c001',
    name: 'Chandler Storage Co',
    slug: 'chandler',
  },
  facilities: [
    {
      slug: 'allseasons',
      name: 'All Seasons Storage',
      branding: {
        hero_title: 'Climate-controlled storage in Chandler',
        hero_subtitle:
          'Drive-up access, 24/7 gate, month-to-month leases. Reserve online in under 2 minutes.',
        primary_color: '#0f4c81',
      },
      unit_types: [
        {
          name: '5x5',
          width_ft: 5,
          length_ft: 5,
          features: ['ground floor'],
          monthly_rate_cents: 4900,
          description: 'A small closet — fits a few boxes and a bike.',
          unit_labels: ['A1', 'A2', 'A3', 'A4'],
        },
        {
          name: '10x10',
          width_ft: 10,
          length_ft: 10,
          features: ['drive-up', 'ground floor'],
          monthly_rate_cents: 12900,
          description: 'A bedroom of furniture, comfortably.',
          unit_labels: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'],
        },
        {
          name: '10x20 climate',
          width_ft: 10,
          length_ft: 20,
          features: ['climate', 'drive-up'],
          monthly_rate_cents: 22900,
          description: 'A 1-bedroom apartment, climate-controlled.',
          unit_labels: ['C1', 'C2', 'C3'],
        },
      ],
    },
  ],
};

export default chandler;
