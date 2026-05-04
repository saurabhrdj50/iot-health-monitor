import React, { memo } from 'react';

export const Table = memo(({ headers, data, keyExtractor, renderRow }) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[var(--line-strong)]">
            {headers.map((header, index) => (
              <th
                key={index}
                className="py-3 px-4 text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider bg-[rgba(10,22,40,0.4)]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {data.length > 0 ? (
            data.map((item, index) => (
              <tr
                key={keyExtractor ? keyExtractor(item) : index}
                className="transition-colors hover:bg-[rgba(255,255,255,0.02)]"
              >
                {renderRow(item)}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={headers.length}
                className="py-8 text-center text-[var(--text-muted)]"
              >
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

export default Table;
