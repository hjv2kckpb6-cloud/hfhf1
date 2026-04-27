import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Menu, Bell, ChevronDown, User, Settings, LogOut, Eye } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ setActiveTab, sidebarOpen, setSidebarOpen }) => {
  const { 
    setCurrentUser, notifications, setNotifications,
    isImpersonating, impersonateRole, setImpersonateRole, hasPermission, getEffectiveUser
  } = useApp();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const effectiveUser = getEffectiveUser();
  const unreadNotifications = notifications.filter(n => !n.read);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    setImpersonateRole(null);
    localStorage.removeItem('fm_current_user');
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-lg border-b border-gray-800">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Menu button & Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-300" />
          </button>
          
          <h1 className="text-xl font-bold hidden md:block">
            <span className="font-handwriting" style={{ 
              background: 'linear-gradient(135deg, #FFB6C1, #B0E0E6)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent' 
            }}>
              Famille Meay
            </span>
          </h1>
        </div>

        {/* Right side - Notifications & User */}
        <div className="flex items-center gap-3">
          {/* Impersonation indicator */}
          {isImpersonating && impersonateRole && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 border border-purple-500/50 rounded-lg">
              <Eye className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300 text-sm">Vue: {impersonateRole}</span>
              <button
                onClick={() => setImpersonateRole(null)}
                className="text-purple-400 hover:text-purple-300"
              >
                ×
              </button>
            </div>
          )}

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Bell className="w-6 h-6 text-gray-300" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 rounded-full text-xs flex items-center justify-center text-white">
                  {unreadNotifications.length}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-[#12121a] border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-3 border-b border-gray-800">
                  <span className="font-semibold">Notifications</span>
                  {unreadNotifications.length > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-sm text-pink-400 hover:text-pink-300"
                    >
                      Tout marquer lu
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-gray-500 text-center text-sm">Aucune notification</p>
                  ) : (
                    notifications.slice(0, 10).map(notif => (
                      <div
                        key={notif.id}
                        className={`p-3 border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer ${
                          !notif.read ? 'bg-pink-500/5' : ''
                        }`}
                        onClick={() => {
                          setNotifications(prev => prev.map(n => 
                            n.id === notif.id ? { ...n, read: true } : n
                          ));
                          if (notif.link) setActiveTab(notif.link);
                        }}
                      >
                        <p className="font-medium text-sm">{notif.title}</p>
                        <p className="text-gray-400 text-xs mt-1">{notif.message}</p>
                        <p className="text-gray-600 text-xs mt-1">
                          {new Date(notif.timestamp).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
            >
              {effectiveUser?.avatar ? (
                <img
                  src={effectiveUser.avatar}
                  alt={effectiveUser.username}
                  className="w-8 h-8 rounded-full border-2 border-pink-400"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <span className="hidden md:block text-sm font-medium">{effectiveUser?.username || 'Utilisateur'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#12121a] border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                {/* User Info */}
                <div className="p-4 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    {effectiveUser?.avatar && (
                      <img src={effectiveUser.avatar} alt="" className="w-12 h-12 rounded-full" />
                    )}
                    <div>
                      <p className="font-semibold">{effectiveUser?.username}</p>
                      <p className="text-sm text-gray-400">{effectiveUser?.grade}</p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <button
                    onClick={() => {
                      setActiveTab('dashboard');
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-800 transition-colors text-left"
                  >
                    <User className="w-5 h-5 text-gray-400" />
                    <span>Mon profil</span>
                  </button>
                  
                  {hasPermission('manage_grades') && (
                    <button
                      onClick={() => {
                        setActiveTab('gestion');
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-800 transition-colors text-left"
                    >
                      <Settings className="w-5 h-5 text-gray-400" />
                      <span>Paramètres</span>
                    </button>
                  )}

                  <div className="border-t border-gray-800 mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-500/10 text-red-400 transition-colors text-left"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Déconnexion</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
