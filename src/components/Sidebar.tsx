import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, FileText, Users, BookOpen, Settings, 
  Home, Award, Shield, Database, ChevronLeft 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  const { hasPermission, isFamilyMember } = useApp();

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, show: true },
    { id: 'candidature', label: 'Candidature', icon: FileText, show: true },
    { id: 'membres', label: 'Membres', icon: Users, show: hasPermission('view_members') },
    { id: 'famille', label: 'Famille', icon: Home, show: true },
    { id: 'reglement', label: 'Règlement', icon: BookOpen, show: true },
    { id: 'recompenses', label: 'Récompenses', icon: Award, show: hasPermission('view_rewards') },
    { id: 'steamid', label: 'SteamID', icon: Database, show: hasPermission('view_steamid') },
    { id: 'admin', label: 'Administratif', icon: Shield, show: hasPermission('view_admin') && isFamilyMember() },
    { id: 'gestion', label: 'Gestion', icon: Settings, show: hasPermission('manage_grades') },
  ];

  const visibleItems = menuItems.filter(item => item.show);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-16 bottom-0 w-64 bg-[#0a0a0f] border-r border-gray-800 z-40
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:top-0
      `}>
        <div className="flex flex-col h-full">
          {/* Mobile close button */}
          <div className="flex justify-end p-2 lg:hidden">
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-800 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {visibleItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl
                    transition-all duration-200 text-left animate-slide-in
                    ${isActive 
                      ? 'bg-gradient-to-r from-pink-500/20 to-sky-500/20 text-white border border-pink-500/30' 
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                    }
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-pink-400' : ''}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800">
            <div className="text-center text-gray-600 text-sm">
              <p className="font-handwriting text-lg" style={{ 
                background: 'linear-gradient(135deg, #FFB6C1, #B0E0E6)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent' 
              }}>
                Famille Meay
              </p>
              <p className="mt-1 text-xs">© 2024</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
