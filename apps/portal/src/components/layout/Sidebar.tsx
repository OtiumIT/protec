import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';

interface MenuItem {
  name: string;
  path?: string;
  icon: React.ReactNode;
  children?: MenuItem[];
}

// Menu Administrativo (só admin)
const adminMenuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: 'Gestão de Clientes',
    path: '/clients',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    name: 'Gestão de Usuários',
    path: '/users',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    name: 'Gestão de Planos',
    path: '/plans',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

// Menu de Módulos (exemplo - será expandido conforme módulos forem adicionados)
const moduleMenuItems: MenuItem[] = [
  {
    name: 'Módulo Exemplo',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    children: [
      {
        name: 'Submenu 1',
        path: '/module-example/submenu1',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        ),
      },
      {
        name: 'Submenu 2',
        path: '/module-example/submenu2',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        ),
      },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  const isAdmin = user?.role === 'admin';

  const toggleMenu = (menuName: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuName)) {
      newExpanded.delete(menuName);
    } else {
      newExpanded.add(menuName);
    }
    setExpandedMenus(newExpanded);
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path;
  };

  const isParentActive = (item: MenuItem): boolean => {
    if (item.path && isActive(item.path)) return true;
    if (item.children) {
      return item.children.some((child) => isActive(child.path));
    }
    return false;
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.has(item.name);
    const active = isParentActive(item);

    if (hasChildren) {
      return (
        <li key={item.name}>
          <button
            onClick={() => toggleMenu(item.name)}
            className={`
              w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all
              ${active ? 'bg-brand/10 text-brand font-semibold' : 'text-slate-700 hover:bg-brand/5 hover:text-brand'}
            `}
          >
            <div className="flex items-center space-x-3">
              <span className={active ? 'text-brand' : 'text-slate-500'}>
                {item.icon}
              </span>
              <span>{item.name}</span>
            </div>
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {isExpanded && (
            <ul className="mt-1 ml-4 space-y-1 border-l-2 border-brand/20 pl-4">
              {item.children?.map((child) => {
                const childActive = isActive(child.path);
                return (
                  <li key={child.name}>
                    <Link
                      to={child.path || '#'}
                      className={`
                        flex items-center space-x-2 px-4 py-2 rounded-lg transition-all text-sm
                        ${childActive ? 'bg-brand/10 text-brand font-semibold' : 'text-slate-600 hover:bg-brand/5 hover:text-brand'}
                      `}
                    >
                      <span className={childActive ? 'text-brand' : 'text-slate-400'}>
                        {child.icon}
                      </span>
                      <span>{child.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      );
    }

    return (
      <li key={item.name}>
        <Link
          to={item.path || '#'}
          className={`
            flex items-center space-x-3 px-4 py-3 rounded-lg transition-all
            ${active ? 'bg-brand/10 text-brand font-semibold' : 'text-slate-700 hover:bg-brand/5 hover:text-brand'}
          `}
        >
          <span className={active ? 'text-brand' : 'text-slate-500'}>
            {item.icon}
          </span>
          <span>{item.name}</span>
        </Link>
      </li>
    );
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center">
            <span className="text-otium-black font-bold text-xl">O</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Otium<span className="text-brand">IT</span>
            </h1>
            <p className="text-xs text-slate-500">SaaS Boilerplate</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {/* Seção Administrativo */}
        {isAdmin && (
          <div className="mb-6">
            <h3 className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Administrativo
            </h3>
            <ul className="space-y-1">
              {adminMenuItems.map((item) => renderMenuItem(item))}
            </ul>
          </div>
        )}

        {/* Seção Módulos */}
        <div>
          <h3 className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Módulos
          </h3>
          <ul className="space-y-1">
            {moduleMenuItems.map((item) => renderMenuItem(item))}
          </ul>
        </div>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-brand/10 rounded-full flex items-center justify-center">
            <span className="text-brand font-semibold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
