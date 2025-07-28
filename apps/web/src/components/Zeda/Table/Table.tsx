// Simplified version of Zeda's Table component
import React from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../../theme/colors';

export interface ColumnOption {
  id: string;
  accessor: string;
  Header: string;
  minWidth?: number;
  maxWidth?: number;
  width?: string;
  disableResizing?: boolean;
  disableSortBy?: boolean;
}

export interface TableProps {
  className?: string;
  columns: Array<ColumnOption>;
  data: Array<any>;
  selectableRows?: boolean;
  onRowSelect?: (selectedRows: any[]) => void;
  onRowClick?: (row: any) => void;
  selectedRows?: any[];
  showHeader?: boolean;
  rowHeight?: number;
  cell?: React.ComponentType<CellProps>;
  cellProps?: any;
}

export interface CellProps {
  value: any;
  row: { original: any; index: number };
  column: ColumnOption;
  [key: string]: any;
}

const TableContainer = styled.div`
  background: ${Colors.white};
  border-radius: inherit;
  overflow: auto;
  height: 100%;
  min-width: 100%;
  width: max-content;
`;

const StyledTable = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const TableHeader = styled.div<{ showHeader: boolean }>`
  background: ${Colors.grey50};
  display: flex;
  align-items: center;
  height: ${({ showHeader }) => (showHeader ? '38px' : '0px')};
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid ${Colors.grey200};
`;

const TableBody = styled.div`
  flex: 1;
  overflow: auto;
`;

const TableHeadRow = styled.div`
  display: flex;
  flex: 1 0 auto;
  min-width: 0px;
  align-items: center;
  height: 100%;

  > :first-child {
    padding-left: 16px;
  }
`;

const TableHeaderItem = styled.div<{ width?: string }>`
  color: ${Colors.grey500};
  font-size: 12px;
  font-weight: 600;
  background-color: ${Colors.transparent};
  height: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 0;
  padding: 0 8px;
  width: ${({ width }) => width || 'auto'};
  min-width: 0;
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TableRow = styled.div<{
  rowHeight?: number;
  selectableRows: boolean;
  isSelected?: boolean;
}>`
  border-top: 1px solid ${Colors.grey200};
  display: flex;
  align-items: stretch;
  margin-block: 0;
  min-height: ${({ rowHeight }) => rowHeight ? `${rowHeight}px` : '48px'};
  background-color: ${({ isSelected }) => isSelected ? Colors.primary25 : Colors.white};

  > *:first-child {
    padding-left: 16px;
  }

  :hover {
    cursor: pointer;
    background-color: ${({ isSelected }) => isSelected ? Colors.primary50 : Colors.grey50};
  }
`;

const TableCell = styled.div<{ width?: string }>`
  color: ${Colors.grey500};
  font-size: 14px;
  padding: 0 8px;
  position: relative;
  display: flex;
  align-items: center;
  background-color: ${Colors.transparent};
  margin-bottom: 0px;
  width: ${({ width }) => width || 'auto'};
  min-width: 0;
  flex-shrink: 0;
`;

const CheckboxCell = styled(TableCell)`
  width: 40px;
  justify-content: center;
`;

export const Table: React.FC<TableProps> = ({
  className,
  columns,
  data,
  selectableRows = false,
  onRowSelect,
  onRowClick,
  selectedRows = [],
  showHeader = true,
  rowHeight = 48,
  cell: CellComponent,
  cellProps = {},
}) => {
  const selectedRowIds = new Set(selectedRows.map(row => typeof row === 'object' ? row.id : row));

  const handleRowClick = (row: any) => {
    onRowClick?.(row);
  };

  const handleRowSelect = (row: any, checked: boolean) => {
    if (!onRowSelect) return;
    
    let newSelectedRows;
    if (checked) {
      newSelectedRows = [...selectedRows, row];
    } else {
      newSelectedRows = selectedRows.filter(selectedRow => 
        (typeof selectedRow === 'object' ? selectedRow.id : selectedRow) !== row.id
      );
    }
    onRowSelect(newSelectedRows);
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onRowSelect) return;
    
    onRowSelect(checked ? [...data] : []);
  };

  const isAllSelected = data.length > 0 && selectedRowIds.size === data.length;
  const isPartiallySelected = selectedRowIds.size > 0 && selectedRowIds.size < data.length;

  return (
    <TableContainer className={className}>
      <StyledTable>
        {showHeader && (
          <TableHeader showHeader={showHeader}>
            <TableHeadRow>
              {selectableRows && (
                <TableHeaderItem width="40px">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={input => {
                      if (input) input.indeterminate = isPartiallySelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableHeaderItem>
              )}
              {columns.map((column) => (
                <TableHeaderItem key={column.id} width={column.width}>
                  {column.Header}
                </TableHeaderItem>
              ))}
            </TableHeadRow>
          </TableHeader>
        )}
        
        <TableBody>
          {data.map((row, rowIndex) => {
            const isSelected = selectedRowIds.has(row.id);
            
            return (
              <TableRow
                key={row.id || rowIndex}
                rowHeight={rowHeight}
                selectableRows={selectableRows}
                isSelected={isSelected}
                onClick={() => handleRowClick(row)}
              >
                {selectableRows && (
                  <CheckboxCell>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleRowSelect(row, e.target.checked);
                      }}
                    />
                  </CheckboxCell>
                )}
                
                {columns.map((column) => (
                  <TableCell key={column.id} width={column.width}>
                    {CellComponent ? (
                      <CellComponent
                        value={row[column.accessor]}
                        row={{ original: row, index: rowIndex }}
                        column={column}
                        {...cellProps}
                      />
                    ) : (
                      row[column.accessor]
                    )}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </StyledTable>
    </TableContainer>
  );
};

export default Table;