import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { moduleService, type ActiveModule } from '../../../modules/modules/services/module.service';

/** Forçar exibir todos os itens de módulo no menu (Simulador, IRPF, etc.) sem depender de /modules/active. No publicado (Cloudflare) evita que o menu fique vazio se a API no Render não retornar todos os módulos. */
const FORCE_SHOW_ALL_MODULES = true;

/** Nomes de exibição dos módulos (mesmas categorias originais) */
const MODULE_DISPLAY_NAMES: Record<string, string> = {
  FISCAL_FILES: 'Arquivos Fiscais',
  RATING_VALIDATOR: 'Análise de Capacidade',
  SIMULADOR_IN_2306: 'Simulador LC 224/2025',
  IRPF_ALTA_RENDA: 'Tributação de Dividendos',
  GESTAO_IMOVEIS: 'Gestão Imobiliária',
};

interface MenuItem {
  name: string;
  path?: string;
  icon: React.ReactNode;
  children?: MenuItem[];
  badge?: string | number;
  moduleKey?: string; // Chave do módulo para verificar se está ativo
}

interface MenuCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  items: MenuItem[];
  /** Quando definido, a categoria é um link direto (clique navega, sem submenu) */
  directLink?: string;
}

/** Ícones de categoria (SVG inline, w-5 h-5) - conforme design IATax */
const CATEGORY_ICONS = {
  /** Início: grade 2x2 (dashboard) */
  home: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={2} />
      <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={2} />
      <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={2} />
      <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={2} />
    </svg>
  ),
  /** Transação Tributária: balança de pratos */
  balanceScale: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v5M12 8v9M4 8h16M8 8l2 4 2-4M8 17l2-4 2 4M6 12H4a1 1 0 000 2h2a1 1 0 100-2zM20 12h-2a1 1 0 100 2h2a1 1 0 100-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 14v4M18 14v4M6 18h12" />
    </svg>
  ),
  /** Simulador LC 224: cavalete com gráfico de tendência */
  chartEasel: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 18v-4h16v4M4 18h16M6 18v4M18 18v4M12 5v9M10 14l2-2 2 2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10l2 2 2-2 2 2" />
    </svg>
  ),
  /** IRPF Alta Renda: diamante (Font Awesome fa-diamond) */
  diamond: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 512 512" aria-hidden="true">
      <path d="M284.3 11.7c-15.6-15.6-40.9-15.6-56.6 0l-216 216c-15.6 15.6-15.6 40.9 0 56.6l216 216c15.6 15.6 40.9 15.6 56.6 0l216-216c15.6-15.6 15.6-40.9 0-56.6l-216-216z" />
    </svg>
  ),
  /** Gestão Imobiliária: prédio com janelas */
  building: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      <rect x="8" y="9" width="2" height="2" strokeWidth={2} />
      <rect x="14" y="9" width="2" height="2" strokeWidth={2} />
      <rect x="8" y="14" width="2" height="2" strokeWidth={2} />
      <rect x="14" y="14" width="2" height="2" strokeWidth={2} />
    </svg>
  ),
  /** Administração: engrenagem + sliders verticais */
  cogSliders: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 6v2m0 8v2M19 7h-3m0 10h-3M19 17h-3m0-10h-3" />
      <circle cx="19" cy="7" r="1" fill="currentColor" />
      <circle cx="19" cy="17" r="1" fill="currentColor" />
    </svg>
  ),
  creditCard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  document: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
};

// Menu Super Admin (gestão global do sistema)
const superAdminMenuItems: MenuItem[] = [
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
    path: '/tenants',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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
  {
    name: 'Gerenciar Módulos',
    path: '/modules',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: 'Editais PGFN',
    path: '/editais',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    name: 'Gestão de Usuários',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    children: [
      {
        name: 'Administradores',
        path: '/administrators',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
      },
      {
        name: 'Clientes',
        path: '/users',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
      },
    ],
  },
];

// Menu Administrativo (admin de tenant)
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
    name: 'Meu plano',
    path: '/meu-plano',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    name: 'Faturas e pagamento',
    path: '/gestao-assinatura',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
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
  // Arquivos Fiscais – escondido por hora (descomentar o bloco abaixo para exibir de novo)
  // { name: 'Arquivos Fiscais', moduleKey: 'FISCAL_FILES', icon: <svg>...</svg>, children: [...] },
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
    name: 'Análise de Capacidade',
    moduleKey: 'RATING_VALIDATOR',
    path: '/rating-validator',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    name: 'Simular Impacto Tributário',
    moduleKey: 'SIMULADOR_IN_2306',
    path: '/simulador-in-2306',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    name: 'Tributação de Dividendos',
    moduleKey: 'IRPF_ALTA_RENDA',
    path: '/irpf-alta-renda',
    icon: CATEGORY_ICONS.diamond,
  },
  {
    name: 'Gestão Imobiliária',
    moduleKey: 'GESTAO_IMOVEIS',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    children: [
      {
        name: 'Simulador PF vs PJ vs Reforma',
        path: '/properties/simulador',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        ),
      },
    ],
  },
];

// Menu de Módulos (exemplo - será expandido conforme módulos forem adicionados)
// const moduleMenuItems: MenuItem[] = [
//   {
//     name: 'Módulo Exemplo',
//     icon: (
//       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
//       </svg>
//     ),
//     children: [
//       {
//         name: 'Submenu 1',
//         path: '/module-example/submenu1',
//         icon: (
//           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//           </svg>
//         ),
//       },
//       {
//         name: 'Submenu 2',
//         path: '/module-example/submenu2',
//         icon: (
//           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//           </svg>
//         ),
//       },
//     ],
//   },
// ];

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ isOpen = false, onToggle, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const { user, tenantId } = useAuth();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeModules, setActiveModules] = useState<Map<string, ActiveModule>>(new Map());
  const [isLoadingModules, setIsLoadingModules] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;

  const loadActiveModules = async () => {
    // Não setar loading aqui pois já é setado antes de chamar a função
    try {
      const modules = await moduleService.listActive();
      const moduleMap = new Map<string, ActiveModule>(modules.map((m: ActiveModule) => [m.key, m]));
      setActiveModules(moduleMap);
    } catch (error) {
      console.error('Error loading active modules:', error);
      setActiveModules(new Map());
    } finally {
      setIsLoadingModules(false);
    }
  };

  const loadAllModules = async () => {
    try {
      const modules = await moduleService.listAvailable();
      // Converter Module[] para ActiveModule[] (sem enabled_until)
      const moduleMap = new Map<string, ActiveModule>(modules.map((m: ActiveModule) => [m.key, { ...m, enabled_until: undefined }]));
      setActiveModules(moduleMap);
    } catch (error) {
      console.error('Error loading all modules:', error);
      setActiveModules(new Map());
    } finally {
      setIsLoadingModules(false);
    }
  };

  // Carregar módulos ativos do tenant
  useEffect(() => {
    if (!isSuperAdmin && tenantId) {
      // Inicializar como loading para evitar mostrar itens que vão sumir
      setIsLoadingModules(true);
      loadActiveModules();
    } else if (isSuperAdmin) {
      // Super admin vê todos os módulos disponíveis
      setIsLoadingModules(true);
      loadAllModules();
    } else {
      setActiveModules(new Map());
      setIsLoadingModules(false);
    }
  }, [tenantId, isSuperAdmin]);

  // Recarregar módulos silenciosamente quando voltar da página de módulos
  // (pode ter sido ativado/desativado um módulo)
  const previousPathRef = useRef<string>('');
  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousPathRef.current;
    
    // Se estava na página de módulos e saiu, recarregar silenciosamente
    if (!isSuperAdmin && tenantId && previousPath === '/modules' && currentPath !== '/modules') {
      const reloadModules = async () => {
        try {
          const modules = await moduleService.listActive();
          const moduleMap = new Map<string, ActiveModule>(modules.map((m: ActiveModule) => [m.key, m]));
          setActiveModules(moduleMap);
        } catch (error) {
          console.error('Error reloading active modules:', error);
        }
      };
      reloadModules();
    }
    
    previousPathRef.current = currentPath;
  }, [location.pathname, isSuperAdmin, tenantId]);

  // Atalho de teclado para busca (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory((prev) => (prev === categoryId ? null : categoryId));
  };

  /** Retorna o id da categoria que contém a rota ativa (para auto-expansão) */
  const getCategoryIdForPath = (pathname: string): string | null => {
    if (pathname === '/dashboard') return null;
    if (isSuperAdmin) {
      if (['/tenants', '/plans', '/modules', '/editais', '/administrators', '/users'].includes(pathname)) return 'administracao';
    } else {
      if (pathname === '/meu-plano' || pathname === '/gestao-assinatura' || pathname === '/clients') return 'administracao';
      if (pathname === '/rating-validator') return 'rating_validator';
      if (pathname === '/simulador-in-2306') return 'simulador_in_2306';
      if (pathname === '/irpf-alta-renda') return 'irpf_alta_renda';
      if (pathname.startsWith('/properties')) return 'gestao_imoveis';
      if (pathname === '/users') return 'administracao';
    }
    return null;
  };

  useEffect(() => {
    const categoryId = getCategoryIdForPath(location.pathname);
    if (categoryId) setExpandedCategory(categoryId);
  }, [location.pathname, isSuperAdmin]);

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

  const categoryHasActiveItem = (cat: MenuCategory): boolean =>
    cat.items.some(
      (item) =>
        isParentActive(item) || (item.children?.some((c) => isActive(c.path)) ?? false)
    );

  /** Constrói categorias (Início + módulos + Administração por último) */
  const buildCategories = (items: MenuItem[]): MenuCategory[] => {
    const categories: MenuCategory[] = [];

    // Início: link direto para /dashboard (sem submenu)
    categories.push({ id: 'inicio', name: 'Início', icon: CATEGORY_ICONS.home, items: [], directLink: '/dashboard' });

    if (isSuperAdmin) {
      const get = (path?: string, name?: string) =>
        items.find((i) => (path && i.path === path) || (name && i.name === name));
      const tenants = get('/tenants');
      const plans = get('/plans');
      const modules = get('/modules');
      const editais = get('/editais');
      const gestaoUsuarios = get(undefined, 'Gestão de Usuários');

      const adminItems: MenuItem[] = [tenants, plans, modules, editais].filter(Boolean) as MenuItem[];
      if (gestaoUsuarios) {
        adminItems.push(...(gestaoUsuarios.children ?? [gestaoUsuarios]));
      }
      if (adminItems.length)
        categories.push({ id: 'administracao', name: 'Administração', icon: CATEGORY_ICONS.cogSliders, items: adminItems });
      return categories;
    }

    // Admin de tenant: módulos primeiro, Administração por último
    const get = (path?: string, name?: string, moduleKey?: string) =>
      items.find((i) => (path && i.path === path) || (name && i.name === name) || (moduleKey && i.moduleKey === moduleKey));
    const meuPlano = get('/meu-plano');
    const faturas = get('/gestao-assinatura');
    const clientes = get('/clients');
    const gestaoUsuarios = get('/users', 'Gestão de Usuários');
    const rating = get(undefined, undefined, 'RATING_VALIDATOR');
    const simulador = get(undefined, undefined, 'SIMULADOR_IN_2306');
    const irpf = get(undefined, undefined, 'IRPF_ALTA_RENDA');
    const gestaoImoveis = get(undefined, undefined, 'GESTAO_IMOVEIS');

    const moduleOrder: Array<{ key: string; item: MenuItem | undefined }> = [
      { key: 'RATING_VALIDATOR', item: rating },
      { key: 'SIMULADOR_IN_2306', item: simulador },
      { key: 'IRPF_ALTA_RENDA', item: irpf },
      { key: 'GESTAO_IMOVEIS', item: gestaoImoveis },
    ];
    const moduleIcons: Record<string, React.ReactNode> = {
      RATING_VALIDATOR: CATEGORY_ICONS.balanceScale,
      SIMULADOR_IN_2306: CATEGORY_ICONS.chartEasel,
      IRPF_ALTA_RENDA: CATEGORY_ICONS.diamond,
      GESTAO_IMOVEIS: CATEGORY_ICONS.building,
    };
    moduleOrder.forEach(({ key, item }) => {
      if (item) {
        const moduleName = activeModules.get(key)?.name || MODULE_DISPLAY_NAMES[key] || key;
        categories.push({ id: key.toLowerCase(), name: moduleName, icon: moduleIcons[key] ?? item.icon, items: [item] });
      }
    });

    const adminItems: MenuItem[] = [meuPlano, faturas, clientes].filter(Boolean) as MenuItem[];
    if (gestaoUsuarios) adminItems.push(gestaoUsuarios);
    if (adminItems.length)
      categories.push({ id: 'administracao', name: 'Administração', icon: CATEGORY_ICONS.cogSliders, items: adminItems });
    return categories;
  };

  // Filtrar itens do menu baseado na busca e módulos ativos
  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    let filtered = items;

    // Filtrar por módulos ativos (apenas para admin de tenant, não super_admin)
    if (!isSuperAdmin && !FORCE_SHOW_ALL_MODULES) {
      // Itens sem moduleKey (Dashboard, Clientes, etc.) sempre aparecem
      // Só itens com moduleKey dependem da resposta de /modules/active
      filtered = items.filter((item) => {
        if (item.moduleKey) {
          if (isLoadingModules) return false;
          return activeModules.has(item.moduleKey);
        }
        return true;
      });
    }

    // Filtrar por busca
    if (!searchQuery) return filtered;
    
    return filtered.filter(item => {
      const matchesName = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesChildren = item.children?.some(child => 
        child.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return matchesName || matchesChildren;
    }).map(item => {
      if (item.children) {
        return {
          ...item,
          children: item.children.filter(child =>
            child.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        };
      }
      return item;
    });
  };

  /** Renderiza um link de item do menu */
  const renderMenuLink = (item: MenuItem, isChild = false) => {
    const active = item.path ? isActive(item.path) : false;
    return (
      <li key={item.name}>
        <Link
          to={item.path || '#'}
          title={item.name}
          className={`
            flex items-center gap-3 rounded-lg transition-all duration-200
            ${isCollapsed ? 'lg:justify-center lg:px-2 lg:py-3' : 'items-start px-4 py-3'}
            group relative
            ${active 
              ? 'bg-brand/10 text-brand font-semibold shadow-sm' 
              : 'text-slate-700 hover:bg-slate-50 hover:text-brand'
            }
            ${isChild ? 'ml-2 text-sm' : ''}
            focus:outline-none focus:ring-2 focus:ring-brand/20 focus:ring-offset-2
          `}
          aria-current={active ? 'page' : undefined}
        >
          <span className={`
            flex-shrink-0 transition-colors duration-200 mt-0.5
            ${active ? 'text-brand' : 'text-slate-500 group-hover:text-brand'}
            ${isCollapsed ? 'lg:mt-0' : ''}
          `}>
            {item.icon}
          </span>
          {!isCollapsed && (
            <>
              <span className="break-words min-w-0 flex-1 text-left leading-snug">{item.name}</span>
              {item.badge && (
                <span className="ml-auto flex-shrink-0 bg-brand text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </>
          )}
          {active && !isCollapsed && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand rounded-r-full" aria-hidden="true" />
          )}
        </Link>
      </li>
    );
  };

  /** Renderiza os itens de uma categoria (links ou filhos de itens com children) */
  const renderCategoryItems = (cat: MenuCategory) => {
    const itemsToRender: MenuItem[] = [];
    cat.items.forEach((item) => {
      if (item.children && item.children.length > 0 && !item.path) {
        itemsToRender.push(...item.children);
      } else {
        itemsToRender.push(item);
      }
    });
    return itemsToRender.map((item) => renderMenuLink(item, false));
  };

  const menuItems = isSuperAdmin ? superAdminMenuItems : adminMenuItems;
  const filteredMenuItems = filterMenuItems(menuItems);
  const categories = buildCategories(filteredMenuItems);

  return (
    <>
      {/* Overlay para mobile quando sidebar está aberto */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      <aside 
        className={`
          fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50
          w-64 h-screen max-h-screen
          bg-white border-r border-slate-200
          flex flex-col
          transform transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          shadow-xl lg:shadow-none
          w-64 ${isCollapsed ? 'lg:w-16' : ''}
        `}
        aria-label="Navegação principal"
      >
        {/* Logo e botão de colapsar */}
        <div className={`border-b border-slate-200 flex items-center flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'p-2 lg:flex-col lg:gap-2' : 'p-4 flex-row justify-between'}`}>
          <Link
            to="/dashboard"
            aria-label="Ir para início"
            className={`flex items-center min-w-0 flex-1 rounded-lg transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:ring-offset-2 ${isCollapsed ? 'lg:flex-1 lg:justify-center' : 'gap-3'}`}
          >
            <img
              src="/logo-iatax.png"
              alt="IATax"
              className="w-10 h-10 flex-shrink-0 object-contain rounded-lg"
            />
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-slate-900 break-words leading-tight">
                  IATax
                </h1>
                <p className="text-xs text-slate-500 break-words leading-tight">Soluções Inteligentes</p>
              </div>
            )}
          </Link>
          <div className="flex items-center gap-1">
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
                aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
                title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
              >
                <svg
                  className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            )}
            <button
              onClick={onToggle}
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              aria-label="Fechar menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Busca rápida - oculta quando recolhido */}
        {!isCollapsed && (
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <svg 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar no menu (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-9 pr-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all bg-slate-50 hover:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                aria-label="Limpar busca"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        )}

        {/* Menu - Categorias em accordion (1 expandida por vez) */}
        <nav className={`flex-1 min-h-0 overflow-y-auto overscroll-contain transition-all duration-300 ${isCollapsed ? 'p-2 lg:px-2' : 'p-4'}`}>
          {isLoadingModules && !FORCE_SHOW_ALL_MODULES && (
            <div className="px-4 py-2 text-center">
              <p className="text-xs text-slate-400">Carregando módulos...</p>
            </div>
          )}
          {isAdmin && (FORCE_SHOW_ALL_MODULES || !isLoadingModules) && categories.map((cat) => {
            const hasActive = cat.directLink ? isActive(cat.directLink) : categoryHasActiveItem(cat);

            if (cat.directLink) {
              return (
                <div key={cat.id} className="mb-2">
                  <Link
                    to={cat.directLink}
                    title={cat.name}
                    className={`
                      w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200
                      group relative
                      ${hasActive ? 'bg-brand/5 text-brand' : 'text-slate-700 hover:bg-slate-50 hover:text-brand'}
                      ${isCollapsed ? 'lg:justify-center lg:px-2' : ''}
                      focus:outline-none focus:ring-2 focus:ring-brand/20 focus:ring-offset-2
                    `}
                  >
                    <span className={`flex-shrink-0 ${hasActive ? 'text-brand' : 'text-slate-500 group-hover:text-brand'}`}>
                      {cat.icon}
                    </span>
                    {!isCollapsed && (
                      <span className="text-sm font-semibold break-words text-left leading-snug">{cat.name}</span>
                    )}
                  </Link>
                </div>
              );
            }

            if (cat.items.length === 0) return null;
            const isExpanded = expandedCategory === cat.id;
            const panelId = `category-panel-${cat.id}`;
            const buttonId = `category-btn-${cat.id}`;

            return (
              <div key={cat.id} className="mb-2">
                <button
                  id={buttonId}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  onClick={() => {
                    if (isCollapsed && onToggleCollapse) onToggleCollapse();
                    toggleCategory(cat.id);
                  }}
                  title={cat.name}
                  className={`
                    w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200
                    group relative
                    ${hasActive ? 'bg-brand/5 text-brand' : 'text-slate-700 hover:bg-slate-50 hover:text-brand'}
                    ${isCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between'}
                    focus:outline-none focus:ring-2 focus:ring-brand/20 focus:ring-offset-2
                  `}
                >
                  <div className={`flex items-center min-w-0 flex-1 gap-3 ${isCollapsed ? 'lg:justify-center' : ''}`}>
                    <span className={`flex-shrink-0 ${hasActive ? 'text-brand' : 'text-slate-500 group-hover:text-brand'}`}>
                      {cat.icon}
                    </span>
                    {!isCollapsed && (
                      <span className="text-sm font-semibold break-words text-left leading-snug">{cat.name}</span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <svg
                      className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''} ${hasActive ? 'text-brand' : 'text-slate-400'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={`
                    overflow-hidden transition-all duration-300 ease-in-out
                    ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
                  `}
                >
                  <ul className={`mt-1 space-y-0.5 ${!isCollapsed ? 'pl-1' : ''}`}>
                    {renderCategoryItems(cat)}
                  </ul>
                </div>
              </div>
            );
          })}

          {searchQuery && categories.length === 0 && (
            <div className="px-4 py-8 text-center">
              <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm text-slate-500">Nenhum item encontrado</p>
            </div>
          )}
        </nav>

        {/* User Info */}
        <div className={`border-t border-slate-200 bg-slate-50/50 flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'p-2 lg:flex lg:justify-center' : 'p-4'}`}>
          <div className={`flex items-center ${isCollapsed ? 'lg:flex-col lg:gap-1' : 'space-x-3'}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-brand/20 to-brand/10 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-brand/20" title={user?.name ?? ''}>
              <span className="text-brand font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 break-words leading-snug">{user?.name}</p>
              <p className="text-xs text-slate-500 break-words leading-snug">{user?.email}</p>
            </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
