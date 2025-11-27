import { useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Logo } from './Logo';
import { ArrowRight } from 'lucide-react';

export function LogoutPage() {
  const handleGoToHome = () => {
    window.location.href = '/';
  };

  // Auto-redirect to homepage after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = '/';
    }, 3000); // 3 second delay

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Logo size="xl" />
          </div>
          <CardTitle className="text-center">You are logged out</CardTitle>
          <CardDescription className="text-center">
            Your session has been successfully terminated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-gray-600">
            <p>Thank you for using our service.</p>
            <p className="mt-2">Redirecting to homepage in a few seconds...</p>
          </div>
          <Button 
            onClick={handleGoToHome} 
            className="w-full"
            size="lg"
          >
            Go to Homepage <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

