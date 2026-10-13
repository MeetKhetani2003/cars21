export type Car = {
  id: string; make: string; model: string; variant: string; year: number; km: number;
  fuel: string; transmission: string; owners: number; price: number; city: string; body: string;
  score: number; badge: string; image: string; accent: string; color: string;
  sellerName?: string; sellerPhone?: string; sellerWhatsApp?: string;
};
export const cars: Car[] = [
  { id:'civic-2022', make:'Honda', model:'City', variant:'ZX CVT', year:2022, km:18400, fuel:'Petrol', transmission:'Automatic', owners:1, price:1249000, city:'Bengaluru', body:'Sedan', score:92, badge:'Cars21 verified', image:'/images/kars21-hero.png', accent:'photo-one', color:'Silver' },
  { id:'creta-2021', make:'Hyundai', model:'Creta', variant:'SX (O) Diesel AT', year:2021, km:32600, fuel:'Diesel', transmission:'Automatic', owners:1, price:1575000, city:'Bengaluru', body:'SUV', score:89, badge:'Inspection ready', image:'/images/kars21-hero.png', accent:'photo-two', color:'Graphite' },
  { id:'nexon-2023', make:'Tata', model:'Nexon EV', variant:'XZ+ Lux', year:2023, km:12100, fuel:'Electric', transmission:'Automatic', owners:1, price:1460000, city:'Pune', body:'Electric', score:95, badge:'Battery report', image:'/images/kars21-hero.png', accent:'photo-three', color:'White' },
  { id:'baleno-2022', make:'Maruti Suzuki', model:'Baleno', variant:'Alpha AGS', year:2022, km:21800, fuel:'Petrol', transmission:'Automatic', owners:1, price:795000, city:'Mumbai', body:'Hatchback', score:91, badge:'Cars21 verified', image:'/images/kars21-hero.png', accent:'photo-four', color:'Blue' },
  { id:'seltos-2020', make:'Kia', model:'Seltos', variant:'HTX Plus', year:2020, km:45200, fuel:'Petrol', transmission:'Manual', owners:2, price:1190000, city:'Delhi NCR', body:'SUV', score:87, badge:'Inspection ready', image:'/images/kars21-hero.png', accent:'photo-five', color:'Red' },
  { id:'virtus-2023', make:'Volkswagen', model:'Virtus', variant:'Highline Plus AT', year:2023, km:9500, fuel:'Petrol', transmission:'Automatic', owners:1, price:1485000, city:'Hyderabad', body:'Sedan', score:94, badge:'Cars21 verified', image:'/images/kars21-hero.png', accent:'photo-six', color:'Grey' },
  { id:'innova-2021', make:'Toyota', model:'Innova Crysta', variant:'ZX AT', year:2021, km:38700, fuel:'Diesel', transmission:'Automatic', owners:1, price:1995000, city:'Chennai', body:'SUV', score:90, badge:'Cars21 verified', image:'/images/kars21-hero.png', accent:'photo-seven', color:'Black' },
  { id:'i20-2022', make:'Hyundai', model:'i20', variant:'Asta (O) iVT', year:2022, km:26700, fuel:'Petrol', transmission:'Automatic', owners:1, price:885000, city:'Bengaluru', body:'Hatchback', score:88, badge:'Inspection ready', image:'/images/kars21-hero.png', accent:'photo-eight', color:'White' },
];
export const formatINR = (amount:number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(amount);
export const formatShort = (amount:number) => amount >= 100000 ? `₹${(amount/100000).toFixed(amount%100000===0?0:1)}L` : formatINR(amount);
export const calcEmi = (principal:number, annualRate:number, months:number) => { const r=annualRate/1200; return r===0 ? principal/months : principal*r*Math.pow(1+r,months)/(Math.pow(1+r,months)-1); };
export function estimateValue(vehicle:{year?:number;km?:number;owners?:number;condition?:string}) {
  const base=720000 + Math.max(0,(vehicle.year??2020)-2018)*82000 - Math.max(0,(vehicle.km??30000)-30000)*1.25 - Math.max(0,(vehicle.owners??1)-1)*22000;
  const conditionFactor=vehicle.condition==='Excellent'?1.08:vehicle.condition==='Fair'?0.91:1;
  const midpoint=Math.max(260000,Math.round(base*conditionFactor/5000)*5000);
  return {low:Math.round(midpoint*.94/5000)*5000,midpoint,high:Math.round(midpoint*1.06/5000)*5000};
}
