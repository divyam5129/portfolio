import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Now from "@/components/sections/Now";
import Experience from "@/components/sections/Experience";
import Toolkit from "@/components/sections/Toolkit";
import TrailMap from "@/components/sections/TrailMap";
import Gallery from "@/components/sections/Gallery";
import Skills from "@/components/sections/Skills";
import Contact from "@/components/sections/Contact";
import Marquee from "@/components/sections/Marquee";
import { site } from "@/data/site";

export default function Page() {
  return (
    <main id="main" className="relative z-10 overflow-x-clip">
      <Hero />
      <About />
      <Marquee words={site.marquee.first} />
      <Now />
      <Experience />
      <Toolkit />
      <TrailMap />
      <Gallery />
      <Skills />
      <Marquee words={site.marquee.second} reverse tone="glass" />
      <Contact />
    </main>
  );
}
