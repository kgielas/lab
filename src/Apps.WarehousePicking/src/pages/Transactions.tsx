import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { AddRegular, ArrowSwapRegular } from '@fluentui/react-icons';
import type { IColumn, IRawRecord } from '@talxis/client-libraries';
import { Lab_warehousetransactionsService } from '@/generated/services/Lab_warehousetransactionsService';
import { Lab_warehouseitemsService } from '@/generated/services/Lab_warehouseitemsService';
import type { Lab_warehousetransactions } from '@/generated/models/Lab_warehousetransactionsModel';
import type { Lab_warehouseitems } from '@/generated/models/Lab_warehouseitemsModel';
import { transactionTypeOptionMetadata } from '@/utils/OptionSets';
import { servicePayload, serviceResult, errorText } from '@/utils/ServicePayload';
import { toNumber } from '@/utils/RecordValues';
import { PageHeader } from '@/components/PageHeader';
import { RecordGrid } from '@/components/RecordGrid';
import { RecordFormDialog } from '@/components/RecordFormDialog';
import type { FormField } from '@/components/RecordFormFields';
import type { LookupRecord } from '@/components/RecordLookup';
import { useToast } from '@/hooks/use-toast';
import { useWarehousePageStyles } from '@/styles/WarehousePages.styles';

const columns: IColumn[] = [
  { name: 'lab_name', displayName: 'Name', dataType: 'SingleLine.Text', isPrimary: true, visualSizeFactor: 220 },
  { name: 'lab_transactiontype', displayName: 'Type', dataType: 'OptionSet', visualSizeFactor: 120, metadata: { OptionSet: transactionTypeOptionMetadata } as IColumn['metadata'] },
  { name: 'item', displayName: 'Item', dataType: 'SingleLine.Text', visualSizeFactor: 190 },
  { name: 'lab_quantity', displayName: 'Quantity', dataType: 'Whole.None', visualSizeFactor: 110 },
  { name: 'lab_transactiondate', displayName: 'Date', dataType: 'DateAndTime.DateAndTime', visualSizeFactor: 180 },
];
const fields: FormField[] = [
  { column: { name: 'lab_name', displayName: 'Name', dataType: 'SingleLine.Text', isPrimary: true }, required: true },
  { column: { name: 'lab_itemid', displayName: 'Item', dataType: 'SingleLine.Text' }, required: true, lookupEntity: 'lab_warehouseitem' },
  { column: { name: 'lab_quantity', displayName: 'Quantity', dataType: 'Whole.None' }, required: true },
  { column: { name: 'lab_transactiontype', displayName: 'Transaction Type', dataType: 'OptionSet', metadata: { OptionSet: transactionTypeOptionMetadata } as IColumn['metadata'] }, required: true },
];

export default function TransactionsPage() {
  const styles = useWarehousePageStyles();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const transactionsQuery = useQuery({
    queryKey: ['allTransactions'],
    queryFn: async () => (await serviceResult(Lab_warehousetransactionsService.getAll({
      select: ['lab_warehousetransactionid', 'lab_name', 'lab_quantity', 'lab_transactiontype', 'lab_transactiondate', '_lab_itemid_value'],
      orderBy: ['lab_transactiondate desc'],
    }))).data ?? [],
  });
  const itemsQuery = useQuery({
    queryKey: ['warehouseItemsLookup'],
    queryFn: async () => (await serviceResult(Lab_warehouseitemsService.getAll({
      select: ['lab_warehouseitemid', 'lab_name'],
      orderBy: ['lab_name asc'],
    }))).data ?? [],
  });
  const itemRecords = useMemo<LookupRecord[]>(() => (itemsQuery.data ?? []).map((item: Lab_warehouseitems) => ({
    id: item.lab_warehouseitemid,
    name: item.lab_name ?? '',
  })), [itemsQuery.data]);
  const rows = useMemo(() => {
    if (!transactionsQuery.data) return undefined;
    const itemNames = new Map(itemRecords.map((item) => [item.id, item.name]));
    return transactionsQuery.data.map((transaction: Lab_warehousetransactions) => ({
      ...transaction,
      lab_quantity: toNumber(transaction.lab_quantity),
      lab_transactiontype: toNumber(transaction.lab_transactiontype),
      item: itemNames.get(transaction._lab_itemid_value ?? '') ?? '',
    })) as unknown as IRawRecord[];
  }, [transactionsQuery.data, itemRecords]);
  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => serviceResult(Lab_warehousetransactionsService.create(servicePayload({
      lab_name: values.lab_name,
      lab_quantity: String(values.lab_quantity),
      lab_transactiontype: Number(values.lab_transactiontype),
      lab_transactiondate: new Date().toISOString(),
      'lab_itemid@odata.bind': `/lab_warehouseitems(${values.lab_itemid})`,
    }))),
    onSuccess: async () => { await queryClient.invalidateQueries(); toast.success('Transaction recorded.'); },
    onError: (error) => toast.error(errorText(error)),
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <PageHeader icon={<ArrowSwapRegular />} title="Transactions" subtitle="Stock movements, newest first" />
        <Button appearance="primary" icon={<AddRegular />} onClick={() => setDialogOpen(true)}>New transaction</Button>
      </div>
      {transactionsQuery.error && <MessageBar intent="error" className={styles.message}><MessageBarBody>{errorText(transactionsQuery.error)}</MessageBarBody></MessageBar>}
      {itemsQuery.error && <MessageBar intent="error" className={styles.message}><MessageBarBody>{errorText(itemsQuery.error)}</MessageBarBody></MessageBar>}
      <RecordGrid rows={rows} columns={columns} entityName="lab_warehousetransaction" onRefresh={() => queryClient.refetchQueries({ queryKey: ['allTransactions'] })} />
      <RecordFormDialog open={dialogOpen} onOpenChange={setDialogOpen} title="New transaction" entityName="lab_warehousetransaction" fields={fields} lookupRecords={{ lab_itemid: itemRecords }} onCreate={(values) => createMutation.mutateAsync(values)} pending={createMutation.isPending} />
    </div>
  );
}