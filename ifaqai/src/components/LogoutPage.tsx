import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { LogOut, ExternalLink } from 'lucide-react';

export function LogoutPage() {
  const handleGoToIfaq = () => {
    window.location.href = 'https://ifaq.ai';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="bg-indigo-600 p-3 rounded-full">
              <LogOut className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-center">You are logged out</CardTitle>
          <CardDescription className="text-center">
            Your session has been successfully terminated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-gray-600">
            <p>Thank you for using our service.</p>
            <p className="mt-2">You can return to ifaq.ai to start a new session.</p>
          </div>
          <Button 
            onClick={handleGoToIfaq} 
            className="w-full"
            size="lg"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Go back to ifaq.ai
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

