import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <section id="about" className="py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
                About <span className="text-gradient">Zoomish Names</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Zoomish Names was built by creators, for creators. We understand the challenges 
                of producing high-quality video content and podcasts. That's why we've designed 
                a platform that combines professional-grade recording tools with an intuitive 
                interface that anyone can use. Whether you're a seasoned podcaster or just 
                getting started with video content, Zoomish Names has everything you need to 
                create, collaborate, and share your best work.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
