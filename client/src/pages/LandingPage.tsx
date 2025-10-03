import { Button } from "@/components/ui/button";
import { Video, Sparkles, Zap, Layers } from "lucide-react";

export default function LandingPage() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-8 text-center">
        <div className="space-y-4">
          <div className="flex justify-center mb-6">
            <div className="bg-primary/10 p-4 rounded-2xl">
              <Video className="h-16 w-16 text-primary" />
            </div>
          </div>
          <h1 className="text-5xl font-bold tracking-tight">
            LinkedIn Video Post Editor
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create stunning square videos for LinkedIn in seconds. Drag, drop, and design professional video posts with ease.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 my-12">
          <div className="p-6 rounded-lg border bg-card space-y-3">
            <div className="bg-primary/10 p-3 rounded-lg w-fit">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Brand Import</h3>
            <p className="text-sm text-muted-foreground">
              Import colors and fonts directly from any website to match your brand instantly
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card space-y-3">
            <div className="bg-primary/10 p-3 rounded-lg w-fit">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Multi-Scene Editor</h3>
            <p className="text-sm text-muted-foreground">
              Create dynamic videos with multiple scenes, each with custom duration and elements
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card space-y-3">
            <div className="bg-primary/10 p-3 rounded-lg w-fit">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Instant Export</h3>
            <p className="text-sm text-muted-foreground">
              Export high-quality WebM videos ready to upload directly to LinkedIn
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Button 
            size="lg" 
            onClick={handleLogin}
            className="text-lg px-8"
            data-testid="button-login"
          >
            Sign In to Get Started
          </Button>
          <p className="text-sm text-muted-foreground">
            Sign in with Google, GitHub, or email to access your workspace
          </p>
        </div>
      </div>
    </div>
  );
}
