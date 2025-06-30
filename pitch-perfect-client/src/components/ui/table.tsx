import React from "react";

export const Table: React.FC<React.HTMLAttributes<HTMLTableElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <table
    className={`w-full text-sm text-left text-gray-500 ${className}`}
    {...props}
  >
    {children}
  </table>
);

export const TableHeader: React.FC<
  React.HTMLAttributes<HTMLTableSectionElement>
> = ({ children, className = "", ...props }) => (
  <thead
    className={`text-xs text-gray-700 uppercase bg-gray-50 ${className}`}
    {...props}
  >
    {children}
  </thead>
);

export const TableBody: React.FC<
  React.HTMLAttributes<HTMLTableSectionElement>
> = ({ children, className = "", ...props }) => (
  <tbody {...props}>{children}</tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <tr className={`bg-[#2a2f3a] border-b  ${className}`} {...props}>
    {children}
  </tr>
);

export const TableHead: React.FC<
  React.ThHTMLAttributes<HTMLTableCellElement>
> = ({ children, className = "", ...props }) => (
  <th scope="col" className={`px-6 py-3 ${className}`} {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<
  React.TdHTMLAttributes<HTMLTableCellElement>
> = ({ children, className = "", ...props }) => (
  <td className={`px-6 py-4 ${className}`} {...props}>
    {children}
  </td>
);

export const TableCaption: React.FC<
  React.HTMLAttributes<HTMLTableCaptionElement>
> = ({ children, className = "", ...props }) => (
  <caption className={`px-6 py-4 text-sm text-white ${className}`} {...props}>
    {children}
  </caption>
);
