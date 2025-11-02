import { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { ProfileSetup } from './components/ProfileSetup';
import { Dashboard } from './components/Dashboard';
import { ChatbotInterface } from './components/ChatbotInterface';
import { fetchAuthFromServer, setLoggedInUser, getAuthPayload, logout as logoutUser } from './api/client';
import { getCurrentUser, updateUserProfile, getUserByUsername, getUserByEmail, fetchUserFromDatabase } from './api/client';
import type { User } from './api/types';


function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'chatbot'>('home');
  const [activeChatbotUsername, setActiveChatbotUsername] = useState<string>('');

  useEffect(() => {
    // Fetch ZeroTrust authentication on mount
    const initializeAuth = async () => {
      // First, try to get auth from server (ZeroTrust)
      const authPayload = await fetchAuthFromServer();
      
      if (authPayload) {
        // User is authenticated via ZeroTrust
        setLoggedInUser(authPayload);
        
        // Try to fetch user from D1 database first
        try {
          const user = await fetchUserFromDatabase(authPayload.email);
          if (user) {
            setCurrentUser(user);
            // Check if user needs profile setup (no username set or temporary username)
            const needsSetup = !user.username || user.username.startsWith('user_');
            setNeedsProfileSetup(needsSetup);
          } else {
            // User doesn't exist in database yet, check localStorage
            const localUser = getUserByEmail(authPayload.email);
            if (localUser) {
              setCurrentUser(localUser);
              const needsSetup = !localUser.username || localUser.username.startsWith('user_');
              setNeedsProfileSetup(needsSetup);
            } else {
              // New user - will be created by setLoggedInUser in localStorage
              // Check again after a moment
              setTimeout(() => {
                const newUser = getUserByEmail(authPayload.email);
                if (newUser) {
                  setCurrentUser(newUser);
                  setNeedsProfileSetup(true); // New user needs setup
                }
              }, 100);
            }
          }
        } catch (error) {
          console.error('Error fetching user from database, falling back to localStorage:', error);
          // Fallback to localStorage
          const localUser = getUserByEmail(authPayload.email);
          if (localUser) {
            setCurrentUser(localUser);
            const needsSetup = !localUser.username || localUser.username.startsWith('user_');
            setNeedsProfileSetup(needsSetup);
          }
        }
      } else {
        // Fallback: check localStorage for existing session
        const storedPayload = getAuthPayload();
        if (storedPayload) {
          // Try database first
          try {
            const user = await fetchUserFromDatabase(storedPayload.email);
            if (user) {
              setCurrentUser(user);
              const needsSetup = !user.username || user.username.startsWith('user_');
              setNeedsProfileSetup(needsSetup);
              return;
            }
          } catch (error) {
            console.error('Error fetching user from database:', error);
          }
          
          // Fallback to localStorage
          const localUser = getUserByEmail(storedPayload.email);
          if (localUser) {
            setCurrentUser(localUser);
            const needsSetup = !localUser.username || localUser.username.startsWith('user_');
            setNeedsProfileSetup(needsSetup);
          }
        }
      }
    };

    initializeAuth();

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
    const user = getUserByUsername(username);
    if (user) {
      setCurrentUser(user);
      setNeedsProfileSetup(needsSetup);
    }
  };

  const handleProfileComplete = (profile: { username: string; name: string; bio: string }) => {
    if (currentUser?.email) {
      try {
        const updatedUser = updateUserProfile(currentUser.email, profile);
        setCurrentUser(updatedUser);
        setNeedsProfileSetup(false);
      } catch (error) {
        console.error('Failed to update profile:', error);
      }
    }
  };

  const handleLogout = () => {
    logoutUser();
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
