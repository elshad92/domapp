import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BookOpen, Building2, Users, DoorOpen, CreditCard,
  FileText, BarChart3, MessageSquare, QrCode, Bell,
  Smartphone, Globe, Shield, HelpCircle, ChevronDown,
  ChevronRight, Mail, Phone, ExternalLink
} from 'lucide-react'

const sections = {
  uk: [
    {
      id: 'getting-started',
      icon: BookOpen,
      titleKey: 'docs.uk.sections.gettingStarted.title',
      contentKey: 'docs.uk.sections.gettingStarted.content',
    },
    {
      id: 'buildings',
      icon: Building2,
      titleKey: 'docs.uk.sections.buildings.title',
      contentKey: 'docs.uk.sections.buildings.content',
    },
    {
      id: 'apartments',
      icon: DoorOpen,
      titleKey: 'docs.uk.sections.apartments.title',
      contentKey: 'docs.uk.sections.apartments.content',
    },
    {
      id: 'residents',
      icon: Users,
      titleKey: 'docs.uk.sections.residents.title',
      contentKey: 'docs.uk.sections.residents.content',
    },
    {
      id: 'requests',
      icon: MessageSquare,
      titleKey: 'docs.uk.sections.requests.title',
      contentKey: 'docs.uk.sections.requests.content',
    },
    {
      id: 'payments',
      icon: CreditCard,
      titleKey: 'docs.uk.sections.payments.title',
      contentKey: 'docs.uk.sections.payments.content',
    },
    {
      id: 'announcements',
      icon: Bell,
      titleKey: 'docs.uk.sections.announcements.title',
      contentKey: 'docs.uk.sections.announcements.content',
    },
    {
      id: 'polls',
      icon: BarChart3,
      titleKey: 'docs.uk.sections.polls.title',
      contentKey: 'docs.uk.sections.polls.content',
    },
    {
      id: 'reports',
      icon: FileText,
      titleKey: 'docs.uk.sections.reports.title',
      contentKey: 'docs.uk.sections.reports.content',
    },
  ],
  resident: [
    {
      id: 'resident-getting-started',
      icon: Smartphone,
      titleKey: 'docs.resident.sections.gettingStarted.title',
      contentKey: 'docs.resident.sections.gettingStarted.content',
    },
    {
      id: 'resident-requests',
      icon: MessageSquare,
      titleKey: 'docs.resident.sections.requests.title',
      contentKey: 'docs.resident.sections.requests.content',
    },
    {
      id: 'resident-payments',
      icon: CreditCard,
      titleKey: 'docs.resident.sections.payments.title',
      contentKey: 'docs.resident.sections.payments.content',
    },
    {
      id: 'resident-polls',
      icon: BarChart3,
      titleKey: 'docs.resident.sections.polls.title',
      contentKey: 'docs.resident.sections.polls.content',
    },
    {
      id: 'resident-guest-qr',
      icon: QrCode,
      titleKey: 'docs.resident.sections.guestQr.title',
      contentKey: 'docs.resident.sections.guestQr.content',
    },
  ],
}

function Section({ section, isOpen, onToggle }) {
  const { t } = useTranslation()
  const Icon = section.icon

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition text-left"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
          <span className="font-medium text-gray-900">{t(section.titleKey)}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100">
          <div className="prose prose-sm max-w-none text-gray-600 mt-3 whitespace-pre-line">
            {t(section.contentKey)}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Docs() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('uk')
  const [openSections, setOpenSections] = useState({})

  const toggleSection = (id) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const currentSections = sections[activeTab] || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('docs.title')}</h1>
              <p className="text-gray-500 text-sm">{t('docs.subtitle')}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('uk')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
                activeTab === 'uk'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Building2 className="w-4 h-4 inline mr-1.5" />
              {t('docs.uk.tab')}
            </button>
            <button
              onClick={() => setActiveTab('resident')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
                activeTab === 'resident'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Smartphone className="w-4 h-4 inline mr-1.5" />
              {t('docs.resident.tab')}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-3">
          {currentSections.map(section => (
            <Section
              key={section.id}
              section={section}
              isOpen={openSections[section.id] || false}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </div>

        {/* Contact / Support */}
        <div className="mt-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-8 text-white">
          <div className="flex items-center space-x-3 mb-4">
            <HelpCircle className="w-8 h-8" />
            <h2 className="text-xl font-bold">{t('docs.support.title')}</h2>
          </div>
          <p className="text-blue-100 mb-6">
            {t('docs.support.description')}
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="mailto:info@domapp.ru"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
            >
              <Mail className="w-4 h-4" />
              <span>info@domapp.ru</span>
            </a>
            <a
              href="https://domapp.ru"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
            >
              <Globe className="w-4 h-4" />
              <span>domapp.ru</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
