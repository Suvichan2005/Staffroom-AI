import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, Moon, Sun, Globe, Lock, User, Palette, 
  Monitor, Smartphone, Volume2, VolumeX, Shield,
  ChevronRight, Check, LogOut, Trash2, HelpCircle,
  Mail, MessageSquare
} from 'lucide-react';
import { PageShell } from '../components/layout';

/**
 * Settings Page - App preferences and configuration
 */
export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    sound: true,
  });
  const [language, setLanguage] = useState('en');

  const settingsSections = [
    {
      title: 'Appearance',
      icon: Palette,
      items: [
        {
          icon: darkMode ? Moon : Sun,
          label: 'Dark Mode',
          desc: 'Toggle dark/light theme',
          type: 'toggle',
          value: darkMode,
          onChange: () => setDarkMode(!darkMode),
        },
        {
          icon: Monitor,
          label: 'Compact View',
          desc: 'Reduce spacing and padding',
          type: 'toggle',
          value: false,
          onChange: () => {},
        },
      ],
    },
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        {
          icon: Mail,
          label: 'Email Notifications',
          desc: 'Receive updates via email',
          type: 'toggle',
          value: notifications.email,
          onChange: () => setNotifications(prev => ({ ...prev, email: !prev.email })),
        },
        {
          icon: Smartphone,
          label: 'Push Notifications',
          desc: 'Browser and mobile alerts',
          type: 'toggle',
          value: notifications.push,
          onChange: () => setNotifications(prev => ({ ...prev, push: !prev.push })),
        },
        {
          icon: MessageSquare,
          label: 'SMS Notifications',
          desc: 'Text message alerts',
          type: 'toggle',
          value: notifications.sms,
          onChange: () => setNotifications(prev => ({ ...prev, sms: !prev.sms })),
        },
        {
          icon: notifications.sound ? Volume2 : VolumeX,
          label: 'Sound Effects',
          desc: 'Play sounds for notifications',
          type: 'toggle',
          value: notifications.sound,
          onChange: () => setNotifications(prev => ({ ...prev, sound: !prev.sound })),
        },
      ],
    },
    {
      title: 'Privacy & Security',
      icon: Shield,
      items: [
        {
          icon: Lock,
          label: 'Change Password',
          desc: 'Update your password',
          type: 'link',
        },
        {
          icon: Shield,
          label: 'Two-Factor Authentication',
          desc: 'Add extra security layer',
          type: 'link',
        },
        {
          icon: User,
          label: 'Privacy Settings',
          desc: 'Control data sharing',
          type: 'link',
        },
      ],
    },
    {
      title: 'Language & Region',
      icon: Globe,
      items: [
        {
          icon: Globe,
          label: 'Language',
          desc: 'App display language',
          type: 'select',
          value: language,
          options: [
            { value: 'en', label: 'English' },
            { value: 'hi', label: 'हिंदी' },
            { value: 'bn', label: 'বাংলা' },
          ],
          onChange: (e) => setLanguage(e.target.value),
        },
      ],
    },
  ];

  const Toggle = ({ value, onChange }) => (
    <button
      onClick={onChange}
      className={`
        relative w-12 h-7 rounded-full transition-colors
        ${value ? 'bg-indigo-600' : 'bg-slate-200'}
      `}
    >
      <motion.div
        className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm"
        animate={{ x: value ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );

  return (
    <PageShell width="3xl">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
          <p className="text-slate-500">Manage your app preferences</p>
        </motion.div>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => {
          const SectionIcon = section.icon;
          return (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIndex * 0.1 }}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            >
              {/* Section Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <SectionIcon className="w-4 h-4 text-slate-600" />
                </div>
                <h2 className="text-sm font-semibold text-slate-800">{section.title}</h2>
              </div>

              {/* Section Items */}
              <div className="divide-y divide-slate-100">
                {section.items.map((item, itemIndex) => {
                  const ItemIcon = item.icon;
                  return (
                    <div
                      key={itemIndex}
                      className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <ItemIcon className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">{item.label}</p>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </div>
                      </div>

                      {item.type === 'toggle' && (
                        <Toggle value={item.value} onChange={item.onChange} />
                      )}

                      {item.type === 'link' && (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}

                      {item.type === 'select' && (
                        <select
                          value={item.value}
                          onChange={item.onChange}
                          className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-slate-700 border-none focus:ring-2 focus:ring-indigo-200"
                        >
                          {item.options.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
        >
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="p-2 bg-red-100 rounded-lg">
              <Trash2 className="w-4 h-4 text-red-600" />
            </div>
            <h2 className="text-sm font-semibold text-red-600">Danger Zone</h2>
          </div>
          <div className="p-5 space-y-3">
            <button className="w-full flex items-center justify-between p-4 rounded-xl border border-red-200 hover:bg-red-50 transition-colors">
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5 text-red-500" />
                <div className="text-left">
                  <p className="text-sm font-medium text-red-600">Sign Out</p>
                  <p className="text-xs text-red-400">Log out of your account</p>
                </div>
              </div>
            </button>
            <button className="w-full flex items-center justify-between p-4 rounded-xl border border-red-200 hover:bg-red-50 transition-colors">
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-red-500" />
                <div className="text-left">
                  <p className="text-sm font-medium text-red-600">Delete Account</p>
                  <p className="text-xs text-red-400">Permanently remove your data</p>
                </div>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Need Help?</h3>
              <p className="text-sm text-indigo-200 mb-3">
                Contact our support team or browse the help center for answers.
              </p>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-white text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors">
                  Help Center
                </button>
                <button className="px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors">
                  Contact Us
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Version Info */}
        <div className="text-center py-4">
          <p className="text-xs text-slate-400">Staffroom v1.0.0 • © 2025</p>
        </div>
      </div>
    </PageShell>
  );
}
