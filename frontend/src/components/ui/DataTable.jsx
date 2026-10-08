import clsx from 'clsx'

/**
 * Responsive list: real <table> from `md` up, cards (renderCard) on phones.
 * columns: [{ key, header, render?(row), align?: 'right', className? }]
 */
export default function DataTable({ rows, columns, renderCard, onRowClick, rowKey = (r) => r.id, footer, className }) {
  return (
    <div className={className}>
      <ul className="space-y-2.5 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)}>
            {onRowClick ? (
              <button
                type="button"
                onClick={() => onRowClick(row)}
                className="block w-full rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-slate-200/60 transition active:scale-[0.99]"
              >
                {renderCard(row)}
              </button>
            ) : (
              <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-200/60">{renderCard(row)}</div>
            )}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-200/60 md:block print-area">
        <table className="w-full text-left text-[15px]">
          <thead className="bg-slate-50 text-[13px] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={clsx('px-4 py-3', c.align === 'right' && 'text-right', c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={clsx(onRowClick && 'cursor-pointer hover:bg-brand-50/50')}
              >
                {columns.map((c) => (
                  <td key={c.key} className={clsx('px-4 py-3 align-middle', c.align === 'right' && 'text-right tabular-nums', c.className)}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold">{footer}</tfoot>}
        </table>
      </div>
    </div>
  )
}
