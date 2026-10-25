import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, MessageBar, MessageBarBody, Spinner, Title2 } from '@fluentui/react-components';
import { ArrowLeftRegular, ArrowSwapRegular } from '@fluentui/react-icons';
import type { IColumn, IRawRecord } from '@talxis/client-libraries';
import { Lab_warehouseitemsService } from '@/generated/services/Lab_warehouseitemsService';
import { Lab_warehousetransactionsService } from '@/generated/services/Lab_warehousetransactionsService';
import { Lab_warehouselocationsService } from '@/generated/services/Lab_warehouselocationsService';
import type { Lab_warehouseitems } from '@/generated/models/Lab_warehouseitemsModel';
import type { Lab_warehousetransactions } from '@/generated/models/Lab_warehousetransactionsModel';
import type { Lab_warehouselocations } from '@/generated/models/Lab_warehouselocationsModel';
import { categoryOptionMetadata, transactionTypeOptionMetadata } from '@/utils/OptionSets';
import { servicePayload, serviceResult, errorText } from '@/utils/ServicePayload';
import { toNumber } from '@/utils/RecordValues';
import { PageHeader } from '@/components/PageHeader';
import { RecordGrid } from '@/components/RecordGrid';
import { RecordForm } from '@/components/RecordForm';
import { RecordFormFields, type FormField } from '@/components/RecordFormFields';
import type { LookupRecord } from '@/components/RecordLookup';
import { RecordFormDialog } from '@/components/RecordFormDialog';
import { useToast } from '@/hooks/use-toast';
import { useWarehousePageStyles } from '@/styles/WarehousePages.styles';

const itemFields: FormField[] = [
  { column: { name: 'lab_name', displayName: 'Name', dataType: 'SingleLine.Text', isPrimary: true }, required: true },
  { column: { name: 'lab_sku', displayName: 'SKU', dataType: 'SingleLine.Text' }, required: true },
  { column: { name: 'lab_availablequantity', displayName: 'Quantity on hand', dataType: 'Whole.None' }, disabled: true },
  { column: { name: 'lab_category', displayName: 'Category', dataType: 'OptionSet', metadata: { OptionSet: categoryOptionMetadata } as IColumn['metadata'] }, required: true },
  { column: { name: 'lab_locationid', displayName: 'Location', dataType: 'SingleLine.Text' }, lookupEntity: 'lab_warehouselocation' },
];
const transactionFields: FormField[] = [
  { column: { name: 'lab_name', displayName: 'Transaction Name', dataType: 'SingleLine.Text', isPrimary: true }, required: true },
  { column: { name: 'lab_quantity', displayName: 'Quantity', dataType: 'Whole.None' }, required: true },
  { column: { name: 'lab_transactiontype', displayName: 'Transaction Type', dataType: 'OptionSet', metadata: { OptionSet: transactionTypeOptionMetadata } as IColumn['metadata'] }, required: true },
];
const transactionColumns: IColumn[] = [
  { name: 'lab_name', displayName: 'Name', dataType: 'SingleLine.Text', isPrimary: true, visualSizeFactor: 210 },
  { name: 'lab_transactiontype', displayName: 'Type', dataType: 'OptionSet', visualSizeFactor: 115, metadata: { OptionSet: transactionTypeOptionMetadata } as IColumn['metadata'] },
  { name: 'lab_quantity', displayName: 'Quantity', dataType: 'Whole.None', visualSizeFactor: 100 },
  { name: 'lab_transactiondate', displayName: 'Date', dataType: 'DateAndTime.DateAndTime', visualSizeFactor: 170 },
];

export default function WarehouseItemDetailPage() {
  const styles = useWarehousePageStyles();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id = '' } = useParams();
  const [dialogOpen, setDialogOpen] = useState(false);

  const itemQuery = useQuery({
    queryKey: ['warehouseItem', id],
    enabled: !!id,
    queryFn: async () => (await serviceResult(Lab_warehouseitemsService.get(id))).data,
  });
  const transactionsQuery = useQuery({
    queryKey: ['itemTransactions', id],
    enabled: !!id,
    queryFn: async () => (await serviceResult(Lab_warehousetransactionsService.getAll({
      select: ['lab_warehousetransactionid', 'lab_name', 'lab_quantity', 'lab_transactiontype', 'lab_transactiondate'],
      filter: `_lab_itemid_value eq '${id}'`,
      orderBy: ['lab_transactiondate desc'],
    }))).data ?? [],
  });
  const locationsQuery = useQuery({
    queryKey: ['warehouseLocationsLookup'],
    queryFn: async () => (await serviceResult(Lab_warehouselocationsService.getAll({
      select: ['lab_warehouselocationid', 'lab_name'],
      orderBy: ['lab_name asc'],
    }))).data ?? [],
  });
  const locationRecords = useMemo<LookupRecord[]>(() => (locationsQuery.data ?? []).map((location: Lab_warehouselocations) => ({
    id: location.lab_warehouselocationid,
    name: location.lab_name ?? '',
  })), [locationsQuery.data]);
  const itemRecord = useMemo(() => {
    const item = itemQuery.data;
    if (!item) return undefined;
    return {
      id: item.lab_warehouseitemid,
      values: {
        lab_name: item.lab_name,
        lab_sku: item.lab_sku,
        lab_availablequantity: toNumber(item.lab_availablequantity),
        lab_category: toNumber(item.lab_category),
        lab_locationid: item._lab_locationid_value ?? null,
      },
    };
  }, [itemQuery.data]);
  const transactionRows = useMemo(() => transactionsQuery.data?.map((transaction: Lab_warehousetransactions) => ({
    ...transaction,
    lab_quantity: toNumber(transaction.lab_quantity),
    lab_transactiontype: toNumber(transaction.lab_transactiontype),
  })) as unknown as IRawRecord[] | undefined, [transactionsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => serviceResult(Lab_warehouseitemsService.update(id, servicePayload({
      ...(values.lab_name !== undefined ? { lab_name: values.lab_name } : {}),
      ...(values.lab_sku !== undefined ? { lab_sku: values.lab_sku } : {}),
      ...(values.lab_category !== undefined ? { lab_category: Number(values.lab_category) } : {}),
      ...(values.lab_locationid !== undefined ? { 'lab_locationid@odata.bind': values.lab_locationid ? `/lab_warehouselocations(${values.lab_locationid})` : null } : {}),
    }))),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['warehouseItem', id] }); toast.success('Item saved.'); },
    onError: (error) => toast.error(errorText(error)),
  });
  const createTransaction = useMutation({
    mutationFn: async (values: Record<string, unknown>) => serviceResult(Lab_warehousetransactionsService.create(servicePayload({
      lab_name: values.lab_name,
      lab_quantity: String(values.lab_quantity),
      lab_transactiontype: Number(values.lab_transactiontype),
      lab_transactiondate: new Date().toISOString(),
      'lab_itemid@odata.bind': `/lab_warehouseitems(${id})`,
    }))),
    onSuccess: async () => { await queryClient.invalidateQueries(); toast.success('Transaction recorded.'); },
    onError: (error) => toast.error(errorText(error)),
  });

  if (itemQuery.isLoading) return <Spinner label="Loading item" />;
  if (itemQuery.error) return <MessageBar intent="error"><MessageBarBody>{errorText(itemQuery.error)}</MessageBarBody></MessageBar>;
  if (!itemRecord || !itemQuery.data) return <MessageBar><MessageBarBody>Item not found.</MessageBarBody></MessageBar>;
  const item = itemQuery.data as Lab_warehouseitems;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <PageHeader icon={<ArrowSwapRegular />} title={item.lab_name ?? 'Warehouse Item'} subtitle={`${item.lab_sku ?? ''} · ${toNumber(item.lab_availablequantity) ?? 0} on hand`} />
        <Button appearance="subtle" icon={<ArrowLeftRegular />} onClick={() => navigate('/items')}>Back to items</Button>
      </div>
      <section className={styles.details}>
        <Title2>Item details</Title2>
        <RecordForm entityName="lab_warehouseitem" columns={itemFields.map((field) => field.column)} record={itemRecord} onSave={(values) => updateMutation.mutateAsync(values)}>
          <RecordFormFields fields={itemFields} lookupRecords={{ lab_locationid: locationRecords }} />
          <div className={styles.formActions}><Button appearance="primary" type="submit" disabled={updateMutation.isPending}>Save item</Button></div>
        </RecordForm>
      </section>
      <section className={styles.section}>
        <div className={styles.header}><Title2>Transactions</Title2><Button appearance="primary" icon={<ArrowSwapRegular />} onClick={() => setDialogOpen(true)}>New transaction</Button></div>
        {transactionsQuery.error && <MessageBar intent="error"><MessageBarBody>{errorText(transactionsQuery.error)}</MessageBarBody></MessageBar>}
        <RecordGrid rows={transactionRows} columns={transactionColumns} entityName="lab_warehousetransaction" onRefresh={() => queryClient.refetchQueries({ queryKey: ['itemTransactions', id] })} />
      </section>
      <RecordFormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={`New transaction for ${item.lab_name ?? 'item'}`} entityName="lab_warehousetransaction" fields={transactionFields} onCreate={(values) => createTransaction.mutateAsync(values)} pending={createTransaction.isPending} />
    </div>
  );
}