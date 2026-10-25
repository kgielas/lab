import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { AddRegular, LocationRegular } from '@fluentui/react-icons';
import type { IColumn, IRawRecord } from '@talxis/client-libraries';
import { Lab_warehouselocationsService } from '@/generated/services/Lab_warehouselocationsService';
import { Lab_warehouseitemsService } from '@/generated/services/Lab_warehouseitemsService';
import type { Lab_warehouselocations } from '@/generated/models/Lab_warehouselocationsModel';
import type { Lab_warehouseitems } from '@/generated/models/Lab_warehouseitemsModel';
import { servicePayload, serviceResult, errorText } from '@/utils/ServicePayload';
import { toNumber } from '@/utils/RecordValues';
import { PageHeader } from '@/components/PageHeader';
import { RecordGrid } from '@/components/RecordGrid';
import { RecordFormDialog } from '@/components/RecordFormDialog';
import type { FormField } from '@/components/RecordFormFields';
import { useToast } from '@/hooks/use-toast';
import { useWarehousePageStyles } from '@/styles/WarehousePages.styles';

const columns: IColumn[] = [
  { name: 'lab_name', displayName: 'Name', dataType: 'SingleLine.Text', isPrimary: true, visualSizeFactor: 220 },
  { name: 'lab_address', displayName: 'Address', dataType: 'SingleLine.Text', visualSizeFactor: 260 },
  { name: 'lab_capacity', displayName: 'Capacity', dataType: 'Whole.None', visualSizeFactor: 110 },
  { name: 'itemCount', displayName: 'Items', dataType: 'Whole.None', visualSizeFactor: 90 },
];
const fields: FormField[] = [
  { column: { name: 'lab_name', displayName: 'Name', dataType: 'SingleLine.Text', isPrimary: true }, required: true },
  { column: { name: 'lab_address', displayName: 'Address', dataType: 'SingleLine.Text' } },
  { column: { name: 'lab_capacity', displayName: 'Capacity', dataType: 'Whole.None' } },
];

export default function LocationsPage() {
  const styles = useWarehousePageStyles();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const locationsQuery = useQuery({
    queryKey: ['warehouseLocationsList'],
    queryFn: async () => (await serviceResult(Lab_warehouselocationsService.getAll({
      select: ['lab_warehouselocationid', 'lab_name', 'lab_address', 'lab_capacity'],
      orderBy: ['lab_name asc'],
    }))).data ?? [],
  });
  const itemsQuery = useQuery({
    queryKey: ['itemsByLocation'],
    queryFn: async () => (await serviceResult(Lab_warehouseitemsService.getAll({
      select: ['lab_warehouseitemid', '_lab_locationid_value'],
    }))).data ?? [],
  });
  const rows = useMemo(() => {
    if (!locationsQuery.data) return undefined;
    const counts = new Map<string, number>();
    (itemsQuery.data ?? []).forEach((item: Lab_warehouseitems) => {
      const id = item._lab_locationid_value;
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    return locationsQuery.data.map((location: Lab_warehouselocations) => ({
      ...location,
      lab_capacity: toNumber(location.lab_capacity),
      itemCount: counts.get(location.lab_warehouselocationid) ?? 0,
    })) as unknown as IRawRecord[];
  }, [locationsQuery.data, itemsQuery.data]);
  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => serviceResult(Lab_warehouselocationsService.create(servicePayload({
      lab_name: values.lab_name,
      lab_address: values.lab_address,
      ...(values.lab_capacity !== undefined && values.lab_capacity !== '' ? { lab_capacity: String(values.lab_capacity) } : {}),
      lab_isactive: true,
    }))),
    onSuccess: async () => { await queryClient.invalidateQueries(); toast.success('Location created.'); },
    onError: (error) => toast.error(errorText(error)),
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <PageHeader icon={<LocationRegular />} title="Locations" subtitle="Warehouse locations and item counts" />
        <Button appearance="primary" icon={<AddRegular />} onClick={() => setDialogOpen(true)}>New location</Button>
      </div>
      {locationsQuery.error && <MessageBar intent="error"><MessageBarBody>{errorText(locationsQuery.error)}</MessageBarBody></MessageBar>}
      {itemsQuery.error && <MessageBar intent="error"><MessageBarBody>{errorText(itemsQuery.error)}</MessageBarBody></MessageBar>}
      <RecordGrid rows={rows} columns={columns} entityName="lab_warehouselocation" onRefresh={() => queryClient.invalidateQueries({ queryKey: ['warehouseLocationsList', 'itemsByLocation'] })} />
      <RecordFormDialog open={dialogOpen} onOpenChange={setDialogOpen} title="New location" entityName="lab_warehouselocation" fields={fields} onCreate={(values) => createMutation.mutateAsync(values)} pending={createMutation.isPending} />
    </div>
  );
}