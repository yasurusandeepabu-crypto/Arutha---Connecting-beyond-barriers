import type { Metadata } from 'next';
import '@fontsource/inter/latin.css';
import '../../avatar/player.css';
import './globals.css';

export const metadata: Metadata = { title: 'SignBridge | Connecting beyond barriers', icons: { icon: '/images/signbridge.jpeg' }, description: 'Live English captions and 14 unverified ASL word signs on a floating 3D avatar. A limited hackathon prototype.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
