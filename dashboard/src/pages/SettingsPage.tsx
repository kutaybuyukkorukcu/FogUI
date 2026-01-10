export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-yellow-900 mb-2">Coming Soon</h2>
        <p className="text-sm text-yellow-800">
          Settings page is under construction. You'll soon be able to:
        </p>
        <ul className="mt-2 list-disc list-inside text-sm text-yellow-800 space-y-1">
          <li>Update your email address</li>
          <li>Change your password</li>
          <li>Delete your account</li>
          <li>Manage notification preferences</li>
        </ul>
      </div>
    </div>
  );
}
