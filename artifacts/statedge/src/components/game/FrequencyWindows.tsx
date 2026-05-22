import { calculateFrequency } from "../../utils/frequency";
import type { WindowsResult } from "../../utils/types";

type Props = { windows: WindowsResult };

export function FrequencyWindows({ windows }: Props) {
  const rows = [
    { label: "Últimas 10", data: windows.last10 },
    { label: "Últimas 20", data: windows.last20 },
    { label: "Últimas 50", data: windows.last50 },
    { label: "Últimas 100", data: windows.last100 },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
      <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">
        Frequência por Janela
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-800">
              <th className="text-left py-2 pr-3 font-medium">Janela</th>
              <th className="text-center py-2 px-2 font-medium">🔴</th>
              <th className="text-center py-2 px-2 font-medium">⚫</th>
              <th className="text-center py-2 px-2 font-medium">⚪</th>
              <th className="text-right py-2 font-medium">N</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, data }) => {
              const f = calculateFrequency(data);
              return (
                <tr
                  key={label}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-2.5 pr-3 text-slate-400">{label}</td>
                  <td className="py-2.5 px-2 text-center">
                    <span className="text-red-400 font-mono font-semibold">
                      {f.red_pct}%
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className="text-slate-300 font-mono font-semibold">
                      {f.black_pct}%
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className="text-white font-mono font-semibold">
                      {f.white_pct}%
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-slate-600 font-mono">
                    {f.total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-slate-600">
        Base esperada: vermelho 47.5% · preto 47.5% · branco 5%
      </p>
    </div>
  );
}
