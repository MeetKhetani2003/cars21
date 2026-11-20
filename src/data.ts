export type Car = {
  id: string; make: string; model: string; variant: string; year: number; km: number;
  fuel: string; transmission: string; owners: number; price: number; city: string; area?: string; body: string;
  score: number; badge: string; image: string; accent: string; color: string;
  sellerName?: string; sellerPhone?: string; sellerWhatsApp?: string;
  vendorId?: string; vendorName?: string; vendorSlug?: string;
  inspectionReviewStatus?: string; inspection?: Record<string, unknown>; photoIds?: string[]; photos?: string[];
  documentPhotoId?: string; documentNumber?: string; documentType?: string;
  verificationStatus?: 'unverified' | 'under_verification' | 'verified' | 'rejected';
  verificationNote?: string;
  verifiedBy?: { id: string; name: string; role: string; at: string };
  addedBy?: { id: string; name: string; email?: string; role: string };
};
export const cars: Car[] = [];
export const formatINR = (amount:number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(amount);
export const formatShort = (amount:number) => amount >= 100000 ? `₹${(amount/100000).toFixed(amount%100000===0?0:1)}L` : formatINR(amount);
export const calcEmi = (principal:number, annualRate:number, months:number) => { const r=annualRate/1200; return r===0 ? principal/months : principal*r*Math.pow(1+r,months)/(Math.pow(1+r,months)-1); };
export function estimateValue(vehicle:{year?:number;km?:number;owners?:number;condition?:string}) {
  const base=720000 + Math.max(0,(vehicle.year??2020)-2018)*82000 - Math.max(0,(vehicle.km??30000)-30000)*1.25 - Math.max(0,(vehicle.owners??1)-1)*22000;
  const conditionFactor=vehicle.condition==='Excellent'?1.08:vehicle.condition==='Fair'?0.91:1;
  const midpoint=Math.max(260000,Math.round(base*conditionFactor/5000)*5000);
  return {low:Math.round(midpoint*.94/5000)*5000,midpoint,high:Math.round(midpoint*1.06/5000)*5000};
}
