import { useEffect, useState } from 'react';
import { api, UsageStats } from '../api/client';

export default function UsagePage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getUsageStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (error) return <div className="text-red-600 text-center py-12">{error}</div>;
  if (!stats) return null;

  const { currentPeriod } = stats;
  const usagePercent = Math.min(
    (currentPeriod.transforms / currentPeriod.quota) * 100,
    100
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usage & Billing</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your API usage and quota limits
        </p>
      </div>

      {/* Usage Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Current Period</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-600">Total Transforms</p>
            <p className="mt-2 text-3xl font-bold text-blue-900">
              {currentPeriod.transforms}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
             <p className="text-sm font-medium text-green-600">Remaining Quota</p>
             <p className="mt-2 text-3xl font-bold text-green-900">
               {currentPeriod.quota === -1 ? 'Unlimited' : currentPeriod.remaining}
             </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-purple-600">Monthly Limit</p>
            <p className="mt-2 text-3xl font-bold text-purple-900">
              {currentPeriod.quota === -1 ? 'Unlimited' : currentPeriod.quota}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {currentPeriod.quota !== -1 && (
          <div>
            <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
              <span>Usage</span>
              <span>{usagePercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className={`h-4 rounded-full ${
                  usagePercent > 90 ? 'bg-red-500' : 'bg-blue-600'
                }`}
                style={{ width: `${usagePercent}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* History Placeholder */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">History</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Transforms</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stats.history.map((day, idx) => (
              <tr key={idx}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.date}</td>
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{day.transforms}</td>
              </tr>
            ))}
            {stats.history.length === 0 && (
                <tr>
                    <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">No history available yet.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
