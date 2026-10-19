import type { Metadata } from 'next';
import '../style.css';
import { BuyerExperienceProvider } from '../components/BuyerExperienceProvider';

export const metadata: Metadata = {
  title: 'Cars21 — Your next car, your best deal',
  description: 'Discover cars, compare transparent details, and move through your next car journey with Cars21.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-IN"><body><BuyerExperienceProvider>{children}</BuyerExperienceProvider></body></html>;
}
