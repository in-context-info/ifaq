import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Logo } from './Logo';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ArrowRight, UserPlus, Brain, Share2 } from 'lucide-react';

interface WelcomePageProps {
  onGetStarted: () => void;
}

export function WelcomePage({ onGetStarted }: WelcomePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <Logo size="xl" />
          </div>
          <h1 className="text-4xl font-bold text-indigo-900 mb-4">AI Chatbot Trainer</h1>
          <p className="text-lg text-indigo-700 mb-8 max-w-2xl mx-auto">
            Create your own personalized AI chatbot in just 3 simple steps.{' '}
            Train it with your knowledge and share it with the world.
          </p>
          <Button
            onClick={onGetStarted}
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Get Started <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Steps Section */}
        <div className="max-w-6xl mx-auto space-y-16">
          {/* Step 1: Sign Up */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="order-2 md:order-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center">
                  <UserPlus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-indigo-600 font-semibold">Step 1</span>
                  <h2 className="text-2xl font-bold text-gray-900">Sign Up</h2>
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                Create your account in seconds. Simply enter your email and password to
                get started. Then, set up your profile with a unique username that will
                be used for your chatbot's URL.
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                  Quick and easy registration
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                  Choose your unique username
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                  Set up your profile information
                </li>
              </ul>
            </div>
            <div className="order-1 md:order-2">
              <Card className="overflow-hidden shadow-xl">
                <CardContent className="p-0">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1612310035518-c48c2c117c89?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaWdudXAlMjBmb3JtJTIwaW50ZXJmYWNlfGVufDF8fHx8MTc2NDI1NzgyNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Sign up interface"
                    className="w-full h-auto"
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Step 2: Train Your AI */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <Card className="overflow-hidden shadow-xl">
                <CardContent className="p-0">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1575388902449-6bca946ad549?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXNoYm9hcmQlMjB0cmFpbmluZyUyMGludGVyZmFjZXxlbnwxfHx8fDE3NjQyNTc4MjV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Training dashboard interface"
                    className="w-full h-auto"
                  />
                </CardContent>
              </Card>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-indigo-600 font-semibold">Step 2</span>
                  <h2 className="text-2xl font-bold text-gray-900">Train Your AI</h2>
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                Build your chatbot's knowledge base by creating FAQ question-answer pairs.
                The more you train it, the smarter it becomes. Your AI will use intelligent
                matching to provide accurate responses.
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                  Add unlimited FAQ pairs
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                  Edit and update anytime
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                  Smart AI matching algorithm
                </li>
              </ul>
            </div>
          </div>

          {/* Step 3: Share Your AI */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="order-2 md:order-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center">
                  <Share2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-indigo-600 font-semibold">Step 3</span>
                  <h2 className="text-2xl font-bold text-gray-900">Share Your AI</h2>
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                Your chatbot gets its own unique URL based on your username. Share it with
                anyone, and they can interact with your AI chatbot instantly. No login
                required for visitors!
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                  Unique /bot/{'{username}'} URL
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                  Easy to share and access
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                  Real-time AI responses
                </li>
              </ul>
            </div>
            <div className="order-1 md:order-2">
              <Card className="overflow-hidden shadow-xl">
                <CardContent className="p-0">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1723987135977-ae935608939e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGF0JTIwY29udmVyc2F0aW9uJTIwc2NyZWVufGVufDF8fHx8MTc2NDI1NzgyNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Chat interface"
                    className="w-full h-auto"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 pb-12">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to create your AI chatbot?
            </h2>
            <p className="text-gray-700 mb-6">
              Join now and start training your personalized AI assistant in minutes.
            </p>
            <Button
              onClick={onGetStarted}
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Create Your Chatbot <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

