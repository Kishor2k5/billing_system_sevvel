import React, { useState, useEffect } from 'react';
import './Settings.css';

const DEFAULT_SETTINGS = {
  companyName: 'SEVVEL GARMENTS',
  companyPhone: '8667488669',
  companyEmail: 'info@sevvel.com',
  companyAddress: '',
  taxId: '',
  pan: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  branchName: '',
  accountHolderName: '',
  invoiceLogo: '',
  notifications: true,
  darkMode: false,
  defaultCurrency: 'INR',
  decimalPlaces: 2,
};

const Settings = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  try {
    const currentHost = window.location.host;
    if (!API_BASE_URL || API_BASE_URL.includes(currentHost)) {
      API_BASE_URL = 'http://localhost:5000';
    }
  } catch (e) {
    API_BASE_URL = 'http://localhost:5000';
  }

  useEffect(() => {
    const loadSettings = async () => {
      const storedSettings = localStorage.getItem('appSettings');
      if (storedSettings) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) });
        } catch (e) {
          setSettings(DEFAULT_SETTINGS);
        }
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/settings`);
        const data = await res.json();
        if (res.ok && data?.settings) {
          const merged = { ...DEFAULT_SETTINGS, ...data.settings };
          setSettings(merged);
          localStorage.setItem('appSettings', JSON.stringify(merged));
        }
      } catch (error) {
        console.error('Failed to load settings from server', error);
      }
    };

    loadSettings();
  }, [API_BASE_URL]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to save settings');

      const merged = { ...DEFAULT_SETTINGS, ...(data.settings || settings) };
      setSettings(merged);
      localStorage.setItem('appSettings', JSON.stringify(merged));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings', error);
      alert(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(DEFAULT_SETTINGS),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Failed to reset settings');

        const merged = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
        setSettings(merged);
        localStorage.setItem('appSettings', JSON.stringify(merged));
      } catch (error) {
        console.error('Failed to reset settings', error);
        alert(error.message || 'Failed to reset settings');
      }
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your application preferences and configuration</p>
      </div>

      {saved && <div className="toast-notification success">✓ Settings saved successfully!</div>}

      <div className="settings-grid">
        {/* Company Information */}
        <div className="settings-section">
          <div className="section-header">
            <h2>🏢 Company Information</h2>
          </div>
          <form className="settings-form">
            <div className="form-row">
              <div className="form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  name="companyName"
                  value={settings.companyName}
                  onChange={handleChange}
                  placeholder="Enter company name"
                />
              </div>
              <div className="form-group">
                <label>Company Phone</label>
                <input
                  type="tel"
                  name="companyPhone"
                  value={settings.companyPhone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Company Email</label>
                <input
                  type="email"
                  name="companyEmail"
                  value={settings.companyEmail}
                  onChange={handleChange}
                  placeholder="Enter email address"
                />
              </div>
              <div className="form-group">
                <label>Tax ID / GST</label>
                <input
                  type="text"
                  name="taxId"
                  value={settings.taxId}
                  onChange={handleChange}
                  placeholder="Enter GST number"
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label>PAN</label>
              <input
                type="text"
                name="pan"
                value={settings.pan}
                onChange={handleChange}
                placeholder="Enter PAN"
              />
            </div>

            <div className="form-group full-width">
              <label>Company Address</label>
              <textarea
                name="companyAddress"
                value={settings.companyAddress}
                onChange={handleChange}
                placeholder="Enter complete company address"
                rows="3"
              />
            </div>
          </form>
        </div>

        {/* Bank Information */}
        <div className="settings-section">
          <div className="section-header">
            <h2>🏦 Bank Information</h2>
          </div>
          <form className="settings-form">
            <div className="form-group full-width">
              <label>Account Holder Name</label>
              <input
                type="text"
                name="accountHolderName"
                value={settings.accountHolderName}
                onChange={handleChange}
                placeholder="Enter account holder name"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Bank Name</label>
                <input
                  type="text"
                  name="bankName"
                  value={settings.bankName}
                  onChange={handleChange}
                  placeholder="Enter bank name"
                />
              </div>
              <div className="form-group">
                <label>Account Number</label>
                <input
                  type="text"
                  name="accountNumber"
                  value={settings.accountNumber}
                  onChange={handleChange}
                  placeholder="Enter account number"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>IFSC Code</label>
                <input
                  type="text"
                  name="ifscCode"
                  value={settings.ifscCode}
                  onChange={handleChange}
                  placeholder="Enter IFSC code"
                />
              </div>
              <div className="form-group">
                <label>Branch Name</label>
                <input
                  type="text"
                  name="branchName"
                  value={settings.branchName}
                  onChange={handleChange}
                  placeholder="Enter branch name"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Display Settings */}
        <div className="settings-section">
          <div className="section-header">
            <h2>⚙️ Display Settings</h2>
          </div>
          <form className="settings-form">
            <div className="form-row">
              <div className="form-group">
                <label>Default Currency</label>
                <select
                  name="defaultCurrency"
                  value={settings.defaultCurrency}
                  onChange={handleChange}
                >
                  <option value="INR">Indian Rupee (₹)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Decimal Places</label>
                <input
                  type="number"
                  name="decimalPlaces"
                  value={settings.decimalPlaces}
                  onChange={handleChange}
                  min="0"
                  max="4"
                />
              </div>
            </div>

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="notifications"
                  checked={settings.notifications}
                  onChange={handleChange}
                />
                <span>Enable Notifications</span>
              </label>
            </div>

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="darkMode"
                  checked={settings.darkMode}
                  onChange={handleChange}
                  disabled
                />
                <span>Dark Mode (Coming Soon)</span>
              </label>
            </div>
          </form>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn-save" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : '💾 Save Settings'}
        </button>
        <button className="btn-reset" onClick={handleReset}>
          🔄 Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export default Settings;
