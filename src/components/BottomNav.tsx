import type { TabId } from '../types';

const tabs: { id: TabId; label: string }[] = [
  { id: 'save', label: 'Save' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'mealplan', label: 'Meal Plan' },
  { id: 'settings', label: 'Settings' },
];

function TabIcon({ id, className }: { id: TabId; className?: string }) {
  const common = {
    className: `h-5 w-5 ${className ?? ''}`,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };

  switch (id) {
    case 'save':
      return (
        <svg {...common}>
          <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      );
    case 'recipes':
      return (
        <svg {...common}>
          <path d="M12 6.042A8.967 8.967 0 0 0 6 3v12c0 .964.448 1.856 1.217 2.433M12 6.042A8.967 8.967 0 0 1 18 3v12c0 .964-.448 1.856-1.217 2.433M6 15.182V18a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2.818M12 6.042V18" />
        </svg>
      );
    case 'schedule':
      return (
        <svg {...common}>
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 14h.01" />
          <path d="M12 14h.01" />
          <path d="M16 14h.01" />
          <path d="M8 18h.01" />
          <path d="M12 18h.01" />
          <path d="M16 18h.01" />
        </svg>
      );
    case 'mealplan':
      return (
        <svg {...common}>
          <path d="M4 4h16v4H4z" />
          <path d="M4 10h16v10H4z" />
          <path d="M8 14h8M8 17h5" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      );
  }
}

type Props = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

export function BottomNav({ activeTab, onTabChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-lg justify-around">
        {tabs.map(({ id, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs ${
                active ? 'text-[#7C9A6E]' : 'text-gray-400'
              }`}
            >
              <TabIcon id={id} />
              <span className="font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
