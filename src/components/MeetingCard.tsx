import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, Plus, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MeetingCard = () => {
  const [name, setName] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const { toast } = useToast();

  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name to join the meeting.",
        variant: "destructive",
      });
      return;
    }

    if (!meetingId.trim()) {
      toast({
        title: "Meeting ID required",
        description: "Please enter a meeting ID to join.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Joining meeting...",
      description: `Connecting ${name} to meeting ${meetingId}`,
    });
    
    console.log("Joining meeting:", { name, meetingId });
  };

  const handleCreateMeeting = () => {
    const newMeetingId = `zm-${Math.random().toString(36).substring(2, 9)}`;
    
    toast({
      title: "Meeting created!",
      description: `Your meeting ID: ${newMeetingId}`,
    });
    
    setMeetingId(newMeetingId);
    console.log("Created new meeting:", newMeetingId);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-card rounded-2xl border border-border shadow-soft p-8 animate-scale-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl gradient-hero">
            <Video className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Join a Meeting</h2>
            <p className="text-sm text-muted-foreground">Enter your details below</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleJoinMeeting} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
              Your Name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="meetingId" className="block text-sm font-medium text-foreground mb-2">
              Meeting ID
            </label>
            <Input
              id="meetingId"
              type="text"
              placeholder="Enter meeting ID"
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
            />
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full group">
            Join Meeting
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Create Meeting */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={handleCreateMeeting}
        >
          <Plus className="h-5 w-5" />
          Create New Meeting
        </Button>
      </div>

      {/* Subtitle */}
      <p className="text-center text-muted-foreground text-sm mt-6 max-w-sm mx-auto">
        Zoomish Names is your platform for professional video recording and podcast production.
      </p>
    </div>
  );
};

export default MeetingCard;
