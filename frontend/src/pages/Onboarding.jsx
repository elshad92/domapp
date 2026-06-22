import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Building2, DoorOpen, Users, CheckCircle2, ArrowRight, ArrowLeft, Home } from 'lucide-react'
import api from '../api'

const steps = [
  { key: 'building', icon: Building2 },
  { key: 'apartments', icon: DoorOpen },
  { key: 'residents', icon: Users },
  { key: 'done', icon: CheckCircle2 },
]

export default function Onboarding() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [companyName, setCompanyName] = useState('')

  // Building form
  const [building, setBuilding] = useState({ address: '', district: '', floors: 1 })

  // Apartments form
  const [apartmentCount, setApartmentCount] = useState(5)
  const [apartmentFloor, setApartmentFloor] = useState(1)

  // Resident form
  const [resident, setResident] = useState({ name: '', phone: '', apartment_number: '' })
  const [createdApartments, setCreatedApartments] = useState([])

  useEffect(() => {
    const name = localStorage.getItem('company_name') || 'УК'
    setCompanyName(name)
  }, [])

  const handleCreateBuilding = async () => {
    if (!building.address.trim()) return
    setLoading(true)
    try {
      await api.post('/buildings', {
        address: building.address,
        district: building.district || 'Центральный',
        floors: parseInt(building.floors) || 1,
      })
      nextStep()
    } catch (err) {
      console.error('Failed to create building:', err)
      alert(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateApartments = async () => {
    setLoading(true)
    try {
      // Get the first building
      const { data: buildings } = await api.get('/buildings')
      if (!buildings?.length) {
        alert('Сначала создайте дом')
        return
      }
      const buildingId = buildings[0].id

      const created = []
      for (let i = 1; i <= apartmentCount; i++) {
        const { data } = await api.post('/apartments', {
          building_id: buildingId,
          number: i,
          floor: Math.ceil(i / (apartmentCount / (parseInt(building.floors) || 1))) || 1,
          area: 50,
        })
        created.push(data)
      }
      setCreatedApartments(created)
      nextStep()
    } catch (err) {
      console.error('Failed to create apartments:', err)
      alert(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleAddResident = async () => {
    if (!resident.name.trim() || !resident.phone.trim() || !resident.apartment_number) return
    setLoading(true)
    try {
      const { data: buildings } = await api.get('/buildings')
      if (!buildings?.length) return
      const buildingId = buildings[0].id

      // Find apartment by number
      const { data: apartments } = await api.get(`/apartments?building_id=${buildingId}`)
      const apt = apartments?.find(a => String(a.number) === String(resident.apartment_number))
      if (!apt) {
        alert('Квартира с таким номером не найдена. Сначала создайте квартиры.')
        return
      }

      await api.post('/tenants', {
        name: resident.name,
        phone: resident.phone,
        apartment_id: apt.id,
        building_id: buildingId,
      })

      setResident({ name: '', phone: '', apartment_number: '' })
      alert('Жилец добавлен! Можно добавить ещё или перейти к завершению.')
    } catch (err) {
      console.error('Failed to add resident:', err)
      alert(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFinish = () => {
    navigate('/dashboard')
  }

  const StepIcon = steps[currentStep].icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <StepIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('onboarding.welcome', { name: companyName })}
          </h1>
          <p className="text-gray-500 mt-2">
            {t('onboarding.subtitle')}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 space-x-2">
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isActive = idx === currentStep
            const isDone = idx < currentStep
            return (
              <div key={step.key} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    isActive
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : isDone
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300 text-gray-400'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-1 ${
                      idx < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Step Labels */}
        <div className="flex justify-between mb-8 px-2">
          {steps.map((step, idx) => (
            <span
              key={step.key}
              className={`text-xs font-medium ${
                idx === currentStep
                  ? 'text-blue-600'
                  : idx < currentStep
                  ? 'text-green-600'
                  : 'text-gray-400'
              }`}
            >
              {t(`onboarding.step${idx + 1}`)}
            </span>
          ))}
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {/* Step 1: Create Building */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('buildings.address')}
                </label>
                <input
                  type="text"
                  value={building.address}
                  onChange={e => setBuilding({ ...building, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ул. Амира Темура, 100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('buildings.district')}
                  </label>
                  <input
                    type="text"
                    value={building.district}
                    onChange={e => setBuilding({ ...building, district: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Мирабадский"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('buildings.floors')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={building.floors}
                    onChange={e => setBuilding({ ...building, floors: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Create Apartments */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('onboarding.apartmentCount')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={apartmentCount}
                  onChange={e => setApartmentCount(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {t('onboarding.apartmentCountHint')}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <Home className="w-4 h-4 inline mr-1" />
                  {t('onboarding.apartmentPreview', { count: apartmentCount, floors: building.floors })}
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Add Residents */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-700">
                  {t('onboarding.residentHint')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('tenants.name')}
                </label>
                <input
                  type="text"
                  value={resident.name}
                  onChange={e => setResident({ ...resident, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Иванов Иван Иванович"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('tenants.phone')}
                </label>
                <input
                  type="text"
                  value={resident.phone}
                  onChange={e => setResident({ ...resident, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+998901234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('apartments.number')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={resident.apartment_number}
                  onChange={e => setResident({ ...resident, apartment_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1"
                />
              </div>
              <button
                onClick={handleAddResident}
                disabled={loading}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? t('common.saving') : t('onboarding.addResident')}
              </button>
            </div>
          )}

          {/* Step 4: Done */}
          {currentStep === 3 && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {t('onboarding.doneTitle')}
              </h2>
              <p className="text-gray-500">
                {t('onboarding.doneSubtitle')}
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
                <h3 className="font-medium text-gray-700">{t('onboarding.nextSteps')}</h3>
                <ul className="space-y-2">
                  <li className="flex items-start space-x-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{t('onboarding.nextStep1')}</span>
                  </li>
                  <li className="flex items-start space-x-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                    <span>{t('onboarding.nextStep2')}</span>
                  </li>
                  <li className="flex items-start space-x-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                    <span>{t('onboarding.nextStep3')}</span>
                  </li>
                  <li className="flex items-start space-x-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                    <span>{t('onboarding.nextStep4')}</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          {currentStep > 0 && currentStep < 3 ? (
            <button
              onClick={prevStep}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('onboarding.back')}</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep === 0 && (
            <button
              onClick={handleCreateBuilding}
              disabled={loading || !building.address.trim()}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <span>{loading ? t('common.saving') : t('onboarding.createBuilding')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {currentStep === 1 && (
            <button
              onClick={handleCreateApartments}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <span>{loading ? t('common.saving') : t('onboarding.createApartments')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {currentStep === 2 && (
            <button
              onClick={nextStep}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <span>{t('onboarding.skipToDashboard')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {currentStep === 3 && (
            <button
              onClick={handleFinish}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <span>{t('onboarding.goToDashboard')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
