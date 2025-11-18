import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { FAQManager } from './FAQManager';
import { Bot, LogOut, ExternalLink, User as UserIcon } from 'lucide-react';
import { updateUserFAQs } from '../api/client';
import type { User } from '../api/types';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onNavigateToChatbot: (username: string) => void;
  onUpdateUser: (user: User) => void;
}

export function Dashboard({ user, onLogout, onNavigateToChatbot, onUpdateUser }: DashboardProps) {
  const handleFAQsUpdate = (faqs: { question: string; answer: string; id: string }[]) => {
    try {
      const updatedUser = updateUserFAQs(user.username, faqs);
      onUpdateUser(updatedUser);
    } catch (error) {
      console.error('Failed to update FAQs:', error);
    }
  };

  const chatbotUrl = `${window.location.origin}/${user.username}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-gray-900">AI Chatbot Trainer</h1>
                <p className="text-sm text-gray-600">Manage your chatbot</p>
              </div>
            </div>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-indigo-600 text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{user.name}</CardTitle>
                  <CardDescription>@{user.username}</CardDescription>
                  {user.bio && <p className="text-sm text-gray-600 mt-2">{user.bio}</p>}
                </div>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Bot className="w-3 h-3" />
                {user.faqs.length} FAQ{user.faqs.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Your chatbot URL:</p>
              <div className="flex items-center gap-2">
                <code className="bg-white px-3 py-2 rounded border text-sm flex-1">
                  {chatbotUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateToChatbot(user.username)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Visit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="faqs" className="w-full">
          <TabsList>
            <TabsTrigger value="faqs">Manage FAQs</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="faqs" className="mt-6">
            <FAQManager
              faqs={user.faqs}
              userId={user.userId}
              onUpdate={handleFAQsUpdate}
            />
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600">Email</label>
                  <p>{user.email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Username</label>
                  <p>@{user.username}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Name</label>
                  <p>{user.name}</p>
                </div>
                {user.bio && (
                  <div>
                    <label className="text-sm text-gray-600">Bio</label>
                    <p>{user.bio}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
