import { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { ProfileSetup } from './components/ProfileSetup';
import { Dashboard } from './components/Dashboard';
import { ChatbotInterface } from './components/ChatbotInterface';

interface User {
  username: string;
  name: string;
  email: string;
  bio?: string;
  faqs: { question: string; answer: string; id: string }[];
}

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'chatbot'>('home');
  const [activeChatbotUsername, setActiveChatbotUsername] = useState<string>('');

  useEffect(() => {
    // Check for Cloudflare Zero Trust Access authentication first
    const checkZeroTrustAuth = async () => {
      try {
        const response = await fetch('/api/auth/user');
        const data = await response.json();
        
        if (data.authenticated && data.email) {
          // User is authenticated via Cloudflare Zero Trust Access
          const users = JSON.parse(localStorage.getItem('users') || '[]');
          let user = users.find((u: User) => u.email === data.email);
          
          if (user) {
            // Update logged in user
            localStorage.setItem('loggedInUser', user.username);
            setCurrentUser(user);
          } else {
            // User doesn't exist yet, LoginPage will handle creation
            // Just check for existing login
            const loggedInUsername = localStorage.getItem('loggedInUser');
            if (loggedInUsername) {
              const foundUser = users.find((u: User) => u.username === loggedInUsername);
              if (foundUser) {
                setCurrentUser(foundUser);
              }
            }
          }
        } else {
          // Not authenticated via Zero Trust, check local storage
          const loggedInUsername = localStorage.getItem('loggedInUser');
          if (loggedInUsername) {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find((u: User) => u.username === loggedInUsername);
            if (user) {
              setCurrentUser(user);
            }
          }
        }
      } catch (error) {
        // If API call fails, fall back to local storage check
        console.error('Error checking Zero Trust authentication:', error);
        const loggedInUsername = localStorage.getItem('loggedInUser');
        if (loggedInUsername) {
          const users = JSON.parse(localStorage.getItem('users') || '[]');
          const user = users.find((u: User) => u.username === loggedInUsername);
          if (user) {
            setCurrentUser(user);
          }
        }
      }
    };

    checkZeroTrustAuth();

    // Check for route-based chatbot access (/<username>)
    // Only treat as username route if it's alphanumeric/underscore and not a file
    const path = window.location.pathname;
    if (path.length > 1 && !path.includes('.')) {
      const username = path.substring(1).split('/')[0]; // Get first segment
      // Only valid usernames (alphanumeric and underscore)
      if (/^[a-z0-9_]+$/.test(username)) {
        setActiveChatbotUsername(username);
        setCurrentView('chatbot');
      }
    }
  }, []);

  const handleLogin = (username: string, needsSetup: boolean) => {
    localStorage.setItem('loggedInUser', username);
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find((u: User) => u.username === username);
    setCurrentUser(user);
    setNeedsProfileSetup(needsSetup);
  };

  const handleProfileComplete = (profile: { username: string; name: string; bio: string }) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex((u: User) => u.email === currentUser?.email);
    
    if (userIndex !== -1) {
      users[userIndex] = {
        ...users[userIndex],
        username: profile.username,
        name: profile.name,
        bio: profile.bio,
      };
      localStorage.setItem('users', JSON.stringify(users));
      setCurrentUser(users[userIndex]);
      setNeedsProfileSetup(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    setCurrentUser(null);
    setCurrentView('home');
    window.history.pushState({}, '', '/');
  };

  const handleNavigateToChatbot = (username: string) => {
    setActiveChatbotUsername(username);
    setCurrentView('chatbot');
    window.history.pushState({}, '', `/${username}`);
  };

  const handleBackToDashboard = () => {
    setCurrentView('home');
    window.history.pushState({}, '', '/');
  };

  // Show chatbot view if accessing /<username>
  if (currentView === 'chatbot') {
    return (
      <ChatbotInterface
        username={activeChatbotUsername}
        onBack={currentUser ? handleBackToDashboard : undefined}
        isOwner={currentUser?.username === activeChatbotUsername}
      />
    );
  }

  // Show login if not authenticated
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Show profile setup if needed
  if (needsProfileSetup) {
    return <ProfileSetup onComplete={handleProfileComplete} initialEmail={currentUser.email} />;
  }

  // Show dashboard
  return (
    <Dashboard
      user={currentUser}
      onLogout={handleLogout}
      onNavigateToChatbot={handleNavigateToChatbot}
      onUpdateUser={setCurrentUser}
    />
  );
}

export default App;
