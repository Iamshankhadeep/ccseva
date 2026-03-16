import type React from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

type ViewType = 'dashboard' | 'live' | 'analytics' | 'terminal' | 'settings';

interface NavigationTabsProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  className?: string;
}

// Claude Code inspired icons with refined design
const DashboardIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <title>Dashboard</title>
    <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={1.5} />
    <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={1.5} />
    <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={1.5} />
    <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={1.5} />
  </svg>
);

const AnalyticsIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <title>Analytics</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M7 12v4m0 0v4m0-4h4m-4 0H3m14-8v8m0 0v4m0-4h4m-4 0h-4m-6-8V8m0 0V4m0 4h4m-4 0H3"
    />
  </svg>
);

const TerminalIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <title>Terminal</title>
    <rect x="2" y="4" width="20" height="16" rx="2" strokeWidth={1.5} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m7 10 2 2-2 2m4 0h4" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <title>Settings</title>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <circle cx="12" cy="12" r="3" strokeWidth={1.5} />
  </svg>
);

const tabs = [
  {
    id: 'dashboard' as ViewType,
    nameKey: 'navigation.dashboard',
    icon: DashboardIcon,
    descriptionKey: 'navigation.dashboardDesc',
  },
  {
    id: 'analytics' as ViewType,
    nameKey: 'navigation.analytics',
    icon: AnalyticsIcon,
    descriptionKey: 'navigation.analyticsDesc',
  },
  {
    id: 'terminal' as ViewType,
    nameKey: 'navigation.terminal',
    icon: TerminalIcon,
    descriptionKey: 'navigation.terminalDesc',
  },
  {
    id: 'settings' as ViewType,
    nameKey: 'navigation.settings',
    icon: SettingsIcon,
    descriptionKey: 'navigation.settingsDesc',
  },
];

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  currentView,
  onNavigate,
  className = '',
}) => {
  const { t } = useTranslation();

  return (
    <Tabs
      value={currentView}
      onValueChange={(value) => onNavigate(value as ViewType)}
      className={`${className} w-full`}
    >
      <TabsList className="grid w-full grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-2 justify-center min-w-0"
              title={t(tab.descriptionKey)}
            >
              <IconComponent />
              <span className="hidden sm:inline font-primary text-xs">{t(tab.nameKey)}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
};
