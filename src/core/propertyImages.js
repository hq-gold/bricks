/** Hero image URLs keyed by property id — shared by cards, gallery, and share hub. */
const IMAGE_URLS = {
  1:  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=80",
  2:  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=80",
  3:  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80",
  4:  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80",
  11: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=900&q=80",
  12: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&q=80",
  13: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=900&q=80",
  14: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=900&q=80",
  15: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=900&q=80",
  21: "https://images.unsplash.com/photo-1599809275671-b5942cabc7a2?w=900&q=80",
  22: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=900&q=80",
  23: "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=900&q=80",
  24: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=900&q=80",
  31: "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=900&q=80",
  32: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=80",
  33: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=900&q=80",
  34: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&q=80",
  35: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=900&q=80",
  36: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&q=80",
  37: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=900&q=80",
  38: "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=900&q=80",
  39: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=80",
  40: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80",
  41: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=900&q=80",
  42: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=80",
  43: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=900&q=80",
  51: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=900&q=80",
  52: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80",
  53: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=80",
};

export function getPropertyHeroImage(property) {
  if (property?.gallery?.length) return property.gallery[0];
  if (property?.heroImage) return property.heroImage;
  return IMAGE_URLS[property?.id] || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=80";
}

/** Up to 4 gallery shots — uses property.gallery when provided. */
export function getPropertyGalleryImages(property) {
  if (property?.gallery?.length) {
    const g = property.gallery;
    if (g.length >= 4) return g.slice(0, 4);
    return [...g, ...g.slice(1)].slice(0, 4);
  }
  return null;
}

export function fmtPrice(price) {
  if (!price) return "—";
  const k = Math.round(price / 1000);
  return k >= 1000 ? `$${(k / 1000).toFixed(2)}M` : `$${k.toLocaleString()}k`;
}
