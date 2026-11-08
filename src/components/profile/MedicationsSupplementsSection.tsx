import React from 'react'
import { Medication } from '@/services/medications'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pill, Clock, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

interface MedicationsSupplementsSectionProps {
  medications: Medication[]
}

const routineLabel = (routine: Medication['routine']) => {
  switch (routine) {
    case 'daily':
      return 'Diário'
    case 'weekly':
      return 'Semanal'
    case 'once':
      return 'Pontual / SOS'
    default:
      return 'Uso contínuo'
  }
}

export const MedicationsSupplementsSection: React.FC<MedicationsSupplementsSectionProps> = ({
  medications,
}) => {
  const recurringMeds = medications.filter((m) => m.routine !== 'once')
  const onceMeds = medications.filter((m) => m.routine === 'once')

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Pill className="w-4 h-4 text-primary" />
            Medications & Supplements (Protocolos Atuais)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Medicamentos contínuos, esporádicos e suplementação integrativa cadastrados na sua
            conta.
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="gap-1 text-xs">
          <Link to="/medicamentos">
            Gerenciar Medicamentos
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {medications.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground space-y-2">
            <p>Nenhuma medicação ou suplemento cadastrado ainda.</p>
            <Button asChild size="sm" variant="default" className="text-xs">
              <Link to="/medicamentos">Cadastrar Medicamento</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recorrentes & Rotina ({recurringMeds.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {recurringMeds.map((med) => (
                <div
                  key={med.id}
                  className="p-3 rounded-lg border border-border/70 bg-card/60 flex flex-col justify-between text-xs space-y-2"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-foreground text-sm leading-tight">
                        {med.name}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {routineLabel(med.routine)}
                      </Badge>
                    </div>
                    {med.active_ingredient && (
                      <div className="text-muted-foreground text-[11px] italic">
                        {med.active_ingredient}
                      </div>
                    )}
                    {med.dosage && (
                      <div className="text-foreground text-xs font-medium mt-0.5">{med.dosage}</div>
                    )}
                  </div>

                  <div className="pt-1 border-t border-border/40 text-[11px] text-muted-foreground space-y-0.5">
                    {med.times && med.times.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Horários: {med.times.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {onceMeds.length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Pontuais / SOS ({onceMeds.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {onceMeds.map((med) => (
                    <div
                      key={med.id}
                      className="p-2.5 rounded-lg border border-dashed border-border/60 bg-muted/20 text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-semibold text-foreground text-xs">{med.name}</div>
                        <div className="text-muted-foreground text-[11px]">
                          {med.dosage || 'Sem dose especificada'}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        SOS
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
