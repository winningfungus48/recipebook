import { useTheme } from '../context';

export function SettingsTab() {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 pt-2">
      <section className="mt-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Appearance
        </h2>
        <div className="mt-2 rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">
            Choose your preferred color mode.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setThemeMode('light')}
              className={`min-h-[44px] rounded-xl border py-2 text-sm font-medium ${
                themeMode === 'light'
                  ? 'border-[#7C9A6E] bg-[#7C9A6E] text-white'
                  : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setThemeMode('dark')}
              className={`min-h-[44px] rounded-xl border py-2 text-sm font-medium ${
                themeMode === 'dark'
                  ? 'border-[#7C9A6E] bg-[#7C9A6E] text-white'
                  : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              Dark
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
