import { useState, useEffect } from 'react';
import { ProfileSetup } from './components/ProfileSetup';
import { Dashboard } from './components/Dashboard';
import { ChatbotInterface } from './components/ChatbotInterface';
import { LogoutPage } from './components/LogoutPage';
import { fetchAuthFromServer, setLoggedInUser, getAuthPayload, logout as logoutUser } from './api/client';
import { getCurrentUser, getUserByUsername, getUserByEmail, fetchUserFromDatabase, createUserInDatabase } from './api/client';
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
      // First, try to get auth from server (ZeroTrust)
      const authPayload = await fetchAuthFromServer();
      
      if (authPayload) {
        // User is authenticated via ZeroTrust
        setLoggedInUser(authPayload);
        
        // Try to fetch user from D1 database first
        try {
          let user = await fetchUserFromDatabase(authPayload.email);
          
          if (user) {
            // User exists in database
            setCurrentUser(user);
            // Check if user needs profile setup (no username set or temporary username)
            const needsSetup = !user.username || user.username.startsWith('user_');
            setNeedsProfileSetup(needsSetup);
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
                // Create in database
                const createdUser = await createUserInDatabase(newUser);
                setCurrentUser(createdUser);
                // New users always need profile setup
                setNeedsProfileSetup(true);
              } catch (error) {
                console.error('Error creating user in database, falling back to localStorage:', error);
                // Fallback: create in localStorage via setLoggedInUser
                // Wait a moment for setLoggedInUser to complete
                setTimeout(() => {
                  const localUser = getUserByEmail(authPayload.email);
                  if (localUser) {
                    setCurrentUser(localUser);
                    setNeedsProfileSetup(true);
                  }
                }, 100);
              }
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
          } else {
            // Create new user in localStorage and set needs setup
            setTimeout(() => {
              const newUser = getUserByEmail(authPayload.email);
              if (newUser) {
                setCurrentUser(newUser);
                setNeedsProfileSetup(true);
              }
            }, 100);
          }
        }
      } else {
        // Fallback: check localStorage for existing session
        const storedPayload = getAuthPayload();
        if (storedPayload) {
          // Try database first
          try {
            let user = await fetchUserFromDatabase(storedPayload.email);
            if (user) {
              setCurrentUser(user);
              const needsSetup = !user.username || user.username.startsWith('user_');
              setNeedsProfileSetup(needsSetup);
              return;
            } else {
              // User doesn't exist in database - create new user record
              const localUser = getUserByEmail(storedPayload.email);
              if (localUser) {
                // Create new user in database using localStorage user data
                try {
                  const newUser = await createUserInDatabase(localUser);
                  setCurrentUser(newUser);
                  setNeedsProfileSetup(true);
                  return;
                } catch (error) {
                  console.error('Error creating user in database:', error);
                  // Fall through to localStorage fallback
                }
              }
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

    // Function to check and handle route-based chatbot access (/<username>)
    const checkRoute = () => {
      const path = window.location.pathname;
      // Only treat as username route if it's alphanumeric/underscore and not a file
      if (path.length > 1 && !path.includes('.')) {
        const username = path.substring(1).split('/')[0]; // Get first segment
        // Only valid usernames (alphanumeric and underscore, case-insensitive)
        if (/^[a-zA-Z0-9_]+$/.test(username)) {
          setActiveChatbotUsername(username);
          setCurrentView('chatbot');
          return;
        }
      }
      // If not a valid username route and we're on chatbot view, go to home
      setCurrentView(prev => {
        if (prev === 'chatbot') {
          setActiveChatbotUsername('');
          return 'home';
        }
        return prev;
      });
    };

    // Check route on mount
    checkRoute();

    // Listen for route changes (browser back/forward)
    const handlePopState = () => {
      checkRoute();
    };
    window.addEventListener('popstate', handlePopState);

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleProfileComplete = async (profile: { username: string; name: string; bio: string }) => {
    console.log('[PROFILE SETUP] Starting profile completion:', { 
      profile: { ...profile, bio: profile.bio.substring(0, 20) + '...' }, 
      currentUser: currentUser?.email,
      currentUserId: currentUser?.userId 
    });
    
    if (!currentUser?.email) {
      console.error('[PROFILE SETUP] No current user or email found');
      toast.error('User not found. Please refresh the page and try again.');
      return;
    }

    try {
      // Prepare user data for database update
      const nameParts = profile.name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      const userToUpdate: User = {
        ...currentUser,
        username: profile.username,
        name: profile.name,
        firstName,
        lastName,
        bio: profile.bio,
      };

      console.log('[PROFILE SETUP] User data prepared:', {
        email: userToUpdate.email,
        username: userToUpdate.username,
        name: userToUpdate.name,
        userId: userToUpdate.userId
      });

      console.log('[PROFILE SETUP] Attempting to create/update user in database...');
      const dbUser = await createUserInDatabase(userToUpdate);
      console.log('[PROFILE SETUP] Successfully updated user in database:', {
        email: dbUser.email,
        username: dbUser.username,
        userId: dbUser.userId
      });
      
      // Refresh user data from database to ensure we have the latest
      console.log('[PROFILE SETUP] Refreshing user data from database...');
      const refreshedUser = await fetchUserFromDatabase(currentUser.email);
      if (refreshedUser) {
        console.log('[PROFILE SETUP] User refreshed from database:', refreshedUser.username);
        setCurrentUser(refreshedUser);
      } else {
        console.log('[PROFILE SETUP] Using returned user from createUserInDatabase');
        setCurrentUser(dbUser);
      }
      
      console.log('[PROFILE SETUP] Setting needsProfileSetup to false');
      setNeedsProfileSetup(false);
      toast.success('Profile completed successfully!');
    } catch (error) {
      console.error('[PROFILE SETUP] Error details:', error);
      // Check if it's a username conflict
      if (error instanceof Error && (error.message.includes('already taken') || error.message.includes('Username'))) {
        console.error('[PROFILE SETUP] Username conflict:', error);
        toast.error('Username already taken. Please choose a different username.');
        // Keep user in profile setup mode
        return;
      }
      console.error('[PROFILE SETUP] Failed to update profile in database:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('[PROFILE SETUP] Error stack:', errorStack);
      toast.error(`Failed to update profile: ${errorMessage}`);
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
