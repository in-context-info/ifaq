import { useState, useEffect } from 'react';
import { ProfileSetup } from './components/ProfileSetup';
import { Dashboard } from './components/Dashboard';
import { ChatbotInterface } from './components/ChatbotInterface';
import { LogoutPage } from './components/LogoutPage';
import { fetchAuthFromServer, setLoggedInUser, getAuthPayload, logout as logoutUser } from './api/client';
import { getCurrentUser, updateUserProfile, getUserByUsername, getUserByEmail, fetchUserFromDatabase, createUserInDatabase } from './api/client';
import type { User } from './api/types';
import { toast } from 'sonner';


function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'chatbot'>('home');
  const [activeChatbotUsername, setActiveChatbotUsername] = useState<string>('');
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  useEffect(() => {
    // Fetch ZeroTrust authentication on mount
    const initializeAuth = async () => {
      try {
        // First, try to get auth from server (ZeroTrust)
        const authPayload = await fetchAuthFromServer();
        
        if (authPayload) {
          // User is authenticated via ZeroTrust
          setLoggedInUser(authPayload);
          
          // Try to fetch user from D1 database first
          // Use Promise.race with timeout to prevent hanging
          let user: User | null = null;
          try {
            const dbQuery = fetchUserFromDatabase(authPayload.email);
            const timeout = new Promise<null>((resolve) => 
              setTimeout(() => resolve(null), 3000) // 3 second timeout
            );
            user = await Promise.race([dbQuery, timeout]);
          } catch (dbError) {
            console.error('Database query error (will use localStorage):', dbError);
          }
          
          if (user) {
            // User exists in database
            setCurrentUser(user);
            // Check if user needs profile setup (no username set or temporary username)
            const needsSetup = !user.username || user.username.startsWith('user_');
            setNeedsProfileSetup(needsSetup);
            return; // Success - exit early
          } else {
            // User doesn't exist in database - create new user record
            // First, get or create user in localStorage (setLoggedInUser does this)
            const localUser = getUserByEmail(authPayload.email);
            
            if (localUser) {
              // Create new user in database using localStorage user data
              try {
                const newUser = await createUserInDatabase(localUser);
                setCurrentUser(newUser);
                // New users always need profile setup
                setNeedsProfileSetup(true);
              } catch (error) {
                console.error('Error creating user in database, using localStorage user:', error);
                setCurrentUser(localUser);
                // New users always need profile setup
                setNeedsProfileSetup(true);
              }
            } else {
              // Create a new user from auth payload
              const nameParts = authPayload.name ? authPayload.name.trim().split(/\s+/) : ['', ''];
              const firstName = nameParts[0] || '';
              const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
              
              const newUser: User = {
                email: authPayload.email,
                name: authPayload.name || '',
                firstName,
                lastName,
                username: `user_${Date.now()}`,
                bio: '',
                faqs: [],
              };
              
              try {
                // Create in database (with timeout)
                const createPromise = createUserInDatabase(newUser);
                const timeout = new Promise<User>((_, reject) => 
                  setTimeout(() => reject(new Error('Database timeout')), 3000)
                );
                const createdUser = await Promise.race([createPromise, timeout]);
                setCurrentUser(createdUser);
                // New users always need profile setup
                setNeedsProfileSetup(true);
              } catch (error) {
                console.error('Error creating user in database, falling back to localStorage:', error);
                // Fallback: create in localStorage via setLoggedInUser
                // setLoggedInUser already creates localStorage entry, so get it
                const localUser = getUserByEmail(authPayload.email);
                if (localUser) {
                  setCurrentUser(localUser);
                  setNeedsProfileSetup(true);
                } else {
                  // If still not found, use the new user we created
                  // setLoggedInUser should have created localStorage entry, but if not, use the newUser directly
                  setCurrentUser(newUser);
                  setNeedsProfileSetup(true);
                }
              }
            }
          }
      } else {
        // No auth payload - check localStorage for existing session
        const storedPayload = getAuthPayload();
        if (storedPayload) {
          // Try database first (with timeout)
          let user: User | null = null;
          try {
            const dbQuery = fetchUserFromDatabase(storedPayload.email);
            const timeout = new Promise<null>((resolve) => 
              setTimeout(() => resolve(null), 3000)
            );
            user = await Promise.race([dbQuery, timeout]);
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
          } else {
            // No user found anywhere - this shouldn't happen, but create a fallback
            console.warn('No user found in database or localStorage');
          }
        } else {
          // No auth and no stored payload - user needs to authenticate
          console.log('No authentication found');
        }
      }
      } catch (error) {
        console.error('Error in initializeAuth:', error);
        // Last resort: try to get user from localStorage
        const storedPayload = getAuthPayload();
        if (storedPayload) {
          const localUser = getUserByEmail(storedPayload.email);
          if (localUser) {
            setCurrentUser(localUser);
            setNeedsProfileSetup(true);
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

  const handleProfileComplete = async (profile: { username: string; name: string; bio: string }) => {
    if (!currentUser?.email) {
      toast.error('User email not found. Please refresh the page.');
      console.error('currentUser is null or missing email:', currentUser);
      return;
    }

    try {
      // updateUserProfile now handles both localStorage and database updates
      const updatedUser = await updateUserProfile(currentUser.email, profile);
      setCurrentUser(updatedUser);
      setNeedsProfileSetup(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      // Check if it's a username conflict
      if (error instanceof Error && error.message.includes('already taken')) {
        toast.error('Username already taken. Please choose a different username.');
        // Keep user in profile setup mode
        throw error; // Re-throw so ProfileSetup can handle it
      }
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile. Please try again.');
      throw error; // Re-throw so ProfileSetup can handle it
    }
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setCurrentView('home');
    setIsLoggedOut(true);
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

  // Show logout page if user has logged out
  if (isLoggedOut) {
    return <LogoutPage />;
  }

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

  // Show loading/auth message if not authenticated
  // With ZeroTrust, users should be automatically authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Authenticating...</h2>
            <p className="text-sm text-gray-600 mt-2">
              Please wait while we verify your authentication via Cloudflare ZeroTrust.
            </p>
          </div>
        </div>
      </div>
    );
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
