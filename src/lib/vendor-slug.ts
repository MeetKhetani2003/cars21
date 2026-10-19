export function vendorSlug(businessName: string, id: string) {
  const name = businessName.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'car-dealer';
  return `${name}-${id.slice(-6).toLowerCase()}`;
}
