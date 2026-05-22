/** Demo listing agents / agencies — powers the public leaderboard rivalry. */
export const DEMO_AGENCIES = [
  {
    agency: "Belle Property · Eastern Suburbs",
    name: "Aisha Chen",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80",
    brand: "#FB7185",
  },
  {
    agency: "Ray White · Double Bay",
    name: "James Morrison",
    photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80",
    brand: "#FACC15",
  },
  {
    agency: "McGrath · Paddington",
    name: "Sophie Walsh",
    photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80",
    brand: "#60A5FA",
  },
  {
    agency: "Laing+Simmons · Bondi",
    name: "Marcus Reid",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
    brand: "#34D399",
  },
  {
    agency: "Raine & Horne · Coogee",
    name: "Priya Nair",
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    brand: "#A78BFA",
  },
  {
    agency: "Stone · Bronte",
    name: "Tom Fletcher",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    brand: "#F472B6",
  },
];

/** Deterministic agent assignment when a property has no explicit agent. */
export function getListingAgent(property) {
  if (property?.agent?.name) {
    return {
      name: property.agent.name,
      agency: property.agent.agency || "Independent",
      photo: property.agent.photo || DEMO_AGENCIES[0].photo,
      brand: "#FB7185",
    };
  }
  const idx = Math.abs((property?.id || 0) * 7 + 3) % DEMO_AGENCIES.length;
  return DEMO_AGENCIES[idx];
}
