'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import EntityForm, { FieldDefinition } from '@/components/admin/EntityForm';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [editions, setEditions] = useState<{label: string, value: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [sRes, eRes] = await Promise.all([
        fetch('/api/admin/settings'),
        fetch('/api/admin/editions')
      ]);
      
      const [sData, eData] = await Promise.all([sRes.json(), eRes.json()]);
      
      if (sData.success) {
        const settingsMap = sData.data.reduce((acc: any, curr: any) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {});
        setSettings(settingsMap);
      }
      
      if (eData.success) {
        setEditions(eData.data.map((e: any) => ({ label: e.name, value: e.id })));
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (formData: any) => {
    setIsSaving(true);

    try {
      // Save each setting (for now simple loop, or we could bulk update)
      const promises = Object.entries(formData).map(([key, value]) => 
        fetch('/api/admin/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ key, value }),
        })
      );
      
      await Promise.all(promises);
      fetchData();
      alert('Settings saved successfully');
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const fields: FieldDefinition[] = [
    { 
      name: 'currentEdition', 
      label: 'Primary Active Edition', 
      type: 'select', 
      options: editions,
      gridCols: 1 
    },
    { name: 'siteTitle', label: 'Site Title Override', type: 'text', gridCols: 1 },
    { name: 'maintenanceMode', label: 'System Maintenance Mode', type: 'switch', gridCols: 1 },
    { name: 'contactEmail', label: 'Global Contact Email', type: 'text', gridCols: 1 },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Global Settings</h1>
        <p className="text-sm text-white/40 font-mono">Configure core system parameters and network defaults.</p>
      </div>

      <div className="max-w-xl">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-white/5 rounded-lg" />
            <div className="h-10 bg-white/5 rounded-lg" />
            <div className="h-10 bg-white/5 rounded-lg" />
          </div>
        ) : (
          <EntityForm
            title="System Configuration"
            fields={fields}
            initialData={settings}
            isLoading={isSaving}
            isModal={false}
            onCancel={() => {}} // Not needed for a page form
            onSubmit={handleSave}
          />
        )}
      </div>

      <div className="max-w-xl mt-12 border-t border-white/5 pt-12">
        <h2 className="text-lg font-bold text-white mb-4">System Maintenance</h2>
        <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-xl">
          <p className="text-sm text-white/60 mb-6">
            Legacy content migration: Move existing data from the file system (.txt links) into the database. 
            This should only be performed once or when legacy files are updated externally.
          </p>
          <button
            onClick={async () => {
              if (confirm('Are you sure you want to migrate legacy text data? This will create new records in the database.')) {
                try {
                  const token = localStorage.getItem('adminToken');
                  const res = await fetch('/api/admin/migrate-txt', { 
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  const data = await res.json();
                  if (data.success) {
                    alert('Migration successful!');
                  } else {
                    alert('Migration failed: ' + data.error);
                  }
                } catch (err) {
                  alert('Error during migration');
                }
              }
            }}
            className="px-6 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs font-bold"
          >
            RUN LEGACY CONTENT MIGRATION
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
