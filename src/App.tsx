import { useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { RecipeDetailView } from './components/RecipeDetailView';
import {
  CurrentWeekProvider,
  RecipesProvider,
  ThemeProvider,
  useTheme,
} from './context';
import { RecipesTab } from './tabs/RecipesTab';
import { SaveTab } from './tabs/SaveTab';
import { SettingsTab } from './tabs/SettingsTab';
import { MealPlanTab } from './tabs/MealPlanTab';
import { ScheduleTab } from './tabs/ThisWeekTab';
import type { TabId } from './types';

function MainLayout({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  const { themeMode } = useTheme();
  const dark = themeMode === 'dark';
  return (
    <div
      className={`mx-auto flex min-h-screen w-full max-w-[390px] flex-col pb-24 ${
        dark ? 'bg-gray-900 text-gray-100' : 'bg-[#E6DDD2]'
      }`}
    >
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeTab === 'save' && <SaveTab />}
        {activeTab === 'recipes' && <RecipesTab />}
        {activeTab === 'schedule' && <ScheduleTab />}
        {activeTab === 'mealplan' && <MealPlanTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('save');

  return (
    <HashRouter>
      <ThemeProvider>
        <RecipesProvider>
          <CurrentWeekProvider>
            <Routes>
              <Route path="/recipes/:id" element={<RecipeDetailView />} />
              <Route
                path="*"
                element={
                  <MainLayout
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                  />
                }
              />
            </Routes>
          </CurrentWeekProvider>
        </RecipesProvider>
      </ThemeProvider>
    </HashRouter>
  );
}
