import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { User } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileSetupProps {
  onComplete: (profile: { username: string; name: string; bio: string }) => void;
  initialEmail: string;
}

export function ProfileSetup({ onComplete, initialEmail }: ProfileSetupProps) {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate username
    if (username.length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }

    // Validate name
    if (!name.trim()) {
      toast.error('Full name is required');
      return;
    }

    // Check if username is available in database
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}`);
      if (response.ok) {
        // Username exists in database - check if it's the same user
        const existingUser = await response.json();
        if (existingUser.email !== initialEmail) {
          toast.error('Username already taken. Please choose a different username.');
          setIsSubmitting(false);
          return;
        }
        // Same user - allow them to keep their username
      } else if (response.status !== 404) {
        // Some other error occurred
        console.error('Error checking username availability:', response.statusText);
        toast.error('Error checking username availability. Please try again.');
        setIsSubmitting(false);
        return;
      }
      // If 404, username is available - proceed
      
      onComplete({ username, name, bio });
    } catch (error) {
      console.error('Error checking username:', error);
      toast.error('Error checking username. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="bg-indigo-600 p-3 rounded-full">
              <User className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            Set up your profile to start creating your AI chatbot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                required
              />
              <p className="text-sm text-gray-600">
                Your chatbot will be accessible at /{username}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio (Optional)</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself and your chatbot..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Complete Setup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
