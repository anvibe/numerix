import React from 'react';
import { Brain, TrendingDown, Target, Lightbulb } from 'lucide-react';

const AIFeedbackInfo: React.FC = () => {
  return (
    <div className="card mb-8">
      <div className="flex items-center mb-4">
        <Brain className="h-6 w-6 text-primary mr-3" />
        <h2 className="text-xl font-semibold">Come funziona il feedback AI</h2>
      </div>

      <div className="space-y-4">
        <div className="bg-bg-secondary rounded-lg p-4">
          <div className="flex items-start">
            <TrendingDown className="h-5 w-5 text-warning mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-2">Apprendimento Pattern Negativi</h3>
              <p className="text-text-secondary text-sm">
                Inserendo le combinazioni che non hanno vinto, l'AI imparerà a evitare numeri e pattern 
                che sono apparsi frequentemente nelle tue giocate sfortunate. L'analisi confronta anche 
                le tue scelte con i numeri effettivamente vincenti per identificare pattern e opportunità mancate.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <Target className="h-5 w-5 text-primary mb-2" />
            <h4 className="font-semibold mb-1">Analisi Pattern</h4>
            <p className="text-text-secondary text-sm">
              L'AI analizza i numeri che hai scelto ma che non hanno vinto, identificando 
              pattern comuni e frequenze che potrebbero essere meno favorevoli.
            </p>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <Lightbulb className="h-5 w-5 text-primary mb-2" />
            <h4 className="font-semibold mb-1">Suggerimenti Migliorati</h4>
            <p className="text-text-secondary text-sm">
              Basandosi sui tuoi feedback, l'AI può suggerire combinazioni alternative 
              che evitano i pattern che non hanno funzionato in passato.
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
          <p className="text-sm text-text-secondary">
            <strong className="text-primary">Nota:</strong> Puoi aggiungere combinazioni non vincenti 
            direttamente dalla sezione "Combinazioni Salvate" utilizzando il pulsante "Segna come Non Vincente" 
            dopo ogni estrazione.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIFeedbackInfo;

