import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageBar, MessageBarBody, Button } from '@fluentui/react-components';
import { AddRegular, BoxRegular } from '@fluentui/react-icons';
import type { IColumn, IRawRecord } from '@talxis/client-libraries';
import { Lab_warehouseitemsService } from '@/generated/services/Lab_warehouseitemsService';
import { Lab_warehouselocationsService } from '@/generated/services/Lab_warehouselocationsService';
import type { Lab_warehouseitems } from '@/generated/models/Lab_warehouseitemsModel';
import type { Lab_warehouselocations } from '@/generated/models/Lab_warehouselocationsModel';
import { categoryOptionMetadata } from '@/utils/OptionSets';
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
  { name: 'lab_name', displayName: 'Name', dataType: 'SingleLine.Text', isPrimary: true, visualSizeFactor: 210 },
  { name: 'lab_sku', displayName: 'SKU', dataType: 'SingleLine.Text', visualSizeFactor: 120 },
  { name: 'lab_availablequantity', displayName: 'Quantity on hand', dataType: 'Whole.None', visualSizeFactor: 130 },
  { name: 'lab_category', displayName: 'Category', dataType: 'OptionSet', visualSizeFactor: 140, metadata: { OptionSet: categoryOptionMetadata } as IColumn['metadata'] },
  { name: 'location', displayName: 'Location', dataType: 'SingleLine.Text', visualSizeFactor: 170 },
];

const formFields: FormField[] = [
  { column: { name: 'lab_name', displayName: 'Name', dataType: 'SingleLine.Text', isPrimary: true }, required: true },
  { column: { name: 'lab_sku', displayName: 'SKU', dataType: 'SingleLine.Text' }, required: true },
  { column: { name: 'lab_availablequantity', displayName: 'Available Quantity', dataType: 'Whole.None' }, required: true },
  { column: { name: 'lab_category', displayName: 'Category', dataType: 'OptionSet', metadata: { OptionSet: categoryOptionMetadata } as IColumn['metadata'] }, required: true },
  { column: { name: 'lab_locationid', displayName: 'Location', dataType: 'SingleLine.Text' }, lookupEntity: 'lab_warehouselocation' },
];

export default function WarehouseItemsPage() {
  const styles = useWarehousePageStyles();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const itemsQuery = useQuery({
    queryKey: ['warehouseItems'],
    queryFn: async () => (await serviceResult(Lab_warehouseitemsService.getAll({
      select: ['lab_warehouseitemid', 'lab_name', 'lab_sku', 'lab_availablequantity', 'lab_category', '_lab_locationid_value'],
      orderBy: ['lab_name asc'],
    }))).data ?? [],
  });
  const locationsQuery = useQuery({
    queryKey: ['warehouseLocationsLookup'],
    queryFn: async () => (await serviceResult(Lab_warehouselocationsService.getAll({
      select: ['lab_warehouselocationid', 'lab_name'],
      orderBy: ['lab_name asc'],
    }))).data ?? [],
  });

  const lookupRecords = useMemo<LookupRecord[]>(() => (locationsQuery.data ?? []).map((location: Lab_warehouselocations) => ({
    id: location.lab_warehouselocationid,
    name: location.lab_name ?? '',
  })), [locationsQuery.data]);
  const rows = useMemo(() => {
    if (!itemsQuery.data) return undefined;
    const locationNames = new Map(lookupRecords.map((location) => [location.id, location.name]));
    return itemsQuery.data.map((item: Lab_warehouseitems) => ({
      ...item,
      lab_availablequantity: toNumber(item.lab_availablequantity),
      lab_category: toNumber(item.lab_category),
      location: locationNames.get(item._lab_locationid_value ?? '') ?? '',
    })) as unknown as IRawRecord[];
  }, [itemsQuery.data, lookupRecords]);

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => serviceResult(Lab_warehouseitemsService.create(servicePayload({
      lab_name: values.lab_name,
      lab_sku: values.lab_sku,
      lab_availablequantity: String(values.lab_availablequantity),
      lab_category: Number(values.lab_category),
      ...(values.lab_locationid ? { 'lab_locationid@odata.bind': `/lab_warehouselocations(${values.lab_locationid})` } : {}),
    }))),
    onSuccess: async () => { await queryClient.invalidateQueries(); toast.success('Item created.'); },
    onError: (error) => toast.error(errorText(error)),
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <PageHeader icon={<BoxRegular />} title="Items" subtitle="Inventory and quantities on hand" />
        <Button appearance="primary" icon={<AddRegular />} onClick={() => setDialogOpen(true)}>New item</Button>
      </div>
      {itemsQuery.error && <MessageBar intent="error" className={styles.message}><MessageBarBody>{errorText(itemsQuery.error)}</MessageBarBody></MessageBar>}
      {locationsQuery.error && <MessageBar intent="error" className={styles.message}><MessageBarBody>{errorText(locationsQuery.error)}</MessageBarBody></MessageBar>}
      <div className={styles.grid}>
        <RecordGrid rows={rows} columns={columns} entityName="lab_warehouseitem" onRefresh={() => queryClient.refetchQueries({ queryKey: ['warehouseItems'] })} />
      </div>
      <RecordFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="New item"
        entityName="lab_warehouseitem"
        fields={formFields}
        lookupRecords={{ lab_locationid: lookupRecords }}
        onCreate={(values) => createMutation.mutateAsync(values)}
        pending={createMutation.isPending}
      />
    </div>
  );
}