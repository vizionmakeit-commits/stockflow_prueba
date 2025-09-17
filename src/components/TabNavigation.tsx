import React, { useState } from 'react';
import { Home, CheckSquare, Settings, Package, FileText, Menu, X } from 'lucide-react';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'HOME', label: 'HOME', icon: Home, shortLabel: 'Home' },
    { id: 'UPDATE_UNIDADES', label: 'Update por Unidades', icon: Package, shortLabel: 'Unidades' },
    { id: 'UPDATE_RECETAS', label: 'Update por Recetas', icon: CheckSquare, shortLabel: 'Recetas' },
    { id: 'CONTROL_TRANSACCIONES', label: 'Control Transacciones', icon: FileText, shortLabel: 'Transacciones' },
    { id: 'ADMINISTRACION', label: 'ADMINISTRACION', icon: Settings, shortLabel: 'Admin' }
  ];

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    setMobileMenuOpen(false); // Cerrar menú mobile al seleccionar
  };

  return (
    <>
      {/* Desktop y Tablet Navigation */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Mobile Menu Button - Solo visible en mobile */}
          <div className="flex items-center justify-between h-16 md:hidden">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {tabs.find(tab => tab.id === activeTab)?.icon && 
                  React.createElement(tabs.find(tab => tab.id === activeTab)!.icon, { className: "h-5 w-5 text-blue-600" })
                }
                <span className="font-medium text-gray-900">
                  {tabs.find(tab => tab.id === activeTab)?.shortLabel}
                </span>
              </div>
            </div>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 text-gray-600" />
              ) : (
                <Menu className="h-5 w-5 text-gray-600" />
              )}
            </button>
          </div>

          {/* Tablet Horizontal Scroll Navigation */}
          <nav className="hidden md:flex lg:hidden overflow-x-auto scrollbar-hide" aria-label="Tabs">
            <div className="flex space-x-1 min-w-max py-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`
                      flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap
                      ${isActive
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Desktop Full Navigation */}
          <nav className="hidden lg:flex space-x-8 py-4" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`
                    flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200
                    ${isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 shadow-lg">
          <div className="px-4 py-2 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`
                    w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default TabNavigation;