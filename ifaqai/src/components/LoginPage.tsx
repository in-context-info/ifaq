import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Bot, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface LoginPageProps {
  onLogin: (username: string, needsSetup: boolean) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isZeroTrustAuth, setIsZeroTrustAuth] = useState(false);

  // Check for Cloudflare Zero Trust Access authentication on mount
  useEffect(() => {
    const checkZeroTrustAuth = async () => {
      try {
        const response = await fetch('/api/auth/user');
        const data = await response.json();
        
        if (data.authenticated && data.email) {
          // User is authenticated via Cloudflare Zero Trust Access
          setIsZeroTrustAuth(true);
          
          // Check if user exists in local storage, if not create one
          const users = JSON.parse(localStorage.getItem('users') || '[]');
          let user = users.find((u: any) => u.email === data.email);
          
          if (!user) {
            // Create new user from Zero Trust authentication
            const newUser = {
              email: data.email,
              password: '', // No password needed for Zero Trust
              username: `user_${Date.now()}`,
              name: data.email.split('@')[0], // Use email prefix as default name
              bio: '',
              faqs: [],
              zeroTrustAuth: true, // Flag to indicate Zero Trust authentication
            };
            
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));
            user = newUser;
          }
          
          toast.success('Authenticated via Cloudflare Zero Trust Access');
          onLogin(user.username, !user.name || user.name === user.email.split('@')[0]);
        } else {
          // User is not authenticated - they should be redirected by Cloudflare Zero Trust
          setIsZeroTrustAuth(false);
        }
      } catch (error) {
        console.error('Error checking Zero Trust authentication:', error);
        setIsZeroTrustAuth(false);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkZeroTrustAuth();
  }, [onLogin]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find((u: any) => u.email === email && u.password === password);
    
    if (user) {
      toast.success('Login successful!');
      onLogin(user.username, false);
    } else {
      toast.error('Invalid email or password');
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const existingUser = users.find((u: any) => u.email === signupEmail);
    
    if (existingUser) {
      toast.error('Email already registered');
      return;
    }

    const newUser = {
      email: signupEmail,
      password: signupPassword,
      username: `user_${Date.now()}`, // Temporary username
      name: '',
      bio: '',
      faqs: [],
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    toast.success('Account created! Please complete your profile.');
    onLogin(newUser.username, true);
  };

  // Show loading state while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-indigo-600 p-4 rounded-full animate-pulse">
              <Shield className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-indigo-900 mb-2">Checking Authentication...</h1>
          <p className="text-indigo-700">Verifying Cloudflare Zero Trust Access</p>
        </div>
      </div>
    );
  }

  // Show Zero Trust authentication message if not authenticated
  if (!isZeroTrustAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-indigo-600 p-4 rounded-full">
                  <Shield className="w-12 h-12 text-white" />
                </div>
              </div>
              <CardTitle>Cloudflare Zero Trust Access Required</CardTitle>
              <CardDescription>
                This application is protected by Cloudflare Zero Trust Access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Please authenticate through Cloudflare Zero Trust Access to continue.
                If you were redirected here, you may need to complete the authentication process.
              </p>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  Authentication Required
                </p>
                <p className="text-xs text-blue-700">
                  Cloudflare Zero Trust Access will handle your authentication automatically.
                  Make sure your browser allows cookies and redirects.
                </p>
              </div>
              <Button 
                className="w-full" 
                onClick={() => window.location.reload()}
              >
                Retry Authentication
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If authenticated, the useEffect will handle login automatically
  // This fallback should rarely be seen
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-indigo-600 p-4 rounded-full">
              <Bot className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-indigo-900 mb-2">AI Chatbot Trainer</h1>
          <p className="text-indigo-700">Create and train your own AI chatbot</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>Login to manage your AI chatbot</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Login
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>Sign up to create your AI chatbot</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Sign Up
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
