import { Video, Shield, Share2, Mic } from "lucide-react";

const features = [
  {
    icon: Video,
    title: "HD Recording",
    description: "Record video calls in stunning 4K quality with automatic optimization for any bandwidth.",
  },
  {
    icon: Shield,
    title: "Secure Sessions",
    description: "Enterprise-grade encryption ensures your recordings and conversations stay private.",
  },
  {
    icon: Share2,
    title: "Easy Sharing",
    description: "Share recordings instantly with one-click links or export to your favorite platforms.",
  },
  {
    icon: Mic,
    title: "Perfect for Podcasts",
    description: "Crystal-clear audio recording with separate tracks for professional podcast production.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything You Need to{" "}
            <span className="text-gradient">Create Amazing Content</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Professional recording tools designed for creators who demand the best.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-card border border-border shadow-soft hover:shadow-hover transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="h-6 w-6 text-primary-foreground" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
