import { UsageStats, api } from '../api/client';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const data = await api.getUsageStats();
      setUsage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (error) {
    return (
      <div className="rounded-md bg-yellow-50 p-4">
        <p className="text-sm text-yellow-800">
          {error} <em>(Usage endpoint needs to be implemented in backend)</em>
        </p>
      </div>
    );
  }

  const percentUsed = usage
    ? (usage.currentPeriod.transforms / usage.currentPeriod.quota) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor your API usage and performance
        </p>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500">This Month</div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">
                  {usage?.currentPeriod.transforms || 0}
                </div>
                <div className="text-sm text-gray-500">transforms</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500">Quota</div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">
                  {usage?.currentPeriod.quota || 1000}
                </div>
                <div className="text-sm text-gray-500">per month</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500">Remaining</div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">
                  {usage?.currentPeriod.remaining || usage?.currentPeriod.quota || 1000}
                </div>
                <div className="text-sm text-gray-500">transforms left</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Progress Bar */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Monthly Usage</h2>
        <div className="relative">
          <div className="overflow-hidden h-4 text-xs flex rounded bg-gray-200">
            <div
              style={{ width: `${percentUsed}%` }}
              className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                percentUsed > 80 ? 'bg-red-500' : percentUsed > 50 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {percentUsed.toFixed(1)}% of quota used
          </p>
        </div>
      </div>

      {/* Quick Start */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-blue-900 mb-2">Quick Start</h2>
        <p className="text-sm text-blue-800 mb-4">
          Get started with FogUI in 3 simple steps:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>Create an API key in the <a href="/api-keys" className="font-medium underline">API Keys</a> section</li>
          <li>Install the SDK: <code className="bg-blue-100 px-2 py-1 rounded">npm install @fogui/react</code></li>
          <li>Check out the <a href="https://fogui.dev/docs" className="font-medium underline">documentation</a></li>
        </ol>
      </div>
    </div>
  );
}
