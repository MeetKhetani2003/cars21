import type { Metadata } from 'next';
import '../style.css';
import { BuyerExperienceProvider } from '../components/BuyerExperienceProvider';

export const metadata: Metadata = {
  title: 'Cars21 — Your next car, your best deal',
  description: 'Discover cars, compare transparent details, and move through your next car journey with Cars21.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..800;1,14..32,400..600&family=Plus+Jakarta+Sans:ital,wght@0,400..800;1,400..600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <BuyerExperienceProvider>{children}</BuyerExperienceProvider>
      </body>
    </html>
  );
}
