import { Suspense } from 'react';
import App from '../App';

export default function SitePage() {
  return <Suspense fallback={<main className="container page-hero"><p>Loading Cars21…</p></main>}><App /></Suspense>;
}
