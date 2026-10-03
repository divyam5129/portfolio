import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Now from "@/components/sections/Now";
import Experience from "@/components/sections/Experience";
import Toolkit from "@/components/sections/Toolkit";
import Gallery from "@/components/sections/Gallery";
import Skills from "@/components/sections/Skills";
import Contact from "@/components/sections/Contact";

export default function Page() {
  return (
    <main id="main" className="relative z-10 overflow-x-clip">
      <Hero />
      <About />
      <Now />
      <Experience />
      <Toolkit />
      <Gallery />
      <Skills />
      <Contact />
    </main>
  );
}
