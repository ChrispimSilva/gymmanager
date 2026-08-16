import { settingsService } from '../services/settingsService';
import type { Workout, Student, NormalizedExercise } from '../types';

export function printWorkoutSheet(
  workout: Workout,
  student?: Student | null,
  getExerciseById?: (id: number | string) => NormalizedExercise | undefined
) {
  const settings = settingsService.getSettings();
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const primaryColor = settings.primaryColor || '#10b981';

  const exercisesRows = workout.exercises
    .map((we, idx) => {
      const ex = getExerciseById ? getExerciseById(we.exerciseId) : undefined;
      return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 8px; text-align: center; font-weight: bold; color: ${primaryColor};">${idx + 1}</td>
        <td style="padding: 10px 8px;">
          <div style="font-weight: 600; font-size: 13px; color: #0f172a;">${ex?.nome || `Exercício #${we.exerciseId}`}</div>
          ${we.notes ? `<div style="font-size: 11px; color: #64748b; font-style: italic; margin-top: 2px;">Obs: ${we.notes}</div>` : ''}
        </td>
        <td style="padding: 10px 8px; font-size: 12px; color: #475569;">${ex?.musculos || workout.muscleGroup}</td>
        <td style="padding: 10px 8px; font-size: 12px; color: #475569;">${ex?.equipamento || '-'}</td>
        <td style="padding: 10px 8px; text-align: center; font-weight: 600; font-size: 13px; color: #0f172a;">${we.sets}</td>
        <td style="padding: 10px 8px; text-align: center; font-weight: 600; font-size: 13px; color: #0f172a;">${we.repetitions}</td>
        <td style="padding: 10px 8px; text-align: center; font-weight: 600; font-size: 13px; color: #0f172a;">${we.weight > 0 ? `${we.weight} kg` : '-'}</td>
        <td style="padding: 10px 8px; text-align: center; border-left: 1px dashed #cbd5e1;">[ &nbsp; ]</td>
      </tr>
    `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>Ficha de Treino - ${workout.name} - ${student?.name || 'Aluno'}</title>
      <style>
        @page { size: A4; margin: 1.5cm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 20px;
          background: #ffffff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid ${primaryColor};
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .brand-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo-img {
          width: 48px;
          height: 48px;
          object-fit: contain;
          border-radius: 8px;
        }
        .brand {
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: ${primaryColor};
        }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          background: #f8fafc;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          margin-bottom: 20px;
          font-size: 12px;
        }
        .meta-item strong {
          display: block;
          color: #64748b;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        th {
          background: #f1f5f9;
          color: #334155;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 10px 8px;
          border-bottom: 2px solid #cbd5e1;
        }
        .footer {
          margin-top: 30px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand-container">
          ${settings.logoUrl ? `<img src="${settings.logoUrl}" alt="${settings.gymName}" class="logo-img" />` : ''}
          <div>
            <div class="brand">${settings.gymName.toUpperCase()}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Ficha de Treino Personalizada</div>
          </div>
        </div>
        <div style="text-align: right; font-size: 12px; color: #64748b;">
          Emitido em: <strong>${dateStr}</strong>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <strong>Aluno</strong>
          <span>${student?.name || 'Aluno Geral'}</span>
        </div>
        <div class="meta-item">
          <strong>Treino / Foco</strong>
          <span>${workout.name} (${workout.muscleGroup})</span>
        </div>
        <div class="meta-item">
          <strong>Objetivo do Aluno</strong>
          <span>${student?.goal || 'Condicionamento / Saúde'}</span>
        </div>
      </div>

      ${workout.description ? `<p style="font-size: 12px; color: #475569; margin-bottom: 16px; font-style: italic;">"${workout.description}"</p>` : ''}

      <table>
        <thead>
          <tr>
            <th style="text-align: center; width: 30px;">#</th>
            <th>Exercício</th>
            <th>Músculos</th>
            <th>Equipamento</th>
            <th style="text-align: center; width: 50px;">Séries</th>
            <th style="text-align: center; width: 60px;">Reps</th>
            <th style="text-align: center; width: 70px;">Carga</th>
            <th style="text-align: center; width: 60px;">Visto</th>
          </tr>
        </thead>
        <tbody>
          ${exercisesRows}
        </tbody>
      </table>

      <div class="footer">
        <div>${settings.gymName} • Treine com consistência e segurança</div>
        <div>Assinatura do Instrutor: _______________________</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
