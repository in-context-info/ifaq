import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { User, Bug, X } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileSetupProps {
  onComplete: (profile: { username: string; name: string; bio: string }) => void;
  initialEmail: string;
}

interface DebugInfo {
  step: string;
  timestamp: Date;
  data?: any;
  error?: string;
}

export function ProfileSetup({ onComplete, initialEmail }: ProfileSetupProps) {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugInfo[]>([]);
  
  const addDebugLog = (step: string, data?: any, error?: string) => {
    setDebugLogs(prev => [...prev, {
      step,
      timestamp: new Date(),
      data,
      error
    }]);
  };

  useEffect(() => {
    // Log initial state
    addDebugLog('Component mounted', { initialEmail });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    addDebugLog('Form submitted', { username, name, bioLength: bio.length });

    // Validate username
    if (username.length < 3) {
      addDebugLog('Validation failed', { field: 'username', reason: 'Too short' }, 'Username must be at least 3 characters');
      toast.error('Username must be at least 3 characters');
      return;
    }

    // Validate name
    if (!name.trim()) {
      addDebugLog('Validation failed', { field: 'name', reason: 'Empty' }, 'Full name is required');
      toast.error('Full name is required');
      return;
    }

    // Check if username is available in database
    setIsSubmitting(true);
    addDebugLog('Starting username availability check', { username });
    
    try {
      console.log('[PROFILE SETUP] Checking username availability:', username);
      const response = await fetch(`/api/users/${encodeURIComponent(username)}`);
      addDebugLog('Username check response', { status: response.status, statusText: response.statusText });
      
      if (response.ok) {
        // Username exists in database - check if it's the same user
        const existingUser = await response.json();
        console.log('[PROFILE SETUP] Username exists, checking if same user:', { existingEmail: existingUser.email, initialEmail });
        addDebugLog('Username exists in database', { 
          existingEmail: existingUser.email, 
          initialEmail,
          isSameUser: existingUser.email === initialEmail 
        });
        
        if (existingUser.email !== initialEmail) {
          addDebugLog('Username conflict', { existingEmail: existingUser.email, initialEmail }, 'Username already taken by different user');
          toast.error('Username already taken. Please choose a different username.');
          setIsSubmitting(false);
          return;
        }
        // Same user - allow them to keep their username
        console.log('[PROFILE SETUP] Same user, allowing username');
        addDebugLog('Username check passed', { reason: 'Same user' });
      } else if (response.status !== 404) {
        // Some other error occurred
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        console.error('[PROFILE SETUP] Error checking username availability:', response.statusText);
        addDebugLog('Username check error', { status: response.status, error: errorData }, errorData.error || response.statusText);
        toast.error(`Error checking username: ${errorData.error || response.statusText}`);
        setIsSubmitting(false);
        return;
      } else {
        // 404 means username is available
        console.log('[PROFILE SETUP] Username is available (404)');
        addDebugLog('Username available', { reason: 'Not found (404)' });
      }
      
      // Username is available - proceed with completion
      console.log('[PROFILE SETUP] Calling onComplete with profile:', { username, name, bio: bio.substring(0, 20) + '...' });
      addDebugLog('Calling onComplete callback', { username, name, bioLength: bio.length });
      
      try {
        await onComplete({ username, name, bio });
        addDebugLog('onComplete succeeded', { username, name });
      } catch (onCompleteError) {
        const errorMsg = onCompleteError instanceof Error ? onCompleteError.message : 'Unknown error';
        addDebugLog('onComplete failed', { error: errorMsg }, errorMsg);
        throw onCompleteError;
      }
      // Note: isSubmitting will be reset by the parent component or we can reset it here
      // But if onComplete succeeds, the component should unmount, so it doesn't matter
    } catch (error) {
      console.error('[PROFILE SETUP] Error in handleSubmit:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog('Submit error', { error: errorMessage }, errorMessage);
      toast.error(`Error: ${errorMessage}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className={`flex gap-4 ${showDebug ? 'max-w-6xl' : 'max-w-md'} w-full`}>
        <Card className={`w-full ${showDebug ? 'flex-1' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex justify-center flex-1">
              <div className="bg-indigo-600 p-3 rounded-full">
                <User className="w-8 h-8 text-white" />
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowDebug(!showDebug)}
              className="ml-2"
              title={showDebug ? 'Hide Debug Panel' : 'Show Debug Panel'}
            >
              <Bug className="w-4 h-4" />
            </Button>
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
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  Your chatbot will be accessible at /{username || 'username'}
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-800">
                  <p className="font-medium mb-1">Username Requirements:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                    <li>At least 3 characters long</li>
                    <li>Only lowercase letters, numbers, and underscores</li>
                    <li>Must be unique (not already taken)</li>
                  </ul>
                </div>
              </div>
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

      {/* Debug Panel */}
      {showDebug && (
        <Card className="w-96 flex flex-col border-2 border-orange-200">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-orange-600" />
                <CardTitle className="text-lg">Debug Panel</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDebug(false)}
                className="h-6 w-6"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-700">Form State</h3>
                <div className="bg-gray-50 rounded p-2 text-xs space-y-1">
                  <div><span className="font-medium">Email:</span> {initialEmail}</div>
                  <div><span className="font-medium">Username:</span> {username || '(empty)'}</div>
                  <div><span className="font-medium">Name:</span> {name || '(empty)'}</div>
                  <div><span className="font-medium">Bio Length:</span> {bio.length} chars</div>
                  <div><span className="font-medium">Is Submitting:</span> {isSubmitting ? 'Yes' : 'No'}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-700">Debug Logs</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDebugLogs([])}
                    className="text-xs h-6"
                  >
                    Clear
                  </Button>
                </div>
                <div className="bg-gray-50 rounded p-2 text-xs space-y-2 max-h-96 overflow-auto">
                  {debugLogs.length === 0 ? (
                    <div className="text-gray-500 text-center py-4">
                      No debug logs yet. Submit the form to see logs.
                    </div>
                  ) : (
                    debugLogs.map((log, index) => (
                      <div key={index} className="border-b pb-2 last:border-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-medium text-indigo-600">{log.step}</div>
                            <div className="text-gray-500 text-xs mt-1">
                              {log.timestamp.toLocaleTimeString()}
                            </div>
                            {log.data && (
                              <div className="mt-1 text-gray-700">
                                <pre className="whitespace-pre-wrap text-xs bg-white p-1 rounded">
                                  {JSON.stringify(log.data, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.error && (
                              <div className="mt-1 text-red-600 font-medium">
                                Error: {log.error}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-700">Validation Status</h3>
                <div className="bg-gray-50 rounded p-2 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={username.length >= 3 ? 'text-green-600' : 'text-red-600'}>
                      {username.length >= 3 ? '✓' : '✗'}
                    </span>
                    <span>Username length: {username.length}/3</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={name.trim().length > 0 ? 'text-green-600' : 'text-red-600'}>
                      {name.trim().length > 0 ? '✓' : '✗'}
                    </span>
                    <span>Name provided: {name.trim().length > 0 ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </Card>
      )}
      </div>
    </div>
  );
}
