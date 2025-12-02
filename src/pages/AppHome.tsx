import { Link } from "react-router-dom";
import { Video, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import MeetingCard from "@/components/MeetingCard";

const AppHome = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="p-2 rounded-lg gradient-hero">
                <Video className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Zoomish<span className="text-gradient">Names</span>
              </span>
            </Link>
            
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-lg">
          {/* Welcome Message */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
              Welcome back!
            </h1>
            <p className="text-muted-foreground">
              Ready to start recording? Join or create a meeting below.
            </p>
          </div>

          {/* Meeting Card */}
          <MeetingCard />
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-border py-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Zoomish Names. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AppHome;
