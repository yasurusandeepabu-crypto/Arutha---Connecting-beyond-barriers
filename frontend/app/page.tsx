import { Navbar, Hero, Capabilities, Pipeline, Trust, DemoStrip, Join, Footer } from '@/components/sections';
import { CompanionProvider } from '@/components/companion-provider';
import { SessionPanel } from '@/components/session-panel';
export default function Home() {
  return <CompanionProvider><Navbar /><main><Hero /><SessionPanel /><Capabilities /><Pipeline /><Trust /><DemoStrip /><Join /></main><Footer /></CompanionProvider>;
}
