/* Main App Component - Handles routing (using react-router-dom), query client and other providers */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

// Pages
import HomePage from '@/pages/Home'
import AuthPage from '@/pages/Auth'
import RegisterMetricPage from '@/pages/RegisterMetric'
import ExamsAndDietsPage from '@/pages/ExamsAndDiets'
import MealsPage from '@/pages/Meals'
import MedicationsPage from '@/pages/Medications'
import EmotionalDiaryPage from '@/pages/EmotionalDiary'
import AiAnalysesPage from '@/pages/AiAnalyses'
import MetricDetailPage from '@/pages/MetricDetail'
import ProfilePage from '@/pages/Profile'
import { ProfileScorePage } from '@/pages/ProfileScore'
import BiomarkersPanelPage from '@/pages/BiomarkersPanel'
import InsightsPage from '@/pages/Insights'
import RecordsPage from '@/pages/Records'
import SourcesPage from '@/pages/Sources'
import ProfessionalDashboardPage from '@/pages/ProfessionalDashboard'
import ProfessionalFeedPage from '@/pages/ProfessionalFeed'
import ProfessionalPatientPage from '@/pages/ProfessionalPatient'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" richColors />
          <Routes>
            {/* Rota pública de login e cadastro */}
            <Route path="/login" element={<AuthPage />} />

            {/* Rotas protegidas para clientes e profissionais */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              {/* Páginas dedicadas dos scores do Profile (só cliente acessa) */}
              <Route
                path="/profile/score-preventivo"
                element={<ProfileScorePage kind="preventivo" />}
              />
              <Route
                path="/profile/score-emocional"
                element={<ProfileScorePage kind="emocional" />}
              />
              <Route path="/biomarcadores" element={<BiomarkersPanelPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/records" element={<RecordsPage />} />
              <Route path="/sources" element={<SourcesPage />} />
              <Route path="/registrar" element={<RegisterMetricPage />} />
              <Route path="/exames-dietas" element={<ExamsAndDietsPage />} />
              <Route path="/medicamentos" element={<MedicationsPage />} />
              <Route path="/refeicoes" element={<MealsPage />} />
              <Route path="/diario-emocional" element={<EmotionalDiaryPage />} />
              <Route path="/analises" element={<AiAnalysesPage />} />
              <Route path="/metrics/:tipo" element={<MetricDetailPage />} />
            </Route>

            {/* Rota exclusiva para profissionais da Clínica Soul */}
            <Route element={<ProtectedRoute requiredRole="profissional" />}>
              <Route path="/profissional" element={<ProfessionalDashboardPage />} />
              <Route path="/profissional/feed" element={<ProfessionalFeedPage />} />
              <Route
                path="/profissional/paciente/:patientId"
                element={<ProfessionalPatientPage />}
              />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
